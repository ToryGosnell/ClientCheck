import { Alert, Linking, Platform } from "react-native";
import * as Api from "@/lib/_core/api";
import { setVerificationCheckoutTrigger } from "@/lib/verification-checkout-trigger-storage";
import type { VerificationPaywallTrigger } from "@/shared/verification-conversion";

/**
 * Starts Stripe Checkout for optional customer identity verification (web redirect or native browser).
 */
export async function startCustomerIdentityCheckout(
  trigger?: VerificationPaywallTrigger,
): Promise<void> {
  if (trigger) {
    await setVerificationCheckoutTrigger(trigger);
  }
  const data = await Api.apiCall<{ url?: string }>("/billing/identity-checkout", {
    method: "POST",
    body: "{}",
  });

  const url = data.url;
  if (!url || typeof url !== "string") {
    throw new Error("Checkout did not return a URL");
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.location.href = url;
    return;
  }

  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    throw new Error("Cannot open checkout in this environment");
  }
  await Linking.openURL(url);
}

export function alertIdentityCheckoutError(err: unknown): void {
  const message = err instanceof Error ? err.message : "Could not start verification checkout.";
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(message);
    return;
  }
  Alert.alert("Verification", message);
}
