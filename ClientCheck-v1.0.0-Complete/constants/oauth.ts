import * as Linking from "expo-linking";
import * as ReactNative from "react-native";

const DEFAULT_DEEP_LINK_SCHEME = "clientcheck";

/** Hardcoded API host used by REST/tRPC unless overridden by public env. */
const DEFAULT_API_BASE = "https://clientcheck-production.up.railway.app";

const env = {
  apiBase: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  oauthServer: process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: process.env.EXPO_PUBLIC_APP_ID ?? "",
  deepLinkScheme: DEFAULT_DEEP_LINK_SCHEME,
};

export const API_BASE = (env.apiBase || DEFAULT_API_BASE).replace(/\/$/, "");

export function getApiBaseUrl(): string {
  return API_BASE.replace(/\/$/, "");
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "clientcheck_user_info";
export const LEGACY_USER_INFO_KEY = "manus-runtime-user-info";

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function buildApiPath(base: string, pathAfterApi: string): string {
  const normalizedBase = stripTrailingSlash(base);
  const normalizedPath = pathAfterApi.startsWith("/") ? pathAfterApi : `/${pathAfterApi}`;
  if (/\/api$/i.test(normalizedBase)) {
    return `${normalizedBase}${normalizedPath}`;
  }
  return `${normalizedBase}/api${normalizedPath}`;
}

function buildOAuthStartUrl(base: string): string {
  const normalizedBase = stripTrailingSlash(base);
  if (/\/api\/oauth\/start$/i.test(normalizedBase)) {
    return normalizedBase;
  }
  const withoutTrailingApi = normalizedBase.replace(/\/api$/i, "");
  return `${withoutTrailingApi}/api/oauth/start`;
}

function encodeState(redirectUri: string): string {
  return Buffer.from(redirectUri, "utf-8").toString("base64");
}

export const getLoginUrl = (options?: { accountType?: string }): string => {
  const oauthBase = stripTrailingSlash((env.oauthServer || env.apiBase || "").trim());
  const appId = env.appId.trim();
  const redirectUri = buildApiPath(API_BASE, "/oauth/callback");
  const state = encodeState(redirectUri);
  const type = "signIn";

  const missing: string[] = [];
  if (!oauthBase) missing.push("oauthBase");
  if (!appId) missing.push("appId");
  if (!redirectUri) missing.push("redirect_uri");
  if (!state) missing.push("state");

  if (missing.length > 0) {
    console.error("[OAuth] OAuth configuration is incomplete", {
      missing,
      hasOauthBase: Boolean(oauthBase),
      hasAppId: Boolean(appId),
      hasRedirectUri: Boolean(redirectUri),
      hasState: Boolean(state),
    });
    throw new Error("OAuth configuration is incomplete");
  }

  const startUrl = buildOAuthStartUrl(oauthBase);
  const parts = [
    `appId=${encodeURIComponent(appId)}`,
    `redirect_uri=${encodeURIComponent(redirectUri)}`,
    `state=${encodeURIComponent(state)}`,
    `type=${encodeURIComponent(type)}`,
  ];

  if (options?.accountType?.trim()) {
    parts.push(`account_type=${encodeURIComponent(options.accountType.trim())}`);
  }

  return `${startUrl}?${parts.join("&")}`;
};

export async function startOAuthLogin(options?: { accountType?: string }): Promise<string> {
  const url = getLoginUrl(options);
  console.log("[OAuth] final url =", url);
  if (ReactNative.Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.location.assign(url);
      return url;
    }
    throw new Error("Navigation could not start in this environment");
  }
  if (await Linking.canOpenURL(url)) {
    await Linking.openURL(url);
    return url;
  }
  const fallback = Linking.createURL("/welcome", { scheme: env.deepLinkScheme });
  await Linking.openURL(fallback);
  return url;
}
