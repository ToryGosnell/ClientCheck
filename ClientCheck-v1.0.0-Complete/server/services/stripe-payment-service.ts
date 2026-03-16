import Stripe from "stripe";
import { db } from "@/server/_core/db";
import { payments, subscriptions, stripeEvents, customers } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Stripe Payment Service
 * Handles complete payment lifecycle: creation, subscription management, refunds, webhooks
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

export interface PaymentIntentInput {
  customerId: number;
  amount: number; // in cents
  currency: string;
  description: string;
  metadata?: Record<string, string>;
}

export interface SubscriptionInput {
  customerId: number;
  priceId: string;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
}

export interface RefundInput {
  paymentIntentId: string;
  amount?: number; // in cents, optional for full refund
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  metadata?: Record<string, string>;
}

export class StripePaymentService {
  /**
   * Create payment intent
   */
  static async createPaymentIntent(input: PaymentIntentInput) {
    try {
      // Get or create Stripe customer
      const stripeCustomer = await this.getOrCreateStripeCustomer(input.customerId);

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: input.amount,
        currency: input.currency,
        customer: stripeCustomer.id,
        description: input.description,
        metadata: {
          customerId: input.customerId.toString(),
          ...input.metadata,
        },
      });

      // Store in database
      await db.insert(payments).values({
        customerId: input.customerId,
        stripePaymentIntentId: paymentIntent.id,
        amount: input.amount,
        currency: input.currency,
        status: paymentIntent.status,
        description: input.description,
        metadata: JSON.stringify(input.metadata || {}),
        createdAt: new Date(),
      });

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      };
    } catch (error) {
      console.error("Error creating payment intent:", error);
      throw error;
    }
  }

  /**
   * Create subscription
   */
  static async createSubscription(input: SubscriptionInput) {
    try {
      // Get or create Stripe customer
      const stripeCustomer = await this.getOrCreateStripeCustomer(input.customerId);

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomer.id,
        items: [{ price: input.priceId }],
        payment_settings: {
          save_default_payment_method: "on_subscription",
        },
        metadata: {
          customerId: input.customerId.toString(),
          ...input.metadata,
        },
      });

      // Store in database
      await db.insert(subscriptions).values({
        customerId: input.customerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: input.priceId,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        metadata: JSON.stringify(input.metadata || {}),
        createdAt: new Date(),
      });

      return {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        items: subscription.items.data.map((item) => ({
          id: item.id,
          priceId: item.price.id,
          productId: item.price.product,
        })),
      };
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw error;
    }
  }

  /**
   * Update subscription
   */
  static async updateSubscription(subscriptionId: string, priceId: string) {
    try {
      // Get current subscription
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      // Update subscription
      const updated = await stripe.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: priceId,
          },
        ],
        proration_behavior: "create_prorations",
      });

      // Update database
      await db
        .update(subscriptions)
        .set({
          stripePriceId: priceId,
          status: updated.status,
          currentPeriodStart: new Date(updated.current_period_start * 1000),
          currentPeriodEnd: new Date(updated.current_period_end * 1000),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

      return {
        id: updated.id,
        status: updated.status,
        priceId: priceId,
      };
    } catch (error) {
      console.error("Error updating subscription:", error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(subscriptionId: string, reason?: string) {
    try {
      // Cancel at period end (graceful cancellation)
      const canceled = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
        metadata: {
          cancellationReason: reason || "customer_request",
        },
      });

      // Update database
      await db
        .update(subscriptions)
        .set({
          status: "canceled",
          canceledAt: new Date(),
          cancellationReason: reason,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

      return {
        id: canceled.id,
        status: canceled.status,
        canceledAt: new Date(),
        cancelAtPeriodEnd: canceled.cancel_at_period_end,
      };
    } catch (error) {
      console.error("Error canceling subscription:", error);
      throw error;
    }
  }

  /**
   * Reactivate subscription
   */
  static async reactivateSubscription(subscriptionId: string) {
    try {
      // Reactivate subscription
      const reactivated = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      // Update database
      await db
        .update(subscriptions)
        .set({
          status: reactivated.status,
          canceledAt: null,
          cancellationReason: null,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

      return {
        id: reactivated.id,
        status: reactivated.status,
        cancelAtPeriodEnd: reactivated.cancel_at_period_end,
      };
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      throw error;
    }
  }

  /**
   * Process refund
   */
  static async processRefund(input: RefundInput) {
    try {
      // Create refund
      const refund = await stripe.refunds.create({
        payment_intent: input.paymentIntentId,
        amount: input.amount,
        reason: input.reason || "requested_by_customer",
        metadata: input.metadata,
      });

      // Store in database
      await db.insert(payments).values({
        stripeRefundId: refund.id,
        stripePaymentIntentId: input.paymentIntentId,
        amount: refund.amount,
        status: refund.status,
        description: `Refund: ${input.reason || "requested_by_customer"}`,
        metadata: JSON.stringify(input.metadata || {}),
        createdAt: new Date(),
      });

      return {
        id: refund.id,
        status: refund.status,
        amount: refund.amount,
        reason: refund.reason,
      };
    } catch (error) {
      console.error("Error processing refund:", error);
      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  static async handleFailedPayment(paymentIntentId: string) {
    try {
      // Get payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== "requires_payment_method") {
        return;
      }

      // Get customer
      const customerId = parseInt(paymentIntent.metadata?.customerId || "0");
      if (!customerId) return;

      // Send retry notification
      await this.sendPaymentFailureNotification(customerId, paymentIntent);

      // Update database
      await db
        .update(payments)
        .set({
          status: "failed",
          failureReason: paymentIntent.last_payment_error?.message,
          updatedAt: new Date(),
        })
        .where(eq(payments.stripePaymentIntentId, paymentIntentId));

      return {
        customerId,
        paymentIntentId,
        failureReason: paymentIntent.last_payment_error?.message,
      };
    } catch (error) {
      console.error("Error handling failed payment:", error);
      throw error;
    }
  }

  /**
   * Retry failed payment
   */
  static async retryFailedPayment(paymentIntentId: string) {
    try {
      // Get payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      // Confirm payment intent (retry)
      const retried = await stripe.paymentIntents.confirm(paymentIntentId);

      // Update database
      await db
        .update(payments)
        .set({
          status: retried.status,
          updatedAt: new Date(),
        })
        .where(eq(payments.stripePaymentIntentId, paymentIntentId));

      return {
        id: retried.id,
        status: retried.status,
      };
    } catch (error) {
      console.error("Error retrying payment:", error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(body: string, signature: string): any {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
      return stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      throw error;
    }
  }

  /**
   * Handle webhook event
   */
  static async handleWebhookEvent(event: Stripe.Event) {
    try {
      // Store event in database
      await db.insert(stripeEvents).values({
        stripeEventId: event.id,
        eventType: event.type,
        data: JSON.stringify(event.data),
        processed: false,
        createdAt: new Date(),
      });

      // Handle specific event types
      switch (event.type) {
        case "payment_intent.succeeded":
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case "payment_intent.payment_failed":
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case "charge.refunded":
          await this.handleChargeRefunded(event.data.object as Stripe.Charge);
          break;

        case "customer.subscription.updated":
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case "customer.subscription.deleted":
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case "invoice.payment_succeeded":
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case "invoice.payment_failed":
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      // Mark event as processed
      await db
        .update(stripeEvents)
        .set({ processed: true, updatedAt: new Date() })
        .where(eq(stripeEvents.stripeEventId, event.id));

      return { success: true, eventId: event.id };
    } catch (error) {
      console.error("Error handling webhook event:", error);
      throw error;
    }
  }

  /**
   * Get payment history
   */
  static async getPaymentHistory(customerId: number) {
    return db
      .select()
      .from(payments)
      .where(eq(payments.customerId, customerId))
      .orderBy((t) => t.createdAt);
  }

  /**
   * Get subscription details
   */
  static async getSubscriptionDetails(customerId: number) {
    const result = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.customerId, customerId))
      .limit(1);

    if (!result.length) return null;

    const sub = result[0];
    const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);

    return {
      id: sub.id,
      stripeId: sub.stripeSubscriptionId,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      canceledAt: sub.canceledAt,
      cancellationReason: sub.cancellationReason,
      items: stripeSubscription.items.data.map((item) => ({
        id: item.id,
        priceId: item.price.id,
        productId: item.price.product,
      })),
    };
  }

  /**
   * Private helper: Get or create Stripe customer
   */
  private static async getOrCreateStripeCustomer(customerId: number) {
    try {
      // Get customer from database
      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, customerId))
        .limit(1);

      if (!customer.length) {
        throw new Error("Customer not found");
      }

      const cust = customer[0];

      // Check if already has Stripe ID
      if ((cust as any).stripeCustomerId) {
        return await stripe.customers.retrieve((cust as any).stripeCustomerId);
      }

      // Create new Stripe customer
      const stripeCustomer = await stripe.customers.create({
        email: cust.email,
        name: `${cust.firstName} ${cust.lastName}`,
        phone: cust.phone,
        metadata: {
          customerId: customerId.toString(),
        },
      });

      // Store Stripe ID
      await db
        .update(customers)
        .set({ stripeCustomerId: stripeCustomer.id })
        .where(eq(customers.id, customerId));

      return stripeCustomer;
    } catch (error) {
      console.error("Error getting or creating Stripe customer:", error);
      throw error;
    }
  }

  /**
   * Private helper: Send payment failure notification
   */
  private static async sendPaymentFailureNotification(customerId: number, paymentIntent: Stripe.PaymentIntent) {
    // In production, send email/SMS notification
    console.log(`Payment failed for customer ${customerId}:`, paymentIntent.last_payment_error?.message);
  }

  /**
   * Private handlers for webhook events
   */
  private static async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    await db
      .update(payments)
      .set({ status: "succeeded", updatedAt: new Date() })
      .where(eq(payments.stripePaymentIntentId, paymentIntent.id));
  }

  private static async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    await db
      .update(payments)
      .set({
        status: "failed",
        failureReason: paymentIntent.last_payment_error?.message,
        updatedAt: new Date(),
      })
      .where(eq(payments.stripePaymentIntentId, paymentIntent.id));
  }

  private static async handleChargeRefunded(charge: Stripe.Charge) {
    if (charge.payment_intent) {
      await db
        .update(payments)
        .set({
          status: "refunded",
          updatedAt: new Date(),
        })
        .where(eq(payments.stripePaymentIntentId, charge.payment_intent as string));
    }
  }

  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const customerId = parseInt(subscription.metadata?.customerId || "0");
    if (!customerId) return;

    await db
      .update(subscriptions)
      .set({
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
  }

  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const customerId = parseInt(subscription.metadata?.customerId || "0");
    if (!customerId) return;

    await db
      .update(subscriptions)
      .set({
        status: "canceled",
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
  }

  private static async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    if (invoice.subscription) {
      await db
        .update(subscriptions)
        .set({
          lastInvoiceId: invoice.id,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription as string));
    }
  }

  private static async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    if (invoice.subscription) {
      await db
        .update(subscriptions)
        .set({
          status: "past_due",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription as string));
    }
  }
}
