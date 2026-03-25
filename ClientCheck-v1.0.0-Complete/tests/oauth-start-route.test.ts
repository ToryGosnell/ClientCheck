import express from "express";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";

const { authorizeRedirectMock } = vi.hoisted(() => ({
  authorizeRedirectMock: vi.fn(),
}));

vi.mock("../server/db", () => ({
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
}));

vi.mock("../server/_core/sdk", () => ({
  sdk: {
    getAuthorizationRedirectUrl: authorizeRedirectMock,
  },
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
  authorizeRedirectMock.mockReset();
});

describe("/api/oauth/start", () => {
  it("redirects directly to the OAuth provider authorize URL", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    authorizeRedirectMock.mockResolvedValue(
      "https://oauth.example.com/authorize?client_id=test-app&state=test-state",
    );
    const server = await startOAuthTestServer({
      OAUTH_SERVER_URL: "https://oauth.example.com",
      EXPO_PUBLIC_OAUTH_SERVER_URL: "",
    });

    try {
      const response = await fetch(
        `${server.baseUrl}/api/oauth/start?appId=test-app&redirect_uri=${encodeURIComponent("https://clientcheck-production.up.railway.app/api/oauth/callback")}&state=test-state&type=signIn&account_type=customer`,
        { redirect: "manual" },
      );

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(
        "https://oauth.example.com/authorize?client_id=test-app&state=test-state",
      );
      expect(authorizeRedirectMock).toHaveBeenCalledWith({
        appId: "test-app",
        redirectUri: "https://clientcheck-production.up.railway.app/api/oauth/callback",
        state: "test-state",
      });
      expect(consoleLog).toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("returns structured JSON when the upstream authorize step fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    authorizeRedirectMock.mockRejectedValue(new Error("upstream authorize failed"));
    const server = await startOAuthTestServer({
      OAUTH_SERVER_URL: "https://oauth.example.com",
      EXPO_PUBLIC_OAUTH_SERVER_URL: "",
    });

    try {
      const response = await fetch(
        `${server.baseUrl}/api/oauth/start?appId=test-app&redirect_uri=${encodeURIComponent("https://clientcheck-production.up.railway.app/api/oauth/callback")}&state=test-state&type=signIn`,
      );

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "OAuth authorize failed",
        message: "upstream authorize failed",
      });
      expect(consoleError).toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("returns JSON with a safe message when OAUTH_SERVER_URL is missing", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const server = await startOAuthTestServer({
      OAUTH_SERVER_URL: "",
      EXPO_PUBLIC_OAUTH_SERVER_URL: "https://oauth.example.com",
    });

    try {
      const response = await fetch(
        `${server.baseUrl}/api/oauth/start?appId=test-app&redirect_uri=${encodeURIComponent("https://clientcheck-production.up.railway.app/api/oauth/callback")}&state=test-state&type=signIn`,
      );

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "OAuth start failed",
        message: "OAUTH_SERVER_URL is not configured",
      });
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });
});
