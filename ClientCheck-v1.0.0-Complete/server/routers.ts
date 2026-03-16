import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
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
import { calculateCustomerRiskScore, saveRiskScore } from "./services/risk-score-engine";
import { FraudDetectionService } from "../lib/fraud-detection-service";
import { getDb } from "./db";
import { reviews as reviewsTable, reviewModerations } from "../drizzle/schema";
import * as integrationImportService from "./services/integration-import-service";
import * as fraudSignalsService from "./services/fraud-signals-service";
import { desc as drizzleDesc } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,
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
  }),

  // ─── Customers ──────────────────────────────────────────────────────────────
  customers: router({
       search: publicProcedure
      .input(z.object({ query: z.string().min(1).max(100) }))
      .query(({ input }) => db.searchCustomers(input.query)),
    
    // Public access to view all reviews for a customer (no login required)
    getReviews: publicProcedure
      .input(z.object({ customerId: z.number() }))
      .query(({ input }) => db.getReviewsForCustomer(input.customerId)),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getCustomerById(input.id)),

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
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check for duplicates based on name + city/state
        const duplicates = await duplicateDetection.findDuplicateCandidates(
          input.firstName,
          input.lastName,
          input.city || "",
          input.state || ""
        );

        // If exact match found:
        // - If phone provided: match on name + phone + city/state/zip
        // - If phone NOT provided: match on name + city/state/zip only
        const exactMatch = duplicates.find(
          (d) => {
            const nameMatch =
              d.firstName.toLowerCase() === input.firstName.toLowerCase() &&
              d.lastName.toLowerCase() === input.lastName.toLowerCase();
            const locationMatch =
              d.city === (input.city || "") &&
              d.state === (input.state || "") &&
              d.zip === (input.zip || "");
            
            // If phone is provided, require exact phone match too
            if (input.phone) {
              return nameMatch && locationMatch && d.phone === input.phone;
            }
            // If phone is NOT provided, just match on name + location
            return nameMatch && locationMatch;
          }
        );

        if (exactMatch) {
          return {
            id: exactMatch.id,
            isDuplicate: true,
            message: `Customer already exists. Using existing profile for ${exactMatch.firstName} ${exactMatch.lastName}.`,
          };
        }

        // If similar matches found (70%+ similarity), return them for user confirmation
        if (duplicates.length > 0) {
          const highSimilarity = duplicates.filter((d) => d.similarity >= 70);
          if (highSimilarity.length > 0) {
            return {
              duplicates: highSimilarity,
              message: "Similar customers found. Please confirm this is a new person.",
            };
          }
        }

        // No duplicates found, create new customer
        const newCustomerId = await db.createCustomer({
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone || "",
          email: input.email,
          address: input.address || "",
          city: input.city || "",
          state: input.state || "",
          zip: input.zip || "",
          createdByUserId: ctx.user.id,
        });

        return { id: newCustomerId, isNew: true };
      }),

    getFlagged: protectedProcedure.query(() => db.getRecentlyFlaggedCustomers(20)),
    getTopRated: protectedProcedure.query(() => db.getTopRatedCustomers(10)),
  }),

  // ─── Subscriptions ────────────────────────────────────────────────────────────
  subscription: router({
    getStatus: protectedProcedure.query(({ ctx }) =>
      subDb.checkSubscriptionStatus(ctx.user.id, ctx.user.openId)
    ),
    createTrial: protectedProcedure.mutation(({ ctx }) =>
      subDb.createTrialSubscription(ctx.user.id)
    ),
    upgrade: protectedProcedure.mutation(({ ctx }) =>
      subDb.upgradeToSubscription(ctx.user.id)
    ),
    cancel: protectedProcedure.mutation(({ ctx }) =>
      subDb.cancelSubscription(ctx.user.id)
    ),
  }),

  // ─── Reviews ────────────────────────────────────────────────────────────────
  reviews: router({
    getForCustomer: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .query(({ input }) => db.getReviewsForCustomer(input.customerId)),

    getMyReviews: protectedProcedure.query(({ ctx }) =>
      db.getReviewsByContractor(ctx.user.id)
    ),

    getRecent: protectedProcedure.query(() => db.getRecentReviews(20)),

    create: protectedProcedure
      .input(
        z.object({
          customerId: z.number(),
          overallRating: z.number().int().min(1).max(5),
          ratingPaymentReliability: z.number().int().min(1).max(5),
          ratingCommunication: z.number().int().min(1).max(5),
          ratingScopeChanges: z.number().int().min(1).max(5),
          ratingPropertyRespect: z.number().int().min(1).max(5),
          ratingPermitPulling: z.number().int().min(1).max(5),
          ratingOverallJobExperience: z.number().int().min(1).max(5),
          reviewText: z.string().max(2000).optional(),
          jobType: z.string().max(128).optional(),
          jobDate: z.string().max(32).optional(),
          jobAmount: z.string().max(32).optional(),
          redFlags: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const reviewId = await db.createReview({ ...input, contractorUserId: ctx.user.id });
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
          overallRating: z.number().int().min(1).max(5).optional(),
          ratingPaidOnTime: z.number().int().min(1).max(5).optional(),
          ratingCommunication: z.number().int().min(1).max(5).optional(),
          ratingKnewWhatTheyWanted: z.number().int().min(1).max(5).optional(),
          ratingProfessionalism: z.number().int().min(1).max(5).optional(),
          ratingInvoiceAccuracy: z.number().int().min(1).max(5).optional(),
          ratingWouldWorkAgain: z.number().int().min(1).max(5).optional(),
          reviewText: z.string().max(2000).optional(),
          jobType: z.string().max(128).optional(),
          redFlags: z.string().optional(),
        })
      )
      .mutation(({ ctx, input }) => {
        const { reviewId, ...data } = input;
        return db.updateReview(reviewId, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ reviewId: z.number() }))
      .mutation(({ ctx, input }) =>
        db.deleteReview(input.reviewId, ctx.user.id)
      ),

    markHelpful: protectedProcedure
      .input(z.object({ reviewId: z.number() }))
      .mutation(({ ctx, input }) =>
        db.markReviewHelpful(input.reviewId, ctx.user.id)
      ),
    addPhotos: protectedProcedure
      .input(
        z.object({
          reviewId: z.number(),
          photoUrls: z.array(z.string().url()).max(10),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const review = await db.getReviewById(input.reviewId);
        if (!review || review.contractorUserId !== ctx.user.id) {
          throw new Error("Review not found or unauthorized");
        }
        await db.addReviewPhotos(input.reviewId, input.photoUrls);
        return { success: true };
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
      .input(z.object({ paymentIntentId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const result = await stripeService.confirmPayment(input.paymentIntentId);
        if ((result as any).success) {
          // Update subscription status in database
          await subDb.upgradeToSubscription(ctx.user.id);
        }
        return result;
      }),

    // App customer subscription flow (server-only Stripe; no secret in client)
    createStripeCustomerForApp: protectedProcedure
      .input(
        z.object({
          email: z.string().email(),
          name: z.string().min(1),
          phone: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return stripePayment.createStripeCustomerForAppUser(input);
      }),

    createCustomerPaymentIntentForApp: protectedProcedure
      .input(
        z.object({
          stripeCustomerId: z.string(),
          amountCents: z.number().min(1),
          plan: z.enum(["monthly", "yearly"]),
        })
      )
      .mutation(async ({ input }) => {
        return stripePayment.createCustomerPaymentIntentForApp(input);
      }),

    createCustomerSubscriptionForApp: protectedProcedure
      .input(
        z.object({
          stripeCustomerId: z.string(),
          plan: z.enum(["monthly", "yearly"]),
          paymentMethodId: z.string().optional(),
          paymentIntentId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await stripePayment.createCustomerSubscriptionForApp(input);
        if (!("error" in result) && result.subscriptionId && result.subscriptionId.startsWith("sub_")) {
          await subDb.upgradeToSubscription(ctx.user.id, input.plan, result.subscriptionId);
        }
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
      .query(async ({ input }) => {
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
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Get the review to find the customer
        const review = await db.getReviewById(input.reviewId);
        if (!review) throw new Error("Review not found");

        // Create dispute
        const dispute = await db.createDispute({
          reviewId: input.reviewId,
          customerId: review.customerId,
          status: "open",
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
      .query(async ({ input }) => {
        return db.getDisputesByCustomer(input.customerId);
      }),

    getDisputesByReview: protectedProcedure
      .input(z.object({ reviewId: z.number() }))
      .query(async ({ input }) => {
        return db.getDisputesByReview(input.reviewId);
      }),
  }),

  // ─── Contractor Analytics ────────────────────────────────────────────────────
  analytics: router({
    getMyAnalytics: protectedProcedure.query(async ({ ctx }) => {
      return analyticsDb.getContractorAnalytics(ctx.user.id);
    }),

    recalculateAnalytics: protectedProcedure.mutation(async ({ ctx }) => {
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

    getPendingVerifications: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new Error("Unauthorized");
      return verificationDb.getPendingVerifications();
    }),

    approveVerification: protectedProcedure
      .input(z.object({
        userId: z.number(),
        idVerified: z.boolean(),
        licenseVerified: z.boolean(),
        insuranceVerified: z.boolean(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new Error("Unauthorized");
        return verificationDb.approveVerification(
          input.userId,
          input.idVerified,
          input.licenseVerified,
          input.insuranceVerified,
          input.notes
        );
      }),

    rejectVerification: protectedProcedure
      .input(z.object({ userId: z.number(), reason: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new Error("Unauthorized");
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
          jobData: z.record(z.any()),
          metadata: z.record(z.any()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return integrationImportService.createImportJob(input);
      }),

    getImportJobDetails: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input }) => {
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
      .query(async ({ input }) => {
        return integrationImportService.getImportHistory(input.integrationId, input.limit, input.status);
      }),

    getImportStats: protectedProcedure
      .input(z.object({ integrationId: z.number() }))
      .query(async ({ input }) => {
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
          metadata: z.record(z.any()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        return fraudSignalsService.recordFraudSignal(input);
      }),

    getSignals: publicProcedure
      .input(z.object({ reviewId: z.number() }))
      .query(async ({ input }) => {
        return fraudSignalsService.getFraudSignals(input.reviewId);
      }),

    getCustomerFraudHistory: protectedProcedure
      .input(z.object({ customerId: z.number(), limit: z.number().default(50) }))
      .query(async ({ input }) => {
        return fraudSignalsService.getFraudHistory(input.customerId, input.limit);
      }),

    getContractorFraudHistory: protectedProcedure
      .input(z.object({ contractorUserId: z.number(), limit: z.number().default(50) }))
      .query(async ({ input }) => {
        return fraudSignalsService.getContractorFraudHistory(input.contractorUserId, input.limit);
      }),

    getCustomerStats: protectedProcedure
      .input(z.object({ customerId: z.number() }))
      .query(async ({ input }) => {
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
      return db.getReferralStatus(ctx.user.id);
    }),

    getReferralRewards: protectedProcedure.query(async ({ ctx }) => {
      return db.getReferralRewards(ctx.user.id);
    }),

    getUserReferrals: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserReferrals(ctx.user.id);
    }),

    sendInvitation: protectedProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ ctx, input }) => {
        const contractor = await db.getContractorProfile(ctx.user.id);
        if (!contractor) return { success: false, message: "Contractor profile not found" };
        const result = await db.trackReferral(ctx.user.id, input.email);
        if (result.success) {
          const referralLink = await db.getUserReferralLink(ctx.user.id, process.env.APP_BASE_URL || "https://clientcheck.app");
          await db.sendReferralInvitation(contractor.company || "A contractor", ctx.user.email || "", input.email, referralLink);
        }
        return result;
      }),
  }),

  // ─── Notifications ──────────────────────────────────────────────────────────
  notifications: router({
    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        return db.listNotificationHistory(ctx.user.id, input.limit);
      }),
  }),
});

export type AppRouter = typeof appRouter;
