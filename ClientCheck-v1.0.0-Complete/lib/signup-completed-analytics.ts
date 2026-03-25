import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { track } from "@/lib/analytics";
import { getSelectedAccountType } from "@/lib/account-type";

const KEY_PREFIX = "cc_analytics_signup_completed_";

function storageKey(userId: number): string {
  return `${KEY_PREFIX}${userId}`;
}

async function alreadyTracked(userId: number): Promise<boolean> {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(storageKey(userId)) === "1";
    }
    return (await AsyncStorage.getItem(storageKey(userId))) === "1";
  } catch {
    return false;
  }
}

async function markTracked(userId: number): Promise<void> {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(storageKey(userId), "1");
      return;
    }
    await AsyncStorage.setItem(storageKey(userId), "1");
  } catch {
    /* ignore */
  }
}

/**
 * When the server marks this OAuth session as a first-time user, emit `signup_completed` once per user id.
 */
export async function trackSignupCompletedIfNew(payload: {
  id: number | null;
  isNewUser?: boolean;
}): Promise<void> {
  if (!payload.isNewUser || payload.id == null) return;
  if (await alreadyTracked(payload.id)) return;
  await markTracked(payload.id);
  const accountType = (await getSelectedAccountType()) ?? "contractor";
  track("signup_completed", { account_type: accountType });
}
