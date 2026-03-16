/**
 * Customer Subscription Service
 * Manages customer (non-contractor) subscriptions
 * Customers pay $9.99/month or $100/year to participate in the platform
 */

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
  static readonly MONTHLY_PRICE = 9.99;
  static readonly YEARLY_PRICE = 100;
  static readonly YEARLY_SAVINGS = 17; // percent

  static async createCustomerSubscription(data: {
    customerId: string;
    email: string;
    plan: "monthly" | "yearly";
    paymentMethodId: string;
  }): Promise<CustomerSubscription | null> {
    try {
      const now = new Date();
      const currentPeriodEnd = new Date(now);

      if (data.plan === "monthly") {
        currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      } else {
        currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
      }

      const subscription: CustomerSubscription = {
        id: `cust_sub_${Date.now()}`,
        customerId: data.customerId,
        email: data.email,
        status: "active",
        plan: data.plan,
        currentPeriodStart: now,
        currentPeriodEnd,
      };

      // In production, create Stripe subscription here
      console.log(`Customer subscription created: ${subscription.id}`);

      return subscription;
    } catch (error) {
      console.error("Failed to create customer subscription:", error);
      return null;
    }
  }

  static async getCustomerSubscription(customerId: string): Promise<CustomerSubscription | null> {
    try {
      // In production, query database
      console.log(`Fetching subscription for customer: ${customerId}`);
      return null;
    } catch (error) {
      console.error("Failed to get customer subscription:", error);
      return null;
    }
  }

  static async cancelCustomerSubscription(customerId: string): Promise<boolean> {
    try {
      const now = new Date();
      console.log(`Customer subscription canceled at: ${now.toISOString()}`);
      return true;
    } catch (error) {
      console.error("Failed to cancel customer subscription:", error);
      return false;
    }
  }

  static async reactivateCustomerSubscription(customerId: string): Promise<CustomerSubscription | null> {
    try {
      const now = new Date();
      const currentPeriodEnd = new Date(now);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

      const subscription: CustomerSubscription = {
        id: `cust_sub_${Date.now()}`,
        customerId,
        email: "",
        status: "active",
        plan: "monthly",
        currentPeriodStart: now,
        currentPeriodEnd,
      };

      console.log(`Customer subscription reactivated: ${subscription.id}`);
      return subscription;
    } catch (error) {
      console.error("Failed to reactivate customer subscription:", error);
      return null;
    }
  }

  static isSubscriptionActive(subscription: CustomerSubscription | null): boolean {
    if (!subscription) return false;
    return subscription.status === "active" && new Date() < subscription.currentPeriodEnd;
  }

  static getDaysUntilExpiration(subscription: CustomerSubscription | null): number {
    if (!subscription) return 0;
    const now = new Date();
    const daysLeft = Math.ceil(
      (subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, daysLeft);
  }

  static shouldShowPaymentPrompt(subscription: CustomerSubscription | null): boolean {
    if (!subscription) return true;
    return !this.isSubscriptionActive(subscription);
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
