import { drizzle } from "drizzle-orm/mysql2";
import { contractorAnalytics, reviews, reviewDisputes } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Get or create contractor analytics record
 */
export async function getOrCreateAnalytics(contractorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(contractorAnalytics)
    .where(eq(contractorAnalytics.contractorUserId, contractorUserId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new analytics record
  const result = await db.insert(contractorAnalytics).values({
    contractorUserId,
    totalReviewsSubmitted: 0,
    totalDisputesReceived: 0,
    totalDisputesResponded: 0,
    disputeResponseRate: "0",
    averageReputationScore: "0",
    mostCommonRedFlag: null,
    redFlagCounts: "{}",
    reviewsThisMonth: 0,
    reviewsLastMonth: 0,
  });

  return (result as any).insertId;
}

/**
 * Recalculate contractor analytics
 */
export async function recalculateContractorAnalytics(contractorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all reviews by this contractor
  const contractorReviews = await db
    .select()
    .from(reviews)
    .where(eq(reviews.contractorUserId, contractorUserId));

  // Get all disputes on reviews by this contractor
  const disputes = await db
    .select()
    .from(reviewDisputes)
    .where(eq(reviewDisputes.reviewId, contractorReviews[0]?.id || 0));

  // Calculate metrics
  const totalReviewsSubmitted = contractorReviews.length;
  const totalDisputesReceived = disputes.filter((d) => d.status === "open").length;
  const totalDisputesResponded = disputes.filter((d) => d.status !== "open").length;
  const disputeResponseRate =
    totalDisputesReceived > 0
      ? Math.round((totalDisputesResponded / (totalDisputesReceived + totalDisputesResponded)) * 100)
      : 0;

  // Calculate average reputation score (0-10)
  const totalRating = contractorReviews.reduce((sum, r) => sum + (r.overallRating || 0), 0);
  const avgRating = totalReviewsSubmitted > 0 ? totalRating / totalReviewsSubmitted : 0;
  const averageReputationScore = Math.round(avgRating * 2) / 2; // Round to nearest 0.5

  // Count red flags
  const redFlagCounts: Record<string, number> = {};
  contractorReviews.forEach((review) => {
    if (review.redFlags) {
      const flags = review.redFlags.split(",");
      flags.forEach((flag) => {
        redFlagCounts[flag] = (redFlagCounts[flag] || 0) + 1;
      });
    }
  });

  // Find most common red flag
  const mostCommonRedFlag = Object.entries(redFlagCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Count reviews this month and last month
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const reviewsThisMonth = contractorReviews.filter(
    (r) => new Date(r.createdAt) >= thisMonthStart
  ).length;

  const reviewsLastMonth = contractorReviews.filter(
    (r) => new Date(r.createdAt) >= lastMonthStart && new Date(r.createdAt) <= lastMonthEnd
  ).length;

  // Update analytics record
  await db
    .update(contractorAnalytics)
    .set({
      totalReviewsSubmitted,
      totalDisputesReceived,
      totalDisputesResponded,
      disputeResponseRate: disputeResponseRate.toString(),
      averageReputationScore: averageReputationScore.toString(),
      mostCommonRedFlag,
      redFlagCounts: JSON.stringify(redFlagCounts),
      reviewsThisMonth,
      reviewsLastMonth,
    })
    .where(eq(contractorAnalytics.contractorUserId, contractorUserId));
}

/**
 * Get contractor analytics for dashboard
 */
export async function getContractorAnalytics(contractorUserId: number) {
  const db = await getDb();
  if (!db) return null;

  const analytics = await db
    .select()
    .from(contractorAnalytics)
    .where(eq(contractorAnalytics.contractorUserId, contractorUserId))
    .limit(1);

  if (analytics.length === 0) {
    await getOrCreateAnalytics(contractorUserId);
    return await getContractorAnalytics(contractorUserId);
  }

  const data = analytics[0];
  return {
    ...data,
    redFlagCounts: data.redFlagCounts ? JSON.parse(data.redFlagCounts) : {},
  };
}

/**
 * Get top contractors by reputation
 */
export async function getTopContractors(limit = 10) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(contractorAnalytics)
    .orderBy(desc(contractorAnalytics.averageReputationScore))
    .limit(limit);
}

/**
 * Get contractors with most reviews this month
 */
export async function getMostActiveContractors(limit = 10) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(contractorAnalytics)
    .orderBy(desc(contractorAnalytics.reviewsThisMonth))
    .limit(limit);
}
