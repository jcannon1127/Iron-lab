/**
 * Iron Lab — Privacy Policy
 * Required for Google OAuth production publishing
 */

import { Link } from "wouter";
import { Dumbbell, ArrowLeft } from "lucide-react";

export default function Privacy() {
  const lastUpdated = "July 28, 2026";

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-[#1a1a1a]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-base font-semibold text-foreground leading-none tracking-wide uppercase">Iron Lab</h1>
            <p className="text-xs text-muted-foreground leading-none mt-0.5">Bench Press Tracker</p>
          </div>
          <Link href="/login" className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground uppercase tracking-wide mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        <section className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Iron Lab ("we," "our," or "us") is a bench press workout tracking application operated by Yoga Democracy of AZ LLC. This Privacy Policy explains how we collect, use, and protect your information when you use Iron Lab at <span className="text-foreground">ironlab.thisisus.ai</span>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">Information We Collect</h2>
          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p><span className="text-foreground font-medium">Account information:</span> When you create an account, we collect your email address and a hashed password. If you sign in with Google or Apple, we receive your name, email address, and a unique identifier from those services.</p>
            <p><span className="text-foreground font-medium">Workout data:</span> We store the workout sessions, sets, weights, and rep counts you log in the app. This data is associated with your account.</p>
            <p><span className="text-foreground font-medium">Profile information:</span> You may optionally provide a display name for the leaderboard feature.</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">How We Use Google User Data</h2>
          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>When you sign in with Google, we receive your Google account email address and profile name solely to create and identify your Iron Lab account. We use this data only to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Create and authenticate your Iron Lab account</li>
              <li>Display your name within the app</li>
              <li>Associate your workout data with your account</li>
            </ul>
            <p>We do not share your Google user data with third parties. We do not use your Google data for advertising. Our use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">Data Storage and Security</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your data is stored on a private server hosted by Vultr. Passwords are hashed using bcrypt and never stored in plain text. Session tokens are stored in secure, httpOnly cookies. We use HTTPS for all data transmission.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">Data Sharing</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We do not sell, trade, or share your personal information with third parties, except as required by law. The optional leaderboard feature displays only your chosen display name and workout statistics — never your email address.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">Account Deletion</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You can permanently delete your account and all associated data at any time from within the app: go to Profile Settings → Delete Account. This action is irreversible and removes all workout sessions, sets, templates, personal records, and your account credentials from our servers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">Cookies</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We use a single session cookie (<code className="text-xs bg-border/50 px-1 py-0.5 rounded font-mono">ironlab_session</code>) to keep you logged in. This cookie is httpOnly, Secure, and SameSite=Strict. We do not use advertising or tracking cookies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">Children's Privacy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Iron Lab is not directed at children under 13. We do not knowingly collect personal information from children under 13.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">Contact</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For privacy questions or data requests, contact us at{" "}
            <a href="mailto:jeff@yogademocracy.com" className="text-primary hover:underline">jeff@yogademocracy.com</a>.
          </p>
        </section>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Iron Lab is operated by Yoga Democracy of AZ LLC · <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
