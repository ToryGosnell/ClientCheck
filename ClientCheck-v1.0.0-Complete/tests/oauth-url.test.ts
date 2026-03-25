import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "web" },
}));

vi.mock("expo-linking", () => ({
  createURL: vi.fn(() => "clientcheck://oauth/callback"),
  canOpenURL: vi.fn(async () => true),
  openURL: vi.fn(async () => undefined),
}));

const originalEnv = { ...process.env };

async function importOAuthWithEnv(env: Record<string, string | undefined>) {
  vi.resetModules();
  process.env = { ...originalEnv, ...env };
  return import("../constants/oauth");
}

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("OAuth login URL", () => {
  it("builds an encoded OAuth start URL with all required params", async () => {
    const { getLoginUrl } = await importOAuthWithEnv({
      EXPO_PUBLIC_OAUTH_SERVER_URL: "https://oauth.example.com/",
      EXPO_PUBLIC_API_BASE_URL: "https://api.example.com",
      EXPO_PUBLIC_APP_ID: "app 123",
    });

    const redirectUri = "https://api.example.com/api/oauth/callback";
    const state = Buffer.from(redirectUri, "utf-8").toString("base64");

    expect(getLoginUrl({ accountType: "customer plus" })).toBe(
      `https://oauth.example.com/api/oauth/start?appId=${encodeURIComponent("app 123")}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&type=${encodeURIComponent("signIn")}&account_type=${encodeURIComponent("customer plus")}`,
    );
  });

  it("falls back to EXPO_PUBLIC_API_BASE_URL when EXPO_PUBLIC_OAUTH_SERVER_URL is blank", async () => {
    const { getLoginUrl } = await importOAuthWithEnv({
      EXPO_PUBLIC_OAUTH_SERVER_URL: "",
      EXPO_PUBLIC_API_BASE_URL: "https://api.example.com",
      EXPO_PUBLIC_APP_ID: "app-123",
    });

    expect(getLoginUrl()).toContain("https://api.example.com/api/oauth/start?");
  });

  it("throws a readable error when required OAuth config is missing", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getLoginUrl } = await importOAuthWithEnv({
      EXPO_PUBLIC_OAUTH_SERVER_URL: "",
      EXPO_PUBLIC_API_BASE_URL: "https://api.example.com",
      EXPO_PUBLIC_APP_ID: "",
    });

    expect(() => getLoginUrl()).toThrow("OAuth configuration is incomplete");
    expect(errorSpy).toHaveBeenCalled();
  });
});
