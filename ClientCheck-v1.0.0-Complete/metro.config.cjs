const { withNativeWind } = require("nativewind/metro");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

const nativeWindConfig = withNativeWind(config, {
  input: "./global.css",
  // Do not set forceWriteFileSystem: true — it skips css-interop's Metro getSha1 patch and
  // production web export resolves global.css to node_modules/.../.cache/web.css before that
  // file exists, causing "Failed to get the SHA-1" on CI (e.g. Vercel).
});

module.exports = nativeWindConfig;
