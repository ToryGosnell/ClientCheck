import { eq } from "drizzle-orm";
import { subscriptions, users } from "../drizzle/schema";
import { getDb } from "./db";
import {
  CONTRACTOR_ANNUAL_PRICE_CENTS,
  CONTRACTOR_PRO_MONTHLY_PRICE_CENTS,
  CUSTOMER_MONTHLY_PRICE_CENTS,
  type DbSubscriptionPlanType,
} from "../shared/billing-config";

const TRIAL_DAYS = 365;
const OWNER_OPEN_ID = process.env.OWNER_OPEN_ID || "owner-clientcheck";
const CARD_PROMPT_DAYS = 3;

// ── Core CRUD ─────────────────────────────────────────────────────────────────

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

// ── Upgrade / activate paid plan ──────────────────────────────────────────────

export async function upgradeToSubscription(
  userId: number,
  planType?: "monthly" | "yearly" | string | null,
  stripeSubscriptionId?: string | null,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const resolvedPlan = resolvePlanType(planType);
  const now = new Date();
  const daysInPlan =
    resolvedPlan === "customer_monthly" || resolvedPlan === "contractor_pro_monthly" ? 30 : 365;
  const subscriptionEndsAt = new Date(now.getTime() + daysInPlan * 24 * 60 * 60 * 1000);
  const amountCents =
    resolvedPlan === "customer_monthly"
      ? CUSTOMER_MONTHLY_PRICE_CENTS
      : resolvedPlan === "contractor_pro_monthly"
        ? CONTRACTOR_PRO_MONTHLY_PRICE_CENTS
        : CONTRACTOR_ANNUAL_PRICE_CENTS;

  const existing = await getSubscription(userId);
  const values = {
    status: "active" as const,
    planType: resolvedPlan,
    subscriptionStartedAt: now,
    subscriptionEndsAt,
    nextBillingAmount: String(amountCents / 100) as any,
    nextBillingDate: subscriptionEndsAt,
    ...(stripeSubscriptionId != null && { stripeSubscriptionId }),
  };

  if (existing) {
    await db.update(subscriptions).set(values).where(eq(subscriptions.userId, userId));
  } else {
    await db.insert(subscriptions).values({
      userId,
      trialStartedAt: now,
      trialEndsAt: now,
      ...values,
    });
  }
}

/**
 * Link a Stripe customer + payment method to the user's subscription row.
 * Called after successful SetupIntent or PaymentIntent.
 */
export async function linkStripeCustomer(
  userId: number,
  stripeCustomerId: string,
  stripeDefaultPaymentMethodId?: string | null,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getSubscription(userId);
  const now = new Date();
  const set: Record<string, unknown> = {
    stripeCustomerId,
    paymentMethodOnFile: true,
    ...(stripeDefaultPaymentMethodId && { stripeDefaultPaymentMethodId }),
  };
  if (existing) {
    await db.update(subscriptions).set(set).where(eq(subscriptions.userId, userId));
  } else {
    await db.insert(subscriptions).values({
      userId,
      status: "trial",
      trialStartedAt: now,
      trialEndsAt: now,
      ...set,
    } as any);
  }
}

/**
 * Record the Stripe subscription ID + activate the subscription.
 * Only marks active if stripeSubscriptionId is a real Stripe ID.
 */
export async function activateStripeSubscription(
  userId: number,
  stripeSubscriptionId: string,
  planType: DbSubscriptionPlanType,
  periodEnd?: Date,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  await db.update(subscriptions).set({
    status: "active",
    planType,
    stripeSubscriptionId,
    subscriptionStartedAt: now,
    subscriptionEndsAt: periodEnd ?? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
  }).where(eq(subscriptions.userId, userId));
}

// ── Cancel ────────────────────────────────────────────────────────────────────

export async function cancelSubscription(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(subscriptions).set({ status: "cancelled" }).where(eq(subscriptions.userId, userId));
}

// ── Status check ──────────────────────────────────────────────────────────────

export async function checkSubscriptionStatus(userId: number, openId: string) {
  if (openId === OWNER_OPEN_ID) {
    return {
      isActive: true, isOwner: true, status: "owner",
      daysRemaining: null, shouldShowCardPrompt: false, shouldSendReminder: false,
    };
  }

  const database = await getDb();
  if (!database) {
    return {
      isActive: false, isOwner: false, status: "no_subscription",
      daysRemaining: null, shouldShowCardPrompt: false, shouldSendReminder: false,
    };
  }

  const [userRow] = await database
    .select({ role: users.role, isVerified: users.isVerified })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  /** Full app preview in admin sessions — does not grant Stripe entitlements. */
  if (userRow?.role === "admin") {
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

  if (userRow?.role === "customer") {
    const now = new Date();
    const paidIdentitySub =
      !!sub &&
      sub.planType === "customer_monthly" &&
      (sub.status === "active" || sub.status === "trial") &&
      !!sub.subscriptionEndsAt &&
      sub.subscriptionEndsAt > now;

    if (paidIdentitySub && sub.subscriptionEndsAt) {
      const daysRemaining = Math.ceil(
        (sub.subscriptionEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
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

    /** One-time Checkout identity verification (webhook sets users.isVerified). */
    if (userRow.isVerified) {
      return {
        isActive: true,
        isOwner: false,
        status: "active",
        daysRemaining: null,
        shouldShowCardPrompt: false,
        shouldSendReminder: false,
      };
    }

    return {
      isActive: true,
      isOwner: false,
      status: "customer_free",
      daysRemaining: null,
      shouldShowCardPrompt: false,
      shouldSendReminder: false,
    };
  }

  if (!sub) {
    return {
      isActive: false, isOwner: false, status: "no_subscription",
      daysRemaining: null, shouldShowCardPrompt: false, shouldSendReminder: false,
    };
  }

  const now = new Date();

  if (sub.status === "trial" && sub.trialEndsAt > now) {
    const daysRemaining = Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return {
      isActive: true, isOwner: false, status: "trial", daysRemaining,
      shouldShowCardPrompt: daysRemaining <= CARD_PROMPT_DAYS,
      shouldSendReminder: daysRemaining === 3,
    };
  }

  if (sub.status === "active" && sub.subscriptionEndsAt && sub.subscriptionEndsAt > now) {
    const daysRemaining = Math.ceil((sub.subscriptionEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return {
      isActive: true, isOwner: false, status: "active", daysRemaining,
      shouldShowCardPrompt: false, shouldSendReminder: false,
    };
  }

  return {
    isActive: false, isOwner: false, status: "expired", daysRemaining: 0,
    shouldShowCardPrompt: false, shouldSendReminder: false,
  };
}

// ── Verified contractor free year ─────────────────────────────────────────────

export async function activateVerifiedFreeYear(
  userId: number,
  freeTrialStartAt: Date,
  freeTrialEndAt: Date,
  annualPrice: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getSubscription(userId);
  const values = {
    status: "trial" as const,
    planType: "verified_contractor_free_year" as const,
    freeTrialStartAt,
    freeTrialEndAt,
    trialStartedAt: freeTrialStartAt,
    trialEndsAt: freeTrialEndAt,
    nextBillingAmount: String(annualPrice) as any,
    nextBillingDate: freeTrialEndAt,
  };
  if (existing) {
    await db.update(subscriptions).set(values).where(eq(subscriptions.userId, userId));
  } else {
    await db.insert(subscriptions).values({ userId, ...values });
  }
}

// ── Reminders ─────────────────────────────────────────────────────────────────

export async function markReminderSent(userId: number) {
  await markRenewalReminderSent(userId);
}

export async function markRenewalReminderSent(userId: number, milestone?: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions).set({
    renewalReminderSentAt: new Date(),
    ...(milestone != null && { lastReminderDaysMilestone: milestone }),
  }).where(eq(subscriptions.userId, userId));
}

// ── Exports ───────────────────────────────────────────────────────────────────

/**
 * Push subscription/trial end dates forward by referral rewards (best-effort; Stripe-managed periods may need dashboard sync).
 */
export async function extendSubscriptionEndDate(userId: number, newEnd: Date): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  const sub = await getSubscription(userId);
  if (!sub) {
    await db.insert(subscriptions).values({
      userId,
      status: "trial",
      planType: "none",
      trialStartedAt: now,
      trialEndsAt: newEnd,
      subscriptionStartedAt: now,
      subscriptionEndsAt: newEnd,
      nextBillingDate: newEnd,
    } as Record<string, unknown>);
    return;
  }

  const nextTrial = sub.trialEndsAt
    ? new Date(Math.max(sub.trialEndsAt.getTime(), newEnd.getTime()))
    : newEnd;
  const nextSub = sub.subscriptionEndsAt
    ? new Date(Math.max(sub.subscriptionEndsAt.getTime(), newEnd.getTime()))
    : newEnd;
  const billing = nextSub.getTime() > nextTrial.getTime() ? nextSub : nextTrial;
  await db
    .update(subscriptions)
    .set({
      trialEndsAt: nextTrial,
      subscriptionEndsAt: nextSub,
      nextBillingDate: billing,
      updatedAt: now,
    })
    .where(eq(subscriptions.userId, userId));
}

export const SUBSCRIPTION_PRICE = 9.99;
export const SUBSCRIPTION_PRICE_YEAR = 120.0;
export const TRIAL_DAYS_COUNT = TRIAL_DAYS;
export const CARD_PROMPT_THRESHOLD = CARD_PROMPT_DAYS;

export function getPricingInfo() {
  return {
    trial: { days: TRIAL_DAYS, price: 0, requiresCard: false },
    monthly: { price: 9.99, currency: "USD", billingCycle: "month" },
    yearly: { price: 100.0, currency: "USD", billingCycle: "year", savings: 19.88, monthlyEquivalent: 8.33, nonRefundable: true },
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function resolvePlanType(plan?: string | null): DbSubscriptionPlanType {
  if (!plan) return "contractor_annual";
  if (plan === "contractor_pro_monthly") return "contractor_pro_monthly";
  if (plan === "monthly" || plan === "customer_monthly" || plan === "customer_identity_verification") {
    return "customer_monthly";
  }
  if (plan === "yearly" || plan === "annual_paid" || plan === "contractor_annual") return "contractor_annual";
  return "contractor_annual";
}
