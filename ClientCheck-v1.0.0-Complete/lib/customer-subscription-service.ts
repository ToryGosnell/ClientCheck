/**
 * Customer Subscription Service — display constants and utility helpers.
 *
 * All mutation operations (create, cancel, reactivate) go through tRPC:
 * - payments.createCustomerSubscriptionForApp
 * - subscription.cancelSubscription
 *
 * This module provides only pricing constants and pure formatting helpers.
 */

import {
  CUSTOMER_MONTHLY_PRICE_CENTS,
  CONTRACTOR_ANNUAL_PRICE_CENTS,
} from "@/shared/billing-config";

export interface CustomerSubscription {
  id: string;
  customerId: string;
  email: string;
  status: "active" | "canceled" | "past_due" | "expired";
  plan: "monthly" | "yearly";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt?: Date;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}

export class CustomerSubscriptionService {
  static readonly MONTHLY_PRICE = CUSTOMER_MONTHLY_PRICE_CENTS / 100;
  static readonly YEARLY_PRICE = CONTRACTOR_ANNUAL_PRICE_CENTS / 100;
  static readonly YEARLY_SAVINGS = 17;

  static isSubscriptionActive(subscription: CustomerSubscription | null): boolean {
    if (!subscription) return false;
    return subscription.status === "active" && new Date() < subscription.currentPeriodEnd;
  }

  static getDaysUntilExpiration(subscription: CustomerSubscription | null): number {
    if (!subscription) return 0;
    const now = new Date();
    const daysLeft = Math.ceil(
      (subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return Math.max(0, daysLeft);
  }

  /**
   * Customer core access is free; do not use this to gate profile, responses, or disputes.
   * Optional paid add-ons (e.g. identity badge) are surfaced only from explicit billing UI.
   */
  static shouldShowPaymentPrompt(_subscription: CustomerSubscription | null): boolean {
    return false;
  }

  static getSubscriptionPrice(plan: "monthly" | "yearly"): number {
    return plan === "monthly" ? this.MONTHLY_PRICE : this.YEARLY_PRICE;
  }

  static getMonthlyEquivalent(plan: "monthly" | "yearly"): number {
    return plan === "monthly" ? this.MONTHLY_PRICE : this.YEARLY_PRICE / 12;
  }

  static formatPrice(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  static getYearlySavingsMessage(): string {
    const monthlyCost = this.MONTHLY_PRICE * 12;
    const yearlyCost = this.YEARLY_PRICE;
    const savings = monthlyCost - yearlyCost;
    return `Save $${savings.toFixed(2)} per year (${this.YEARLY_SAVINGS}% off)`;
  }
}
