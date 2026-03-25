import * as Linking from "expo-linking";
import * as ReactNative from "react-native";

const schemeFromBundleId = "clientcheck";

/** Hardcoded API host — all REST, tRPC, and web OAuth callback URLs use this (no env / no relative origins). */
const DEFAULT_API_BASE = "https://clientcheck-production.up.railway.app";

const env = {
  portal: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  server: process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  apiBase: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  appId: process.env.EXPO_PUBLIC_APP_ID ?? "",
  ownerId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? "",
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? "",
  deepLinkScheme: schemeFromBundleId,
};

export const OAUTH_PORTAL_URL = env.portal;
export const OAUTH_SERVER_URL = env.server;
export const API_BASE = (env.apiBase || DEFAULT_API_BASE).replace(/\/$/, "");
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

const trimToNull = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
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
  const candidate = trimToNull(OAUTH_SERVER_URL) || trimToNull(getApiBaseUrl());
  if (!candidate) return null;
  const url = safeUrl(candidate);
  return url?.toString().replace(/\/$/, "") ?? null;
}

type OAuthLoginRequest = {
  serverBase: string;
  appId: string;
  redirectUri: string;
  state: string;
  type: "signIn";
  accountType: string | null;
  url: string;
};

function buildOAuthLoginRequest(options?: { accountType?: string }): OAuthLoginRequest {
  const startBase = getOAuthStartBase();
  if (!startBase) {
    console.error("[OAuth] Missing OAuth server base", {
      oauthServerUrl: OAUTH_SERVER_URL,
      apiBase: getApiBaseUrl(),
    });
    throw new Error("OAuth configuration is incomplete");
  }

  const appId = trimToNull(APP_ID) ?? "";
  const redirectUri = trimToNull(getRedirectUri()) ?? "";
  const state = trimToNull(redirectUri ? encodeState(redirectUri) : "") ?? "";
  const type = "signIn" as const;
  const accountType = trimToNull(options?.accountType);

  const missingValues = {
    appId: appId.length === 0,
    redirectUri: redirectUri.length === 0,
    state: state.length === 0,
  };

  if (missingValues.appId || missingValues.redirectUri || missingValues.state) {
    console.error("[OAuth] Missing required config", {
      appId,
      redirectUri,
      state,
      missingValues,
    });
    throw new Error("OAuth configuration is incomplete");
  }

  const queryParts = [
    `appId=${encodeURIComponent(appId)}`,
    `redirect_uri=${encodeURIComponent(redirectUri)}`,
    `state=${encodeURIComponent(state)}`,
    `type=${encodeURIComponent(type)}`,
  ];
  if (accountType) {
    queryParts.push(`account_type=${encodeURIComponent(accountType)}`);
  }

  return {
    serverBase: startBase,
    appId,
    redirectUri,
    state,
    type,
    accountType,
    url: `${startBase}/api/oauth/start?${queryParts.join("&")}`,
  };
}

export const getLoginUrl = (options?: { accountType?: string }): string => {
  return buildOAuthLoginRequest(options).url;
};

/**
 * Start OAuth login flow.
 */
export async function startOAuthLogin(options?: { accountType?: string }): Promise<string> {
  const loginRequest = buildOAuthLoginRequest(options);
  console.log("[OAuth] server base =", loginRequest.serverBase);
  console.log("[OAuth] appId =", loginRequest.appId);
  console.log("[OAuth] redirectUri =", loginRequest.redirectUri);
  console.log("[OAuth] state =", loginRequest.state);
  console.log("[OAuth] type =", loginRequest.type);
  console.log("[OAuth] accountType =", loginRequest.accountType ?? "");
  console.log("[OAuth] final url =", loginRequest.url);

  if (ReactNative.Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.location.href = loginRequest.url;
      return loginRequest.url;
    }
    throw new Error("OAuth login could not start in this environment");
  }

  try {
    const supported = await Linking.canOpenURL(loginRequest.url);
    if (!supported) {
      throw new Error("OAuth login URL could not be opened");
    }
    await Linking.openURL(loginRequest.url);
    return loginRequest.url;
  } catch (error) {
    console.warn("[OAuth] Failed to open login URL:", error);
    throw error instanceof Error ? error : new Error("OAuth login could not be started");
  }
}
