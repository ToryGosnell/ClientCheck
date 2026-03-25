import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { VerificationPaywallTrigger } from "@/shared/verification-conversion";

const prefix = "cc_verify_paywall_session_";

function key(trigger: VerificationPaywallTrigger): string {
  return `${prefix}${trigger}`;
}

export async function hasPaywallBeenShownForTrigger(trigger: VerificationPaywallTrigger): Promise<boolean> {
  try {
    if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
      return sessionStorage.getItem(key(trigger)) === "1";
    }
    const v = await AsyncStorage.getItem(key(trigger));
    return v === "1";
  } catch {
    return false;
  }
}

export async function markPaywallShownForTrigger(trigger: VerificationPaywallTrigger): Promise<void> {
  try {
    if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(key(trigger), "1");
      return;
    }
    await AsyncStorage.setItem(key(trigger), "1");
  } catch {
    /* ignore */
  }
}
