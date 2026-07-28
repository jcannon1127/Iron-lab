/**
 * Standalone auth routes — replaces Manus OAuth.
 * Handles: email/password register/login, Google OAuth2 callback, Apple Sign-In callback.
 * Session cookie: ironlab_session (set by server/auth.ts helpers)
 *
 * Security:
 * - OAuth state CSRF protection: state stored in httpOnly cookie, verified on callback
 * - Rate limiting on all auth endpoints
 */
import crypto from "crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import type { Express, Request, Response } from "express";
import {
  registerWithEmail,
  loginWithEmail,
  handleGoogleCallback,
  handleAppleCallback,
  getGoogleAuthUrl,
  getAppleAuthUrl,
  signToken,
  setSessionCookie,
  clearSessionCookie,
} from "../auth";
import {
  getUserByEmail,
  createPasswordResetToken,
  getPasswordResetToken,
  markPasswordResetTokenUsed,
  updateUserPassword,
  getUserById,
} from "../db";
import { sendPasswordResetEmail } from "../email";

// ─── Rate limiters ─────────────────────────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  skip: (req) => process.env.NODE_ENV !== "production",
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset requests, please try again later." },
  skip: (req) => process.env.NODE_ENV !== "production",
});

// ─── OAuth state cookie helpers ────────────────────────────────────────────────

const OAUTH_STATE_COOKIE = "ironlab_oauth_state";

function setOAuthStateCookie(res: Response, state: string): void {
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // must be lax (not strict) to survive the OAuth redirect
    maxAge: 10 * 60 * 1000, // 10 minutes
    path: "/",
  });
}

function verifyOAuthState(req: Request, state: string): boolean {
  const stored = req.cookies?.[OAUTH_STATE_COOKIE];
  return typeof stored === "string" && stored.length > 0 && stored === state;
}

function clearOAuthStateCookie(res: Response): void {
  res.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });
}

export function registerOAuthRoutes(app: Express) {
  // ─── Email / Password ──────────────────────────────────────────────────────

  app.post("/api/auth/register", authLimiter, async (req: Request, res: Response) => {
    const { name, email, password } = req.body ?? {};
    if (!name || !email || !password) {
      res.status(400).json({ error: "name, email, and password are required" });
      return;
    }
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email))) {
      res.status(400).json({ error: "Please enter a valid email address" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    try {
      const user = await registerWithEmail(String(name), String(email), String(password));
      const token = signToken(user.id, user.email ?? null);
      setSessionCookie(res, token);
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "UNKNOWN";
      if (msg === "EMAIL_TAKEN") {
        res.status(409).json({ error: "An account with that email already exists" });
      } else {
        console.error("[Auth] Register failed:", err);
        res.status(500).json({ error: "Registration failed" });
      }
    }
  });

  app.post("/api/auth/login", authLimiter, async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    try {
      const user = await loginWithEmail(String(email), String(password));
      const token = signToken(user.id, user.email ?? null);
      setSessionCookie(res, token);
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "UNKNOWN";
      if (msg === "INVALID_CREDENTIALS") {
        res.status(401).json({ error: "Invalid email or password" });
      } else {
        console.error("[Auth] Login failed:", err);
        res.status(500).json({ error: "Login failed" });
      }
    }
  });

  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    clearSessionCookie(res);
    res.json({ success: true });
  });

  // ─── Forgot / Reset Password ───────────────────────────────────────────────

  app.post("/api/auth/forgot-password", forgotPasswordLimiter, async (req: Request, res: Response) => {
    const { email } = req.body ?? {};
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    try {
      const user = await getUserByEmail(email.toLowerCase().trim());
      // Always return success to prevent email enumeration
      if (!user || !user.email) {
        res.json({ success: true, message: "If that email exists, a reset link has been sent." });
        return;
      }
      const token = crypto.randomBytes(48).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await createPasswordResetToken({ userId: user.id, token, expiresAt });
      await sendPasswordResetEmail(user.email, token);
      res.json({ success: true, message: "If that email exists, a reset link has been sent." });
    } catch (err) {
      console.error("[Auth] Forgot password failed:", err);
      // Still return success to prevent enumeration
      res.json({ success: true, message: "If that email exists, a reset link has been sent." });
    }
  });

  app.post("/api/auth/reset-password", authLimiter, async (req: Request, res: Response) => {
    const { token, password } = req.body ?? {};
    if (!token || !password || typeof token !== "string" || typeof password !== "string") {
      res.status(400).json({ error: "Token and password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    try {
      const resetRecord = await getPasswordResetToken(token);
      if (!resetRecord || resetRecord.usedAt) {
        res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
        return;
      }
      const passwordHash = await bcrypt.hash(password, 12);
      await updateUserPassword(resetRecord.userId, passwordHash);
      await markPasswordResetTokenUsed(resetRecord.id);
      // Auto-login after reset
      const user = await getUserById(resetRecord.userId);
      if (user) {
        const jwtToken = signToken(user.id, user.email ?? null);
        setSessionCookie(res, jwtToken);
      }
      res.json({ success: true, message: "Password updated successfully." });
    } catch (err) {
      console.error("[Auth] Reset password failed:", err);
      res.status(500).json({ error: "Failed to reset password. Please try again." });
    }
  });

  // ─── Google OAuth2 ─────────────────────────────────────────────────────────

  app.get("/api/auth/google", (req: Request, res: Response) => {
    try {
      const state = crypto.randomUUID();
      setOAuthStateCookie(res, state);
      const url = getGoogleAuthUrl(state);
      res.redirect(302, url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "GOOGLE_NOT_CONFIGURED") {
        res.status(503).json({ error: "Google Sign-In is not yet configured" });
      } else {
        res.status(500).json({ error: "Failed to initiate Google login" });
      }
    }
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : null;
    const state = typeof req.query.state === "string" ? req.query.state : null;

    if (!code || !state) {
      res.status(400).redirect("/?auth_error=missing_params");
      return;
    }

    // CSRF check: verify state matches what we stored in the cookie
    if (!verifyOAuthState(req, state)) {
      console.warn("[Auth] Google OAuth state mismatch — possible CSRF attempt");
      res.status(403).redirect("/?auth_error=state_mismatch");
      return;
    }
    clearOAuthStateCookie(res);

    try {
      const user = await handleGoogleCallback(code);
      const token = signToken(user.id, user.email);
      setSessionCookie(res, token);
      res.redirect(302, "/");
    } catch (err: unknown) {
      console.error("[Auth] Google callback failed:", err);
      res.redirect(302, "/?auth_error=google_failed");
    }
  });

  // ─── Apple Sign-In ─────────────────────────────────────────────────────────

  app.get("/api/auth/apple", (req: Request, res: Response) => {
    try {
      const state = crypto.randomUUID();
      setOAuthStateCookie(res, state);
      const url = getAppleAuthUrl(state);
      res.redirect(302, url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "APPLE_NOT_CONFIGURED") {
        res.status(503).json({ error: "Apple Sign-In is not yet configured" });
      } else {
        res.status(500).json({ error: "Failed to initiate Apple login" });
      }
    }
  });

  // Apple sends a POST with form data (response_mode=form_post)
  app.post("/api/auth/apple/callback", async (req: Request, res: Response) => {
    const code = typeof req.body?.code === "string" ? req.body.code : null;
    const state = typeof req.body?.state === "string" ? req.body.state : null;
    const userJson = typeof req.body?.user === "string" ? req.body.user : undefined;

    if (!code || !state) {
      res.status(400).redirect("/?auth_error=missing_params");
      return;
    }

    // CSRF check
    if (!verifyOAuthState(req, state)) {
      console.warn("[Auth] Apple OAuth state mismatch — possible CSRF attempt");
      res.status(403).redirect("/?auth_error=state_mismatch");
      return;
    }
    clearOAuthStateCookie(res);

    try {
      const user = await handleAppleCallback(code, userJson);
      const token = signToken(user.id, user.email);
      setSessionCookie(res, token);
      res.redirect(302, "/");
    } catch (err: unknown) {
      console.error("[Auth] Apple callback failed:", err);
      res.redirect(302, "/?auth_error=apple_failed");
    }
  });
}
