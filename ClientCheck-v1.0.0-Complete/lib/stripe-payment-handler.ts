/**
 * Stripe Payment Handler — client-side utilities.
 *
 * Actual payment confirmation happens via:
 * - Native: @stripe/stripe-react-native PaymentSheet
 * - Web: @stripe/stripe-js Elements
 *
 * This module provides validation, formatting, and error message helpers.
 * It does NOT confirm payments — that is done by the Stripe SDK + backend webhooks.
 */

import {
  CONTRACTOR_ANNUAL_PRICE_CENTS,
  CUSTOMER_MONTHLY_PRICE_CENTS,
} from "@/shared/billing-config";

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
  static getErrorMessage(errorCode?: string): string {
    const errorMessages: Record<string, string> = {
      INIT_FAILED: "Unable to initialize payment processor. Please try again.",
      PAYMENT_FAILED: "Payment failed. Please check your card and try again.",
      CARD_DECLINED: "Your card was declined. Please try another card.",
      EXPIRED_CARD: "Your card has expired. Please use a different card.",
      INSUFFICIENT_FUNDS: "Insufficient funds. Please try another card.",
      PROCESSING_ERROR: "A processing error occurred. Please try again.",
      NOT_CONFIGURED: "Payment processing is not available right now.",
      STRIPE_PRICE_MISSING: "Subscription plan is not configured. Please contact support.",
    };
    return errorMessages[errorCode || "PAYMENT_FAILED"] || "Payment failed. Please try again.";
  }

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

  static formatAmount(amount: number): number {
    return Math.round(amount * 100);
  }

  static parseAmount(amountInCents: number): number {
    return amountInCents / 100;
  }

  static getPlanDetails(plan: "monthly" | "yearly"): {
    amountCents: number;
    amount: number;
    interval: string;
    displayName: string;
  } {
    if (plan === "yearly") {
      return {
        amountCents: CONTRACTOR_ANNUAL_PRICE_CENTS,
        amount: CONTRACTOR_ANNUAL_PRICE_CENTS / 100,
        interval: "year",
        displayName: "Annual Plan ($100.00/year)",
      };
    }
    return {
      amountCents: CUSTOMER_MONTHLY_PRICE_CENTS,
      amount: CUSTOMER_MONTHLY_PRICE_CENTS / 100,
      interval: "month",
      displayName: "Monthly Plan ($9.99/month)",
    };
  }
}
