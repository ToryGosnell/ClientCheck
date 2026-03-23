import * as Linking from "expo-linking";
import * as ReactNative from "react-native";

const schemeFromBundleId = "clientcheck";

/** Hardcoded production API — deployed web must hit Railway (not static host origin). Local dev still uses localhost below. */
export const PRODUCTION_API_BASE_URL = "https://clientcheck-production.up.railway.app";

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
 * Base URL for resolving relative links on web. Non-local browsers use the API host, not the static app origin.
 */
function getWebOrigin(): string {
  if (typeof window !== "undefined" && window.location?.hostname) {
    if (isLocalWebDevHostname(window.location.hostname)) {
      return window.location.origin;
    }
  }
  return PRODUCTION_API_BASE_URL;
}

/** True when the web app is clearly running on local dev (API may be same origin or proxied). */
function isLocalWebDevHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    hostname.endsWith(".local")
  );
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
    if (isLocalWebDevHostname(hostname)) {
      const apiHostname = hostname.replace(/^8081-/, "3000-");
      if (apiHostname !== hostname) {
        return `${protocol}//${apiHostname}`;
      }
      return window.location.origin;
    }
  }

  return PRODUCTION_API_BASE_URL;
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
