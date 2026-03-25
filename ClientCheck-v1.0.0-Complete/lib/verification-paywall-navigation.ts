import type { Href } from "expo-router";
import type { VerificationPaywallTrigger } from "@/shared/verification-conversion";

type RouterLike = { push: (href: Href) => void };

/** Navigate to full-screen verify paywall with analytics trigger context. */
export function openVerificationPaywall(router: RouterLike, trigger: VerificationPaywallTrigger): void {
  const q = encodeURIComponent(trigger);
  router.push(`/verify-customer-paywall?trigger=${q}` as Href);
}
