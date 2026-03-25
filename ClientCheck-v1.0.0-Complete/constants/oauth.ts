import * as Linking from "expo-linking";
import * as ReactNative from "react-native";

const schemeFromBundleId = "clientcheck";

/** Hardcoded API host — all REST, tRPC, and web OAuth callback URLs use this (no env / no relative origins). */
export const API_BASE = "https://clientcheck-production.up.railway.app";

const env = {
  portal: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  server: process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: process.env.EXPO_PUBLIC_APP_ID ?? "",
  ownerId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? "",
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? "",
  deepLinkScheme: schemeFromBundleId,
};

export const OAUTH_PORTAL_URL = env.portal;
export const OAUTH_SERVER_URL = env.server;
export const APP_ID = env.appId;
export const OWNER_OPEN_ID = env.ownerId;
export const OWNER_NAME = env.ownerName;

export function getApiBaseUrl(): string {
  return API_BASE.replace(/\/$/, "");
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";

const encodeState = (value: string) => {
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(value);
  }
  const BufferImpl = (globalThis as Record<string, any>).Buffer;
  if (BufferImpl) {
    return BufferImpl.from(value, "utf-8").toString("base64");
  }
  return value;
};

/**
 * Build an absolute URL safely. If `input` is already absolute, use it directly.
 * Otherwise resolve it against the API base (no window / relative app origin).
 */
function safeUrl(input: string, base?: string): URL | null {
  if (!input) return null;
  try {
    return new URL(input);
  } catch {
    try {
      return new URL(input, base || getApiBaseUrl());
    } catch {
      return null;
    }
  }
}

/**
 * Get the redirect URI for OAuth callback.
 */
export const getRedirectUri = () => {
  if (ReactNative.Platform.OS === "web") {
    return `${getApiBaseUrl()}/api/oauth/callback`;
  }
  return Linking.createURL("/oauth/callback", {
    scheme: env.deepLinkScheme,
  });
};

function getOAuthStartBase(): string | null {
  const candidate = OAUTH_SERVER_URL || getApiBaseUrl();
  if (!candidate) return null;
  const url = safeUrl(candidate);
  return url?.toString().replace(/\/$/, "") ?? null;
}

export const getLoginUrl = (options?: { accountType?: string }): string | null => {
  const redirectUri = getRedirectUri();
  const state = encodeState(redirectUri);

  const startBase = getOAuthStartBase();
  if (!startBase) {
    console.warn("[OAuth] Cannot build login URL — configure EXPO_PUBLIC_OAUTH_SERVER_URL.");
    return null;
  }

  const url = safeUrl(`${startBase}/api/oauth/start`);
  if (!url) {
    console.warn("[OAuth] Cannot build login URL from configured OAuth server URL.");
    return null;
  }

  url.searchParams.set("appId", APP_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  if (options?.accountType) {
    url.searchParams.set("account_type", options.accountType);
  }

  return url.toString();
};

/**
 * Start OAuth login flow.
 */
export async function startOAuthLogin(options?: { accountType?: string }): Promise<string | null> {
  const loginUrl = getLoginUrl(options);
  if (!loginUrl) return null;

  if (ReactNative.Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.location.href = loginUrl;
      return loginUrl;
    }
    return null;
  }

  try {
    const supported = await Linking.canOpenURL(loginUrl);
    if (!supported) {
      console.warn("[OAuth] Cannot open login URL: URL scheme not supported");
      return null;
    }
    await Linking.openURL(loginUrl);
    return loginUrl;
  } catch (error) {
    console.warn("[OAuth] Failed to open login URL:", error);
  }

  return null;
}
