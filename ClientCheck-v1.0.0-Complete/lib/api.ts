import Constants from "expo-constants";
import { Platform } from "react-native";

function resolveApiBaseUrl() {
  const explicit =
    process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const hostUri = (Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost || "").split(":")[0];
  if (hostUri) {
    const port = process.env.EXPO_PUBLIC_API_PORT || "3000";
    return `http://${hostUri}:${port}`;
  }

  if (Platform.OS === "web") {
    return "";
  }

  return "http://localhost:3000";
}

export const API_BASE_URL = resolveApiBaseUrl();

export function apiUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

export async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(apiUrl(path), { ...init, headers });
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === "string" ? payload : payload?.error || payload?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}
