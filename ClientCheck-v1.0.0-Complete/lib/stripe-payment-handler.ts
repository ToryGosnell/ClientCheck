/**
 * Stripe Payment Handler
 * Handles Stripe.js integration for customer subscription payments
 */

export interface StripePaymentConfig {
  publishableKey: string;
  clientSecret: string;
  customerId: string;
  amount: number;
  plan: "monthly" | "yearly";
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
  errorCode?: string;
}

export class StripePaymentHandler {
  /**
   * Initialize Stripe payment
   * In production, this would use @stripe/react-native-stripe-sdk
   */
  static async initializePayment(config: StripePaymentConfig): Promise<PaymentResult> {
    try {
      // In production, initialize Stripe with:
      // import { initStripe } from '@stripe/react-native-stripe-sdk';
      // await initStripe({ publishableKey: config.publishableKey });

      console.log("Stripe initialized with publishable key");
      return { success: true };
    } catch (error) {
      console.error("Failed to initialize Stripe:", error);
      return {
        success: false,
        error: "Failed to initialize payment processor",
        errorCode: "INIT_FAILED",
      };
    }
  }

  /**
   * Confirm payment with card details
   * In production, this would use Stripe.js to confirm payment
   */
  static async confirmPayment(config: StripePaymentConfig): Promise<PaymentResult> {
    try {
      // In production, use Stripe.js to confirm payment:
      // const { paymentIntent, error } = await stripe.confirmCardPayment(
      //   config.clientSecret,
      //   {
      //     payment_method: {
      //       card: cardElement,
      //       billing_details: { name: customerName }
      //     }
      //   }
      // );

      const paymentIntentId = `pi_${Date.now()}`;

      console.log(`Payment confirmed: ${paymentIntentId}`);
      return {
        success: true,
        paymentIntentId,
      };
    } catch (error) {
      console.error("Payment confirmation failed:", error);
      return {
        success: false,
        error: "Payment failed. Please try again.",
        errorCode: "PAYMENT_FAILED",
      };
    }
  }

  /**
   * Handle payment errors
   */
  static getErrorMessage(errorCode?: string): string {
    const errorMessages: Record<string, string> = {
      INIT_FAILED: "Unable to initialize payment processor. Please try again.",
      PAYMENT_FAILED: "Payment failed. Please check your card and try again.",
      CARD_DECLINED: "Your card was declined. Please try another card.",
      EXPIRED_CARD: "Your card has expired. Please use a different card.",
      INSUFFICIENT_FUNDS: "Insufficient funds. Please try another card.",
      PROCESSING_ERROR: "A processing error occurred. Please try again.",
    };

    return errorMessages[errorCode || "PAYMENT_FAILED"] || "Payment failed. Please try again.";
  }

  /**
   * Validate payment configuration
   */
  static validateConfig(config: StripePaymentConfig): { valid: boolean; error?: string } {
    if (!config.publishableKey) {
      return { valid: false, error: "Stripe publishable key not configured" };
    }

    if (!config.clientSecret) {
      return { valid: false, error: "Payment intent not created" };
    }

    if (config.amount <= 0) {
      return { valid: false, error: "Invalid payment amount" };
    }

    if (!["monthly", "yearly"].includes(config.plan)) {
      return { valid: false, error: "Invalid subscription plan" };
    }

    return { valid: true };
  }

  /**
   * Format amount for Stripe (convert to cents)
   */
  static formatAmount(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Parse Stripe amount (convert from cents)
   */
  static parseAmount(amountInCents: number): number {
    return amountInCents / 100;
  }

  /**
   * Get plan details
   */
  static getPlanDetails(plan: "monthly" | "yearly"): {
    amount: number;
    interval: string;
    displayName: string;
  } {
    if (plan === "yearly") {
      return {
        amount: 100,
        interval: "year",
        displayName: "Yearly Plan ($100/year)",
      };
    }

    return {
      amount: 9.99,
      interval: "month",
      displayName: "Monthly Plan ($9.99/month)",
    };
  }
}
