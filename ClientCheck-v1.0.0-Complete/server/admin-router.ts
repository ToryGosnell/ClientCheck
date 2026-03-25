import { z } from "zod";
import { eq, like, desc, or, sql, and, gte, isNotNull, inArray } from "drizzle-orm";
import { adminProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import * as dbModule from "./db";
import {
  users,
  reviews,
  reviewDisputes,
  subscriptions,
  stripePayments,
  adminAuditLog,
  reviewModerations,
  contractorProfiles,
  customers,
} from "../drizzle/schema";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

async function logAction(adminId: number, action: string, targetType: string, targetId?: string | number, details?: string) {
  const db = await getDb();
  if (!db) return;
  console.log(
    `[admin-audit] adminUserId=${adminId} action=${action} target=${targetType}:${targetId ?? "—"}${details ? ` details=${details.slice(0, 200)}` : ""}`,
  );
  await db.insert(adminAuditLog).values({
    adminUserId: adminId,
    action,
    targetType,
    targetId: targetId != null ? String(targetId) : null,
    details: details ?? null,
  });
}

function n(v: any): number { return Number(v?.c ?? v ?? 0); }

export const adminRouter = router({
  // ─── Dashboard stats ─────────────────────────────────────────────────────────
  stats: adminProcedure.query(async () => {
    const db = await getDb();
    const zero = {
      totalUsers: 0,
      totalReviews: 0,
      totalContractors: 0,
      totalCustomers: 0,
      pendingContractorVerifications: 0,
      activeContractors: 0, freeYearContractors: 0, renewalsDueSoon: 0, activePaid: 0,
      pendingDisputes: 0, flaggedReviews: 0,
      revenue30d: 0, refunds30d: 0,
      failedPayments30d: 0,
      newContractors7d: 0, newReviews7d: 0,
      conversionToPaidPct: 0,
      reviewsUnderReview: 0,
      disputesResolved7d: 0,
      moderationBacklog: 0,
      // chart data
      revenueTimeline: [] as { day: string; cents: number }[],
      disputeActivity: [] as { day: string; opened: number; resolved: number }[],
      funnelData: { freeYear: 0, renewalsDue: 0, paid: 0 },
    };
    if (!db) return zero;

    const now = new Date();
    const DAY = 86400000;
    const d7 = new Date(now.getTime() - 7 * DAY);
    const d30 = new Date(now.getTime() - 30 * DAY);
    const d30f = new Date(now.getTime() + 30 * DAY);

    const [totalUsers] = await db.select({ c: sql<number>`count(*)` }).from(users);
    const [totalReviews] = await db.select({ c: sql<number>`count(*)` }).from(reviews);

    const [totalContractors] = await db
      .select({ c: sql<number>`count(*)` })
      .from(users)
      .where(inArray(users.role, ["contractor", "user"]));
    const [totalCustomers] = await db.select({ c: sql<number>`count(*)` }).from(users).where(eq(users.role, "customer"));
    let pendingContractorVerifications = 0;
    try {
      const [pcv] = await db
        .select({ c: sql<number>`count(*)` })
        .from(contractorProfiles)
        .where(eq(contractorProfiles.verificationStatus, "pending"));
      pendingContractorVerifications = n(pcv);
    } catch {
      /* schema drift */
    }

    const [activeContractors] = await db.select({ c: sql<number>`count(*)` }).from(subscriptions)
      .where(or(eq(subscriptions.status, "active"), eq(subscriptions.status, "trial")));

    const [freeYear] = await db.select({ c: sql<number>`count(*)` }).from(subscriptions)
      .where(and(eq(subscriptions.planType, "verified_contractor_free_year"), eq(subscriptions.status, "trial")));

    const [renewals] = await db.select({ c: sql<number>`count(*)` }).from(subscriptions)
      .where(and(
        or(eq(subscriptions.status, "active"), eq(subscriptions.status, "trial")),
        isNotNull(subscriptions.subscriptionEndsAt),
        sql`${subscriptions.subscriptionEndsAt} <= ${d30f}`,
        sql`${subscriptions.subscriptionEndsAt} > ${now}`,
      ));

    const [activePaid] = await db.select({ c: sql<number>`count(*)` }).from(subscriptions)
      .where(and(eq(subscriptions.status, "active"), eq(subscriptions.planType, "contractor_annual")));

    const [pendingDisputes] = await db.select({ c: sql<number>`count(*)` }).from(reviewDisputes)
      .where(eq(reviewDisputes.status, "open"));

    const [flaggedReviews] = await db.select({ c: sql<number>`count(*)` }).from(reviews)
      .where(isNotNull(reviews.hiddenAt));

    const [rev30] = await db.select({ c: sql<number>`COALESCE(SUM(amount_cents), 0)` }).from(stripePayments)
      .where(and(eq(stripePayments.status, "succeeded"), gte(stripePayments.createdAt, d30)));

    const [ref30] = await db.select({ c: sql<number>`COALESCE(SUM(amount_cents), 0)` }).from(stripePayments)
      .where(and(eq(stripePayments.status, "refunded"), gte(stripePayments.createdAt, d30)));

    const [failedPay] = await db.select({ c: sql<number>`count(*)` }).from(stripePayments)
      .where(and(eq(stripePayments.status, "failed"), gte(stripePayments.createdAt, d30)));

    const [newUsers7] = await db.select({ c: sql<number>`count(*)` }).from(users)
      .where(gte(users.createdAt, d7));

    const [newReviews7] = await db.select({ c: sql<number>`count(*)` }).from(reviews)
      .where(gte(reviews.createdAt, d7));

    const [disputesResolved7] = await db.select({ c: sql<number>`count(*)` }).from(reviewDisputes)
      .where(and(
        or(eq(reviewDisputes.status, "resolved"), eq(reviewDisputes.status, "dismissed")),
        gte(reviewDisputes.resolvedAt, d7),
      ));

    let reviewsUnderReview = 0;
    let moderationBacklog = 0;
    try {
      const [rur] = await db.select({ c: sql<number>`count(*)` }).from(reviewModerations)
        .where(eq(reviewModerations.status, "pending"));
      reviewsUnderReview = n(rur);
      moderationBacklog = reviewsUnderReview;
    } catch { /* table may not exist yet */ }

    const actC = n(activeContractors);
    const paidC = n(activePaid);
    const convPct = actC > 0 ? Math.round((paidC / actC) * 100) : 0;

    // Revenue timeline (daily for 30 days)
    let revenueTimeline: { day: string; cents: number }[] = [];
    try {
      const rows = await db.select({
        day: sql<string>`DATE(${stripePayments.createdAt})`,
        cents: sql<number>`COALESCE(SUM(amount_cents), 0)`,
      }).from(stripePayments)
        .where(and(eq(stripePayments.status, "succeeded"), gte(stripePayments.createdAt, d30)))
        .groupBy(sql`DATE(${stripePayments.createdAt})`)
        .orderBy(sql`DATE(${stripePayments.createdAt})`);
      revenueTimeline = rows.map(r => ({ day: String(r.day), cents: Number(r.cents) }));
    } catch { /* ignore */ }

    // Dispute activity (daily for 30 days)
    let disputeActivity: { day: string; opened: number; resolved: number }[] = [];
    try {
      const openedRows = await db.select({
        day: sql<string>`DATE(${reviewDisputes.createdAt})`,
        c: sql<number>`count(*)`,
      }).from(reviewDisputes)
        .where(gte(reviewDisputes.createdAt, d30))
        .groupBy(sql`DATE(${reviewDisputes.createdAt})`);

      const resolvedRows = await db.select({
        day: sql<string>`DATE(${reviewDisputes.resolvedAt})`,
        c: sql<number>`count(*)`,
      }).from(reviewDisputes)
        .where(and(isNotNull(reviewDisputes.resolvedAt), gte(reviewDisputes.resolvedAt, d30)))
        .groupBy(sql`DATE(${reviewDisputes.resolvedAt})`);

      const map = new Map<string, { opened: number; resolved: number }>();
      for (const r of openedRows) { const k = String(r.day); map.set(k, { opened: Number(r.c), resolved: map.get(k)?.resolved ?? 0 }); }
      for (const r of resolvedRows) { const k = String(r.day); const e = map.get(k) ?? { opened: 0, resolved: 0 }; e.resolved = Number(r.c); map.set(k, e); }
      disputeActivity = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, v]) => ({ day, ...v }));
    } catch { /* ignore */ }

    return {
      totalUsers: n(totalUsers),
      totalReviews: n(totalReviews),
      totalContractors: n(totalContractors),
      totalCustomers: n(totalCustomers),
      pendingContractorVerifications,
      activeContractors: actC,
      freeYearContractors: n(freeYear),
      renewalsDueSoon: n(renewals),
      activePaid: paidC,
      pendingDisputes: n(pendingDisputes),
      flaggedReviews: n(flaggedReviews),
      revenue30d: n(rev30),
      refunds30d: n(ref30),
      failedPayments30d: n(failedPay),
      newContractors7d: n(newUsers7),
      newReviews7d: n(newReviews7),
      conversionToPaidPct: convPct,
      reviewsUnderReview,
      disputesResolved7d: n(disputesResolved7),
      moderationBacklog,
      revenueTimeline,
      disputeActivity,
      funnelData: { freeYear: n(freeYear), renewalsDue: n(renewals), paid: paidC },
    };
  }),

  // ─── Users ───────────────────────────────────────────────────────────────────
  listUsers: adminProcedure
    .input(z.object({ query: z.string().default(""), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const q = input.query.trim();
      const base = q
        ? db.select().from(users).where(or(like(users.name, `%${q}%`), like(users.email, `%${q}%`)))
        : db.select().from(users);
      return base.orderBy(desc(users.createdAt)).limit(input.limit).offset(input.offset);
    }),

  /** Users + subscription row + contractor verification (one row per user; best-effort joins). */
  listUsersAdmin: adminProcedure
    .input(z.object({ query: z.string().default(""), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const q = input.query.trim();
      const sel = {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isVerified: users.isVerified,
        accountStatus: users.accountStatus,
        createdAt: users.createdAt,
        subStatus: subscriptions.status,
        subPlan: subscriptions.planType,
        contractorVerification: contractorProfiles.verificationStatus,
      };
      const base = db
        .select(sel)
        .from(users)
        .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
        .leftJoin(contractorProfiles, eq(contractorProfiles.userId, users.id));
      if (q) {
        return base
          .where(or(like(users.name, `%${q}%`), like(users.email, `%${q}%`)))
          .orderBy(desc(users.createdAt))
          .limit(input.limit)
          .offset(input.offset);
      }
      return base.orderBy(desc(users.createdAt)).limit(input.limit).offset(input.offset);
    }),

  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["user", "admin", "contractor", "customer"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id && input.role !== "admin") {
        throw new Error("You cannot remove your own admin role.");
      }
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      await database.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      await logAction(ctx.user.id, "update_user_role", "user", input.userId, `role=${input.role}`);
      return { success: true as const };
    }),

  setUserAccountStatus: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        status: z.enum(["active", "suspended", "deleted"]),
        reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id && input.status !== "active") {
        throw new Error("You cannot suspend or delete your own account from the admin console.");
      }
      const database = await getDb();
      if (!database) throw new Error("Database not available");
      await database.update(users).set({ accountStatus: input.status }).where(eq(users.id, input.userId));
      await logAction(
        ctx.user.id,
        "set_account_status",
        "user",
        input.userId,
        `${input.status}${input.reason ? `: ${input.reason}` : ""}`,
      );
      return { success: true as const };
    }),

  dashboardFeed: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return { recentDisputes: [] as unknown[], pendingVerifications: [] as unknown[], flaggedReviews: [] as unknown[] };
    }
    const recentDisputes = await db.select().from(reviewDisputes).orderBy(desc(reviewDisputes.createdAt)).limit(10);
    const pendingVerifications = await db
      .select({
        userId: contractorProfiles.userId,
        trade: contractorProfiles.trade,
        licenseNumber: contractorProfiles.licenseNumber,
        company: contractorProfiles.company,
        verificationSubmittedAt: contractorProfiles.verificationSubmittedAt,
      })
      .from(contractorProfiles)
      .where(eq(contractorProfiles.verificationStatus, "pending"))
      .orderBy(desc(contractorProfiles.verificationSubmittedAt))
      .limit(12);
    const flaggedReviews = await db
      .select({
        id: reviews.id,
        moderationStatus: reviews.moderationStatus,
        overallRating: reviews.overallRating,
        reviewText: reviews.reviewText,
        customerId: reviews.customerId,
        createdAt: reviews.createdAt,
        hiddenAt: reviews.hiddenAt,
      })
      .from(reviews)
      .where(
        or(
          isNotNull(reviews.hiddenAt),
          inArray(reviews.moderationStatus, ["hidden_flagged", "under_investigation", "removed"]),
        ),
      )
      .orderBy(desc(reviews.createdAt))
      .limit(14);
    return { recentDisputes, pendingVerifications, flaggedReviews };
  }),

  globalSearch: adminProcedure
    .input(z.object({ q: z.string().min(1).max(120) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { users: [], customers: [], reviews: [] };
      const raw = input.q.trim();
      const term = `%${raw}%`;
      const userRows = await db
        .select({ id: users.id, name: users.name, email: users.email, role: users.role })
        .from(users)
        .where(or(like(users.name, term), like(users.email, term)))
        .limit(12);
      const custRows = await db
        .select({
          id: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          phone: customers.phone,
          city: customers.city,
          state: customers.state,
        })
        .from(customers)
        .where(
          or(
            like(customers.firstName, term),
            like(customers.lastName, term),
            like(customers.phone, term),
            like(customers.city, term),
            like(customers.state, term),
            like(customers.searchText, term),
          ),
        )
        .limit(12);
      const revRows = await db
        .select({
          id: reviews.id,
          customerId: reviews.customerId,
          overallRating: reviews.overallRating,
          reviewText: reviews.reviewText,
        })
        .from(reviews)
        .where(like(reviews.reviewText, term))
        .limit(8);
      return { users: userRows, customers: custRows, reviews: revRows };
    }),

  getCustomerAdmin: adminProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const customer = await dbModule.getCustomerById(input.customerId);
      if (!customer) return null;
      const reviewData = await dbModule.getReviewsForCustomer(input.customerId);
      const db = await getDb();
      const disputes = db
        ? await db
            .select()
            .from(reviewDisputes)
            .where(eq(reviewDisputes.customerId, input.customerId))
            .orderBy(desc(reviewDisputes.createdAt))
            .limit(80)
        : [];
      return {
        customer,
        reviews: reviewData?.reviews ?? [],
        disputes,
      };
    }),

  /** Directory customers (not user accounts) — search by name, phone, location, searchText. */
  listCustomersAdmin: adminProcedure
    .input(z.object({ query: z.string().default(""), limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const q = input.query.trim();
      const term = `%${q}%`;
      const cols = {
        id: customers.id,
        firstName: customers.firstName,
        lastName: customers.lastName,
        phone: customers.phone,
        city: customers.city,
        state: customers.state,
        riskLevel: customers.riskLevel,
        reviewCount: customers.reviewCount,
        overallRating: customers.overallRating,
        redFlagCount: customers.redFlagCount,
      };
      const base = db.select(cols).from(customers);
      if (!q) {
        return base.orderBy(desc(customers.createdAt)).limit(input.limit);
      }
      return base
        .where(
          or(
            like(customers.firstName, term),
            like(customers.lastName, term),
            like(customers.phone, term),
            like(customers.city, term),
            like(customers.state, term),
            like(customers.searchText, term),
          ),
        )
        .orderBy(desc(customers.createdAt))
        .limit(input.limit);
    }),

  listPendingContractorVerifications: adminProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select({
          userId: contractorProfiles.userId,
          trade: contractorProfiles.trade,
          licenseNumber: contractorProfiles.licenseNumber,
          company: contractorProfiles.company,
          verificationSubmittedAt: contractorProfiles.verificationSubmittedAt,
        })
        .from(contractorProfiles)
        .where(eq(contractorProfiles.verificationStatus, "pending"))
        .orderBy(desc(contractorProfiles.verificationSubmittedAt))
        .limit(input.limit);
    }),

  // ─── Reviews ─────────────────────────────────────────────────────────────────
  listReviews: adminProcedure
    .input(z.object({ query: z.string().default(""), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const q = input.query.trim();
      const base = q
        ? db.select().from(reviews).where(like(reviews.reviewText, `%${q}%`))
        : db.select().from(reviews);
      return base.orderBy(desc(reviews.createdAt)).limit(input.limit).offset(input.offset);
    }),

  hideReview: adminProcedure
    .input(z.object({ reviewId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(reviews).set({ hiddenAt: new Date(), hiddenByAdminId: ctx.user.id, moderationStatus: "removed" }).where(eq(reviews.id, input.reviewId));
      await logAction(ctx.user.id, "hide_review", "review", input.reviewId, input.reason);
      return { success: true };
    }),

  restoreReview: adminProcedure
    .input(z.object({ reviewId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(reviews).set({ hiddenAt: null, hiddenByAdminId: null, moderationStatus: "active" }).where(eq(reviews.id, input.reviewId));
      await logAction(ctx.user.id, "restore_review", "review", input.reviewId);
      return { success: true };
    }),

  setModerationStatus: adminProcedure
    .input(z.object({ reviewId: z.number(), status: z.enum(["active", "hidden_flagged", "under_investigation", "removed"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const update: any = { moderationStatus: input.status };
      if (input.status === "active") { update.hiddenAt = null; update.hiddenByAdminId = null; }
      if (input.status === "removed" || input.status === "hidden_flagged") { update.hiddenAt = new Date(); update.hiddenByAdminId = ctx.user.id; }
      await db.update(reviews).set(update).where(eq(reviews.id, input.reviewId));
      await logAction(ctx.user.id, `moderation_${input.status}`, "review", input.reviewId);
      return { success: true };
    }),

  listFlagRequests: adminProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { reviewFlagRequests } = await import("../drizzle/schema");
      return db.select().from(reviewFlagRequests).orderBy(desc(reviewFlagRequests.createdAt)).limit(input.limit);
    }),

  // ─── Disputes ────────────────────────────────────────────────────────────────
  listDisputes: adminProcedure
    .input(z.object({ status: z.string().default(""), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const base = input.status
        ? db.select().from(reviewDisputes).where(eq(reviewDisputes.status, input.status as any))
        : db.select().from(reviewDisputes);
      return base.orderBy(desc(reviewDisputes.createdAt)).limit(input.limit).offset(input.offset);
    }),

  resolveDispute: adminProcedure
    .input(z.object({ disputeId: z.number(), resolution: z.string(), status: z.enum(["resolved", "dismissed"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(reviewDisputes).set({
        status: input.status,
        resolution: input.resolution,
        resolvedAt: new Date(),
      }).where(eq(reviewDisputes.id, input.disputeId));
      await logAction(ctx.user.id, `dispute_${input.status}`, "dispute", input.disputeId, input.resolution);
      return { success: true };
    }),

  // ─── Payments ────────────────────────────────────────────────────────────────
  listPayments: adminProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(stripePayments).orderBy(desc(stripePayments.createdAt)).limit(input.limit).offset(input.offset);
    }),

  refundPayment: adminProcedure
    .input(z.object({ paymentIntentId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!stripe) throw new Error("Stripe not configured");
      const refund = await stripe.refunds.create({
        payment_intent: input.paymentIntentId,
        reason: "requested_by_customer",
      });
      const db = await getDb();
      if (db) {
        await db.update(stripePayments).set({ status: "refunded", updatedAt: new Date() }).where(eq(stripePayments.stripePaymentIntentId, input.paymentIntentId));
      }
      await logAction(ctx.user.id, "refund_payment", "payment", input.paymentIntentId, `refund_id: ${refund.id}, reason: ${input.reason ?? "admin"}`);
      return { success: true, refundId: refund.id };
    }),

  // ─── Subscriptions ──────────────────────────────────────────────────────────
  listSubscriptions: adminProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt)).limit(input.limit).offset(input.offset);
    }),

  cancelSubscription: adminProcedure
    .input(z.object({ userId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const sub = await db.select().from(subscriptions).where(eq(subscriptions.userId, input.userId)).limit(1);
      if (sub.length > 0 && sub[0].stripeSubscriptionId && stripe) {
        try {
          await stripe.subscriptions.update(sub[0].stripeSubscriptionId, { cancel_at_period_end: true });
        } catch (e) {
          console.warn("[Admin] Stripe cancel failed (may already be cancelled):", (e as Error).message);
        }
      }
      await db.update(subscriptions).set({ status: "cancelled", updatedAt: new Date() }).where(eq(subscriptions.userId, input.userId));
      await logAction(ctx.user.id, "cancel_subscription", "subscription", input.userId, input.reason);
      return { success: true };
    }),

  /** PostHog HogQL beta funnel (requires POSTHOG_PERSONAL_API_KEY + POSTHOG_PROJECT_ID on server). */
  betaFunnelAnalytics: adminProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(7) }))
    .query(async ({ input }) => {
      const { fetchBetaFunnelAnalytics } = await import("./posthog-beta-funnel");
      return fetchBetaFunnelAnalytics(input.days);
    }),

  // ─── Algolia (customer search index) ───────────────────────────────────────
  reindexAlgoliaCustomers: adminProcedure
    .input(z.object({ batchSize: z.number().min(50).max(1000).optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const { syncAllCustomersToAlgolia, isAlgoliaAdminConfigured } = await import("./algolia-customers");
      if (!isAlgoliaAdminConfigured()) {
        throw new Error(
          "Algolia admin not configured. Set ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY, ALGOLIA_CUSTOMERS_INDEX_NAME on the server.",
        );
      }
      const result = await syncAllCustomersToAlgolia({ batchSize: input?.batchSize ?? 500 });
      await logAction(ctx.user.id, "algolia_reindex_customers", "algolia", undefined, JSON.stringify(result));
      return result;
    }),

  // ─── Audit Log ──────────────────────────────────────────────────────────────
  getAuditLog: adminProcedure
    .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(adminAuditLog).orderBy(desc(adminAuditLog.createdAt)).limit(input.limit).offset(input.offset);
    }),
});
