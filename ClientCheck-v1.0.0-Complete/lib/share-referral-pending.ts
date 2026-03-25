import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const STORAGE_KEY = "@cc_share_referrer_id";
const WEB_KEY = "cc_share_referrer_id";

export async function setPendingShareReferrer(userId: number): Promise<void> {
  const n = Math.floor(Number(userId));
  if (!Number.isFinite(n) || n < 1) return;
  const v = String(n);
  if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(WEB_KEY, v);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, v);
}

export async function getPendingShareReferrer(): Promise<number | null> {
  let raw: string | null = null;
  if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
    raw = sessionStorage.getItem(WEB_KEY);
  } else {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
  }
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function clearPendingShareReferrer(): Promise<void> {
  if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(WEB_KEY);
    return;
  }
  await AsyncStorage.removeItem(STORAGE_KEY);
}
