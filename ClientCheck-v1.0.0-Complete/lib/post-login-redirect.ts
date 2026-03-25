import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const STORAGE_KEY = "@cc_post_login_path";
const WEB_KEY = "cc_post_login_path";

function normalizePath(path: string): string {
  const t = path.trim();
  if (!t) return "/(tabs)";
  const withSlash = t.startsWith("/") ? t : `/${t}`;
  if (withSlash.startsWith("//")) return "/(tabs)";
  return withSlash;
}

export async function setPostLoginRedirect(path: string): Promise<void> {
  const normalized = normalizePath(path);
  if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(WEB_KEY, normalized);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, normalized);
}

export async function consumePostLoginRedirect(): Promise<string | null> {
  if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
    const v = sessionStorage.getItem(WEB_KEY);
    if (v) sessionStorage.removeItem(WEB_KEY);
    return v;
  }
  const v = await AsyncStorage.getItem(STORAGE_KEY);
  if (v) await AsyncStorage.removeItem(STORAGE_KEY);
  return v;
}

/** Clears any stored path (e.g. user opened signup without a share intent — avoids stale native redirects). */
export async function clearPostLoginRedirect(): Promise<void> {
  if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(WEB_KEY);
    return;
  }
  await AsyncStorage.removeItem(STORAGE_KEY);
}
