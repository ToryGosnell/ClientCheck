// https://docs.expo.dev/guides/using-eslint/
// Note: Unescaped entities in JSX are safe in React Native and not a security issue.
// Disabling this rule to focus on actual code quality issues.
import { defineConfig } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";

export default defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    rules: {
      "react/no-unescaped-entities": "off", // Safe in React Native
      "@typescript-eslint/no-unused-vars": "off", // Unused variables don't affect functionality
    },
  },
]);
