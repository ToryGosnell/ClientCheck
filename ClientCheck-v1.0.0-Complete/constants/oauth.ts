import * as Linking from "expo-linking";
import * as ReactNative from "react-native";

const DEFAULT_DEEP_LINK_SCHEME = "clientcheck";

/** Hardcoded API host used by REST/tRPC unless overridden by public env. */
const DEFAULT_API_BASE = "https://clientcheck-production.up.railway.app";

const env = {
  apiBase: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  deepLinkScheme: DEFAULT_DEEP_LINK_SCHEME,
};

export const API_BASE = (env.apiBase || DEFAULT_API_BASE).replace(/\/$/, "");

export function getApiBaseUrl(): string {
  return API_BASE.replace(/\/$/, "");
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "clientcheck_user_info";
export const LEGACY_USER_INFO_KEY = "manus-runtime-user-info";

/** Legacy API kept for compatibility with old screens; no longer starts OAuth. */
export const getLoginUrl = (_options?: { accountType?: string }): string => {
  if (ReactNative.Platform.OS === "web") return "/welcome";
  return Linking.createURL("/welcome", { scheme: env.deepLinkScheme });
};

/** Legacy function name kept to avoid immediate screen breakage; now routes to in-app first-party entry. */
export async function startOAuthLogin(options?: { accountType?: string }): Promise<string> {
  const url = getLoginUrl(options);
  if (ReactNative.Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.location.assign(url);
      return url;
    }
    throw new Error("Navigation could not start in this environment");
  }
  await Linking.openURL(url);
  return url;
}
