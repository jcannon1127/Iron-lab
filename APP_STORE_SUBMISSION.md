# Iron Lab — App Store Submission Brief

## Product Details

| Field | Submission value |
|---|---|
| App name | Iron Lab |
| Bundle ID | `com.yogademocracy.ironlab` |
| Primary category | Health & Fitness |
| Secondary category | Sports |
| Suggested subtitle | Track bench press & swims |
| Suggested keywords | bench press,workout tracker,swimming,lap swim,strength training,gym,fitness,training log |
| Support URL | `https://ironlab.thisisus.ai/terms` |
| Privacy Policy URL | `https://ironlab.thisisus.ai/privacy` |

## Promotional Text

Log bench press sessions and pool workouts in one focused training tracker. Follow volume, reps, yardage, pacing, session history, and personal bests without clutter.

## Full Description

Iron Lab is a focused workout tracker for people who train with the barbell and in the pool.

Track bench press sessions set by set, including weight, reps, total volume, session goals, personal records, and progress over time. When it is time to swim, switch to Swimming mode to log warmups, intervals, main sets, cooldowns, strokes, pool length, total yardage, and pace.

Iron Lab supports two ways to log: use **Live Workout** when you want a rest timer between sets, or use **Log Past Workout** to enter a completed session without the timer. Your history, goals, and progress remain organized by sport and date.

Optional Apple Health integration lets you save completed bench sessions as strength-training workouts and completed pool sessions as swimming workouts. Iron Lab uses email/password, Google, or Apple Sign In for secure account access.

## What’s New (Version 1.0)

- Bench press tracking with set-level logging, volume, goals, personal records, and session history.
- Swimming mode with yardage goals, pool-length settings, interval entry, stroke tracking, and pace calculation.
- Live Workout and Log Past Workout modes.
- Optional Apple Health saves for strength and swimming workouts.
- Native Sign in with Apple and Google sign-in support on iPhone.

## App Review Notes

Iron Lab is a workout tracker for bench press and swimming. Users can create an account with email/password or use Apple/Google sign-in. Apple Health access is optional and used only after the user chooses to connect or save a workout. The app requests HealthKit permission only to read and write workout records; it does not sell HealthKit information or use it for advertising.

Before upload, confirm the reviewer account details in App Store Connect are current and that the current iOS build has been tested with a physical iPhone. Do not place passwords in this repository or public App Store fields.

## Final Xcode Checklist

1. Open `ios/App/App.xcodeproj` on a Mac running Xcode.
2. Choose the **App** target and select Jeff’s Apple Developer Team under **Signing & Capabilities**.
3. Confirm the bundle identifier is `com.yogademocracy.ironlab`.
4. Confirm **HealthKit** appears under Signing & Capabilities and that `App/App.entitlements` is selected as the code-signing entitlement file.
5. Confirm `IronLabHealthPlugin.swift` is in the **App** target membership.
6. Build and run on a physical iPhone. Test email/password, native Google, native Apple, bench HealthKit save, and swim HealthKit save.
7. Set a unique build number under **General → Identity** before every App Store Connect upload.
8. Archive the Release build, choose **Distribute App → App Store Connect → Upload**, then wait for processing.
9. In App Store Connect, create the version, enter the listing values above, upload the required screenshots, complete App Privacy, and submit for review.
