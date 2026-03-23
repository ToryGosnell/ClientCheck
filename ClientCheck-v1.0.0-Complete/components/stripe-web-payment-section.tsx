import type { ReactElement } from "react";
import type { StripeWebPaymentSectionProps } from "./stripe-web-payment-types";

export type { StripeWebPaymentSectionProps };

/**
 * Native / fallback: Stripe.js + Payment Element are web-only.
 * Metro uses `stripe-web-payment-section.web.tsx` on web instead of this file.
 */
export function StripeWebPaymentSection(_props: StripeWebPaymentSectionProps): ReactElement | null {
  return null;
}
