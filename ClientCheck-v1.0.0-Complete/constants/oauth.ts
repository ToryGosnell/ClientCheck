import * as Linking from "expo-linking";
import * as ReactNative from "react-native";

const schemeFromBundleId = "clientcheck";

const env = {
  portal: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  server: process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: process.env.EXPO_PUBLIC_APP_ID ?? "",
  ownerId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? "",
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? "",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  deepLinkScheme: schemeFromBundleId,
};

export const OAUTH_PORTAL_URL = env.portal;
export const OAUTH_SERVER_URL = env.server;
export const APP_ID = env.appId;
export const OWNER_OPEN_ID = env.ownerId;
export const OWNER_NAME = env.ownerName;
export const API_BASE_URL = env.apiBaseUrl;

/**
 * Resolve the web origin (protocol + host) for building absolute URLs.
 * Falls back to the production API URL when running outside a browser.
 */
function getWebOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.EXPO_PUBLIC_API_BASE_URL || "https://clientcheck-production.up.railway.app";
}

/**
 * Get the API base URL, deriving from current hostname if not set.
 * Always returns an absolute URL — never an empty string.
 */
export function getApiBaseUrl(): string {
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }

  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) {
      return `${protocol}//${apiHostname}`;
    }
    // Same host — API is co-located or proxied; use current origin
    return window.location.origin;
  }

  return process.env.EXPO_PUBLIC_API_BASE_URL || "https://clientcheck-production.up.railway.app";
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
 * Otherwise resolve it against `base` (or the current web origin).
 */
function safeUrl(input: string, base?: string): URL | null {
  if (!input) return null;
  try {
    return new URL(input);
  } catch {
    try {
      return new URL(input, base || getWebOrigin());
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

export const getLoginUrl = () => {
  const redirectUri = getRedirectUri();
  const state = encodeState(redirectUri);

  const portalBase = OAUTH_PORTAL_URL || getApiBaseUrl();
  const url = safeUrl(`${portalBase}/app-auth`);
  if (!url) {
    console.warn("[OAuth] Cannot build login URL — OAUTH_PORTAL_URL is not configured.");
    return `${getWebOrigin()}/oauth/callback?error=misconfigured`;
  }

  url.searchParams.set("appId", APP_ID);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

/**
 * Start OAuth login flow.
 */
export async function startOAuthLogin(): Promise<string | null> {
  const loginUrl = getLoginUrl();

  if (ReactNative.Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.location.href = loginUrl;
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
  } catch (error) {
    console.warn("[OAuth] Failed to open login URL:", error);
  }

  return null;
}
