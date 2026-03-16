import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: [
      "tests/phase4-security.test.ts",
      "tests/phase5-fraud-identity.test.ts",
      "tests/fraud-signals-service.test.ts",
      "tests/integration-import-service.test.ts",
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
        "@shared": path.resolve(__dirname, "shared"),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
