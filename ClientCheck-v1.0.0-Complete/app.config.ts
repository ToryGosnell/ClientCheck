// Load environment variables (CJS loader works in EAS/Node config context)
import "./scripts/load-env.cjs";
import type { ExpoConfig } from "expo/config";

// Android package / iOS bundle ID. Must be unique on Play Store (e.g. com.yourcompany.clientcheck).
// Only letters, numbers, and dots; each segment must start with a letter.
const rawBundleId = "com.torygosnell.clientcheck";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") // Replace hyphens/underscores with dots
    .replace(/[^a-zA-Z0-9.]/g, "") // Remove invalid chars
    .replace(/\.+/g, ".") // Collapse consecutive dots
    .replace(/^\.+|\.+$/g, "") // Trim leading/trailing dots
    .toLowerCase()
    .split(".")
    .map((segment) => {
      // Android requires each segment to start with a letter
      // Prefix with 'x' if segment starts with a digit
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "space.manus.app";
// Extract timestamp from bundle ID and prefix with "manus" for deep link scheme
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `clientcheck`;

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "ClientCheck",
  appSlug: "clientcheck",
  // S3 URL of the app logo - set this to the URL returned by generate_image when creating custom logo
  // Leave empty to use the default icon from assets/images/icon.png
  logoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663431665515/EkeHHMMWrNDmuayMUAjuP3/clientcheck-icon-akvPu3BjwSNfHsFFphSGqa.webp",
  scheme: "clientcheck",
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  extra: {
    eas: {
      projectId: "49fc9313-847c-466c-aa77-7f9b6a6af02d",
    },
  },
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false,
        "NSPhotoLibraryUsageDescription": "ClientCheck needs access to your photos to upload profile pictures."
      }
  },
  android: {
    // Bump versionCode for each new Play Store upload (e.g. 2, 3, …).
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: false,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: ["POST_NOTIFICATIONS", "INTERNET", "READ_PHONE_STATE"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          minSdkVersion: 24,
          targetSdkVersion: 36,
          compileSdkVersion: 36,
          buildToolsVersion: "36.0.0",
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          enableProguardInReleaseBuilds: false,
        },
      },
    ],
    "expo-notifications",
    "@stripe/stripe-react-native",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: false,
  },
};

export default config;
