import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { disputeModerations, reviewDisputes, reviews } from "../../drizzle/schema";

export type DisputeDecision =
  | "review_stands"
  | "review_removed"
  | "review_modified"
  | "customer_response_approved";

export async function getPendingDisputes() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ dispute: reviewDisputes, moderation: disputeModerations, review: reviews })
    .from(reviewDisputes)
    .leftJoin(disputeModerations, eq(disputeModerations.disputeId, reviewDisputes.id))
    .innerJoin(reviews, eq(reviews.id, reviewDisputes.reviewId))
    .where(eq(disputeModerations.status, "pending"));
}

export async function getDisputeDetails(disputeId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({ dispute: reviewDisputes, moderation: disputeModerations, review: reviews })
    .from(reviewDisputes)
    .leftJoin(disputeModerations, eq(disputeModerations.disputeId, reviewDisputes.id))
    .innerJoin(reviews, eq(reviews.id, reviewDisputes.reviewId))
    .where(eq(reviewDisputes.id, disputeId));
  return result[0] || null;
}

export async function submitModerationDecision(
  disputeId: number,
  moderatorId: number,
  decision: DisputeDecision,
  reason?: string,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(disputeModerations)
    .where(eq(disputeModerations.disputeId, disputeId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(disputeModerations)
      .set({ status: "approved", decision, moderatorId, reason, moderatedAt: new Date() })
      .where(eq(disputeModerations.disputeId, disputeId));
  } else {
    await db.insert(disputeModerations).values({
      disputeId,
      status: "approved",
      decision,
      moderatorId,
      reason,
      moderatedAt: new Date(),
    });
  }

  const newDisputeStatus =
    decision === "customer_response_approved" ? "responded" : "resolved";

  await db
    .update(reviewDisputes)
    .set({ status: newDisputeStatus, resolvedAt: new Date() })
    .where(eq(reviewDisputes.id, disputeId));
}

export async function getModerationStats() {
  const db = await getDb();
  if (!db) return { totalDisputes: 0, totalModerations: 0, pending: 0, approved: 0, rejected: 0, avgResolutionTimeHours: 0 };
  const allDisputes = await db.select().from(reviewDisputes);
  const allModerations = await db.select().from(disputeModerations);
  const pending = allModerations.filter((m) => m.status === "pending").length;
  const approved = allModerations.filter((m) => m.status === "approved").length;
  const rejected = allModerations.filter((m) => m.status === "rejected").length;
  const avgResolutionTime =
    allModerations.filter((m) => m.moderatedAt).reduce((sum, m) => {
      if (!m.moderatedAt || !m.createdAt) return sum;
      return sum + (new Date(m.moderatedAt).getTime() - new Date(m.createdAt).getTime());
    }, 0) / Math.max(allModerations.length, 1);
  return {
    totalDisputes: allDisputes.length,
    totalModerations: allModerations.length,
    pending,
    approved,
    rejected,
    avgResolutionTimeHours: Math.round(avgResolutionTime / (1000 * 60 * 60)),
  };
}

export async function getModeratorStats(moderatorId: number) {
  const db = await getDb();
  if (!db) return { totalDecisions: 0, decisions: {}, avgTimePerDecisionHours: 0 };
  const moderations = await db
    .select()
    .from(disputeModerations)
    .where(eq(disputeModerations.moderatorId, moderatorId));
  const decisions: Record<DisputeDecision, number> = {
    review_stands: 0,
    review_removed: 0,
    review_modified: 0,
    customer_response_approved: 0,
  };
  moderations.forEach((m) => {
    if (m.decision) decisions[m.decision as DisputeDecision]++;
  });
  return {
    totalDecisions: moderations.length,
    decisions,
    avgTimePerDecisionHours:
      moderations.filter((m) => m.moderatedAt).reduce((sum, m) => {
        if (!m.moderatedAt || !m.createdAt) return sum;
        return sum + (new Date(m.moderatedAt).getTime() - new Date(m.createdAt).getTime());
      }, 0) / Math.max(moderations.length, 1) / (1000 * 60 * 60),
  };
}
