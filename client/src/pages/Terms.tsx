/**
 * Iron Lab — Terms of Service
 */

import { Link } from "wouter";
import { Dumbbell, ArrowLeft } from "lucide-react";

export default function Terms() {
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
          <h1 className="font-display text-3xl font-bold text-foreground uppercase tracking-wide mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        <section className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            By using Iron Lab ("the app") at <span className="text-foreground">ironlab.thisisus.ai</span>, you agree to these Terms of Service. Iron Lab is operated by Yoga Democracy of AZ LLC.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">Use of the App</h2>
          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>Iron Lab is a personal workout tracking tool. You may use it to log bench press sessions, track personal records, and optionally participate in the leaderboard.</p>
            <p>You agree not to use the app to: (a) violate any laws, (b) attempt to gain unauthorized access to other accounts or our servers, (c) submit false or misleading data, or (d) interfere with the app's operation.</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">Your Account</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You are responsible for maintaining the security of your account credentials. You may delete your account at any time from within the app. Upon deletion, all your data is permanently removed from our servers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">Your Data</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You own your workout data. We store it to provide the service. See our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for details on how we handle your data.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">Leaderboard</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The leaderboard is opt-in. If you choose to participate, your display name and workout statistics will be visible to other users. You can opt out at any time from Profile Settings.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">Disclaimer</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Iron Lab is provided "as is" without warranty of any kind. We are not responsible for any injuries or health issues arising from workouts logged in the app. Always consult a qualified fitness professional before beginning a new exercise program.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">Changes</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update these terms from time to time. Continued use of the app after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground uppercase tracking-wide">Contact</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Questions? Contact us at{" "}
            <a href="mailto:jeff@yogademocracy.com" className="text-primary hover:underline">jeff@yogademocracy.com</a>.
          </p>
        </section>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Iron Lab is operated by Yoga Democracy of AZ LLC · <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
