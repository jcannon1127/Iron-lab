import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.yogademocracy.ironlab",
  appName: "Iron Lab",
  webDir: "dist/client",
  // In production, load the live server so users always get the latest version
  // without needing an App Store update. Comment this out for fully offline builds.
  server: {
    url: "https://ironlab.thisisus.ai",
    cleartext: false,
    // Allow navigation within the app
    allowNavigation: ["ironlab.thisisus.ai"],
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#0f0f0f",
    // Scroll behavior
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0f0f0f",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "Dark",
      backgroundColor: "#0f0f0f",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "body",
      style: "dark",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
