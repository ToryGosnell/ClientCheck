/**
 * Client-safe Stripe service facade.
 *
 * All payment operations MUST go through the server via tRPC:
 * - payments.createStripeCustomerForApp
 * - payments.createCustomerPaymentIntentForApp
 * - payments.createCustomerSubscriptionForApp
 * - payments.verifyPayment
 * - subscription.getStatus / getMembership
 *
 * This module only provides the publishable key and type definitions.
 * STRIPE_SECRET_KEY is never used client-side.
 */

export interface StripeCustomerPaymentResult {
  success: boolean;
  subscriptionId?: string;
  clientSecret?: string;
  error?: string;
}

export interface StripeCustomerSetupResult {
  success: boolean;
  customerId?: string;
  error?: string;
}

export class StripeCustomerService {
  private static publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  static getPublishableKey(): string | null {
    return this.publishableKey || null;
  }

  static isConfigured(): boolean {
    return !!this.publishableKey;
  }
}
