import { and, eq } from "drizzle-orm";
import { subscriptions, type InsertSubscription } from "../drizzle/schema";
import { getDb } from "./db";

const TRIAL_DAYS = 90;
const SUBSCRIPTION_PRICE_MONTHLY = 9.99;
const SUBSCRIPTION_PRICE_YEARLY = 100.0;
const OWNER_OPEN_ID = process.env.OWNER_OPEN_ID || "owner-clientcheck";
const REQUIRE_CC_AT_TRIAL_END = true;
const CARD_PROMPT_DAYS = 3; // Show card prompt 3 days before trial ends

export async function createTrialSubscription(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const result = await db.insert(subscriptions).values({
    userId,
    status: "trial",
    trialStartedAt: now,
    trialEndsAt,
  });

  return result[0].insertId as number;
}

export async function getSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

export async function upgradeToSubscription(
  userId: number,
  planType: "monthly" | "yearly" = "monthly",
  stripeSubscriptionId?: string | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const subscriptionEndsAt = new Date(
    now.getTime() + (planType === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000
  );

  await db
    .update(subscriptions)
    .set({
      status: "active",
      subscriptionStartedAt: now,
      subscriptionEndsAt,
      ...(stripeSubscriptionId != null && { stripeSubscriptionId }),
    })
    .where(eq(subscriptions.userId, userId));

  if (stripeSubscriptionId) {
    console.log(`User ${userId} upgraded to ${planType} plan; Stripe sub ${stripeSubscriptionId}`);
  }
}

export async function cancelSubscription(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(subscriptions)
    .set({ status: "cancelled" })
    .where(eq(subscriptions.userId, userId));
}

export async function checkSubscriptionStatus(userId: number, openId: string) {
  // Owner bypass
  if (openId === OWNER_OPEN_ID) {
    return {
      isActive: true,
      isOwner: true,
      status: "owner",
      daysRemaining: null,
      shouldShowCardPrompt: false,
      shouldSendReminder: false,
    };
  }

  const sub = await getSubscription(userId);
  if (!sub) {
    return {
      isActive: false,
      isOwner: false,
      status: "no_subscription",
      daysRemaining: null,
      shouldShowCardPrompt: false,
      shouldSendReminder: false,
    };
  }

  const now = new Date();

  // Check if trial is still active
  if (sub.status === "trial" && sub.trialEndsAt > now) {
    const daysRemaining = Math.ceil(
      (sub.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );
    const shouldShowCardPrompt = daysRemaining <= CARD_PROMPT_DAYS;
    const shouldSendReminder = daysRemaining === 3;
    return {
      isActive: true,
      isOwner: false,
      status: "trial",
      daysRemaining,
      shouldShowCardPrompt,
      shouldSendReminder,
    };
  }

  // Check if subscription is active
  if (
    sub.status === "active" &&
    sub.subscriptionEndsAt &&
    sub.subscriptionEndsAt > now
  ) {
    const daysRemaining = Math.ceil(
      (sub.subscriptionEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );
    return {
      isActive: true,
      isOwner: false,
      status: "active",
      daysRemaining,
      shouldShowCardPrompt: false,
      shouldSendReminder: false,
    };
  }

  // Subscription expired
  return {
    isActive: false,
    isOwner: false,
    status: "expired",
    daysRemaining: 0,
    shouldShowCardPrompt: false,
    shouldSendReminder: false,
  };
}

export const SUBSCRIPTION_PRICE = SUBSCRIPTION_PRICE_MONTHLY;
export const SUBSCRIPTION_PRICE_YEAR = SUBSCRIPTION_PRICE_YEARLY;
export const TRIAL_DAYS_COUNT = TRIAL_DAYS;
export const CARD_PROMPT_THRESHOLD = CARD_PROMPT_DAYS;

export function getPricingInfo() {
  return {
    trial: {
      days: TRIAL_DAYS,
      price: 0,
      requiresCard: false,
    },
    monthly: {
      price: SUBSCRIPTION_PRICE_MONTHLY,
      currency: "USD",
      billingCycle: "month",
    },
    yearly: {
      price: SUBSCRIPTION_PRICE_YEARLY,
      currency: "USD",
      billingCycle: "year",
      savings: 19.88,
      monthlyEquivalent: 8.33,
      nonRefundable: true,
    },
  };
}

export async function markCardPromptShown(userId: number) {
  // Track in local state or separate table in production
  console.log(`Card prompt shown for user ${userId}`);
}

export async function markReminderSent(userId: number) {
  // Track in local state or separate table in production
  console.log(`Reminder sent for user ${userId}`);
}
