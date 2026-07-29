/**
 * Iron Lab — Standalone Login / Register page
 * Supports: email/password, Google, Apple, Forgot Password flow.
 */
import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { trpc } from "@/lib/trpc";

type Mode = "login" | "register" | "forgot" | "forgot-sent";

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const utils = trpc.useUtils();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "forgot") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (res.ok) {
          setMode("forgot-sent");
        } else {
          const data = (await res.json()) as { error?: string };
          setError(data.error ?? "Something went wrong");
        }
        return;
      }

      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> = { email, password };
      if (mode === "register") body.name = name;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      await utils.auth.me.invalidate();
      window.location.href = "/";
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    // On iOS native (Capacitor), use the native Google Sign-In plugin to avoid
    // the WKWebView disallowed_useragent error. On web, fall back to the redirect flow.
    if (Capacitor.isNativePlatform()) {
      setLoading(true);
      setError(null);
      try {
        const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
        await GoogleAuth.initialize({
          clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
          scopes: ["profile", "email"],
          grantOfflineAccess: false,
        });
        const googleUser = await GoogleAuth.signIn();
        const idToken = googleUser.authentication?.idToken;
        if (!idToken) throw new Error("No ID token returned from Google");

        const res = await fetch("/api/auth/native", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ provider: "google", idToken }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Google sign-in failed");

        await utils.auth.me.invalidate();
        window.location.href = "/";
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Google sign-in failed";
        if (!msg.includes("cancel") && !msg.includes("dismiss")) {
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Web: standard redirect flow
      window.location.href = "/api/auth/google";
    }
  }

  async function handleApple() {
    // On iOS native (Capacitor), use the native Apple Sign-In plugin.
    // On web, fall back to the redirect flow.
    if (Capacitor.isNativePlatform()) {
      setLoading(true);
      setError(null);
      try {
        const { SignInWithApple } = await import("@capacitor-community/apple-sign-in");
        // On iOS native, the Capacitor plugin uses the native ASAuthorizationAppleIDProvider
        // directly — no clientId or redirectURI needed (those are only for the web flow).
        const result = await SignInWithApple.authorize({
          clientId: "com.yogademocracy.ironlab", // bundle ID used by native Apple Sign-In
          redirectURI: "https://ironlab.thisisus.ai/api/auth/apple/callback",
          scopes: "email name",
          state: crypto.randomUUID(),
        });
        const identityToken = result.response?.identityToken;
        if (!identityToken) throw new Error("No identity token returned from Apple");

        const appleUser = result.response?.user
          ? {
              name: {
                givenName: result.response.givenName ?? undefined,
                familyName: result.response.familyName ?? undefined,
              },
            }
          : undefined;

        const res = await fetch("/api/auth/native", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ provider: "apple", identityToken, user: appleUser }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Apple sign-in failed");

        await utils.auth.me.invalidate();
        window.location.href = "/";
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Apple sign-in failed";
        if (!msg.includes("cancel") && !msg.includes("dismiss") && !msg.includes("1001")) {
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Web: standard redirect flow
      window.location.href = "/api/auth/apple";
    }
  }

  // ─── Forgot-sent confirmation screen ──────────────────────────────────────
  if (mode === "forgot-sent") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
        <div
          className="fixed inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.1) 2px,rgba(255,255,255,0.1) 4px)",
          }}
        />
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#ff6b00] mb-4 shadow-lg shadow-orange-500/30">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h2m14 0h2M5 12a7 7 0 1114 0A7 7 0 015 12zm3.5-3.5h5m-5 7h5" />
              </svg>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white" style={{ fontFamily: "'Oswald', sans-serif" }}>
              IRON LAB
            </h1>
          </div>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-3">Check your email</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              If an account exists for <span className="text-white font-medium">{email}</span>, 
              we've sent a password reset link. Check your inbox (and spam folder).
            </p>
            <p className="text-gray-500 text-xs mb-6">The link expires in 1 hour.</p>
            <button
              onClick={() => { setMode("login"); setError(null); }}
              className="text-[#ff6b00] hover:text-orange-400 text-sm font-semibold transition-colors"
            >
              ← Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Forgot password form ──────────────────────────────────────────────────
  if (mode === "forgot") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
        <div
          className="fixed inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.1) 2px,rgba(255,255,255,0.1) 4px)",
          }}
        />
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#ff6b00] mb-4 shadow-lg shadow-orange-500/30">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h2m14 0h2M5 12a7 7 0 1114 0A7 7 0 015 12zm3.5-3.5h5m-5 7h5" />
              </svg>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white" style={{ fontFamily: "'Oswald', sans-serif" }}>
              IRON LAB
            </h1>
            <p className="text-gray-500 text-sm mt-1">Bench Press Tracker</p>
          </div>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Forgot your password?</h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Enter your email and we'll send you a link to reset your password.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00] transition-colors"
                />
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ff6b00] hover:bg-[#e55e00] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all duration-150 active:scale-[0.97] shadow-lg shadow-orange-500/20 mt-2"
              >
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
            <div className="mt-6 text-center">
              <button
                onClick={() => { setMode("login"); setError(null); }}
                className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main login / register form ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.1) 2px,rgba(255,255,255,0.1) 4px)",
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo / header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#ff6b00] mb-4 shadow-lg shadow-orange-500/30">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h2m14 0h2M5 12a7 7 0 1114 0A7 7 0 015 12zm3.5-3.5h5m-5 7h5" />
            </svg>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white" style={{ fontFamily: "'Oswald', sans-serif" }}>
            IRON LAB
          </h1>
          <p className="text-gray-500 text-sm mt-1">Bench Press Tracker</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Tab switcher */}
          <div className="flex rounded-xl bg-[#111] p-1 mb-6">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === m
                    ? "bg-[#ff6b00] text-white shadow-md"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jeff Cannon"
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00] transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00] transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Password
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setError(null); }}
                    className="text-xs text-[#ff6b00] hover:text-orange-400 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "At least 8 characters" : "••••••••"}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00] transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ff6b00] hover:bg-[#e55e00] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all duration-150 active:scale-[0.97] shadow-lg shadow-orange-500/20 mt-2"
            >
              {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-gray-600 text-xs uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Social buttons */}
          <div className="space-y-3">
            <button
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 rounded-xl transition-all duration-150 active:scale-[0.97]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <button
              onClick={handleApple}
              className="w-full flex items-center justify-center gap-3 bg-[#1c1c1e] hover:bg-[#2c2c2e] border border-white/20 text-white font-semibold py-3 rounded-xl transition-all duration-150 active:scale-[0.97]"
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Continue with Apple
            </button>
          </div>

          <p className="text-center text-gray-600 text-xs mt-6">
            By continuing, you agree to our{" "}
            <a href="/terms" className="underline hover:text-gray-400 transition-colors">Terms of Service</a>{" "}and{" "}
            <a href="/privacy" className="underline hover:text-gray-400 transition-colors">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
