/**
 * Web: Stripe.js (no native-only modules).
 * Metro/Expo resolves this for web; use alongside `stripe.native.ts` via `import "@/lib/stripe"`.
 */
import { createElement, Fragment, type ReactNode } from "react";
import { loadStripe } from "@stripe/stripe-js";

export type { Stripe, StripeElements } from "@stripe/stripe-js";
export { loadStripe };

type StripeProviderProps = {
  publishableKey: string;
  children: ReactNode;
};

/** Web: pass-through — Payment Element uses `loadStripe` where needed. */
export function StripeProvider({ children }: StripeProviderProps) {
  return createElement(Fragment, null, children);
}
