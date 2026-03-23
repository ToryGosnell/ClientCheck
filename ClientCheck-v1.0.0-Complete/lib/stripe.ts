/**
 * TypeScript entry for `@/lib/stripe`.
 * Metro still resolves `stripe.native.ts` / `stripe.web.ts` at bundle time (they take precedence over this file).
 */
export { StripeProvider, usePaymentSheet } from "./stripe.native";
