import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { LEGACY_USER_INFO_KEY, SESSION_TOKEN_KEY, USER_INFO_KEY } from "@/constants/oauth";

let inMemorySessionToken: string | null = null;

export type User = {
  id: number;
  openId?: string | null;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role?: string;
  /** Customer identity verification (Stripe Checkout + webhook). */
  isVerified: boolean;
  /** When verification completed; null if never verified. */
  verifiedAt: Date | null;
  lastSignedIn: Date;
};

function parseDateTimeOrNull(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Build `User` from `/api/auth/me` or OAuth payloads (coerces ISO datetime strings). */
export function userFromApiJson(raw: Record<string, unknown>): User {
  const id = Number(raw.id);
  if (!Number.isFinite(id)) {
    throw new Error("Invalid user payload: id");
  }
  return {
    id,
    openId:
      raw.openId == null || raw.openId === ""
        ? null
        : String(raw.openId),
    name: (raw.name as string | null) ?? null,
    email: (raw.email as string | null) ?? null,
    loginMethod: (raw.loginMethod as string | null) ?? null,
    role: (raw.role as string | undefined) ?? "user",
    isVerified: typeof raw.isVerified === "boolean" ? raw.isVerified : false,
    verifiedAt: parseDateTimeOrNull(raw.verifiedAt),
    lastSignedIn: parseDateTimeOrNull(raw.lastSignedIn) ?? new Date(),
  };
}

export async function getSessionToken(): Promise<string | null> {
  try {
    if (inMemorySessionToken) {
      return inMemorySessionToken;
    }
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return null;
      const stored = window.localStorage.getItem(SESSION_TOKEN_KEY);
      if (stored) {
        inMemorySessionToken = stored;
      }
      return stored;
    }
    const stored = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
    if (stored) {
      inMemorySessionToken = stored;
    }
    return stored;
  } catch (error) {
    console.warn("[Auth] Failed to get session token:", error);
    return null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  inMemorySessionToken = token;
  try {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(SESSION_TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
  } catch (error) {
    // Keep in-memory token so auth still works in this browser session.
    console.warn("[Auth] Failed to persist session token:", error);
  }
}

export async function removeSessionToken(): Promise<void> {
  inMemorySessionToken = null;
  try {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(SESSION_TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  } catch (error) {
    console.warn("[Auth] Failed to remove session token:", error);
  }
}

export async function getUserInfo(): Promise<User | null> {
  try {
    let info: string | null = null;
    if (Platform.OS === "web") {
      info = window.localStorage.getItem(USER_INFO_KEY);
      if (!info) {
        const legacy = window.localStorage.getItem(LEGACY_USER_INFO_KEY);
        if (legacy) {
          window.localStorage.setItem(USER_INFO_KEY, legacy);
          window.localStorage.removeItem(LEGACY_USER_INFO_KEY);
          info = legacy;
        }
      }
    } else {
      info = await SecureStore.getItemAsync(USER_INFO_KEY);
      if (!info) {
        const legacy = await SecureStore.getItemAsync(LEGACY_USER_INFO_KEY);
        if (legacy) {
          await SecureStore.setItemAsync(USER_INFO_KEY, legacy);
          await SecureStore.deleteItemAsync(LEGACY_USER_INFO_KEY);
          info = legacy;
        }
      }
    }
    if (!info) return null;
    return JSON.parse(info);
  } catch (error) {
    console.warn("[Auth] Failed to get user info:", error);
    return null;
  }
}

export async function setUserInfo(user: User): Promise<void> {
  try {
    if (Platform.OS === "web") {
      window.localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
      return;
    }
    await SecureStore.setItemAsync(USER_INFO_KEY, JSON.stringify(user));
  } catch (error) {
    console.warn("[Auth] Failed to set user info:", error);
  }
}

export async function clearUserInfo(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      window.localStorage.removeItem(USER_INFO_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(USER_INFO_KEY);
  } catch (error) {
    console.warn("[Auth] Failed to clear user info:", error);
  }
}
