/**
 * Stripe Payment Service — façade around the lower-level stripe-payment and
 * stripe-webhook-handler modules.
 *
 * Production code should call these functions via tRPC (server/routers.ts).
 * This module exists to expose a class-based API used by tests and admin tools.
 */

import Stripe from "stripe";
import * as stripePayment from "../stripe-payment";
import * as webhookHandler from "../stripe-webhook-handler";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export interface PaymentIntentInput {
  customerId: number;
  amount: number;
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
  amount?: number;
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  metadata?: Record<string, string>;
}

export class StripePaymentService {
  static async createPaymentIntent(input: PaymentIntentInput) {
    if (!stripe) throw new Error("Stripe not configured");
    const pi = await stripe.paymentIntents.create({
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      metadata: { customerId: String(input.customerId), ...input.metadata },
    });
    return { id: pi.id, clientSecret: pi.client_secret, status: pi.status, amount: pi.amount, currency: pi.currency };
  }

  static async createSubscription(input: SubscriptionInput) {
    if (!stripe) throw new Error("Stripe not configured");
    const sub = await stripe.subscriptions.create({
      customer: input.metadata?.stripeCustomerId ?? "",
      items: [{ price: input.priceId }],
      metadata: { customerId: String(input.customerId), ...input.metadata },
    });
    return { id: sub.id, status: sub.status };
  }

  static async cancelSubscription(subscriptionId: string, _reason?: string) {
    return stripePayment.cancelSubscription(subscriptionId);
  }

  static async processRefund(input: RefundInput) {
    if (!stripe) throw new Error("Stripe not configured");
    const refund = await stripe.refunds.create({
      payment_intent: input.paymentIntentId,
      amount: input.amount,
      reason: input.reason || "requested_by_customer",
    });
    return { id: refund.id, status: refund.status, amount: refund.amount };
  }

  static verifyWebhookSignature(body: string, signature: string) {
    return webhookHandler.verifyStripeWebhook(body, signature);
  }

  static async handleWebhookEvent(event: Stripe.Event) {
    return webhookHandler.handleStripeWebhookEvent(event);
  }

  static async getPaymentMethod(paymentMethodId: string) {
    return stripePayment.getPaymentMethod(paymentMethodId);
  }

  static isConfigured(): boolean {
    return stripePayment.isStripeConfigured();
  }
}
