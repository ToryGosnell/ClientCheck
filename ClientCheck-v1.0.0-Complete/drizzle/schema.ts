import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "contractor", "customer"]).default("user").notNull(),
  /** Set when the user closes their account (soft delete). Row is retained for FK integrity. */
  deletedAt: timestamp("deletedAt"),
  accountStatus: mysqlEnum("accountStatus", ["active", "deleted", "suspended"])
    .default("active")
    .notNull(),
  termsAcceptedAt: timestamp("termsAcceptedAt"),
  privacyAcceptedAt: timestamp("privacyAcceptedAt"),
  legalAcceptanceVersion: varchar("legalAcceptanceVersion", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  /** Customer identity verification completed (Stripe Checkout, metadata.type=identity_verification). */
  isVerified: boolean("isVerified").default(false).notNull(),
  /** When verification completed; MySQL DATETIME / nullable. */
  verifiedAt: timestamp("verifiedAt"),
  /** Set once: numeric app user id of the contractor who shared a customer profile link this user followed (growth / referrals). */
  referredByUserId: int("referredByUserId"),
  /** Contractors who used this user's /invite link (signup attributed). */
  referralCount: int("referralCount").default(0).notNull(),
  /** Subset of referralCount that completed contractor verification. */
  verifiedReferralCount: int("verifiedReferralCount").default(0).notNull(),
  freeMonthsEarned: int("freeMonthsEarned").default(0).notNull(),
  /** Stacked referral reward extension end (subscription access). */
  subscriptionExtendedUntil: timestamp("subscriptionExtendedUntil"),
  /** True until the user dismisses the in-app reward celebration. */
  referralRewardUnseen: boolean("referralRewardUnseen").default(false).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Contractor profiles — extended info for contractors using the app.
 */
export const contractorProfiles = mysqlTable("contractor_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  trade: varchar("trade", { length: 128 }),
  licenseNumber: varchar("licenseNumber", { length: 64 }),
  company: varchar("company", { length: 255 }),
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 64 }),
  bio: text("bio"),
  verificationStatus: mysqlEnum("verificationStatus", ["unverified", "pending", "verified", "rejected"]).default("unverified").notNull(),
  idVerified: boolean("idVerified").default(false).notNull(),
  licenseVerified: boolean("licenseVerified").default(false).notNull(),
  insuranceVerified: boolean("insuranceVerified").default(false).notNull(),
  idDocumentUrl: varchar("idDocumentUrl", { length: 512 }),
  licenseDocumentUrl: varchar("licenseDocumentUrl", { length: 512 }),
  insuranceDocumentUrl: varchar("insuranceDocumentUrl", { length: 512 }),
  verificationSubmittedAt: timestamp("verificationSubmittedAt"),
  verificationReviewedAt: timestamp("verificationReviewedAt"),
  verificationNotes: text("verificationNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContractorProfile = typeof contractorProfiles.$inferSelect;
export type InsertContractorProfile = typeof contractorProfiles.$inferInsert;

/**
 * Customer profiles — the people being vetted by contractors.
 */
export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 128 }).notNull(),
  lastName: varchar("lastName", { length: 128 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  address: varchar("address", { length: 255 }).notNull(),
  city: varchar("city", { length: 128 }).notNull(),
  state: varchar("state", { length: 64 }).notNull(),
  zip: varchar("zip", { length: 16 }).notNull(),
  // Normalized fields for dedup and search
  normalizedName: varchar("normalizedName", { length: 255 }),
  normalizedPhone: varchar("normalizedPhone", { length: 32 }),
  normalizedEmail: varchar("normalizedEmail", { length: 320 }),
  normalizedAddressKey: varchar("normalizedAddressKey", { length: 512 }),
  searchText: text("searchText"),
  mergedIntoId: int("mergedIntoId"),
  isDuplicate: boolean("isDuplicate").default(false).notNull(),
  // Aggregate rating fields (denormalized for fast reads)
  overallRating: decimal("overallRating", { precision: 3, scale: 2 }).default("0.00"),
  calculatedOverallScore: decimal("calculatedOverallScore", { precision: 3, scale: 2 }).default("0.00"),
  reviewCount: int("reviewCount").default(0).notNull(),
  wouldWorkAgainYesCount: int("wouldWorkAgainYesCount").default(0).notNull(),
  wouldWorkAgainNoCount: int("wouldWorkAgainNoCount").default(0).notNull(),
  wouldWorkAgainNaCount: int("wouldWorkAgainNaCount").default(0).notNull(),
  redFlagCount: int("redFlagCount").default(0).notNull(),
  criticalRedFlagCount: int("criticalRedFlagCount").default(0).notNull(),
  greenFlagCount: int("greenFlagCount").default(0).notNull(),
  ratingPaymentReliability: decimal("ratingPaymentReliability", { precision: 3, scale: 2 }).default("0.00"),
  ratingCommunication: decimal("ratingCommunication", { precision: 3, scale: 2 }).default("0.00"),
  ratingScopeChanges: decimal("ratingScopeChanges", { precision: 3, scale: 2 }).default("0.00"),
  ratingPropertyRespect: decimal("ratingPropertyRespect", { precision: 3, scale: 2 }).default("0.00"),
  ratingPermitPulling: decimal("ratingPermitPulling", { precision: 3, scale: 2 }).default("0.00"),
  ratingOverallJobExperience: decimal("ratingOverallJobExperience", { precision: 3, scale: 2 }).default("0.00"),
  // Risk level computed from overallRating
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high", "unknown"]).default("unknown").notNull(),
  /**
   * Incremented when an authenticated contractor opens this directory profile (conversion / insights).
   * Used for customer-side verification paywall triggers, not for public analytics alone.
   */
  contractorProfileViewCount: int("contractorProfileViewCount").default(0).notNull(),
  /** Nullable so a hard-deleted creator user does not remove the customer row (FK ON DELETE SET NULL in DB). */
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

/**
 * Contractor invite program (/invite?ref=) — one row per referred contractor signup.
 */
export const contractorInviteReferrals = mysqlTable("contractor_invite_referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull(),
  referredUserId: int("referredUserId").notNull().unique(),
  isVerified: boolean("isVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContractorInviteReferral = typeof contractorInviteReferrals.$inferSelect;
export type InsertContractorInviteReferral = typeof contractorInviteReferrals.$inferInsert;

/**
 * Per-user contractor opens of a customer directory profile (for weekly social proof / analytics).
 */
export const customerProfileViews = mysqlTable("customer_profile_views", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  userId: int("userId").notNull(),
  viewedAt: timestamp("viewedAt").defaultNow().notNull(),
});

export type CustomerProfileView = typeof customerProfileViews.$inferSelect;
export type InsertCustomerProfileView = typeof customerProfileViews.$inferInsert;

/**
 * Reviews — a contractor's rating and review of a customer.
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  /** Nullable for FK ON DELETE SET NULL if a user row is ever hard-deleted; soft-deleted contractors keep their id. */
  contractorUserId: int("contractorUserId"),
  // Final published overall rating (0 when wouldWorkAgain=no, otherwise calculated average)
  overallRating: int("overallRating").notNull(),
  // Raw category average before override (for analytics)
  calculatedOverallRating: decimal("calculatedOverallRating", { precision: 3, scale: 2 }),
  // Category ratings 1–5 (new consolidated categories)
  /** 1–5 when rated; NULL when category marked N/A */
  ratingPaymentReliability: int("ratingPaymentReliability"),
  ratingCommunication: int("ratingCommunication"),
  ratingScopeChanges: int("ratingScopeChanges"),
  ratingPropertyRespect: int("ratingPropertyRespect"),
  ratingPermitPulling: int("ratingPermitPulling"),
  ratingOverallJobExperience: int("ratingOverallJobExperience"),
  // New: normalized categories + wouldWorkAgain stored as JSON (coexists with legacy int cols)
  categoryDataJson: text("categoryDataJson"),
  wouldWorkAgain: varchar("wouldWorkAgain", { length: 3 }),
  clientScore: int("clientScore").default(0).notNull(),
  confirmationCount: int("confirmationCount").default(0).notNull(),
  // Review text
  reviewText: text("reviewText"),
  // Job details
  jobType: varchar("jobType", { length: 128 }),
  jobDate: varchar("jobDate", { length: 32 }),
  jobAmount: varchar("jobAmount", { length: 32 }),
  // Flags (red flags stored as comma-separated or JSON, green flags as JSON)
  redFlags: text("redFlags"),
  greenFlags: text("greenFlags"),
  // Helpful votes
  helpfulCount: int("helpfulCount").default(0).notNull(),
  moderationStatus: mysqlEnum("moderationStatus", ["active", "hidden_flagged", "under_investigation", "removed"]).default("active").notNull(),
  hiddenAt: timestamp("hiddenAt"),
  hiddenByAdminId: int("hiddenByAdminId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * Helpful votes — tracks which contractors found a review helpful.
 */
export const reviewHelpfulVotes = mysqlTable("review_helpful_votes", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("reviewId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReviewHelpfulVote = typeof reviewHelpfulVotes.$inferSelect;

/**
 * Subscriptions — tracks user subscription status and trial periods.
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  status: mysqlEnum("status", ["trial", "active", "cancelled", "expired"]).default("trial").notNull(),
  planType: mysqlEnum("planType", [
    "verified_contractor_free_year",
    "contractor_annual",
    "contractor_pro_monthly",
    "customer_monthly",
    "annual_paid",
    "none",
  ]).default("none").notNull(),
  trialStartedAt: timestamp("trialStartedAt").defaultNow().notNull(),
  trialEndsAt: timestamp("trialEndsAt").notNull(),
  freeTrialStartAt: timestamp("freeTrialStartAt"),
  freeTrialEndAt: timestamp("freeTrialEndAt"),
  subscriptionStartedAt: timestamp("subscriptionStartedAt"),
  subscriptionEndsAt: timestamp("subscriptionEndsAt"),
  nextBillingAmount: decimal("nextBillingAmount", { precision: 8, scale: 2 }),
  nextBillingDate: timestamp("nextBillingDate"),
  paymentMethodOnFile: boolean("paymentMethodOnFile").default(false).notNull(),
  renewalReminderSentAt: timestamp("renewalReminderSentAt"),
  lastReminderDaysMilestone: int("lastReminderDaysMilestone"),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  stripeDefaultPaymentMethodId: varchar("stripeDefaultPaymentMethodId", { length: 255 }),
  paymentMethod: varchar("paymentMethod", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Review photos — images attached to reviews for evidence/documentation.
 */
export const reviewPhotos = mysqlTable("review_photos", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("reviewId").notNull(),
  photoUrl: text("photoUrl").notNull(), // S3 or storage URL
  caption: text("caption"), // Optional caption for the photo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReviewPhoto = typeof reviewPhotos.$inferSelect;
export type InsertReviewPhoto = typeof reviewPhotos.$inferInsert;

/**
 * Review disputes — customers can dispute negative reviews with their own response.
 */
export const reviewDisputes = mysqlTable("review_disputes", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("reviewId").notNull(),
  customerId: int("customerId").notNull(),
  status: mysqlEnum("status", ["open", "responded", "resolved", "dismissed", "pending", "under_review", "awaiting_info", "rejected"]).default("pending").notNull(),
  reason: mysqlEnum("dispute_reason", [
    "incorrect_information",
    "wrong_individual",
    "harassment_abuse",
    "privacy_concern",
    "outdated_information",
    "other",
  ]),
  customerResponse: text("customerResponse"),
  respondedAt: timestamp("respondedAt"),
  resolvedAt: timestamp("resolvedAt"),
  resolution: text("resolution"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReviewDispute = typeof reviewDisputes.$inferSelect;
export type InsertReviewDispute = typeof reviewDisputes.$inferInsert;

/**
 * Dispute photos — customer response photos for disputes.
 */
export const disputePhotos = mysqlTable("dispute_photos", {
  id: int("id").autoincrement().primaryKey(),
  disputeId: int("disputeId").notNull(),
  photoUrl: varchar("photoUrl", { length: 512 }).notNull(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type DisputePhoto = typeof disputePhotos.$inferSelect;
export type InsertDisputePhoto = typeof disputePhotos.$inferInsert;

/**
 * Review moderation queue — admins review flagged reviews before they appear publicly.
 */
export const reviewModerations = mysqlTable("review_moderations", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("reviewId").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "request_changes"]).default("pending").notNull(),
  reason: text("reason"), // Reason for flagging (if rejected or request_changes)
  moderatorId: int("moderatorId"), // Admin who reviewed it
  moderatedAt: timestamp("moderatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReviewModeration = typeof reviewModerations.$inferSelect;
export type InsertReviewModeration = typeof reviewModerations.$inferInsert;

/**
 * Contractor analytics — aggregated stats for contractor dashboard.
 */
export const contractorAnalytics = mysqlTable("contractor_analytics", {
  id: int("id").autoincrement().primaryKey(),
  contractorUserId: int("contractorUserId").notNull(),
  totalReviewsSubmitted: int("totalReviewsSubmitted").default(0).notNull(),
  totalDisputesReceived: int("totalDisputesReceived").default(0).notNull(),
  totalDisputesResponded: int("totalDisputesResponded").default(0).notNull(),
  disputeResponseRate: decimal("disputeResponseRate", { precision: 5, scale: 2 }).default("0").notNull(), // 0-100%
  averageReputationScore: decimal("averageReputationScore", { precision: 3, scale: 1 }).default("0").notNull(), // 0-10
  mostCommonRedFlag: varchar("mostCommonRedFlag", { length: 128 }),
  redFlagCounts: text("redFlagCounts"), // JSON: { "slow_payer": 5, "disputed_invoice": 3, ... }
  reviewsThisMonth: int("reviewsThisMonth").default(0).notNull(),
  reviewsLastMonth: int("reviewsLastMonth").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContractorAnalytics = typeof contractorAnalytics.$inferSelect;
export type InsertContractorAnalytics = typeof contractorAnalytics.$inferInsert;

/**
 * Email notifications log — track sent emails for audit and retry purposes.
 */
export const emailNotifications = mysqlTable("email_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", [
    "trial_expiring_7_days",
    "trial_expiring_1_day",
    "trial_expired",
    "dispute_filed",
    "review_posted",
    "review_approved",
    "review_rejected",
  ]).notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  failureReason: text("failureReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailNotification = typeof emailNotifications.$inferSelect;
export type InsertEmailNotification = typeof emailNotifications.$inferInsert;


/**
 * In-app messages between users
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull(),
  recipientId: int("recipientId").notNull(),
  text: text("text").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Onboarding status tracking
 */
export const onboardingStatus = mysqlTable("onboarding_status", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  profileCompleted: boolean("profileCompleted").default(false).notNull(),
  tradeSelected: boolean("tradeSelected").default(false).notNull(),
  verificationSubmitted: boolean("verificationSubmitted").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OnboardingStatus = typeof onboardingStatus.$inferSelect;
export type InsertOnboardingStatus = typeof onboardingStatus.$inferInsert;


/**
 * Achievements - gamification badges for contractors
 */
export const achievements = mysqlTable("achievements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", [
    "TOP_VETTER",
    "PAYMENT_DETECTIVE",
    "RED_FLAG_SPOTTER",
    "COMMUNITY_HELPER",
    "ACCURACY_MASTER",
    "STREAK_7",
    "STREAK_30",
    "REVIEWS_10",
    "REVIEWS_50",
    "REVIEWS_100"
  ]).notNull(),
  title: varchar("title", { length: 128 }).notNull(),
  description: text("description"),
  unlockedAt: timestamp("unlockedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;

/**
 * Contractor streaks - daily vetting engagement
 */
export const contractorStreaks = mysqlTable("contractor_streaks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  currentStreak: int("currentStreak").default(0).notNull(),
  longestStreak: int("longestStreak").default(0).notNull(),
  lastActivityDate: timestamp("lastActivityDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContractorStreak = typeof contractorStreaks.$inferSelect;
export type InsertContractorStreak = typeof contractorStreaks.$inferInsert;

/**
 * Referral tracking - viral growth incentives
 */
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull(),
  referredUserId: int("referredUserId"),
  referralCode: varchar("referralCode", { length: 32 }).notNull().unique(),
  referralEmail: varchar("referralEmail", { length: 320 }),
  status: mysqlEnum("status", ["pending", "completed", "expired"]).default("pending").notNull(),
  rewardUnlocked: boolean("rewardUnlocked").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  expiresAt: timestamp("expiresAt").notNull(),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

/**
 * Customer risk timeline - intelligence dashboard
 */
export const customerRiskTimeline = mysqlTable("customer_risk_timeline", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  eventType: mysqlEnum("eventType", ["payment_delay", "scope_creep", "dispute", "negative_review", "positive_review"]).notNull(),
  description: text("description"),
  severity: mysqlEnum("severity", ["low", "medium", "high"]).default("medium").notNull(),
  relatedReviewId: int("relatedReviewId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CustomerRiskTimeline = typeof customerRiskTimeline.$inferSelect;
export type InsertCustomerRiskTimeline = typeof customerRiskTimeline.$inferInsert;

/**
 * Customer alerts - custom notifications for contractors
 */
export const customerAlerts = mysqlTable("customer_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  customerId: int("customerId").notNull(),
  alertType: mysqlEnum("alertType", ["multiple_red_flags", "payment_pattern", "dispute_activity", "high_risk_score"]).notNull(),
  threshold: int("threshold").default(3).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomerAlert = typeof customerAlerts.$inferSelect;
export type InsertCustomerAlert = typeof customerAlerts.$inferInsert;

/**
 * Contractor connections - network graph
 */
export const contractorConnections = mysqlTable("contractor_connections", {
  id: int("id").autoincrement().primaryKey(),
  contractorId: int("contractorId").notNull(),
  connectedContractorId: int("connectedContractorId").notNull(),
  connectionType: mysqlEnum("connectionType", ["same_trade", "same_location", "referral", "collaboration"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContractorConnection = typeof contractorConnections.$inferSelect;
export type InsertContractorConnection = typeof contractorConnections.$inferInsert;

/**
 * Call logs - track incoming calls and customer interactions
 */
export const callLogs = mysqlTable("call_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  customerId: int("customerId"),
  phoneNumber: varchar("phoneNumber", { length: 32 }).notNull(),
  callType: mysqlEnum("callType", ["incoming", "outgoing", "missed"]).notNull(),
  callDuration: int("callDuration"),
  callOutcome: mysqlEnum("callOutcome", ["accepted", "declined", "missed"]),
  reviewSubmitted: boolean("reviewSubmitted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = typeof callLogs.$inferInsert;
/**
 * Contractor verification badges - admins manually verify contractors and assign badges to reviews
 */
export const contractorVerificationBadges = mysqlTable("contractor_verification_badges", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("reviewId").notNull().unique(),
  contractorUserId: int("contractorUserId").notNull(),
  licenseNumber: varchar("licenseNumber", { length: 64 }).notNull(),
  state: varchar("state", { length: 64 }).notNull(),
  verifiedByAdminId: int("verifiedByAdminId").notNull(),
  verificationNotes: text("verificationNotes"),
  verifiedAt: timestamp("verifiedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContractorVerificationBadge = typeof contractorVerificationBadges.$inferSelect;
export type InsertContractorVerificationBadge = typeof contractorVerificationBadges.$inferInsert;


/**
 * Customer Risk Scores - the core differentiator
 * Calculated from payment history, disputes, red flags, and review patterns
 */
export const customerRiskScores = mysqlTable("customer_risk_scores", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull().unique(),
  riskScore: int("riskScore").notNull(), // 0-100 (0=highest risk, 100=lowest risk)
  riskLevel: mysqlEnum("riskLevel", ["critical", "high", "medium", "low"]).notNull(),
  // Component scores
  paymentReliabilityScore: int("paymentReliabilityScore").notNull(), // 0-100
  communicationScore: int("communicationScore").notNull(), // 0-100
  scopeManagementScore: int("scopeManagementScore").notNull(), // 0-100
  propertyRespectScore: int("propertyRespectScore").notNull(), // 0-100
  // Risk factors
  missedPayments: int("missedPayments").default(0).notNull(),
  noShows: int("noShows").default(0).notNull(),
  disputes: int("disputes").default(0).notNull(),
  latePayments: int("latePayments").default(0).notNull(),
  redFlagCount: int("redFlagCount").default(0).notNull(),
  // Metadata
  reviewsAnalyzed: int("reviewsAnalyzed").default(0).notNull(),
  lastCalculatedAt: timestamp("lastCalculatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomerRiskScore = typeof customerRiskScores.$inferSelect;
export type InsertCustomerRiskScore = typeof customerRiskScores.$inferInsert;

/**
 * Industry specialization for contractors
 * Allows contractors to specialize in specific trades (Plumbing, HVAC, Electrical, etc.)
 */
export const contractorIndustries = mysqlTable("contractor_industries", {
  id: int("id").autoincrement().primaryKey(),
  contractorUserId: int("contractorUserId").notNull(),
  industry: mysqlEnum("industry", [
    "plumbing",
    "hvac",
    "electrical",
    "roofing",
    "carpentry",
    "painting",
    "landscaping",
    "general_contractor",
    "masonry",
    "drywall",
    "flooring",
    "tile",
    "plumbing_hvac",
    "plumbing_electrical",
    "hvac_electrical",
    "multi_trade"
  ]).notNull(),
  yearsExperience: int("yearsExperience"),
  certifications: text("certifications"), // JSON array of certifications
  isPrimary: boolean("isPrimary").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContractorIndustry = typeof contractorIndustries.$inferSelect;
export type InsertContractorIndustry = typeof contractorIndustries.$inferInsert;

/**
 * Pre-job risk checks - quick lookup history
 * Tracks when contractors check customers before accepting jobs
 */
export const preJobRiskChecks = mysqlTable("pre_job_risk_checks", {
  id: int("id").autoincrement().primaryKey(),
  contractorUserId: int("contractorUserId").notNull(),
  customerId: int("customerId").notNull(),
  riskScoreAtCheck: int("riskScoreAtCheck").notNull(),
  riskLevelAtCheck: mysqlEnum("riskLevelAtCheck", ["critical", "high", "medium", "low"]).notNull(),
  jobAccepted: boolean("jobAccepted"),
  jobAmount: varchar("jobAmount", { length: 32 }),
  jobCompletedSuccessfully: boolean("jobCompletedSuccessfully"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PreJobRiskCheck = typeof preJobRiskChecks.$inferSelect;
export type InsertPreJobRiskCheck = typeof preJobRiskChecks.$inferInsert;

/**
 * Dispute moderation queue - admins review and resolve disputes
 */
export const disputeModerations = mysqlTable("dispute_moderations", {
  id: int("id").autoincrement().primaryKey(),
  disputeId: int("disputeId").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "request_changes"]).default("pending").notNull(),
  moderatorId: int("moderatorId"), // Admin who reviewed it
  reason: text("reason"), // Reason for decision
  decision: mysqlEnum("decision", ["review_stands", "review_removed", "review_modified", "customer_response_approved"]),
  moderatedAt: timestamp("moderatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DisputeModeration = typeof disputeModerations.$inferSelect;
export type InsertDisputeModeration = typeof disputeModerations.$inferInsert;


/**
 * Contractor reviews - customers rate contractors to support a trusted two-sided marketplace.
 */
export const contractorReviews = mysqlTable("contractor_reviews", {
  id: int("id").autoincrement().primaryKey(),
  contractorUserId: int("contractorUserId").notNull(),
  customerId: int("customerId").notNull(),
  professionalismRating: int("professionalismRating").notNull(),
  communicationRating: int("communicationRating").notNull(),
  reliabilityRating: int("reliabilityRating").notNull(),
  workmanshipRating: int("workmanshipRating").notNull(),
  reviewText: text("reviewText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const contractorScores = mysqlTable("contractor_scores", {
  id: int("id").autoincrement().primaryKey(),
  contractorUserId: int("contractorUserId").notNull().unique(),
  overallScore: int("overallScore").default(0).notNull(),
  professionalismScore: int("professionalismScore").default(0).notNull(),
  communicationScore: int("communicationScore").default(0).notNull(),
  reliabilityScore: int("reliabilityScore").default(0).notNull(),
  workmanshipScore: int("workmanshipScore").default(0).notNull(),
  reviewsAnalyzed: int("reviewsAnalyzed").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const verificationDocuments = mysqlTable("verification_documents", {
  id: int("id").autoincrement().primaryKey(),
  contractorUserId: int("contractorUserId").notNull(),
  documentType: mysqlEnum("documentType", ["license", "insurance", "identity", "business_registration", "tax_document"]).notNull(),
  documentUrl: varchar("documentUrl", { length: 512 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewedByUserId: int("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const reviewEvidence = mysqlTable("review_evidence", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("reviewId").notNull(),
  uploadedByUserId: int("uploadedByUserId").notNull(),
  fileUrl: varchar("fileUrl", { length: 512 }).notNull(),
  fileType: varchar("fileType", { length: 64 }),
  caption: text("caption"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const fraudSignals = mysqlTable("fraud_signals", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("reviewId"),
  userId: int("userId"),
  customerId: int("customerId"),
  signalType: mysqlEnum("signalType", ["duplicate_ip", "velocity_spike", "duplicate_device", "duplicate_text", "reputation_attack"]).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["open", "reviewing", "dismissed", "confirmed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const deviceFingerprints = mysqlTable("device_fingerprints", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fingerprintHash: varchar("fingerprintHash", { length: 255 }).notNull(),
  lastSeenIp: varchar("lastSeenIp", { length: 64 }),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const partnerApiKeys = mysqlTable("partner_api_keys", {
  id: int("id").autoincrement().primaryKey(),
  partnerName: varchar("partnerName", { length: 255 }).notNull(),
  apiKeyHash: varchar("apiKeyHash", { length: 255 }).notNull().unique(),
  contactEmail: varchar("contactEmail", { length: 320 }),
  status: mysqlEnum("status", ["active", "disabled", "revoked"]).default("active").notNull(),
  rateLimitPerHour: int("rateLimitPerHour").default(500).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
});

export const webhookDeliveries = mysqlTable("webhook_deliveries", {
  id: int("id").autoincrement().primaryKey(),
  partnerApiKeyId: int("partnerApiKeyId").notNull(),
  eventType: varchar("eventType", { length: 128 }).notNull(),
  requestBody: text("requestBody"),
  responseStatus: int("responseStatus"),
  deliveredAt: timestamp("deliveredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const growthCampaigns = mysqlTable("growth_campaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  channel: mysqlEnum("channel", ["referral", "sms", "email", "paid_social", "organic", "supply_house"]).notNull(),
  status: mysqlEnum("status", ["draft", "active", "paused", "completed"]).default("draft").notNull(),
  incentiveType: mysqlEnum("incentiveType", ["free_month", "credit", "badge", "contest"]).default("free_month").notNull(),
  budgetCents: int("budgetCents").default(0).notNull(),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const growthEvents = mysqlTable("growth_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  campaignId: int("campaignId"),
  eventType: mysqlEnum("eventType", ["invite_sent", "signup_completed", "review_submitted", "subscription_started", "risk_check_completed"]).notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const territoryAlerts = mysqlTable("territory_alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  territoryKey: varchar("territoryKey", { length: 128 }).notNull(),
  alertType: mysqlEnum("alertType", ["new_high_risk_customer", "new_contractor_signup", "competitor_activity"]).notNull(),
  isEnabled: boolean("isEnabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const customerWatchlists = mysqlTable("customer_watchlists", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  customerId: int("customerId").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContractorReview = typeof contractorReviews.$inferSelect;
export type ContractorScore = typeof contractorScores.$inferSelect;
export type VerificationDocument = typeof verificationDocuments.$inferSelect;
export type ReviewEvidence = typeof reviewEvidence.$inferSelect;
export type FraudSignal = typeof fraudSignals.$inferSelect;
export type DeviceFingerprint = typeof deviceFingerprints.$inferSelect;
export type PartnerApiKey = typeof partnerApiKeys.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type GrowthCampaign = typeof growthCampaigns.$inferSelect;
export type GrowthEvent = typeof growthEvents.$inferSelect;
export type TerritoryAlert = typeof territoryAlerts.$inferSelect;
export type CustomerWatchlist = typeof customerWatchlists.$inferSelect;


/**
 * Collections and recovery workflows.
 */
export const collectionsCases = mysqlTable("collections_cases", {
  id: int("id").autoincrement().primaryKey(),
  contractorUserId: int("contractor_user_id").notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  amountCents: int("amount_cents").notNull(),
  stage: mysqlEnum("stage", ["reminder", "demand_letter", "payment_plan", "collections_partner", "resolved"]).default("reminder").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type CollectionsCase = typeof collectionsCases.$inferSelect;
export type InsertCollectionsCase = typeof collectionsCases.$inferInsert;

export const depositRecommendations = mysqlTable("deposit_recommendations", {
  id: int("id").autoincrement().primaryKey(),
  customerKey: varchar("customer_key", { length: 255 }).notNull(),
  riskScore: int("risk_score"),
  riskLevel: mysqlEnum("risk_level", ["low", "medium", "high"]).notNull(),
  recommendedDepositPercent: int("recommended_deposit_percent").notNull(),
  recommendedPaymentPlan: mysqlEnum("recommended_payment_plan", ["on_completion", "50_50", "deposit_plus_milestones"]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type DepositRecommendation = typeof depositRecommendations.$inferSelect;
export type InsertDepositRecommendation = typeof depositRecommendations.$inferInsert;

export const contractorBenchmarks = mysqlTable("contractor_benchmarks", {
  id: int("id").autoincrement().primaryKey(),
  contractorUserId: int("contractor_user_id").notNull(),
  city: varchar("city", { length: 128 }).notNull(),
  trade: varchar("trade", { length: 128 }).notNull(),
  disputeRate: decimal("dispute_rate", { precision: 5, scale: 2 }).default("0.00").notNull(),
  cancellationRate: decimal("cancellation_rate", { precision: 5, scale: 2 }).default("0.00").notNull(),
  latePayRate: decimal("late_pay_rate", { precision: 5, scale: 2 }).default("0.00").notNull(),
  percentileRank: int("percentile_rank").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ContractorBenchmark = typeof contractorBenchmarks.$inferSelect;
export type InsertContractorBenchmark = typeof contractorBenchmarks.$inferInsert;

export const smartIntakeSessions = mysqlTable("smart_intake_sessions", {
  id: int("id").autoincrement().primaryKey(),
  contractorUserId: int("contractor_user_id").notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  jobType: varchar("job_type", { length: 255 }).notNull(),
  notes: text("notes"),
  redFlagsJson: text("red_flags_json"),
  recommendedTermsJson: text("recommended_terms_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type SmartIntakeSession = typeof smartIntakeSessions.$inferSelect;
export type InsertSmartIntakeSession = typeof smartIntakeSessions.$inferInsert;

export const reputationPassports = mysqlTable("reputation_passports", {
  id: int("id").autoincrement().primaryKey(),
  customerKey: varchar("customer_key", { length: 255 }).notNull().unique(),
  label: varchar("label", { length: 255 }).notNull(),
  strengthsJson: text("strengths_json").notNull(),
  visibility: mysqlEnum("visibility", ["private", "shareable"]).default("private").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type ReputationPassport = typeof reputationPassports.$inferSelect;
export type InsertReputationPassport = typeof reputationPassports.$inferInsert;

export const partnershipLeads = mysqlTable("partnership_leads", {
  id: int("id").autoincrement().primaryKey(),
  partnerType: mysqlEnum("partner_type", ["supply_house", "association", "insurance", "franchise", "financing"]).notNull(),
  organization: varchar("organization", { length: 255 }).notNull(),
  market: varchar("market", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["prospect", "active", "paused"]).default("prospect").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type PartnershipLead = typeof partnershipLeads.$inferSelect;
export type InsertPartnershipLead = typeof partnershipLeads.$inferInsert;

export const enterpriseAccounts = mysqlTable("enterprise_accounts", {
  id: int("id").autoincrement().primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  branchCount: int("branch_count").default(1).notNull(),
  seats: int("seats").default(1).notNull(),
  crmIntegration: varchar("crm_integration", { length: 128 }),
  status: mysqlEnum("status", ["pilot", "active"]).default("pilot").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type EnterpriseAccount = typeof enterpriseAccounts.$inferSelect;
export type InsertEnterpriseAccount = typeof enterpriseAccounts.$inferInsert;

export const reviewClaimWorkflows = mysqlTable("review_claim_workflows", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("review_id").notNull(),
  contractorUserId: int("contractor_user_id").notNull(),
  path: mysqlEnum("path", ["case", "dispute", "demand_notice", "payment_protection_claim"]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ReviewClaimWorkflow = typeof reviewClaimWorkflows.$inferSelect;
export type InsertReviewClaimWorkflow = typeof reviewClaimWorkflows.$inferInsert;

export const territoryPredictions = mysqlTable("territory_predictions", {
  id: int("id").autoincrement().primaryKey(),
  zipCode: varchar("zip_code", { length: 16 }).notNull(),
  city: varchar("city", { length: 128 }).notNull(),
  trade: varchar("trade", { length: 128 }).notNull(),
  chargebackRisk: decimal("chargeback_risk", { precision: 5, scale: 2 }).default("0.00").notNull(),
  cancellationRate: decimal("cancellation_rate", { precision: 5, scale: 2 }).default("0.00").notNull(),
  paymentStrength: varchar("payment_strength", { length: 64 }).notNull(),
  trend: mysqlEnum("trend", ["up", "flat", "down"]).default("flat").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type TerritoryPrediction = typeof territoryPredictions.$inferSelect;
export type InsertTerritoryPrediction = typeof territoryPredictions.$inferInsert;

export const paymentControlRecords = mysqlTable("payment_control_records", {
  id: int("id").autoincrement().primaryKey(),
  contractorUserId: int("contractor_user_id").notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  depositLinkIssued: boolean("deposit_link_issued").default(true).notNull(),
  milestoneBillingEnabled: boolean("milestone_billing_enabled").default(false).notNull(),
  signedApprovalRequired: boolean("signed_approval_required").default(false).notNull(),
  financingOffered: boolean("financing_offered").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type PaymentControlRecord = typeof paymentControlRecords.$inferSelect;
export type InsertPaymentControlRecord = typeof paymentControlRecords.$inferInsert;


/**
 * Platform growth, trust, and operations persistence.
 */
export const paymentProtectionClaims = mysqlTable("payment_protection_claims", {
  id: int("id").autoincrement().primaryKey(),
  contractorUserId: int("contractor_user_id").notNull(),
  customerId: int("customer_id"),
  customerName: varchar("customer_name", { length: 255 }),
  amountCents: int("amount_cents").notNull(),
  reason: mysqlEnum("reason", ["non_payment", "chargeback", "fraud", "cancellation"]).notNull(),
  status: mysqlEnum("status", ["submitted", "under_review", "approved", "denied"]).default("submitted").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type PaymentProtectionClaim = typeof paymentProtectionClaims.$inferSelect;
export type InsertPaymentProtectionClaim = typeof paymentProtectionClaims.$inferInsert;

export const softwareIntegrationConnections = mysqlTable("software_integration_connections", {
  id: int("id").autoincrement().primaryKey(),
  contractorUserId: int("contractor_user_id").notNull(),
  provider: mysqlEnum("provider", ["ServiceTitan", "Housecall Pro", "Jobber", "Zapier", "Custom API"]).notNull(),
  status: mysqlEnum("status", ["connected", "pending", "disconnected"]).default("pending").notNull(),
  externalAccountName: varchar("external_account_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type SoftwareIntegrationConnection = typeof softwareIntegrationConnections.$inferSelect;
export type InsertSoftwareIntegrationConnection = typeof softwareIntegrationConnections.$inferInsert;

export const trustNetworkBadges = mysqlTable("trust_network_badges", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  badge: mysqlEnum("badge", ["verified_identity", "verified_license", "insured", "background_checked", "top_responder"]).notNull(),
  awardedByUserId: int("awarded_by_user_id"),
  awardedAt: timestamp("awarded_at").defaultNow().notNull(),
});
export type TrustNetworkBadge = typeof trustNetworkBadges.$inferSelect;
export type InsertTrustNetworkBadge = typeof trustNetworkBadges.$inferInsert;

export const industryInsightSnapshots = mysqlTable("industry_insight_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  city: varchar("city", { length: 128 }).notNull(),
  trade: varchar("trade", { length: 128 }).notNull(),
  metric: varchar("metric", { length: 255 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  periodLabel: varchar("period_label", { length: 128 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type IndustryInsightSnapshot = typeof industryInsightSnapshots.$inferSelect;
export type InsertIndustryInsightSnapshot = typeof industryInsightSnapshots.$inferInsert;

export const integrationWebhookReceipts = mysqlTable("integration_webhook_receipts", {
  id: int("id").autoincrement().primaryKey(),
  provider: varchar("provider", { length: 128 }).notNull(),
  externalEventId: varchar("external_event_id", { length: 255 }).notNull().unique(),
  signatureHash: varchar("signature_hash", { length: 255 }),
  payloadHash: varchar("payload_hash", { length: 255 }),
  status: mysqlEnum("status", ["received", "processed", "replayed", "failed"]).default("received").notNull(),
  payloadJson: text("payload_json"),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});
export type IntegrationWebhookReceipt = typeof integrationWebhookReceipts.$inferSelect;

export const adminAuditLog = mysqlTable("admin_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  adminUserId: int("adminUserId").notNull(),
  action: varchar("action", { length: 128 }).notNull(),
  targetType: varchar("targetType", { length: 64 }).notNull(),
  targetId: varchar("targetId", { length: 128 }),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminAuditLog = typeof adminAuditLog.$inferSelect;

export const stripeWebhookEvents = mysqlTable("stripe_webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  stripeEventId: varchar("stripe_event_id", { length: 255 }).notNull().unique(),
  eventType: varchar("event_type", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["received", "processed", "failed"]).default("received").notNull(),
  payloadJson: text("payload_json"),
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type StripeWebhookEvent = typeof stripeWebhookEvents.$inferSelect;

/** Stripe payment intents — updated by webhooks so app stays accurate if user closes mid-payment. */
export const stripePayments = mysqlTable("stripe_payments", {
  id: int("id").autoincrement().primaryKey(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }).notNull().unique(),
  userId: int("userId"),
  amountCents: int("amount_cents"),
  currency: varchar("currency", { length: 8 }),
  status: mysqlEnum("status", ["requires_payment_method", "requires_confirmation", "requires_action", "processing", "succeeded", "canceled", "failed", "refunded"]).notNull(),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type StripePayment = typeof stripePayments.$inferSelect;
export type InsertStripePayment = typeof stripePayments.$inferInsert;

/**
 * Production hardening tables.
 */
export const emailVerificationTokens = mysqlTable("email_verification_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  tokenHash: varchar("tokenHash", { length: 255 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "verified", "expired", "revoked"]).default("pending").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  verifiedAt: timestamp("verifiedAt"),
  lastSentAt: timestamp("lastSentAt").defaultNow().notNull(),
  sendAttempts: int("sendAttempts").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId"),
  actorRole: varchar("actorRole", { length: 64 }),
  action: varchar("action", { length: 128 }).notNull(),
  entityType: varchar("entityType", { length: 128 }).notNull(),
  entityId: varchar("entityId", { length: 128 }),
  outcome: mysqlEnum("outcome", ["success", "failure", "denied"]).default("success").notNull(),
  metadataJson: text("metadataJson"),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: varchar("userAgent", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuditLog = typeof auditLogs.$inferSelect;

export const reviewPolicyAcceptances = mysqlTable("review_policy_acceptances", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  policyVersion: varchar("policyVersion", { length: 32 }).notNull(),
  acceptedAt: timestamp("acceptedAt").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  userAgent: varchar("userAgent", { length: 255 }),
});
export type ReviewPolicyAcceptance = typeof reviewPolicyAcceptances.$inferSelect;

export const disputeEscalations = mysqlTable("dispute_escalations", {
  id: int("id").autoincrement().primaryKey(),
  disputeId: int("disputeId").notNull(),
  escalatedByUserId: int("escalatedByUserId").notNull(),
  escalationType: mysqlEnum("escalationType", ["appeal", "takedown_request", "legal_review", "sla_breach"]).notNull(),
  status: mysqlEnum("status", ["open", "in_review", "resolved", "rejected"]).default("open").notNull(),
  notes: text("notes"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DisputeEscalation = typeof disputeEscalations.$inferSelect;

export const notificationDeliveries = mysqlTable("notification_deliveries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  channel: mysqlEnum("channel", ["push", "email", "sms", "webhook"]).notNull(),
  templateKey: varchar("templateKey", { length: 128 }).notNull(),
  destination: varchar("destination", { length: 320 }),
  status: mysqlEnum("status", ["queued", "sent", "failed", "retrying", "delivered"]).default("queued").notNull(),
  providerMessageId: varchar("providerMessageId", { length: 255 }),
  payloadJson: text("payloadJson"),
  errorMessage: text("errorMessage"),
  attempts: int("attempts").default(0).notNull(),
  sentAt: timestamp("sentAt"),
  deliveredAt: timestamp("deliveredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;

export const integrationUsageEvents = mysqlTable("integration_usage_events", {
  id: int("id").autoincrement().primaryKey(),
  partnerApiKeyId: int("partnerApiKeyId"),
  provider: varchar("provider", { length: 128 }),
  eventType: varchar("eventType", { length: 128 }).notNull(),
  requestId: varchar("requestId", { length: 128 }),
  statusCode: int("statusCode"),
  mode: mysqlEnum("mode", ["sandbox", "production"]).default("sandbox").notNull(),
  metadataJson: text("metadataJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type IntegrationUsageEvent = typeof integrationUsageEvents.$inferSelect;

export const partnerApiKeyScopes = mysqlTable("partner_api_key_scopes", {
  id: int("id").autoincrement().primaryKey(),
  partnerApiKeyId: int("partnerApiKeyId").notNull(),
  scope: varchar("scope", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PartnerApiKeyScope = typeof partnerApiKeyScopes.$inferSelect;

export const partnerApiKeyRotations = mysqlTable("partner_api_key_rotations", {
  id: int("id").autoincrement().primaryKey(),
  partnerApiKeyId: int("partnerApiKeyId").notNull(),
  rotatedByUserId: int("rotatedByUserId"),
  oldKeyHash: varchar("oldKeyHash", { length: 255 }).notNull(),
  newKeyHash: varchar("newKeyHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PartnerApiKeyRotation = typeof partnerApiKeyRotations.$inferSelect;

export const customerIdentityProfiles = mysqlTable("customer_identity_profiles", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull().unique(),
  normalizedPhone: varchar("normalizedPhone", { length: 32 }),
  normalizedEmail: varchar("normalizedEmail", { length: 320 }),
  normalizedAddress: varchar("normalizedAddress", { length: 255 }),
  normalizedName: varchar("normalizedName", { length: 255 }).notNull(),
  confidenceScore: int("confidenceScore").default(50).notNull(),
  duplicateClusterKey: varchar("duplicateClusterKey", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CustomerIdentityProfile = typeof customerIdentityProfiles.$inferSelect;

export const customerIdentityMatches = mysqlTable("customer_identity_matches", {
  id: int("id").autoincrement().primaryKey(),
  sourceCustomerId: int("sourceCustomerId").notNull(),
  targetCustomerId: int("targetCustomerId").notNull(),
  matchScore: int("matchScore").notNull(),
  matchReasonsJson: text("matchReasonsJson"),
  status: mysqlEnum("status", ["suggested", "approved", "rejected", "merged"]).default("suggested").notNull(),
  reviewedByUserId: int("reviewedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CustomerIdentityMatch = typeof customerIdentityMatches.$inferSelect;

export const customerMergeEvents = mysqlTable("customer_merge_events", {
  id: int("id").autoincrement().primaryKey(),
  sourceCustomerId: int("sourceCustomerId").notNull(),
  targetCustomerId: int("targetCustomerId").notNull(),
  mergedByUserId: int("mergedByUserId").notNull(),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CustomerMergeEvent = typeof customerMergeEvents.$inferSelect;

export const reporterTrustScores = mysqlTable("reporter_trust_scores", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  trustScore: int("trustScore").default(50).notNull(),
  confirmedReports: int("confirmedReports").default(0).notNull(),
  dismissedReports: int("dismissedReports").default(0).notNull(),
  falseReports: int("falseReports").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ReporterTrustScore = typeof reporterTrustScores.$inferSelect;

export const rateLimitEvents = mysqlTable("rate_limit_events", {
  id: int("id").autoincrement().primaryKey(),
  actorKey: varchar("actorKey", { length: 255 }).notNull(),
  bucket: varchar("bucket", { length: 128 }).notNull(),
  routeKey: varchar("routeKey", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RateLimitEvent = typeof rateLimitEvents.$inferSelect;

/**
 * Customer responses — customers can respond publicly to reviews about them.
 * One response per review.
 */
export const customerResponses = mysqlTable("customer_responses", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("reviewId").notNull().unique(),
  customerUserId: int("customerUserId").notNull(),
  responseText: text("responseText").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CustomerResponse = typeof customerResponses.$inferSelect;
export type InsertCustomerResponse = typeof customerResponses.$inferInsert;

/**
 * Dispute timeline — chat-style thread entries on disputes.
 */
export const disputeTimeline = mysqlTable("dispute_timeline", {
  id: int("id").autoincrement().primaryKey(),
  disputeId: int("disputeId").notNull(),
  authorUserId: int("authorUserId"),
  authorRole: mysqlEnum("authorRole", ["customer", "admin", "system"]).notNull(),
  entryType: mysqlEnum("entryType", ["message", "status_change", "info_request", "attachment", "resolution"]).notNull(),
  content: text("content"),
  attachmentUrl: varchar("attachmentUrl", { length: 512 }),
  newStatus: varchar("newStatus", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DisputeTimelineEntry = typeof disputeTimeline.$inferSelect;
export type InsertDisputeTimelineEntry = typeof disputeTimeline.$inferInsert;

/**
 * Review flag requests — public users flag reviews for admin evaluation.
 */
export const reviewFlagRequests = mysqlTable("review_flag_requests", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("reviewId").notNull(),
  reporterUserId: int("reporterUserId"),
  reason: mysqlEnum("reason", [
    "incorrect_information",
    "wrong_individual",
    "harassment_abuse",
    "privacy_concern",
    "outdated_information",
    "other",
  ]).notNull(),
  details: text("details"),
  photoUrl: varchar("photoUrl", { length: 512 }),
  legalAccepted: boolean("legalAccepted").default(false).notNull(),
  status: mysqlEnum("status", ["pending", "under_review", "resolved", "dismissed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ReviewFlagRequest = typeof reviewFlagRequests.$inferSelect;
export type InsertReviewFlagRequest = typeof reviewFlagRequests.$inferInsert;
