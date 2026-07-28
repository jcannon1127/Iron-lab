/**
 * Iron Lab — Reset Password page
 * Accessed via link in password reset email: /reset-password?token=...
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

type State = "form" | "loading" | "success" | "error";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<State>("form");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) {
      setErrorMsg("Missing reset token. Please request a new password reset link.");
      setState("error");
    } else {
      setToken(t);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setState("loading");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setErrorMsg(data.error ?? "Failed to reset password. Please try again.");
        setState("form");
        return;
      }
      setState("success");
    } catch {
      setErrorMsg("Network error — please try again.");
      setState("form");
    }
  }

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
        {/* Logo */}
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
          {/* Success state */}
          {state === "success" && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-3">Password updated!</h2>
              <p className="text-gray-400 text-sm mb-6">
                Your password has been reset and you're now signed in.
              </p>
              <button
                onClick={() => navigate("/")}
                className="w-full bg-[#ff6b00] hover:bg-[#e55e00] text-white font-bold py-3 rounded-xl transition-all duration-150 active:scale-[0.97]"
              >
                Go to Iron Lab →
              </button>
            </div>
          )}

          {/* Error state (bad/missing token) */}
          {state === "error" && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-3">Link invalid or expired</h2>
              <p className="text-gray-400 text-sm mb-6">{errorMsg}</p>
              <button
                onClick={() => navigate("/login")}
                className="w-full bg-[#ff6b00] hover:bg-[#e55e00] text-white font-bold py-3 rounded-xl transition-all duration-150 active:scale-[0.97]"
              >
                Request a new link
              </button>
            </div>
          )}

          {/* Form state */}
          {(state === "form" || state === "loading") && (
            <>
              <h2 className="text-lg font-bold text-white mb-2">Set a new password</h2>
              <p className="text-gray-400 text-sm mb-6">
                Choose a strong password for your Iron Lab account.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    disabled={state === "loading"}
                    className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00] transition-colors disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    disabled={state === "loading"}
                    className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#ff6b00] focus:ring-1 focus:ring-[#ff6b00] transition-colors disabled:opacity-50"
                  />
                </div>
                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                    {errorMsg}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={state === "loading"}
                  className="w-full bg-[#ff6b00] hover:bg-[#e55e00] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all duration-150 active:scale-[0.97] shadow-lg shadow-orange-500/20 mt-2"
                >
                  {state === "loading" ? "Updating…" : "Set New Password"}
                </button>
              </form>
              <div className="mt-6 text-center">
                <button
                  onClick={() => navigate("/login")}
                  className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                >
                  ← Back to Sign In
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
