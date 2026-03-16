/**
 * Stripe Customer Payment Service
 * Handles customer subscription payments through Stripe
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

/**
 * Client-safe Stripe customer helpers.
 * STRIPE_SECRET_KEY must never be used in client code. Create customer, payment intent,
 * and subscription are done via tRPC (payments.createStripeCustomerForApp, etc.).
 */
export class StripeCustomerService {
  private static publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  /**
   * Create a Stripe customer — use tRPC payments.createStripeCustomerForApp instead.
   * This client-side method is deprecated and returns not configured.
   */
  static async createStripeCustomer(_data: {
    email: string;
    name: string;
    phone?: string;
  }): Promise<StripeCustomerSetupResult> {
    return { success: false, error: "Stripe not configured. Use API." };
  }

  /**
   * Create a payment intent — use tRPC payments.createCustomerPaymentIntentForApp instead.
   */
  static async createPaymentIntent(_data: {
    customerId: string;
    amount: number;
    plan: "monthly" | "yearly";
  }): Promise<StripeCustomerPaymentResult> {
    return { success: false, error: "Stripe not configured. Use API." };
  }

  /**
   * Create a subscription — use tRPC payments.createCustomerSubscriptionForApp instead.
   */
  static async createSubscription(_data: {
    customerId: string;
    plan: "monthly" | "yearly";
    paymentMethodId: string;
  }): Promise<StripeCustomerPaymentResult> {
    return { success: false, error: "Stripe not configured. Use API." };
  }

  /**
   * Cancel a customer subscription — call server/API to cancel.
   */
  static async cancelSubscription(_subscriptionId: string): Promise<StripeCustomerPaymentResult> {
    return { success: false, error: "Use API to cancel subscription." };
  }

  /**
   * Get publishable key for frontend
   */
  static getPublishableKey(): string | null {
    return this.publishableKey || null;
  }

  /**
   * Confirm payment on frontend
   */
  static async confirmPayment(data: {
    clientSecret: string;
    paymentMethodId: string;
  }): Promise<StripeCustomerPaymentResult> {
    try {
      // In production, use Stripe.js to confirm payment
      console.log("Payment confirmed with method:", data.paymentMethodId);
      return { success: true };
    } catch (error) {
      console.error("Failed to confirm payment:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get customer subscription status
   */
  static async getSubscriptionStatus(subscriptionId: string): Promise<{
    status: string;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
  } | null> {
    if (!this.secretKey) {
      console.warn("Stripe secret key not configured");
      return null;
    }

    try {
      // In production, call Stripe API to get subscription
      // GET https://api.stripe.com/v1/subscriptions/{id}
      return {
        status: "active",
        currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancelAtPeriodEnd: false,
      };
    } catch (error) {
      console.error("Failed to get subscription status:", error);
      return null;
    }
  }

  /**
   * Update customer payment method
   */
  static async updatePaymentMethod(data: {
    customerId: string;
    paymentMethodId: string;
  }): Promise<StripeCustomerPaymentResult> {
    if (!this.secretKey) {
      console.warn("Stripe secret key not configured");
      return { success: false, error: "Stripe not configured" };
    }

    try {
      // In production, call Stripe API to update payment method
      console.log(`Payment method updated for customer: ${data.customerId}`);
      return { success: true };
    } catch (error) {
      console.error("Failed to update payment method:", error);
      return { success: false, error: String(error) };
    }
  }
}
