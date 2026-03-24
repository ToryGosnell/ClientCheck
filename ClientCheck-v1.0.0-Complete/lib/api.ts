import { API_BASE } from "@/constants/oauth";

const normalizedBase = API_BASE.replace(/\/$/, "");

export const API_BASE_URL = normalizedBase;

/**
 * Ensure REST paths hit the Express /api/* mount (idempotent if already /api/...).
 * Skips absolute http(s) URLs.
 */
export function ensureApiPrefix(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const q = path.indexOf("?");
  const h = path.indexOf("#");
  let end = path.length;
  if (q >= 0) end = Math.min(end, q);
  if (h >= 0) end = Math.min(end, h);
  const pathOnly = path.slice(0, end);
  const suffix = path.slice(end);
  const n = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
  if (n === "/api" || n.startsWith("/api/")) return `${n}${suffix}`;
  return `/api${n}${suffix}`;
}

export function apiUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${normalizedBase}${ensureApiPrefix(path)}`;
}

export async function apiFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(apiUrl(path), { ...init, headers, credentials: "include" });
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === "string" ? payload : payload?.error || payload?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}
