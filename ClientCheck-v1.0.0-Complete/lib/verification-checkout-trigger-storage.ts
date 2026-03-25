import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "cc_verify_checkout_trigger";

/** Persist trigger before redirecting to Stripe so success page can fire `paywall_converted`. */
export async function setVerificationCheckoutTrigger(trigger: string): Promise<void> {
  try {
    if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(KEY, trigger);
      return;
    }
    await AsyncStorage.setItem(KEY, trigger);
  } catch {
    /* ignore */
  }
}

export async function getAndClearVerificationCheckoutTrigger(): Promise<string | null> {
  try {
    if (Platform.OS === "web" && typeof sessionStorage !== "undefined") {
      const v = sessionStorage.getItem(KEY);
      sessionStorage.removeItem(KEY);
      return v;
    }
    const v = await AsyncStorage.getItem(KEY);
    if (v != null) await AsyncStorage.removeItem(KEY);
    return v;
  } catch {
    return null;
  }
}
