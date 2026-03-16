import { drizzle } from "drizzle-orm/mysql2";
import { reviewModerations, reviews } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

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
 * Get all pending reviews for moderation
 */
export async function getPendingModerations(limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(reviewModerations)
    .where(eq(reviewModerations.status, "pending"))
    .orderBy(desc(reviewModerations.createdAt))
    .limit(limit);
}

/**
 * Get moderation history for a review
 */
export async function getReviewModerationHistory(reviewId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(reviewModerations)
    .where(eq(reviewModerations.reviewId, reviewId))
    .orderBy(desc(reviewModerations.createdAt));
}

/**
 * Approve a review
 */
export async function approveReview(reviewId: number, moderatorId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Create moderation record
  await db.insert(reviewModerations).values({
    reviewId,
    status: "approved",
    moderatorId,
    moderatedAt: new Date(),
  });

  // Update review status (if you add a flagged_for_moderation column)
  // await db.update(reviews).set({ flaggedForModeration: false }).where(eq(reviews.id, reviewId));

  return { success: true };
}

/**
 * Reject a review
 */
export async function rejectReview(reviewId: number, moderatorId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Create moderation record
  await db.insert(reviewModerations).values({
    reviewId,
    status: "rejected",
    reason,
    moderatorId,
    moderatedAt: new Date(),
  });

  // Delete the review
  await db.delete(reviews).where(eq(reviews.id, reviewId));

  return { success: true };
}

/**
 * Request changes to a review
 */
export async function requestReviewChanges(reviewId: number, moderatorId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Create moderation record
  await db.insert(reviewModerations).values({
    reviewId,
    status: "request_changes",
    reason,
    moderatorId,
    moderatedAt: new Date(),
  });

  return { success: true };
}

/**
 * Get moderation stats
 */
export async function getModerationStats() {
  const db = await getDb();
  if (!db) return null;

  const pending = await db
    .select()
    .from(reviewModerations)
    .where(eq(reviewModerations.status, "pending"));

  const approved = await db
    .select()
    .from(reviewModerations)
    .where(eq(reviewModerations.status, "approved"));

  const rejected = await db
    .select()
    .from(reviewModerations)
    .where(eq(reviewModerations.status, "rejected"));

  const requestChanges = await db
    .select()
    .from(reviewModerations)
    .where(eq(reviewModerations.status, "request_changes"));

  return {
    pending: pending.length,
    approved: approved.length,
    rejected: rejected.length,
    requestChanges: requestChanges.length,
    total: pending.length + approved.length + rejected.length + requestChanges.length,
  };
}
