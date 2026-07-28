/**
 * Standalone authentication module — no Manus OAuth dependency.
 * Supports: email/password (bcrypt + JWT), Google OAuth2, Apple Sign-In.
 *
 * JWT payload: { sub: userId (number), email: string, iat, exp }
 * Cookie: ironlab_session (httpOnly, secure, sameSite=strict)
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import {
  getUserByEmail,
  getUserByGoogleId,
  getUserByAppleId,
  getUserById,
  createUser,
  touchLastSignedIn,
} from "./db";

const COOKIE_NAME = "ironlab_session";
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    "[Auth] JWT_SECRET environment variable is not set. " +
    "Set it to a long random string before starting the server."
  );
}
const JWT_EXPIRES_IN = "30d";
const BCRYPT_ROUNDS = 12;

// ─── JWT helpers ──────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: number;
  email: string | null;
  [key: string]: unknown;
}

const JWT_SECRET_SAFE: string = JWT_SECRET;

export function signToken(userId: number, email: string | null): string {
  return jwt.sign({ sub: userId, email } as JwtPayload, JWT_SECRET_SAFE, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET_SAFE) as unknown as JwtPayload;
  } catch {
    return null;
  }
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

export function setSessionCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function getTokenFromRequest(req: Request): string | null {
  // 1. Cookie (primary)
  const cookie = req.cookies?.[COOKIE_NAME];
  if (cookie) return cookie;
  // 2. Authorization header (mobile / PWA fallback)
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

// ─── Auth middleware ──────────────────────────────────────────────────────────

export async function authenticateRequest(req: Request) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await getUserById(payload.sub);
  if (!user) return null;
  return user;
}

// ─── Email / Password ─────────────────────────────────────────────────────────

export async function registerWithEmail(
  name: string,
  email: string,
  password: string
) {
  const existing = await getUserByEmail(email);
  if (existing) throw new Error("EMAIL_TAKEN");

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await createUser({
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    loginMethod: "email",
    emailVerified: false,
  });
  return user;
}

export async function loginWithEmail(email: string, password: string) {
  const user = await getUserByEmail(email.toLowerCase().trim());
  if (!user || !user.passwordHash) throw new Error("INVALID_CREDENTIALS");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error("INVALID_CREDENTIALS");

  await touchLastSignedIn(user.id);
  return user;
}

// ─── Google OAuth2 ────────────────────────────────────────────────────────────
// Full flow: frontend redirects to /api/auth/google → Google → /api/auth/google/callback
// Requires env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

export function getGoogleAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_NOT_CONFIGURED");

  const redirectUri = process.env.APP_URL + "/api/auth/google/callback";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function handleGoogleCallback(code: string): Promise<{
  id: number;
  email: string | null;
  name: string | null;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("GOOGLE_NOT_CONFIGURED");

  const redirectUri = process.env.APP_URL + "/api/auth/google/callback";

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenData.access_token) throw new Error("GOOGLE_TOKEN_EXCHANGE_FAILED");

  // Fetch user info
  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const googleUser = (await userRes.json()) as {
    sub: string;
    email?: string;
    name?: string;
    email_verified?: boolean;
  };
  if (!googleUser.sub) throw new Error("GOOGLE_USERINFO_FAILED");

  // Find or create user
  let user = await getUserByGoogleId(googleUser.sub);
  // Only match by email when Google has verified it — prevents account takeover via
  // unverified Google accounts that claim someone else's email address.
  if (!user && googleUser.email && googleUser.email_verified === true) {
    user = await getUserByEmail(googleUser.email);
  }

  if (user) {
    // Link Google ID if not already linked — only when email is verified to prevent account takeover
    if (!user.googleId && googleUser.email_verified === true) {
      const db = await (await import("./db")).getDb();
      if (db) {
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(users).set({ googleId: googleUser.sub }).where(eq(users.id, user.id));
      }
    }
    await touchLastSignedIn(user.id);
  } else {
    user = await createUser({
      name: googleUser.name ?? null,
      email: googleUser.email?.toLowerCase() ?? null,
      googleId: googleUser.sub,
      loginMethod: "google",
      emailVerified: googleUser.email_verified ?? false,
    });
  }

  return { id: user.id, email: user.email ?? null, name: user.name ?? null };
}

// ─── Apple Sign-In ────────────────────────────────────────────────────────────
// Full flow: frontend redirects to /api/auth/apple → Apple → /api/auth/apple/callback
// Requires env: APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (base64)

export function getAppleAuthUrl(state: string): string {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) throw new Error("APPLE_NOT_CONFIGURED");

  const redirectUri = process.env.APP_URL + "/api/auth/apple/callback";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    response_mode: "form_post",
    scope: "name email",
    state,
  });
  return `https://appleid.apple.com/auth/authorize?${params}`;
}

export async function handleAppleCallback(
  code: string,
  userJson?: string
): Promise<{ id: number; email: string | null; name: string | null }> {
  const clientId = process.env.APPLE_CLIENT_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKeyB64 = process.env.APPLE_PRIVATE_KEY;
  if (!clientId || !teamId || !keyId || !privateKeyB64)
    throw new Error("APPLE_NOT_CONFIGURED");

  const privateKey = Buffer.from(privateKeyB64, "base64").toString("utf8");
  const redirectUri = process.env.APP_URL + "/api/auth/apple/callback";

  // Build client_secret JWT
  const clientSecret = jwt.sign({}, privateKey, {
    algorithm: "ES256",
    expiresIn: "5m",
    issuer: teamId,
    audience: "https://appleid.apple.com",
    subject: clientId,
    header: { alg: "ES256", kid: keyId },
  });

  // Exchange code for tokens
  const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenData = (await tokenRes.json()) as { id_token?: string; error?: string };
  if (!tokenData.id_token) throw new Error("APPLE_TOKEN_EXCHANGE_FAILED");

  // Decode the id_token (no verification needed for sub extraction — Apple signs it)
  const idPayload = jwt.decode(tokenData.id_token) as {
    sub: string;
    email?: string;
  } | null;
  if (!idPayload?.sub) throw new Error("APPLE_ID_TOKEN_INVALID");

  // Apple only sends name on first login — parse from userJson if present
  let firstName: string | undefined;
  let lastName: string | undefined;
  if (userJson) {
    try {
      const parsed = JSON.parse(userJson) as {
        name?: { firstName?: string; lastName?: string };
      };
      firstName = parsed.name?.firstName;
      lastName = parsed.name?.lastName;
    } catch {
      // ignore
    }
  }
  const name = [firstName, lastName].filter(Boolean).join(" ") || null;

  // Find or create user
  let user = await getUserByAppleId(idPayload.sub);
  if (!user && idPayload.email) {
    user = await getUserByEmail(idPayload.email);
  }

  if (user) {
    if (!user.appleId) {
      const db = await (await import("./db")).getDb();
      if (db) {
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(users).set({ appleId: idPayload.sub }).where(eq(users.id, user.id));
      }
    }
    await touchLastSignedIn(user.id);
  } else {
    user = await createUser({
      name,
      email: idPayload.email?.toLowerCase() ?? null,
      appleId: idPayload.sub,
      loginMethod: "apple",
      emailVerified: true,
    });
  }

  return { id: user.id, email: user.email ?? null, name: user.name ?? null };
}
