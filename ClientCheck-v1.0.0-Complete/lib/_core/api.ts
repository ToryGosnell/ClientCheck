import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";
import { ensureApiPrefix } from "@/lib/api";
import * as Auth from "./auth";

export async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  // Native: Bearer token auth. Web: cookie-based auth (browser handles automatically).
  if (Platform.OS !== "web") {
    const sessionToken = await Auth.getSessionToken();
    if (sessionToken) {
      headers["Authorization"] = `Bearer ${sessionToken}`;
    }
  }

  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  const path = ensureApiPrefix(endpoint);
  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || errorText;
    } catch {
      // Not JSON, use raw text
    }
    throw new Error(errorMessage || `API call failed: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : {}) as T;
}

// Logout
export async function logout(): Promise<void> {
  await apiCall<void>("/api/auth/logout", {
    method: "POST",
  });
}

/** JSON shape for GET /api/auth/me → `{ user }` (datetimes as ISO 8601 strings). */
export type MeUserJson = {
  id: number | null;
  openId?: string | null;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  emailVerifiedAt?: string | null;
  lastSignedIn: string;
};

export type AuthResponse = {
  user: MeUserJson;
  sessionToken?: string;
  app_session_id?: string;
};

async function persistNativeSessionToken(result: AuthResponse): Promise<void> {
  if (Platform.OS === "web") return;
  const token = result.sessionToken ?? result.app_session_id ?? null;
  if (token) {
    await Auth.setSessionToken(token);
  }
}

export async function me(): Promise<MeUserJson | null> {
  try {
    const result = await apiCall<{ user: MeUserJson | null }>("/api/auth/me");
    return result.user ?? null;
  } catch (error) {
    // 401 / "Not authenticated" is expected when session expired — not a real error
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("Not authenticated") || msg.includes("401")) {
      return null;
    }
    console.warn("[API] getMe unexpected error:", msg);
    return null;
  }
}

// Backward-compatible alias used by existing code.
export const getMe = me;

export async function signup(input: {
  email: string;
  password: string;
  name?: string;
  accountType?: "contractor" | "customer";
  legalAcceptanceVersion?: string;
}): Promise<AuthResponse> {
  const result = await apiCall<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  await persistNativeSessionToken(result);
  return result;
}

export async function login(input: { email: string; password: string }): Promise<AuthResponse> {
  const result = await apiCall<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  await persistNativeSessionToken(result);
  return result;
}

export async function forgotPassword(email: string): Promise<{ success: boolean }> {
  return apiCall<{ success: boolean }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<{ success: boolean }> {
  return apiCall<{ success: boolean }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
  return apiCall<{ success: boolean; error?: string }>("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function resendVerification(email?: string): Promise<{ success: boolean }> {
  return apiCall<{ success: boolean }>("/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify(email ? { email } : {}),
  });
}
