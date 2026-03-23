import Stripe from "stripe";
import { getDb } from "./db";
import { stripeWebhookEvents, subscriptions } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

async function persistWebhookEvent(event: Stripe.Event, status: "received" | "processed" | "failed", errorMessage?: string) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(stripeWebhookEvents).where(eq(stripeWebhookEvents.stripeEventId, event.id)).limit(1);
  if (existing[0]) {
    await db.update(stripeWebhookEvents).set({
      status,
      eventType: event.type,
      payloadJson: JSON.stringify(event),
      errorMessage: errorMessage ?? null,
      processedAt: status === 'processed' ? new Date() : existing[0].processedAt,
    }).where(eq(stripeWebhookEvents.stripeEventId, event.id));
    return;
  }
  await db.insert(stripeWebhookEvents).values({
    stripeEventId: event.id,
    eventType: event.type,
    status,
    payloadJson: JSON.stringify(event),
    errorMessage: errorMessage ?? null,
    processedAt: status === 'processed' ? new Date() : null,
  });
}

async function hasProcessedEvent(eventId: string) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select().from(stripeWebhookEvents).where(eq(stripeWebhookEvents.stripeEventId, eventId)).limit(1);
  return rows[0]?.status === 'processed';
}

/** Verify Stripe webhook signature */
export function verifyWebhookSignature(body: string, signature: string): Stripe.Event | null {
  if (!WEBHOOK_SECRET) {
    console.warn("[Stripe] Webhook secret not configured");
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error("[Stripe] Webhook signature verification failed:", err);
    return null;
  }
}

async function upsertSubscriptionState(userId: number, patch: Partial<typeof subscriptions.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  if (existing[0]) {
    await db.update(subscriptions).set({ ...patch, updatedAt: new Date() }).where(eq(subscriptions.userId, userId));
  } else {
    const now = new Date();
    await db.insert(subscriptions).values({
      userId,
      status: (patch.status as any) || 'trial',
      trialEndsAt: patch.trialEndsAt || new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      trialStartedAt: patch.trialStartedAt || now,
      subscriptionStartedAt: patch.subscriptionStartedAt || null,
      subscriptionEndsAt: patch.subscriptionEndsAt || null,
      paymentMethod: patch.paymentMethod || 'stripe',
    });
  }
}

export async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const userId = Number(paymentIntent.metadata?.userId);
  if (!userId) return;
  const now = new Date();
  await upsertSubscriptionState(userId, {
    status: 'active',
    subscriptionStartedAt: now,
    subscriptionEndsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    paymentMethod: 'stripe',
  });
}

export async function handleCustomerSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = Number(subscription.metadata?.userId);
  if (!userId) return;
  const status = subscription.status === 'active' ? 'active' : subscription.status === 'trialing' ? 'trial' : 'cancelled';
  const periodStart = (subscription as any).current_period_start ? new Date((subscription as any).current_period_start * 1000) : new Date();
  const periodEnd = (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : new Date();
  await upsertSubscriptionState(userId, {
    status: status as any,
    subscriptionStartedAt: periodStart,
    subscriptionEndsAt: periodEnd,
    paymentMethod: 'stripe',
  });
}

export async function handleCustomerSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = Number(subscription.metadata?.userId);
  if (!userId) return;
  await upsertSubscriptionState(userId, {
    status: 'cancelled',
    subscriptionEndsAt: new Date(),
    paymentMethod: 'stripe',
  });
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const userId = Number((invoice as any).parent?.subscription_details?.metadata?.userId || (invoice as any).subscription_details?.metadata?.userId || invoice.metadata?.userId);
  if (!userId) return;
  await upsertSubscriptionState(userId, {
    status: 'expired',
    subscriptionEndsAt: new Date(),
    paymentMethod: 'stripe',
  });
}

export async function handleStripeWebhookEvent(event: Stripe.Event) {
  if (await hasProcessedEvent(event.id)) {
    return { duplicate: true };
  }

  await persistWebhookEvent(event, 'received');
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
        await handleCustomerSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleCustomerSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log('[Stripe] Unhandled event type:', event.type);
    }
    await persistWebhookEvent(event, 'processed');
    return { duplicate: false };
  } catch (error: any) {
    await persistWebhookEvent(event, 'failed', error?.message || 'Unknown error');
    throw error;
  }
}
