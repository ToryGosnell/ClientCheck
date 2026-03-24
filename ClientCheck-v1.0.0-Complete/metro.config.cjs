const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Do not set forceWriteFileSystem: true — it skips css-interop's Metro getSha1 patch and
  // production web export resolves global.css to node_modules/.../.cache/web.css before that
  // file exists, causing "Failed to get the SHA-1" on CI (e.g. Vercel).
});
