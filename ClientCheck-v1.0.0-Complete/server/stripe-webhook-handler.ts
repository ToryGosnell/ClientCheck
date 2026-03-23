/**
 * Stripe webhook handling — keeps app accurate when user closes mid-payment.
 * Listens for: successful payment, failed payment, subscription lifecycle, refunds.
 * Uses getDb() and stripeWebhookEvents for idempotency; updates stripePayments and subscriptions.
 */

import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { stripeWebhookEvents, stripePayments, subscriptions, users } from "../drizzle/schema";
import type { BillingPlanType } from "../shared/billing-config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

export function verifyStripeWebhook(body: string | Buffer, signature: string): Stripe.Event {
  if (!WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
}

/** Extract period dates from subscription (property names vary across Stripe SDK versions) */
function getSubPeriod(sub: Record<string, any>): { start: Date; end: Date } {
  const startTs = sub.current_period_start ?? Math.floor(Date.now() / 1000);
  const endTs = sub.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 86400;
  return { start: new Date(startTs * 1000), end: new Date(endTs * 1000) };
}

/** Extract subscription ID from an Invoice (property name varies across Stripe SDK versions) */
function getInvoiceSubId(invoice: Record<string, any>): string | null {
  const sub = invoice.subscription ?? invoice.subscription_details?.metadata?.subscription_id;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id ?? null;
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
  console.log("Webhook received:", event.type);
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
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(db, event.data.object as Stripe.Checkout.Session);
        break;
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
  const userId = pi.metadata?.userId ? Number(pi.metadata.userId) : null;
  const existing = await db
    .select()
    .from(stripePayments)
    .where(eq(stripePayments.stripePaymentIntentId, pi.id))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(stripePayments)
      .set({ status: "succeeded", ...(userId && { userId }), updatedAt: new Date() })
      .where(eq(stripePayments.stripePaymentIntentId, pi.id));
  } else {
    await db.insert(stripePayments).values({
      stripePaymentIntentId: pi.id,
      userId,
      amountCents: pi.amount ?? null,
      currency: pi.currency ?? null,
      status: "succeeded",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // If payment method was attached, record it on the user's subscription
  if (userId && pi.payment_method) {
    const pmId = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method.id;
    const subRows = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
    if (subRows.length > 0) {
      await db.update(subscriptions).set({
        paymentMethodOnFile: true,
        stripeDefaultPaymentMethodId: pmId,
      }).where(eq(subscriptions.userId, userId));
    }
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
  const status = mapStripeSubscriptionStatus(sub.status);
  const { start: periodStart, end: periodEnd } = getSubPeriod(sub);

  // Try to find existing row by stripeSubscriptionId
  const bySubId = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, sub.id))
    .limit(1);

  if (bySubId.length > 0) {
    await db.update(subscriptions).set({
      status, subscriptionStartedAt: periodStart, subscriptionEndsAt: periodEnd, updatedAt: new Date(),
    }).where(eq(subscriptions.stripeSubscriptionId, sub.id));
    return;
  }

  // No row by sub ID — try to link by userId from metadata
  const userIdStr = sub.metadata?.userId;
  if (!userIdStr) return;
  const userId = Number(userIdStr);
  if (!userId || isNaN(userId)) return;

  const byUserId = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (byUserId.length > 0) {
    await db.update(subscriptions).set({
      status, stripeSubscriptionId: sub.id,
      subscriptionStartedAt: periodStart, subscriptionEndsAt: periodEnd, updatedAt: new Date(),
    }).where(eq(subscriptions.userId, userId));
  } else {
    await db.insert(subscriptions).values({
      userId, status, stripeSubscriptionId: sub.id,
      subscriptionStartedAt: periodStart, subscriptionEndsAt: periodEnd,
      trialStartedAt: periodStart, trialEndsAt: periodStart,
    });
  }
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
  const { start: periodStart, end: periodEnd } = getSubPeriod(sub);
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
  const subId = getInvoiceSubId(invoice);
  if (!db || !subId) return;
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
  const subId = getInvoiceSubId(invoice);
  if (!db || !subId) return;
  await db
    .update(subscriptions)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(subscriptions.stripeSubscriptionId, subId));
}

/**
 * checkout.session.completed — the primary event for Stripe Checkout flows.
 * Links the Stripe customer, subscription, and payment to the app user,
 * then activates their subscription.
 */
async function handleCheckoutSessionCompleted(
  db: Awaited<ReturnType<typeof getDb>>,
  session: Stripe.Checkout.Session,
) {
  if (!db) return;

  const userIdStr = session.metadata?.userId;
  const userId = userIdStr ? Number(userIdStr) : null;
  const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;
  const stripeCustomerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id ?? null;
  const stripeSubscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : (session.subscription as any)?.id ?? null;
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : (session.payment_intent as any)?.id ?? null;
  const planType = (session.metadata?.planType ?? session.metadata?.plan ?? null) as BillingPlanType | null;

  console.log("[Stripe webhook] checkout.session.completed", {
    userId, customerEmail, stripeCustomerId, stripeSubscriptionId, paymentIntentId, planType,
    mode: session.mode, status: session.payment_status,
  });

  if (!userId && !customerEmail) {
    console.warn("[Stripe webhook] checkout.session.completed: no userId or email — cannot link to user");
    return;
  }

  // Resolve user: prefer userId from metadata, fall back to email lookup
  let resolvedUserId = userId;
  if (!resolvedUserId && customerEmail) {
    const userRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, customerEmail))
      .limit(1);
    if (userRows.length > 0) {
      resolvedUserId = userRows[0].id;
    }
  }

  if (!resolvedUserId) {
    console.warn("[Stripe webhook] checkout.session.completed: could not resolve userId");
    return;
  }

  // Record payment if there is a payment_intent
  if (paymentIntentId) {
    const existingPayment = await db
      .select()
      .from(stripePayments)
      .where(eq(stripePayments.stripePaymentIntentId, paymentIntentId))
      .limit(1);

    if (existingPayment.length > 0) {
      await db
        .update(stripePayments)
        .set({ status: "succeeded", userId: resolvedUserId, updatedAt: new Date() })
        .where(eq(stripePayments.stripePaymentIntentId, paymentIntentId));
    } else {
      await db.insert(stripePayments).values({
        stripePaymentIntentId: paymentIntentId,
        userId: resolvedUserId,
        amountCents: session.amount_total ?? null,
        currency: session.currency ?? null,
        status: "succeeded",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // Determine plan type from metadata or price lookup
  let resolvedPlanType: BillingPlanType = planType ?? "none";
  if (resolvedPlanType === "none" && stripeSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      const priceId = sub.items?.data?.[0]?.price?.id;
      const { STRIPE_PRICE_ID_CONTRACTOR_ANNUAL, STRIPE_PRICE_ID_CUSTOMER_MONTHLY } =
        await import("../shared/billing-config");
      if (priceId === STRIPE_PRICE_ID_CONTRACTOR_ANNUAL) resolvedPlanType = "contractor_annual";
      else if (priceId === STRIPE_PRICE_ID_CUSTOMER_MONTHLY) resolvedPlanType = "customer_monthly";
    } catch (e) {
      console.warn("[Stripe webhook] Could not look up subscription for plan detection:", e);
    }
  }

  // Upsert subscription record
  const now = new Date();
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const periodEnd = resolvedPlanType === "contractor_annual" ? oneYearFromNow : oneMonthFromNow;

  const existingSub = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, resolvedUserId))
    .limit(1);

  const subUpdate = {
    status: "active" as const,
    planType: resolvedPlanType !== "none" ? resolvedPlanType : undefined,
    stripeCustomerId: stripeCustomerId ?? undefined,
    stripeSubscriptionId: stripeSubscriptionId ?? undefined,
    subscriptionStartedAt: now,
    subscriptionEndsAt: periodEnd,
    paymentMethodOnFile: true,
    updatedAt: now,
  };

  if (existingSub.length > 0) {
    await db
      .update(subscriptions)
      .set(subUpdate)
      .where(eq(subscriptions.userId, resolvedUserId));
  } else {
    await db.insert(subscriptions).values({
      userId: resolvedUserId,
      ...subUpdate,
      trialStartedAt: now,
      trialEndsAt: now,
    });
  }

  console.log(`[Stripe webhook] checkout.session.completed: activated ${resolvedPlanType} for user ${resolvedUserId}`);
}
