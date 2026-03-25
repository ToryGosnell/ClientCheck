import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const STORAGE_KEY = "@cc_contractor_invite_ref";
const WEB_KEY = "cc_contractor_invite_ref";

export async function setPendingContractorInviteReferrer(userId: number): Promise<void> {
  const n = Math.floor(Number(userId));
  if (!Number.isFinite(n) || n < 1) return;
  const v = String(n);
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.setItem(WEB_KEY, v);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, v);
}

export async function getPendingContractorInviteReferrer(): Promise<number | null> {
  let raw: string | null = null;
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    raw = localStorage.getItem(WEB_KEY);
  } else {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
  }
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function clearPendingContractorInviteReferrer(): Promise<void> {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.removeItem(WEB_KEY);
    return;
  }
  await AsyncStorage.removeItem(STORAGE_KEY);
}
