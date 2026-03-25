import { randomUUID } from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import * as subDb from "./subscription-db";
import * as stripeService from "./stripe-service";
import * as s3Service from "./s3-service";
import * as analyticsDb from "./analytics-db";
import * as moderationDb from "./moderation-db";
import * as emailService from "./email-service";
import * as stripePayment from "./stripe-payment";
import * as pushNotifications from "./push-notifications";
import * as verificationDb from "./verification-db";
import * as duplicateDetection from "./duplicate-detection";
import * as referralService from "./referral-rewards-service";
import * as notificationDelivery from "./services/notification-delivery-service";
import { calculateCustomerRiskScore, saveRiskScore } from "./services/risk-score-engine";
import { FraudDetectionService } from "../lib/fraud-detection-service";
import { getDb } from "./db";
import {
  reviews as reviewsTable,
  reviewModerations,
  customerResponses,
  reviewFlagRequests,
  disputeTimeline,
  reviewDisputes,
  users,
} from "../drizzle/schema";
import * as integrationImportService from "./services/integration-import-service";
import * as fraudSignalsService from "./services/fraud-signals-service";
import { desc as drizzleDesc, eq, inArray } from "drizzle-orm";
import { adminRouter } from "./admin-router";
import * as contractorInviteReferral from "./contractor-invite-referral-service";
import { isAdmin, isContractor } from "../shared/roles";

/**
 * Core customer flows (profile, responses, disputes) never require Stripe.
 * Contractor roles (`contractor`, `user`) need an active trial or paid plan for platform tools.
 */
async function requireContractorSubscriptionForPlatformTools(ctx: {
  user: { id: number; openId: string; role: string };
}) {
  const role = ctx.user.role;
  if (role === "customer" || role === "admin") return;
  const s = await subDb.checkSubscriptionStatus(ctx.user.id, ctx.user.openId);
  if (!s.isActive) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Contractor subscription or an active trial is required for this action. Upgrade from Billing or complete verification.",
    });
  }
}

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Contractor Profile ─────────────────────────────────────────────────────
  contractor: router({
    getProfile: protectedProcedure.query(({ ctx }) =>
      db.getContractorProfile(ctx.user.id)
    ),
    upsertProfile: protectedProcedure
      .input(
        z.object({
          trade: z.string().max(128).optional(),
          licenseNumber: z.string().max(64).optional(),
          company: z.string().max(255).optional(),
          city: z.string().max(128).optional(),
          state: z.string().max(64).optional(),
          bio: z.string().max(1000).optional(),
        })
      )
      .mutation(({ ctx, input }) => db.upsertContractorProfile(ctx.user.id, input)),

    /**
     * Soft-delete contractor account: user row + profile PII cleared; customers and reviews are NOT removed.
     * Stripe subscription is cancelled when present. Client should clear session after success.
     */
    softDeleteAccount: protectedProcedure
      .input(z.object({ confirm: z.literal("DELETE_MY_ACCOUNT") }))
      .mutation(async ({ ctx }) => {
        const role = ctx.user.role;
        if (role === "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin accounts cannot be closed through this action." });
        }
        if (role === "customer") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Customer account closure uses a different process. Contact support.",
          });
        }
        const userId = ctx.user.id;
        try {
          const sub = await subDb.getSubscription(userId);
          if (sub?.stripeSubscriptionId) {
            await stripePayment.cancelSubscription(sub.stripeSubscriptionId);
          }
        } catch (e) {
          console.warn("[softDeleteAccount] Stripe cancel failed (continuing with DB soft-delete):", e);
        }
        await subDb.cancelSubscription(userId);
        await db.softDeleteContractorUser(userId);
        return { ok: true as const };
      }),

    /** Contractor invite program stats (/invite?ref=). */
    getReferralStats: protectedProcedure.query(async ({ ctx }) => {
      if (!isContractor(ctx.user) && !isAdmin(ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only contractors can view referral rewards." });
      }
      const dash = await contractorInviteReferral.getContractorReferralDashboard(ctx.user.id);
      if (!dash) return null;
      return {
        referralCount: dash.referralCount,
        verifiedReferralCount: dash.verifiedReferralCount,
        freeMonthsEarned: dash.freeMonthsEarned,
        nextReferralsUntilReward: dash.nextReferralsUntilReward,
        referralRewardUnseen: dash.referralRewardUnseen,
        subscriptionExtendedUntil: dash.subscriptionExtendedUntil?.toISOString() ?? null,
      };
    }),

    dismissReferralReward: protectedProcedure.mutation(async ({ ctx }) => {
      if (!isContractor(ctx.user) && !isAdmin(ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only contractors can dismiss this prompt." });
      }
      await contractorInviteReferral.clearReferralRewardUnseen(ctx.user.id);
      return { ok: true as const };
    }),

    /** Top referrers by verified count (read-only; does not affect rewards). */
    getReferralLeaderboardPreview: protectedProcedure.query(async ({ ctx }) => {
      if (!isContractor(ctx.user) && !isAdmin(ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only contractors can view the referral leaderboard." });
      }
      const rows = await contractorInviteReferral.getContractorReferralLeaderboardPreview(3);
      return {
        entries: rows.map((r, i) => ({
          rank: i + 1,
          displayName: r.displayName,
          verifiedCount: r.verifiedReferralCount,
        })),
      };
    }),
  }),

  // ─── Customers ──────────────────────────────────────────────────────────────
  customers: router({
    search: publicProcedure
      .input(z.object({
        query: z.string().min(1).max(100),
        state: z.string().max(2).optional(),
        city: z.string().max(128).optional(),
        limit: z.number().min(1).max(30).default(15),
      }))
      .query(async ({ input }) => {
        if (process.env.NODE_ENV !== "production") {
          console.log("[trpc customers.search]", { query: input.query, state: input.state ?? null, limit: input.limit });
        }
        const rows = await db.searchCustomers(input.query, input.limit, input.state, input.city);
        if (process.env.NODE_ENV !== "production") {
          console.log("[trpc customers.search] rows", rows.length);
        }
        return rows;
      }),

    findMatches: protectedProcedure
      .input(z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        return db.findPotentialCustomerMatches(input);
      }),
    
    // Public access to view all reviews for a customer (no login required)
    getReviews: publicProcedure
      .input(z.object({ customerId: z.number() }))
      .query(({ input }) => db.getReviewsForCustomer(input.customerId)),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getCustomerById(input.id)),

    /** Customer-only: directory row + risk engine snapshot for verification paywall triggers. */
    getMyDirectoryInsights: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "customer") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only customer accounts can load directory insights." });
      }
      return db.getDirectoryCustomerInsightsForUser(ctx.user.id);
    }),

    /**
     * Contractor-only: count authenticated opens of a directory profile (conversion signals).
     * Does not block the UI if it fails.
     */
    recordContractorProfileView: protectedProcedure
      .input(z.object({ customerId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        if (ctx.user.role === "customer") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only contractors can record profile views." });
        }
        const next = await db.incrementCustomerContractorProfileViews(input.customerId, ctx.user.id);
        if (next == null) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found." });
        }
        return { ok: true as const, contractorProfileViewCount: next };
      }),

    getScore: publicProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ input }) => {
        const { computeCustomerScore } = await import("../shared/customer-score");
        const reviewData = await db.getReviewsForCustomer(input.customerId);
        const allReviews = (reviewData?.reviews ?? []).map((r: any) => ({
          overallRating: typeof r.overallRating === "number" ? r.overallRating : 0,
          ratingPaymentReliability:
            typeof r.ratingPaymentReliability === "number" ? r.ratingPaymentReliability : null,
          createdAt: r.createdAt ?? new Date().toISOString(),
          redFlags: r.redFlags ?? null,
        }));
        const d = await getDb();
        let disputeCount = 0;
        let disputesResolvedForCustomer = 0;
        if (d) {
          const disputes = await d.select().from(reviewDisputes).where(eq(reviewDisputes.customerId, input.customerId));
          disputeCount = disputes.length;
          disputesResolvedForCustomer = disputes.filter(
            (disp: any) => disp.status === "resolved",
          ).length;
        }
        return computeCustomerScore({ reviews: allReviews, disputeCount, disputesResolvedForCustomer });
      }),

    /** Lightweight snapshot for saved-customer retention alerts (read-only aggregate). */
    getRetentionSnapshot: publicProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ input }) => {
        const customer = await db.getCustomerById(input.customerId);
        if (!customer) return null;
        const reviewData = await db.getReviewsForCustomer(input.customerId);
        const reviews = reviewData?.reviews ?? [];
        const anyReviewUnderReview = reviews.some((r: { moderationStatus?: string | null }) => {
          const st = r.moderationStatus ?? "active";
          return st === "hidden_flagged" || st === "under_investigation";
        });
        const d = await getDb();
        let disputeCount = 0;
        let disputesResolvedForCustomer = 0;
        if (d) {
          const disputes = await d.select().from(reviewDisputes).where(eq(reviewDisputes.customerId, input.customerId));
          disputeCount = disputes.length;
          disputesResolvedForCustomer = disputes.filter(
            (disp: { status?: string }) => disp.status === "resolved",
          ).length;
        }
        const { computeCustomerScore } = await import("../shared/customer-score");
        const allReviews = reviews.map((r: any) => ({
          overallRating: typeof r.overallRating === "number" ? r.overallRating : 0,
          ratingPaymentReliability:
            typeof r.ratingPaymentReliability === "number" ? r.ratingPaymentReliability : null,
          createdAt: r.createdAt ?? new Date().toISOString(),
          redFlags: r.redFlags ?? null,
        }));
        const scoreResult = computeCustomerScore({
          reviews: allReviews,
          disputeCount,
          disputesResolvedForCustomer,
        });
        return {
          customerId: input.customerId,
          reviewCount: reviews.length,
          disputeCount,
          customerScore: scoreResult.score,
          anyReviewUnderReview,
        };
      }),

    getByPhone: publicProcedure
      .input(z.object({ phone: z.string().min(1).max(32) }))
      .query(({ input }) => db.getCustomerByPhone(input.phone)),

    create: protectedProcedure
      .input(
        z.object({
          firstName: z.string().min(1).max(128),
          lastName: z.string().min(1).max(128),
          phone: z.string().max(32).optional(),
          email: z.string().email().max(320).optional(),
          address: z.string().max(255).optional(),
          city: z.string().max(128).optional(),
          state: z.string().max(64).optional(),
          zip: z.string().max(16).optional(),
          forceCreate: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        const rawPhone = (input.phone ?? "").trim();
        // Empty phone would violate UNIQUE(phone) on second row (MySQL treats '' as one value).
        const phone =
          rawPhone.length > 0 ? rawPhone : `pending-${ctx.user.id}-${randomUUID()}`;
        const customerData = {
          firstName: input.firstName,
          lastName: input.lastName,
          phone,
          email: input.email,
          address: input.address || "",
          city: input.city || "",
          state: input.state || "",
          zip: input.zip || "",
          createdByUserId: ctx.user.id,
        };

        // Try normalized matching first (email, phone, address, name+location)
        const match = await db.findOrCreateCustomer(customerData);
        if (!match.isNew) {
          return {
            id: match.id,
            isDuplicate: true,
            message: `Customer already exists. Using existing profile.`,
          };
        }

        // If not force-creating, also check fuzzy duplicates for user confirmation
        if (!input.forceCreate) {
          const duplicates = await duplicateDetection.findDuplicateCandidates(
            input.firstName,
            input.lastName,
            input.city || "",
            input.state || "",
          );
          const highSimilarity = duplicates
            .filter((d) => d.similarity >= 70 && d.id !== match.id);
          if (highSimilarity.length > 0) {
            return {
              id: match.id,
              isNew: true,
              duplicates: highSimilarity,
              message: "Similar customers found. Please confirm this is a new person.",
            };
          }
        }

        return { id: match.id, isNew: true };
      }),

    recomputeAggregates: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        return db.recomputeCustomerAggregates(input.customerId);
      }),

    getFlagged: protectedProcedure.query(async ({ ctx }) => {
      await requireContractorSubscriptionForPlatformTools(ctx);
      return db.getRecentlyFlaggedCustomers(20);
    }),
    getTopRated: protectedProcedure.query(async ({ ctx }) => {
      await requireContractorSubscriptionForPlatformTools(ctx);
      return db.getTopRatedCustomers(10);
    }),
  }),

  // ─── Subscriptions ────────────────────────────────────────────────────────────
  subscription: router({
    getStatus: protectedProcedure.query(({ ctx }) =>
      subDb.checkSubscriptionStatus(ctx.user.id, ctx.user.openId)
    ),
    createTrial: protectedProcedure.mutation(({ ctx }) =>
      subDb.createTrialSubscription(ctx.user.id)
    ),
    upgrade: protectedProcedure
      .input(z.object({ plan: z.enum(["monthly", "yearly"]).optional() }).optional())
      .mutation(({ ctx, input }) =>
        subDb.upgradeToSubscription(ctx.user.id, input?.plan ?? "yearly")
      ),
    cancel: protectedProcedure.mutation(({ ctx }) =>
      subDb.cancelSubscription(ctx.user.id)
    ),

    getMembership: protectedProcedure.query(async ({ ctx }) => {
      const { getDaysRemaining } = await import("@/shared/membership");

      if (ctx.user.role === "admin") {
        const far = new Date();
        far.setFullYear(far.getFullYear() + 10);
        return {
          verificationStatus: "verified" as const,
          contractorLicenseNumber: null,
          planType: "annual_paid" as const,
          freeTrialStartAt: null,
          freeTrialEndAt: null,
          nextBillingAmount: null,
          nextBillingDate: null,
          paymentMethodOnFile: false,
          renewalReminderSentAt: null,
          daysRemaining: 3650,
          subscriptionEndsAt: far.toISOString(),
          lastReminderDaysMilestone: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          membershipStatus: "paid_active" as const,
        };
      }

      const profile = await db.getContractorProfile(ctx.user.id);
      const sub = await subDb.getSubscription?.(ctx.user.id).catch(() => null);

      if (ctx.user.role === "customer") {
        const now = new Date();
        const pt = (sub as { planType?: string })?.planType;
        const database = await getDb();
        let identityVerifiedUser = false;
        let userVerifiedAtIso: string | null = null;
        if (database) {
          const [urow] = await database
            .select({ isVerified: users.isVerified, verifiedAt: users.verifiedAt })
            .from(users)
            .where(eq(users.id, ctx.user.id))
            .limit(1);
          identityVerifiedUser = !!urow?.isVerified;
          userVerifiedAtIso = urow?.verifiedAt?.toISOString?.() ?? null;
        }
        const paidSub =
          !!sub &&
          pt === "customer_monthly" &&
          ((sub as { status?: string }).status === "active" ||
            (sub as { status?: string }).status === "trial") &&
          (sub as { subscriptionEndsAt?: Date }).subscriptionEndsAt &&
          new Date((sub as { subscriptionEndsAt: Date }).subscriptionEndsAt) > now;
        const paid = paidSub || identityVerifiedUser;
        const displayPlan = paid ? ("customer_identity_verification" as const) : ("free_customer" as const);
        return {
          verificationStatus: "not_submitted" as const,
          contractorLicenseNumber: null,
          planType: displayPlan,
          freeTrialStartAt: null,
          freeTrialEndAt: null,
          nextBillingAmount:
            paidSub && (sub as { nextBillingAmount?: unknown }).nextBillingAmount != null
              ? Number((sub as { nextBillingAmount: string }).nextBillingAmount)
              : null,
          nextBillingDate:
            paidSub && (sub as { nextBillingDate?: Date }).nextBillingDate
              ? new Date((sub as { nextBillingDate: Date }).nextBillingDate).toISOString()
              : null,
          paymentMethodOnFile: !!(sub as { paymentMethodOnFile?: boolean })?.paymentMethodOnFile,
          renewalReminderSentAt: null,
          daysRemaining: paidSub
            ? getDaysRemaining((sub as { subscriptionEndsAt?: Date }).subscriptionEndsAt)
            : null,
          subscriptionEndsAt:
            paidSub && (sub as { subscriptionEndsAt?: Date }).subscriptionEndsAt
              ? new Date((sub as { subscriptionEndsAt: Date }).subscriptionEndsAt).toISOString()
              : identityVerifiedUser
                ? userVerifiedAtIso
                : null,
          lastReminderDaysMilestone: null,
          stripeCustomerId: (sub as { stripeCustomerId?: string | null })?.stripeCustomerId ?? null,
          stripeSubscriptionId: (sub as { stripeSubscriptionId?: string | null })?.stripeSubscriptionId ?? null,
          membershipStatus: paid ? ("paid_active" as const) : ("customer_free" as const),
        };
      }

      return {
        verificationStatus: profile?.verificationStatus ?? "not_submitted",
        contractorLicenseNumber: profile?.licenseNumber ?? null,
        planType: (sub as any)?.planType ?? "none",
        freeTrialStartAt: (sub as any)?.freeTrialStartAt?.toISOString?.() ?? null,
        freeTrialEndAt: (sub as any)?.freeTrialEndAt?.toISOString?.() ?? null,
        nextBillingAmount: (sub as any)?.nextBillingAmount ? Number((sub as any).nextBillingAmount) : null,
        nextBillingDate: (sub as any)?.nextBillingDate?.toISOString?.() ?? null,
        paymentMethodOnFile: !!(sub as any)?.paymentMethodOnFile,
        renewalReminderSentAt: (sub as any)?.renewalReminderSentAt?.toISOString?.() ?? null,
        daysRemaining: getDaysRemaining((sub as any)?.subscriptionEndsAt ?? (sub as any)?.freeTrialEndAt),
        subscriptionEndsAt: (sub as any)?.subscriptionEndsAt?.toISOString?.() ?? null,
        lastReminderDaysMilestone: (sub as any)?.lastReminderDaysMilestone ?? null,
        stripeCustomerId: (sub as any)?.stripeCustomerId ?? null,
        stripeSubscriptionId: (sub as any)?.stripeSubscriptionId ?? null,
        membershipStatus: (() => {
          const pt = (sub as any)?.planType;
          if (
            pt === "annual_paid" ||
            pt === "contractor_annual" ||
            pt === "contractor_pro_monthly" ||
            pt === "customer_monthly"
          ) {
            const status = (sub as any)?.status;
            if (status === "active") return "paid_active" as const;
            return "expired" as const;
          }
          if (pt === "verified_contractor_free_year") {
            const end = (sub as any)?.freeTrialEndAt;
            if (end && new Date(end).getTime() > Date.now()) return "free_year_active" as const;
            return "expired" as const;
          }
          return "inactive" as const;
        })(),
      };
    }),

    activateFreeYear: protectedProcedure.mutation(async ({ ctx }) => {
      const { canActivateVerifiedFreeYear, computeFreeYearDates, ANNUAL_PRICE } = await import("@/shared/membership");
      const profile = await db.getContractorProfile(ctx.user.id);
      if (!profile || profile.verificationStatus !== "verified") {
        throw new Error("Contractor must be verified to activate free year.");
      }
      const dates = computeFreeYearDates();
      await subDb.activateVerifiedFreeYear?.(ctx.user.id, dates.freeTrialStartAt, dates.freeTrialEndAt, ANNUAL_PRICE);
      return { success: true, freeTrialEndAt: dates.freeTrialEndAt.toISOString() };
    }),

    markReminderSent: protectedProcedure.mutation(async ({ ctx }) => {
      await subDb.markRenewalReminderSent?.(ctx.user.id);
      return { success: true };
    }),

    markReminderSeen: protectedProcedure
      .input(z.object({ milestone: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await subDb.markRenewalReminderSent?.(ctx.user.id, input.milestone);
        return { success: true };
      }),
  }),

  // ─── Reviews ────────────────────────────────────────────────────────────────
  reviews: router({
    getForCustomer: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        return db.getReviewsForCustomer(input.customerId);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        return db.getReviewById(input.id);
      }),

    getMyReviews: protectedProcedure.query(async ({ ctx }) => {
      await requireContractorSubscriptionForPlatformTools(ctx);
      return db.getReviewsByContractor(ctx.user.id);
    }),

    getRecent: protectedProcedure.query(async ({ ctx }) => {
      await requireContractorSubscriptionForPlatformTools(ctx);
      return db.getRecentReviews(20);
    }),

    create: protectedProcedure
      .input(
        z.object({
          customerId: z.number(),
          overallRating: z.number().int().min(0).max(5),
          calculatedOverallRating: z.number().min(0).max(5).optional().nullable(),
          // Legacy flat columns — null when category is N/A (never coerce to 0)
          ratingPaymentReliability: z.number().int().min(1).max(5).nullable().optional(),
          ratingCommunication: z.number().int().min(1).max(5).nullable().optional(),
          ratingScopeChanges: z.number().int().min(1).max(5).nullable().optional(),
          ratingPropertyRespect: z.number().int().min(1).max(5).nullable().optional(),
          ratingPermitPulling: z.number().int().min(1).max(5).nullable().optional(),
          ratingOverallJobExperience: z.number().int().min(1).max(5).nullable().optional(),
          // New structured category data
          categoryDataJson: z.string().optional(),
          wouldWorkAgain: z.string().optional(),
          reviewText: z.string().max(2000).optional(),
          jobType: z.string().max(128).optional(),
          jobDate: z.string().max(32).optional(),
          jobAmount: z.string().max(32).optional(),
          redFlags: z.string().optional(),
          greenFlags: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        const { calculatedOverallRating, ...rest } = input;
        const reviewId = await db.createReview({
          ...rest,
          ratingPaymentReliability: input.ratingPaymentReliability ?? null,
          ratingCommunication: input.ratingCommunication ?? null,
          ratingScopeChanges: input.ratingScopeChanges ?? null,
          ratingPropertyRespect: input.ratingPropertyRespect ?? null,
          ratingPermitPulling: input.ratingPermitPulling ?? null,
          ratingOverallJobExperience: input.ratingOverallJobExperience ?? null,
          contractorUserId: ctx.user.id,
          calculatedOverallRating: calculatedOverallRating != null ? String(calculatedOverallRating.toFixed(2)) : null,
        });
        try {
          const score = await calculateCustomerRiskScore(input.customerId);
          await saveRiskScore(input.customerId, score);
          const dbConn = await getDb();
          if (dbConn) {
            const recentReviews = await dbConn
              .select({
                id: reviewsTable.id,
                contractorId: reviewsTable.contractorUserId,
                customerId: reviewsTable.customerId,
                rating: reviewsTable.overallRating,
                text: reviewsTable.reviewText,
                createdAt: reviewsTable.createdAt,
              })
              .from(reviewsTable)
              .orderBy(drizzleDesc(reviewsTable.createdAt))
              .limit(100);
            const fraud = FraudDetectionService.analyzeReview(
              {
                id: String(reviewId),
                contractorId: String(ctx.user.id),
                contractorEmail: ctx.user.email || "",
                contractorIp: ctx.req.ip || "",
                customerId: String(input.customerId),
                rating: input.overallRating,
                text: input.reviewText || "",
                createdAt: Date.now(),
              },
              recentReviews.map((r) => ({
                id: String(r.id),
                contractorId: String(r.contractorId),
                contractorEmail: "",
                contractorIp: "",
                customerId: String(r.customerId),
                rating: r.rating,
                text: r.text || "",
                createdAt: new Date(r.createdAt as any).getTime(),
              }))
            );
            await dbConn.insert(reviewModerations).values({
              reviewId,
              status: fraud.requiresModeration ? "pending" : "approved",
              reason: fraud.flags.join("; ") || null,
            });
          }
        } catch (error) {
          console.error("Post-review automation failed", error);
        }
        return { reviewId, success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          reviewId: z.number(),
          overallRating: z.number().int().min(0).max(5).optional(),
          ratingPaymentReliability: z.number().int().min(1).max(5).nullable().optional(),
          ratingCommunication: z.number().int().min(1).max(5).nullable().optional(),
          ratingScopeChanges: z.number().int().min(1).max(5).nullable().optional(),
          ratingPropertyRespect: z.number().int().min(1).max(5).nullable().optional(),
          ratingPermitPulling: z.number().int().min(1).max(5).nullable().optional(),
          ratingOverallJobExperience: z.number().int().min(1).max(5).nullable().optional(),
          categoryDataJson: z.string().optional(),
          wouldWorkAgain: z.string().optional(),
          reviewText: z.string().max(2000).optional(),
          jobType: z.string().max(128).optional(),
          redFlags: z.string().optional(),
          greenFlags: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        const { reviewId, ...data } = input;
        return db.updateReview(reviewId, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ reviewId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        return db.deleteReview(input.reviewId, ctx.user.id);
      }),

    markHelpful: protectedProcedure
      .input(z.object({ reviewId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        return db.markReviewHelpful(input.reviewId, ctx.user.id);
      }),
    addPhotos: protectedProcedure
      .input(
        z.object({
          reviewId: z.number(),
          photoUrls: z.array(z.string().url()).max(10),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        const review = await db.getReviewById(input.reviewId);
        if (!review || review.contractorUserId !== ctx.user.id) {
          throw new Error("Review not found or unauthorized");
        }
        await db.addReviewPhotos(input.reviewId, input.photoUrls);
        return { success: true };
      }),
  }),

  // ─── Legal Acceptance ───────────────────────────────────────────────────────
  legal: router({
    getAcceptanceStatus: protectedProcedure.query(async ({ ctx }) => {
      const { users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const database = await getDb();
      if (!database) return { accepted: false, termsAcceptedAt: null, privacyAcceptedAt: null, version: null };
      const rows = await database.select({
        termsAcceptedAt: users.termsAcceptedAt,
        privacyAcceptedAt: users.privacyAcceptedAt,
        legalAcceptanceVersion: users.legalAcceptanceVersion,
      }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const row = rows[0];
      if (!row) return { accepted: false, termsAcceptedAt: null, privacyAcceptedAt: null, version: null };
      return {
        accepted: !!(row.termsAcceptedAt && row.privacyAcceptedAt),
        termsAcceptedAt: row.termsAcceptedAt?.toISOString() ?? null,
        privacyAcceptedAt: row.privacyAcceptedAt?.toISOString() ?? null,
        version: row.legalAcceptanceVersion ?? null,
      };
    }),

    acceptTerms: protectedProcedure
      .input(z.object({ version: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const database = await getDb();
        if (!database) throw new Error("Database not available");
        const now = new Date();
        await database.update(users).set({
          termsAcceptedAt: now,
          privacyAcceptedAt: now,
          legalAcceptanceVersion: input.version,
        }).where(eq(users.id, ctx.user.id));
        return { accepted: true, acceptedAt: now.toISOString(), version: input.version };
      }),
  }),

  // ─── Stripe Payments ────────────────────────────────────────────────────────
  payments: router({
    createPaymentIntent: protectedProcedure
      .input(
        z.object({
          amountInCents: z.number().min(1),
          description: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return stripeService.createPaymentIntent(
          ctx.user.id,
          input.amountInCents,
          input.description
        );
      }),

    confirmPayment: protectedProcedure
      .input(z.object({ paymentIntentId: z.string(), plan: z.enum(["monthly", "yearly"]).optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await stripeService.confirmPayment(input.paymentIntentId);
        if ((result as any).success) {
          await subDb.upgradeToSubscription(ctx.user.id, input.plan ?? "yearly");
        }
        return result;
      }),

    // App subscription flow — server-only Stripe; secret key never touches the client
    createStripeCustomerForApp: protectedProcedure
      .input(
        z.object({
          email: z.string().email(),
          name: z.string().min(1),
          phone: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await stripePayment.createStripeCustomerForAppUser(input);
        if ("customerId" in result) {
          await subDb.linkStripeCustomer(ctx.user.id, result.customerId);
        }
        return result;
      }),

    createCustomerPaymentIntentForApp: protectedProcedure
      .input(
        z.object({
          stripeCustomerId: z.string(),
          amountCents: z.number().min(1),
          plan: z.enum(["monthly", "yearly"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return stripePayment.createCustomerPaymentIntentForApp({
          ...input,
          userId: ctx.user.id,
        });
      }),

    createCustomerSubscriptionForApp: protectedProcedure
      .input(
        z.object({
          stripeCustomerId: z.string(),
          plan: z.enum(["monthly", "yearly"]),
          /** Default: monthly → customer identity; yearly → contractor Pro annual. Set `contractor_pro` for Pro monthly. */
          productLine: z.enum(["customer_identity", "contractor_pro"]).optional(),
          paymentMethodId: z.string().optional(),
          paymentIntentId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await stripePayment.createCustomerSubscriptionForApp({
          ...input,
          userId: ctx.user.id,
        });
        if ("subscriptionId" in result && result.subscriptionId.startsWith("sub_")) {
          await subDb.activateStripeSubscription(
            ctx.user.id,
            result.subscriptionId,
            result.dbPlanType,
            result.currentPeriodEnd,
          );
        }
        return "subscriptionId" in result
          ? { subscriptionId: result.subscriptionId }
          : result;
      }),

    verifyPayment: protectedProcedure
      .input(z.object({ paymentIntentId: z.string() }))
      .query(async ({ input }) => {
        const result = await stripePayment.confirmSubscriptionPayment(input.paymentIntentId);
        return result;
      }),
  }),

  // ─── S3 Photo Upload ────────────────────────────────────────────────────────
  photos: router({
    getPresignedUrl: protectedProcedure
      .input(
        z.object({
          reviewId: z.number(),
          photoIndex: z.number(),
        })
      )
      .query(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        return s3Service.generatePresignedUploadUrl(
          input.reviewId,
          input.photoIndex
        );
      }),
    getPresignedDisputeUrl: protectedProcedure
      .input(
        z.object({
          disputeId: z.number(),
          photoIndex: z.number(),
        })
      )
      .query(async ({ input }) => {
        return s3Service.generatePresignedDisputeUploadUrl(
          input.disputeId,
          input.photoIndex
        );
      }),
  }),

  // ─── Review Disputes ────────────────────────────────────────────────────────
  disputes: router({
    createDispute: protectedProcedure
      .input(
        z.object({
          reviewId: z.number(),
          reason: z.enum([
            "false_information",
            "defamatory",
            "privacy_violation",
            "not_my_business",
            "other",
          ]),
          description: z.string().min(10).max(2000),
          customerName: z.string().min(1).max(128),
          customerEmail: z.string().email().max(255),
        })
      )
      .mutation(async ({ input }) => {
        const review = await db.getReviewById(input.reviewId);
        if (!review) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Review not found" });
        }

        const reasonDb = (
          {
            false_information: "incorrect_information",
            defamatory: "harassment_abuse",
            privacy_violation: "privacy_concern",
            not_my_business: "wrong_individual",
            other: "other",
          } as const
        )[input.reason];

        const customerResponse = [
          `Contact: ${input.customerName} <${input.customerEmail}>`,
          `Reason (customer-selected): ${input.reason}`,
          "",
          input.description.trim(),
        ].join("\n");

        const dispute = await db.createDispute({
          reviewId: input.reviewId,
          customerId: review.customerId,
          status: "pending",
          reason: reasonDb,
          customerResponse,
        });
        return dispute;
      }),

    respondToDispute: protectedProcedure
      .input(
        z.object({
          disputeId: z.number(),
          response: z.string().min(10).max(2000),
          photoUrls: z.array(z.string().url()).max(10).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const dispute = await db.respondToDispute(
          input.disputeId,
          input.response
        );
        if (input.photoUrls?.length) {
          await db.addDisputePhotos(input.disputeId, input.photoUrls);
        }
        return dispute;
      }),

    getDisputesByCustomer: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        return db.getDisputesByCustomer(input.customerId);
      }),

    getDisputesByReview: protectedProcedure
      .input(z.object({ reviewId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        return db.getDisputesByReview(input.reviewId);
      }),
  }),

  // ─── Contractor Analytics ────────────────────────────────────────────────────
  analytics: router({
    getMyAnalytics: protectedProcedure.query(async ({ ctx }) => {
      await requireContractorSubscriptionForPlatformTools(ctx);
      return analyticsDb.getContractorAnalytics(ctx.user.id);
    }),

    recalculateAnalytics: protectedProcedure.mutation(async ({ ctx }) => {
      await requireContractorSubscriptionForPlatformTools(ctx);
      await analyticsDb.recalculateContractorAnalytics(ctx.user.id);
      return analyticsDb.getContractorAnalytics(ctx.user.id);
    }),

    getTopContractors: publicProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ input }) => {
        return analyticsDb.getTopContractors(input.limit);
      }),

    getMostActive: publicProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ input }) => {
        return analyticsDb.getMostActiveContractors(input.limit);
      }),
  }),

  // ─── Review Moderation ──────────────────────────────────────────────────────
  moderation: router({
    getPendingReviews: protectedProcedure.query(async ({ ctx }) => {
      // Only admins can access moderation queue
      if (ctx.user.role !== "admin") throw new Error("Unauthorized");
      return moderationDb.getPendingModerations();
    }),

    approveReview: protectedProcedure
      .input(z.object({ reviewId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new Error("Unauthorized");
        return moderationDb.approveReview(input.reviewId, ctx.user.id);
      }),

    rejectReview: protectedProcedure
      .input(z.object({ reviewId: z.number(), reason: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new Error("Unauthorized");
        return moderationDb.rejectReview(input.reviewId, ctx.user.id, input.reason);
      }),

    requestChanges: protectedProcedure
      .input(z.object({ reviewId: z.number(), reason: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new Error("Unauthorized");
        return moderationDb.requestReviewChanges(input.reviewId, ctx.user.id, input.reason);
      }),

    getModerationStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Unauthorized");
      return moderationDb.getModerationStats();
    }),

    /** Reviews in non-active moderation states (flagged, investigation, removed) for admin triage */
    getFlaggedReviewsQueue: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Unauthorized");
      const d = await getDb();
      if (!d) return [];
      return d
        .select({
          id: reviewsTable.id,
          moderationStatus: reviewsTable.moderationStatus,
          hiddenAt: reviewsTable.hiddenAt,
          overallRating: reviewsTable.overallRating,
          reviewText: reviewsTable.reviewText,
          customerId: reviewsTable.customerId,
          createdAt: reviewsTable.createdAt,
        })
        .from(reviewsTable)
        .where(
          inArray(reviewsTable.moderationStatus, ["hidden_flagged", "under_investigation", "removed"]),
        )
        .orderBy(drizzleDesc(reviewsTable.hiddenAt))
        .limit(80);
    }),
  }),

  payment: router({
    createPaymentIntent: protectedProcedure
      .input(z.object({ amount: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await stripePayment.createSubscriptionPaymentIntent(
          ctx.user.id,
          ctx.user.email || "",
          input.amount || 999
        );
        return result || { error: "Payment service not configured" };
      }),

    confirmPayment: protectedProcedure
      .input(z.object({ paymentIntentId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const result = await stripePayment.confirmSubscriptionPayment(input.paymentIntentId);
        if (result.success) {
          await subDb.upgradeToSubscription(ctx.user.id);
        }
        return result;
      }),

    getPublishableKey: publicProcedure.query(() => {
      return { key: stripePayment.getStripePublishableKey() };
    }),
  }),

  notifications: router({
    sendTestNotification: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        return pushNotifications.sendPushNotification(input.token, {
          title: "Test Notification",
          body: "This is a test notification from Contractor Black List",
        });
      }),

    notifyTrialExpiring: protectedProcedure
      .input(z.object({ token: z.string(), daysRemaining: z.number() }))
      .mutation(async ({ input }) => {
        return pushNotifications.notifyTrialExpiring(input.token, input.daysRemaining);
      }),

    notifyVerificationStatus: protectedProcedure
      .input(z.object({ token: z.string(), status: z.enum(["approved", "rejected", "pending"]), notes: z.string().optional() }))
      .mutation(async ({ input }) => {
        return pushNotifications.notifyVerificationStatus(input.token, input.status, input.notes);
      }),
  }),

  verification: router({
    submitLicenseNumber: protectedProcedure
      .input(z.object({ licenseNumber: z.string().min(4).max(30) }))
      .mutation(async ({ ctx, input }) => {
        const { validateContractorLicenseNumber } = await import("@/shared/membership");
        const validation = validateContractorLicenseNumber(input.licenseNumber);
        if (!validation.valid) throw new Error(validation.error);
        await db.updateContractorLicense(ctx.user.id, input.licenseNumber);
        return { success: true, status: "pending" as const };
      }),

    submitVerification: protectedProcedure
      .input(z.object({
        idDocumentUrl: z.string().optional(),
        licenseDocumentUrl: z.string().optional(),
        insuranceDocumentUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return verificationDb.submitVerification(
          ctx.user.id,
          input.idDocumentUrl,
          input.licenseDocumentUrl,
          input.insuranceDocumentUrl
        );
      }),

    getVerificationStatus: protectedProcedure.query(async ({ ctx }) => {
      return verificationDb.getVerificationStatus(ctx.user.id);
    }),

    getPendingVerifications: adminProcedure.query(async () => {
      return verificationDb.getPendingVerifications();
    }),

    approveVerification: adminProcedure
      .input(z.object({
        userId: z.number(),
        idVerified: z.boolean(),
        licenseVerified: z.boolean(),
        insuranceVerified: z.boolean(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await verificationDb.approveVerification(
          input.userId,
          input.idVerified,
          input.licenseVerified,
          input.insuranceVerified,
          input.notes
        );
        // Auto-activate 12-month free membership on approval
        if (input.licenseVerified) {
          try {
            const { computeFreeYearDates, ANNUAL_PRICE } = await import("@/shared/membership");
            const dates = computeFreeYearDates();
            await subDb.activateVerifiedFreeYear?.(input.userId, dates.freeTrialStartAt, dates.freeTrialEndAt, ANNUAL_PRICE);
          } catch { /* subscription activation is best-effort */ }
        }
        return result;
      }),

    rejectVerification: adminProcedure
      .input(z.object({ userId: z.number(), reason: z.string() }))
      .mutation(async ({ input }) => {
        return verificationDb.rejectVerification(input.userId, input.reason);
      }),

    isVerified: protectedProcedure.query(async ({ ctx }) => {
      return verificationDb.isContractorVerified(ctx.user.id);
    }),
  }),

  // ─── Integration Imports ─────────────────────────────────────────────────────
  integrations: router({
    createImportJob: protectedProcedure
      .input(
        z.object({
          integrationId: z.number(),
          integrationName: z.enum(["servicetitan", "jobber", "housecall_pro"]),
          externalJobId: z.string(),
          jobData: z.record(z.string(), z.any()),
          metadata: z.record(z.string(), z.any()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        return integrationImportService.createImportJob(input);
      }),

    getImportJobDetails: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        return integrationImportService.getImportJobDetails(input.jobId);
      }),

    getImportHistory: protectedProcedure
      .input(
        z.object({
          integrationId: z.number(),
          limit: z.number().default(50),
          status: z.enum(["pending", "processing", "completed", "failed", "skipped"]).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        return integrationImportService.getImportHistory(input.integrationId, input.limit, input.status);
      }),

    getImportStats: protectedProcedure
      .input(z.object({ integrationId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        return integrationImportService.getImportStats(input.integrationId);
      }),

    retryFailedImports: protectedProcedure
      .input(z.object({ integrationId: z.number(), maxAttempts: z.number().default(3) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new Error("Unauthorized");
        const retried = await integrationImportService.retryFailedImports(input.integrationId, input.maxAttempts);
        return { success: true, retriedCount: retried };
      }),
  }),

  // ─── Fraud Signals ──────────────────────────────────────────────────────────
  fraud: router({
    recordSignal: protectedProcedure
      .input(
        z.object({
          reviewId: z.number(),
          customerId: z.number(),
          contractorUserId: z.number(),
          signals: z.array(z.string()),
          riskScore: z.number().min(0).max(100),
          flaggedForModeration: z.boolean(),
          metadata: z.record(z.string(), z.any()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        return fraudSignalsService.recordFraudSignal(input);
      }),

    getSignals: publicProcedure
      .input(z.object({ reviewId: z.number() }))
      .query(async ({ input }) => {
        return fraudSignalsService.getFraudSignals(input.reviewId);
      }),

    getCustomerFraudHistory: protectedProcedure
      .input(z.object({ customerId: z.number(), limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        return fraudSignalsService.getFraudHistory(input.customerId, input.limit);
      }),

    getContractorFraudHistory: protectedProcedure
      .input(z.object({ contractorUserId: z.number(), limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        return fraudSignalsService.getContractorFraudHistory(input.contractorUserId, input.limit);
      }),

    getCustomerStats: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        return fraudSignalsService.getCustomerFraudStats(input.customerId);
      }),

    getFlaggedForModeration: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new Error("Unauthorized");
        return fraudSignalsService.getFlaggedReviewsForModeration(input.limit);
      }),

    markReviewed: protectedProcedure
      .input(
        z.object({
          signalId: z.number(),
          action: z.enum(["approved", "rejected", "escalated"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new Error("Unauthorized");
        const success = await fraudSignalsService.markFraudSignalReviewed(input.signalId, ctx.user.id, input.action);
        return { success };
      }),
  }),

  // ─── Referrals ──────────────────────────────────────────────────────────────
  referrals: router({
    getReferralStatus: protectedProcedure.query(async ({ ctx }) => {
      await requireContractorSubscriptionForPlatformTools(ctx);
      return referralService.getReferralStatus(ctx.user.id);
    }),

    getReferralRewards: protectedProcedure.query(async ({ ctx }) => {
      await requireContractorSubscriptionForPlatformTools(ctx);
      return referralService.getReferralRewards(ctx.user.id);
    }),

    getUserReferrals: protectedProcedure.query(async ({ ctx }) => {
      await requireContractorSubscriptionForPlatformTools(ctx);
      return referralService.getUserReferrals(ctx.user.id);
    }),

    sendInvitation: protectedProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        const contractor = await db.getContractorProfile(ctx.user.id);
        if (!contractor) return { success: false, message: "Contractor profile not found" };
        const result = await referralService.trackReferral(ctx.user.id, input.email);
        if (result.success) {
          const referralLink = await referralService.getUserReferralLink(ctx.user.id, process.env.APP_BASE_URL || "https://clientcheck.app");
          await referralService.sendReferralInvitation(contractor.company || "A contractor", ctx.user.email || "", input.email, referralLink);
        }
        return result;
      }),
  }),

  // ─── Notification History ──────────────────────────────────────────────────
  notificationHistory: router({
    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        return notificationDelivery.listNotificationHistory(ctx.user.id, input.limit);
      }),
  }),

  // ─── Review Flagging (public users can flag reviews) ──────────────────────
  reviewFlags: router({
    submit: protectedProcedure
      .input(z.object({
        reviewId: z.number(),
        reason: z.enum(["incorrect_information", "wrong_individual", "harassment_abuse", "privacy_concern", "outdated_information", "other"]),
        details: z.string().max(2000).optional(),
        photoUrl: z.string().max(512).optional(),
        legalAccepted: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!input.legalAccepted) throw new Error("You must accept the Terms of Service and Privacy Policy.");
        const d = await getDb();
        if (!d) throw new Error("Database not available");
        await d.insert(reviewFlagRequests).values({
          reviewId: input.reviewId,
          reporterUserId: ctx.user.id,
          reason: input.reason,
          details: input.details ?? null,
          photoUrl: input.photoUrl ?? null,
          legalAccepted: true,
        });
        await d.update(reviewsTable).set({
          moderationStatus: "hidden_flagged",
          hiddenAt: new Date(),
        }).where(eq(reviewsTable.id, input.reviewId));
        return { success: true };
      }),

    getByReview: protectedProcedure
      .input(z.object({ reviewId: z.number() }))
      .query(async ({ input }) => {
        const d = await getDb();
        if (!d) return [];
        return d.select().from(reviewFlagRequests).where(eq(reviewFlagRequests.reviewId, input.reviewId));
      }),
  }),

  // ─── Customer Responses ───────────────────────────────────────────────────
  customerResponse: router({
    get: publicProcedure
      .input(z.object({ reviewId: z.number() }))
      .query(async ({ input }) => {
        const d = await getDb();
        if (!d) return null;
        const rows = await d.select().from(customerResponses).where(eq(customerResponses.reviewId, input.reviewId)).limit(1);
        return rows[0] ?? null;
      }),

    upsert: protectedProcedure
      .input(z.object({
        reviewId: z.number(),
        responseText: z.string().min(10).max(2000),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        const d = await getDb();
        if (!d) throw new Error("Database not available");
        const existing = await d.select().from(customerResponses).where(eq(customerResponses.reviewId, input.reviewId)).limit(1);
        if (existing.length > 0) {
          await d.update(customerResponses).set({
            responseText: input.responseText,
          }).where(eq(customerResponses.id, existing[0].id));
          return { ...existing[0], responseText: input.responseText };
        }
        const [result] = await d.insert(customerResponses).values({
          reviewId: input.reviewId,
          customerUserId: ctx.user.id,
          responseText: input.responseText,
        }).$returningId();
        return { id: result.id, reviewId: input.reviewId, responseText: input.responseText };
      }),
  }),

  // ─── Dispute Timeline (chat-style thread) ─────────────────────────────────
  disputeThread: router({
    getTimeline: protectedProcedure
      .input(z.object({ disputeId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        const d = await getDb();
        if (!d) return [];
        return d.select().from(disputeTimeline)
          .where(eq(disputeTimeline.disputeId, input.disputeId))
          .orderBy(disputeTimeline.createdAt);
      }),

    addMessage: protectedProcedure
      .input(z.object({
        disputeId: z.number(),
        content: z.string().min(1).max(2000),
        attachmentUrl: z.string().max(512).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        const d = await getDb();
        if (!d) throw new Error("Database not available");
        const role = ctx.user.role === "admin" ? "admin" as const : "customer" as const;
        const [result] = await d.insert(disputeTimeline).values({
          disputeId: input.disputeId,
          authorUserId: ctx.user.id,
          authorRole: role,
          entryType: "message",
          content: input.content,
          attachmentUrl: input.attachmentUrl ?? null,
        }).$returningId();
        return { id: result.id, success: true };
      }),

    getDispute: protectedProcedure
      .input(z.object({ disputeId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requireContractorSubscriptionForPlatformTools(ctx);
        const d = await getDb();
        if (!d) return null;
        const rows = await d.select().from(reviewDisputes).where(eq(reviewDisputes.id, input.disputeId)).limit(1);
        return rows[0] ?? null;
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        disputeId: z.number(),
        status: z.enum(["pending", "under_review", "awaiting_info", "resolved", "rejected"]),
        note: z.string().max(1000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const d = await getDb();
        if (!d) throw new Error("Database not available");
        if (ctx.user.role !== "admin") throw new Error("Only admins can update dispute status");
        await d.update(reviewDisputes).set({
          status: input.status,
          resolvedAt: (input.status === "resolved" || input.status === "rejected") ? new Date() : undefined,
          resolution: input.note ?? undefined,
        }).where(eq(reviewDisputes.id, input.disputeId));

        await d.insert(disputeTimeline).values({
          disputeId: input.disputeId,
          authorUserId: ctx.user.id,
          authorRole: "system",
          entryType: "status_change",
          content: `Status changed to ${input.status}${input.note ? `: ${input.note}` : ""}`,
          newStatus: input.status,
        });

        if (input.status === "resolved") {
          const dispute = await d.select().from(reviewDisputes).where(eq(reviewDisputes.id, input.disputeId)).limit(1);
          if (dispute[0]) {
            await d.update(reviewsTable).set({ moderationStatus: "active", hiddenAt: null, hiddenByAdminId: null })
              .where(eq(reviewsTable.id, dispute[0].reviewId));
          }
        } else if (input.status === "rejected") {
          const dispute = await d.select().from(reviewDisputes).where(eq(reviewDisputes.id, input.disputeId)).limit(1);
          if (dispute[0]) {
            await d.update(reviewsTable).set({ moderationStatus: "removed" })
              .where(eq(reviewsTable.id, dispute[0].reviewId));
          }
        }
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
