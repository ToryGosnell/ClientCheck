/**
 * Stripe webhook handling — keeps app accurate when user closes mid-payment.
 * Listens for: successful payment, failed payment, subscription lifecycle, refunds.
 * Uses getDb() and stripeWebhookEvents for idempotency; updates stripePayments and subscriptions.
 */

import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { stripeWebhookEvents, stripePayments, subscriptions } from "../drizzle/schema";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2023-10-16" });
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

export function verifyStripeWebhook(body: string, signature: string): Stripe.Event {
  if (!WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
}

/** Map Stripe subscription status to our subscriptions.status enum */
function mapStripeSubscriptionStatus(stripeStatus: string): "active" | "cancelled" | "expired" {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "canceled":
    case "cancelled":
    case "unpaid":
    case "past_due":
    case "incomplete_expired":
      return "cancelled";
    default:
      return "cancelled";
  }
}

/**
 * Idempotent process: record event, then handle by type. Returns true if processed (or already seen).
 */
export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<{ success: boolean; alreadyProcessed?: boolean }> {
  const db = await getDb();
  if (!db) {
    console.error("[Stripe webhook] Database not available");
    throw new Error("Database not available");
  }

  // Idempotency: if we already have this event, return success (Stripe may retry)
  const existing = await db
    .select()
    .from(stripeWebhookEvents)
    .where(eq(stripeWebhookEvents.stripeEventId, event.id))
    .limit(1);
  if (existing.length > 0) {
    return { success: true, alreadyProcessed: true };
  }

  // Store event (received)
  await db.insert(stripeWebhookEvents).values({
    stripeEventId: event.id,
    eventType: event.type,
    status: "received",
    payloadJson: JSON.stringify(event.data),
    createdAt: new Date(),
  });

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(db, event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(db, event.data.object as Stripe.PaymentIntent);
        break;
      case "charge.refunded":
        await handleChargeRefunded(db, event.data.object as Stripe.Charge);
        break;
      case "customer.subscription.created":
        await handleSubscriptionCreated(db, event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(db, event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(db, event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(db, event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(db, event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`[Stripe webhook] Unhandled event type: ${event.type}`);
    }

    await db
      .update(stripeWebhookEvents)
      .set({ status: "processed", processedAt: new Date() })
      .where(eq(stripeWebhookEvents.stripeEventId, event.id));
    return { success: true };
  } catch (err) {
    console.error("[Stripe webhook] Error processing event:", event.id, err);
    await db
      .update(stripeWebhookEvents)
      .set({
        status: "failed",
        errorMessage: err instanceof Error ? err.message : String(err),
        processedAt: new Date(),
      })
      .where(eq(stripeWebhookEvents.stripeEventId, event.id));
    throw err;
  }
}

async function handlePaymentIntentSucceeded(db: Awaited<ReturnType<typeof getDb>>, pi: Stripe.PaymentIntent) {
  if (!db) return;
  const existing = await db
    .select()
    .from(stripePayments)
    .where(eq(stripePayments.stripePaymentIntentId, pi.id))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(stripePayments)
      .set({ status: "succeeded", updatedAt: new Date() })
      .where(eq(stripePayments.stripePaymentIntentId, pi.id));
  } else {
    await db.insert(stripePayments).values({
      stripePaymentIntentId: pi.id,
      amountCents: pi.amount ?? null,
      currency: pi.currency ?? null,
      status: "succeeded",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

async function handlePaymentIntentFailed(db: Awaited<ReturnType<typeof getDb>>, pi: Stripe.PaymentIntent) {
  if (!db) return;
  const failureReason = pi.last_payment_error?.message ?? null;
  const existing = await db
    .select()
    .from(stripePayments)
    .where(eq(stripePayments.stripePaymentIntentId, pi.id))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(stripePayments)
      .set({ status: "failed", failureReason, updatedAt: new Date() })
      .where(eq(stripePayments.stripePaymentIntentId, pi.id));
  } else {
    await db.insert(stripePayments).values({
      stripePaymentIntentId: pi.id,
      amountCents: pi.amount ?? null,
      currency: pi.currency ?? null,
      status: "failed",
      failureReason,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

async function handleChargeRefunded(db: Awaited<ReturnType<typeof getDb>>, charge: Stripe.Charge) {
  if (!db || !charge.payment_intent) return;
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent.id;
  await db
    .update(stripePayments)
    .set({ status: "refunded", updatedAt: new Date() })
    .where(eq(stripePayments.stripePaymentIntentId, paymentIntentId));
}

async function handleSubscriptionCreated(db: Awaited<ReturnType<typeof getDb>>, sub: Stripe.Subscription) {
  if (!db) return;
  // We may not have a row yet (app creates subscription after payment; webhook can arrive first).
  // Update any subscription row that already has this stripeSubscriptionId (e.g. created by app).
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, sub.id))
    .limit(1);
  const status = mapStripeSubscriptionStatus(sub.status);
  const periodStart = new Date(sub.current_period_start * 1000);
  const periodEnd = new Date(sub.current_period_end * 1000);
  if (rows.length > 0) {
    await db
      .update(subscriptions)
      .set({
        status,
        subscriptionStartedAt: periodStart,
        subscriptionEndsAt: periodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, sub.id));
  }
  // If no row exists, subscription was created in Stripe only; app will link on next sync or we could create by metadata.userId if you add it.
}

async function handleSubscriptionUpdated(db: Awaited<ReturnType<typeof getDb>>, sub: Stripe.Subscription) {
  if (!db) return;
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, sub.id))
    .limit(1);
  if (rows.length === 0) return;
  const status = mapStripeSubscriptionStatus(sub.status);
  const periodStart = new Date(sub.current_period_start * 1000);
  const periodEnd = new Date(sub.current_period_end * 1000);
  await db
    .update(subscriptions)
    .set({
      status,
      subscriptionStartedAt: periodStart,
      subscriptionEndsAt: periodEnd,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, sub.id));
}

async function handleSubscriptionDeleted(db: Awaited<ReturnType<typeof getDb>>, sub: Stripe.Subscription) {
  if (!db) return;
  await db
    .update(subscriptions)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(subscriptions.stripeSubscriptionId, sub.id));
}

async function handleInvoicePaymentSucceeded(db: Awaited<ReturnType<typeof getDb>>, invoice: Stripe.Invoice) {
  if (!db || !invoice.subscription) return;
  const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription.id;
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subId))
    .limit(1);
  if (rows.length > 0) {
    await db
      .update(subscriptions)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(subscriptions.stripeSubscriptionId, subId));
  }
}

async function handleInvoicePaymentFailed(db: Awaited<ReturnType<typeof getDb>>, invoice: Stripe.Invoice) {
  if (!db || !invoice.subscription) return;
  const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription.id;
  await db
    .update(subscriptions)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(subscriptions.stripeSubscriptionId, subId));
}
