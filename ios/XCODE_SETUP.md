# Iron Lab — Xcode Setup Guide

## Prerequisites
- Xcode 15+ installed
- Apple Developer account (Team ID needed for signing)
- Physical iPhone for HealthKit testing (Simulator does not support HealthKit)

---

## Opening the Project

```bash
cd ios/App
open App.xcodeproj
```

---

## Required Xcode Steps

### 1. Set Your Development Team
- Select the **App** target → **Signing & Capabilities**
- Set **Team** to your Apple Developer account
- Bundle ID: `com.yogademocracy.ironlab`

### 2. Enable HealthKit Capability
- In **Signing & Capabilities**, click **+ Capability**
- Add **HealthKit**
- This automatically links the HealthKit framework

### 3. Confirm the Custom IronLabHealth Plugin
The `IronLabHealthPlugin.swift` file is already included in the **App** target. In the Xcode file navigator, select the file and confirm **Target Membership → App** is checked.

### 4. Build & Run
- Select your iPhone as the target device
- Press **⌘R** to build and run
- On first launch, the app will request HealthKit permissions

---

## Architecture

```
capacitor.config.ts
  └── server.url = "https://ironlab.thisisus.ai"   ← loads live web app
  └── appId = "com.yogademocracy.ironlab"

iOS Plugins (auto-registered via Package.swift):
  ├── @capacitor/status-bar     ← dark status bar
  ├── @capacitor/splash-screen  ← branded splash
  ├── @capacitor/keyboard       ← keyboard resize
  ├── @capacitor/haptics        ← tap feedback
  ├── @capacitor/app            ← app lifecycle
  └── capacitor-health          ← read Apple Health workouts

Custom Native Plugin:
      └── IronLabHealthPlugin.swift ← writes bench and swimming workouts to HealthKit
      JS bridge: registerPlugin("IronLabHealth") in useHealthKit.ts
```

---

## HealthKit Data Flow

**Read** (via `capacitor-health`):
- Permissions: `READ_WORKOUTS`
- Queries past workout sessions from Apple Health

**Write** (via `IronLabHealthPlugin`):
- Permissions: `WRITE_WORKOUTS`
- Activity type: `HKWorkoutActivityType.traditionalStrengthTraining` for bench sessions and `.swimming` for swim sessions
- Saves each completed session with:
  - Start/end time
  - Estimated calories burned (MET × body weight × duration)
  - Metadata: totalVolumeLbs/maxWeightLbs for bench and totalYards for swimming

---

## App Store Submission Checklist

- [ ] Development Team set in Xcode
- [ ] HealthKit capability added
- [ ] Tested on real device (not Simulator)
- [ ] Privacy strings verified in Info.plist:
  - `NSHealthShareUsageDescription`
  - `NSHealthUpdateUsageDescription`
- [ ] App icon: 1024×1024 in `Assets.xcassets/AppIcon.appiconset/`
- [ ] Splash screen: 2732×2732 in `Assets.xcassets/Splash.imageset/`
- [ ] Archive → Distribute App → App Store Connect
