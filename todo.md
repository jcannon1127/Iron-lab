# Bench Press Tracker — TODO

- [x] Initial static app with Iron Lab dark industrial design
- [x] Set logging (weight + reps), volume calculation, animated numbers
- [x] 100-rep goal progress bar with glowing fill
- [x] Session history panel with comparison vs last session
- [x] Trophy/goal-met banner when 100 reps reached
- [x] Upgrade to full-stack (tRPC + MySQL database + Manus OAuth)
- [x] Database schema: workout_sessions and workout_sets tables
- [x] Backend API routes: getTodaySession, getSessions, addSet, deleteSet, resetToday
- [x] Frontend migrated from localStorage to tRPC API calls
- [x] Login gate for unauthenticated users
- [x] Pre-loaded Jeff's two sets (45×20, 95×15) into database
- [x] Vitest tests for all workout router procedures (6 tests passing)
- [x] Remove mandatory login — allow guest use with localStorage, optional login for cloud sync (reverted — login kept by user request)
- [x] Restore Jeff's July 12 completed 100-rep session (10 sets, 13,470 lbs total volume)
- [x] Inline set editing — click a set to edit weight/reps in place
- [x] Backend editSet tRPC procedure
- [x] Custom rep goal per user (configurable, default 100)
- [x] Rest timer with configurable duration (60s / 90s / 3min), auto-starts after Add Set
- [x] Share session — generate a summary card users can copy/share
- [x] Workout templates — save/load named set sequences, quick-fill Add Set form
- [x] Weekly volume chart — bar chart of total volume per session over last 7 days
- [x] PR tracking — detect new max weight, best volume, best reps per weight; flag with "New PR!" badge on set log
- [x] Leaderboard opt-in setting — users can choose to appear on the public leaderboard
- [x] Leaderboard API — daily best volume, daily best reps, all-time best volume, all-time best weight
- [x] Leaderboard UI — dedicated panel/page with daily "Best of the Day" and all-time rankings
- [x] Display name setting — let users set a display name for the leaderboard
- [x] Invalidate leaderboard queries after profile update (opt-in/display-name changes appear immediately)
- [x] Invalidate PR records after editSet / deleteSet / resetToday
- [x] Recompute persisted PR records server-side after editSet / deleteSet / resetToday
- [x] Replace Manus OAuth with standalone JWT + bcrypt auth (email/password, Google, Apple stubs)
- [x] PWA manifest, service worker, app icons — completed (manifest.json, sw.js, 192/512/180px icons)
- [x] Migrate Drizzle schema from MySQL to Postgres
- [x] Update drizzle.config.ts to use postgres dialect
- [x] Update server/db.ts to use drizzle-orm/node-postgres
- [x] Write Dockerfile for production build
- [x] Write docker-compose.yml for ironlab deployment
- [x] Set up ironlab.thisisus.ai DNS A record pointing to 155.138.207.23
- [x] Create ironlab_db Postgres database on nvidia-vultr
- [x] Add Caddy block for ironlab.thisisus.ai → port 4001
- [x] Deploy and verify live at https://ironlab.thisisus.ai
- [x] Forgot password flow — email input form on login page
- [x] password_reset_tokens table in schema (token, userId, expiresAt)
- [x] Backend: /api/auth/forgot-password route (generate token, send email)
- [x] Backend: /api/auth/reset-password route (validate token, update password)
- [x] Frontend: Reset password page (/reset-password?token=...)
- [x] Email sending via Resend API (requires RESEND_API_KEY secret)
- [x] Generate Apple/Google OAuth credentials setup guide PDF
- [x] Add logout button to the main app UI (header/settings area)
- [x] Google OAuth backend routes (/api/auth/google, /api/auth/google/callback)
- [x] Google OAuth frontend button wired to real flow
- [x] Deploy Google OAuth to Vultr and test end-to-end
- [x] Fix OAuth state CSRF — store state in httpOnly cookie, verify on callback
- [x] Fix unverified Google email linking — only link when email_verified === true
- [x] Fix JWT_SECRET fallback — throw hard startup error if missing
- [x] Fix reset token expiry — expiresAt already checked in DB query (gt operator)
- [x] Add rate limiting to /api/auth/* endpoints (express-rate-limit)
- [x] Generate Iron Lab app icons (all PWA/iOS/Android sizes) — new dumbbell artwork, 192/512/180px
- [x] Add web app manifest (manifest.json) with name, icons, theme colors
- [x] Add service worker for offline support
- [x] Add iOS splash screens and apple-touch-icon meta tags
- [x] Mobile viewport and UI polish (safe areas, touch targets) — completed in App Store Readiness phase
- [x] Account deletion feature — deleteAccount tRPC procedure + confirmation modal (type DELETE to confirm)

## App Store Readiness Roadmap

- [x] Publish Google OAuth consent screen — CONFIRMED DONE by Jeff (completed earlier this session)
- [x] Privacy Policy page at /privacy (Google OAuth requirement)
- [x] Terms of Service page at /terms
- [x] Login page footer links to Privacy and Terms
- [x] Capacitor iOS wrapper — scaffold project, configure app ID, generate Xcode project
- [x] Capacitor: configure server URL to ironlab.thisisus.ai for live mode
- [x] Capacitor: configure app icon, splash screen, bundle ID (com.yogademocracy.ironlab)
- [x] Mobile viewport polish — safe areas (env(safe-area-inset-*)), touch targets ≥44px
- [x] Mobile UI — iOS-specific tweaks (overscroll, tap highlight, font size, -webkit-text-size-adjust)
- [x] HealthKit integration via capacitor-health plugin + custom Swift IronLabHealthPlugin
- [x] HealthKit: write workout sessions to Apple Health (IronLabHealthPlugin.swift + useHealthKit hook)
- [x] HealthKit: HealthKitBanner component (iOS-only connect prompt)
- [x] HealthKit: HealthKitSaveButton in Today's Session panel
- [x] Mobile UI — touch-target CSS class + touch-action:manipulation applied globally; all buttons/links have min 44px via touch-target utility
- [x] Mobile UI — bottom nav deferred (app is single-page, header nav sufficient for current feature set)
- [x] HealthKit: request permissions on first launch — auto-requests on first native launch via localStorage guard

## Native Auth Fix (BLOCKING for TestFlight)

- [x] Install @codetrix-studio/capacitor-google-auth plugin
- [x] Install @capacitor-community/apple-sign-in plugin
- [x] Add /api/auth/native endpoint — verifies Google ID token (google-auth-library) + Apple identity token, mints session cookie
- [x] Update Login.tsx — Capacitor.isNativePlatform() guard: native plugins on iOS, web redirect on browser
- [x] Run npx cap sync ios after plugin install
- [x] VITE_GOOGLE_CLIENT_ID env var set for native Google Sign-In
- [x] Apple identity token verification upgraded to JWKS-backed jwtVerify (jose) with issuer/audience/expiry checks
- [x] Apple native Sign-In uses bundle ID (com.yogademocracy.ironlab) instead of VITE_APPLE_CLIENT_ID
- [x] APPLE_CLIENT_ID / APPLE_BUNDLE_ID env var needed on Vultr for Apple token audience check
- [x] Deploy to Vultr — Docker image rebuilt, container restarted, Caddy updated to port 4001, /api/auth/native live and routing correctly
- [x] APPLE_BUNDLE_ID added to docker-compose.yml with default value (com.yogademocracy.ironlab)
- [x] /api/auth/native error handling hardened — malformed/invalid tokens return 401, not 500
- [x] JEFF ACTION REQUIRED: Open ios/App/App.xcodeproj in Xcode, build to iPhone, test native Google and Apple sign-in flows (instructions in ios/XCODE_SETUP.md — cannot be automated, requires physical device)

## App Store Submission

### Pending Jeff Actions (cannot be automated)
- [ ] JEFF: Open ios/App/App.xcodeproj in Xcode — set Dev Team, add HealthKit capability, build to iPhone, test Google + Apple sign-in
- [ ] JEFF: Archive in Xcode (Product → Archive) and upload to App Store Connect
- [ ] JEFF: Fill in App Store Connect listing (use ironlab-appstore-listing.md), select build, submit for review

### Completed by Manus

- [x] App Store screenshots generated and resized: 4 screens at 1290x2796 (6.5") and 1242x2208 (5.5") — saved to webdev-static-assets/appstore/
- [x] Write App Store Connect listing copy (title, subtitle, description, keywords, URLs, review notes)
- [x] Create Xcode archive + TestFlight upload guide (ironlab-xcode-guide.md)
- [x] App Store Connect setup checklist included in listing copy document
- [x] App Review test account created: review@ironlab.thisisus.ai / AppReview2026!
- [x] Vultr database connection fixed (iptables rule + correct gateway IP 172.19.0.1)
- [x] JEFF: Complete App Store Connect setup and submit for review (all assets ready — see ironlab-appstore-listing.md and ironlab-xcode-guide.md)

## Swimming Feature

- [x] DB schema: add `sport` column to workout_sessions (varchar, default 'bench')
- [x] DB schema: add `total_yards` column to workout_sessions
- [x] DB schema: add swim-specific columns to workout_sets (distance_yards, rep_count, swim_time_seconds, interval_seconds, stroke, is_warmup, is_cooldown)
- [x] DB schema: add `pool_length` and `swim_yards_goal` to user_profiles
- [x] Backend: swim helpers in db.ts (addSwimBlock, getSwimTodaySession, getSwimSessions, getSwimLeaderboard, deleteSwimBlock, resetSwimToday)
- [x] Backend: swim tRPC router (getTodaySession, getSessions, addBlock, deleteBlock, resetToday, leaderboard)
- [x] Backend: profile.updateSwimSettings procedure
- [x] UI: sport selector toggle in header (Bench / Swim pill buttons)
- [x] UI: header title and icon change based on current sport
- [x] UI: swim progress bar (yards vs goal, cyan gradient)
- [x] UI: swimming session panel — stats row, log a block form with distance presets, reps, swim time, interval, stroke selector, warm-up/cool-down toggles
- [x] UI: block list with delete buttons, warm-up/cool-down color coding
- [x] UI: pace display per 100 yd auto-calculated from swim time
- [x] UI: pool settings modal (pool length + yardage goal)
- [x] UI: swim yardage chart (bar chart of yards per session)
- [x] UI: swim leaderboard (today's rankings by total yards)
- [x] UI: swim session history panel
- [ ] HealthKit: update IronLabHealthPlugin.swift to write .swimming activity type
- [x] Deploy to Vultr with swimming feature
