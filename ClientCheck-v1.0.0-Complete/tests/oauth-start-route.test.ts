import express from "express";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/db", () => ({
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
}));

vi.mock("../server/_core/sdk", () => ({
  sdk: {},
}));

const originalEnv = { ...process.env };

async function startOAuthTestServer(env: Record<string, string | undefined>) {
  vi.resetModules();
  process.env = { ...originalEnv, ...env };
  const { registerOAuthRoutes } = await import("../server/_core/oauth");
  const app = express();
  registerOAuthRoutes(app);

  const server = await new Promise<import("node:http").Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    async close() {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("/api/oauth/start", () => {
  it("redirects using EXPO_PUBLIC_OAUTH_SERVER_URL when server-only env vars are absent", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const server = await startOAuthTestServer({
      OAUTH_PORTAL_URL: "",
      OAUTH_SERVER_URL: "",
      EXPO_PUBLIC_OAUTH_PORTAL_URL: "",
      EXPO_PUBLIC_OAUTH_SERVER_URL: "https://oauth.example.com",
    });

    try {
      const response = await fetch(
        `${server.baseUrl}/api/oauth/start?appId=test-app&redirect_uri=${encodeURIComponent("https://clientcheck-production.up.railway.app/api/oauth/callback")}&state=test-state&type=signIn&account_type=customer`,
        { redirect: "manual" },
      );

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(
        "https://oauth.example.com/app-auth?appId=test-app&redirectUri=https%3A%2F%2Fclientcheck-production.up.railway.app%2Fapi%2Foauth%2Fcallback&state=test-state&type=signIn&account_type=customer",
      );
      expect(consoleLog).toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("returns JSON with a safe message when OAuth start is misconfigured", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const server = await startOAuthTestServer({
      OAUTH_PORTAL_URL: "",
      OAUTH_SERVER_URL: "",
      EXPO_PUBLIC_OAUTH_PORTAL_URL: "",
      EXPO_PUBLIC_OAUTH_SERVER_URL: "",
    });

    try {
      const response = await fetch(
        `${server.baseUrl}/api/oauth/start?appId=test-app&redirect_uri=${encodeURIComponent("https://clientcheck-production.up.railway.app/api/oauth/callback")}&state=test-state&type=signIn`,
      );

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "OAuth start failed",
        message: "OAuth start route is misconfigured",
      });
      expect(consoleError).toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });
});
