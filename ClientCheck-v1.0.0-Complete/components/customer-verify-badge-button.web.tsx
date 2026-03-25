import { useRouter } from "expo-router";
import { openVerificationPaywall } from "@/lib/verification-paywall-navigation";

/**
 * Web: opens verify paywall (DOM `button.verify-btn`); Stripe Checkout runs from that screen.
 */
export function CustomerVerifyBadgeButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="verify-btn"
      onClick={() => openVerificationPaywall(router, "manual")}
    >
      Get Verified Badge
    </button>
  );
}
