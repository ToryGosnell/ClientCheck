/**
 * Fraud Signals Service
 * Records and tracks fraud signals detected during review submission
 * All state is persisted to MySQL via Drizzle ORM
 */

import { and, desc, eq } from "drizzle-orm";
import { fraudSignals, reviews } from "../../drizzle/schema";
import { getDb } from "../db";
import { writeAuditLog } from "./audit-log-service";

export interface FraudSignalInput {
  reviewId: number;
  customerId: number;
  contractorUserId: number;
  signals: string[];
  riskScore: number;
  flaggedForModeration: boolean;
  metadata?: Record<string, any>;
}

export interface FraudSignalRecord {
  id: number;
  reviewId: number;
  customerId: number;
  contractorUserId: number;
  signals: string[];
  riskScore: number;
  flaggedForModeration: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Record fraud signals for a review
 */
export async function recordFraudSignal(input: FraudSignalInput): Promise<{ success: boolean; signalId?: number; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };

  try {
    // Check if signals already recorded for this review
    const existing = await db.select().from(fraudSignals).where(eq(fraudSignals.reviewId, input.reviewId)).limit(1);

    if (existing[0]) {
      // Update existing record
      await db
        .update(fraudSignals)
        .set({
          signalsJson: JSON.stringify(input.signals),
          riskScore: input.riskScore,
          flaggedForModeration: input.flaggedForModeration,
          metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
        })
        .where(eq(fraudSignals.reviewId, input.reviewId));

      await writeAuditLog({
        action: "fraud.signal_updated",
        entityType: "fraud_signal",
        entityId: existing[0].id,
        metadata: {
          reviewId: input.reviewId,
          riskScore: input.riskScore,
          signalCount: input.signals.length,
        },
      });

      return { success: true, signalId: existing[0].id, message: "Fraud signals updated" };
    }

    // Create new fraud signal record
    const result = await db.insert(fraudSignals).values({
      reviewId: input.reviewId,
      customerId: input.customerId,
      contractorUserId: input.contractorUserId,
      signalsJson: JSON.stringify(input.signals),
      riskScore: input.riskScore,
      flaggedForModeration: input.flaggedForModeration,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    });

    const signalId = result[0].insertId as number;

    await writeAuditLog({
      action: "fraud.signal_created",
      entityType: "fraud_signal",
      entityId: signalId,
      metadata: {
        reviewId: input.reviewId,
        customerId: input.customerId,
        riskScore: input.riskScore,
        signalCount: input.signals.length,
        flaggedForModeration: input.flaggedForModeration,
      },
    });

    return { success: true, signalId, message: "Fraud signals recorded" };
  } catch (error) {
    console.error("[Fraud Signals] Record error:", error);
    return { success: false, message: "Failed to record fraud signals" };
  }
}

/**
 * Get fraud signals for a specific review
 */
export async function getFraudSignals(reviewId: number): Promise<FraudSignalRecord | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const rows = await db.select().from(fraudSignals).where(eq(fraudSignals.reviewId, reviewId)).limit(1);
    const signal = rows[0];
    if (!signal) return null;

    return {
      id: signal.id,
      reviewId: signal.reviewId,
      customerId: signal.customerId,
      contractorUserId: signal.contractorUserId,
      signals: signal.signalsJson ? JSON.parse(signal.signalsJson) : [],
      riskScore: signal.riskScore,
      flaggedForModeration: signal.flaggedForModeration,
      metadata: signal.metadataJson ? JSON.parse(signal.metadataJson) : undefined,
      createdAt: new Date(signal.createdAt),
    };
  } catch (error) {
    console.error("[Fraud Signals] Get signals error:", error);
    return null;
  }
}

/**
 * Get fraud history for a customer
 */
export async function getFraudHistory(customerId: number, limit: number = 50): Promise<FraudSignalRecord[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const rows = await db
      .select()
      .from(fraudSignals)
      .where(eq(fraudSignals.customerId, customerId))
      .orderBy(desc(fraudSignals.createdAt))
      .limit(limit);

    return rows.map((signal) => ({
      id: signal.id,
      reviewId: signal.reviewId,
      customerId: signal.customerId,
      contractorUserId: signal.contractorUserId,
      signals: signal.signalsJson ? JSON.parse(signal.signalsJson) : [],
      riskScore: signal.riskScore,
      flaggedForModeration: signal.flaggedForModeration,
      metadata: signal.metadataJson ? JSON.parse(signal.metadataJson) : undefined,
      createdAt: new Date(signal.createdAt),
    }));
  } catch (error) {
    console.error("[Fraud Signals] Get history error:", error);
    return [];
  }
}

/**
 * Get fraud history for a contractor
 */
export async function getContractorFraudHistory(contractorUserId: number, limit: number = 50): Promise<FraudSignalRecord[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const rows = await db
      .select()
      .from(fraudSignals)
      .where(eq(fraudSignals.contractorUserId, contractorUserId))
      .orderBy(desc(fraudSignals.createdAt))
      .limit(limit);

    return rows.map((signal) => ({
      id: signal.id,
      reviewId: signal.reviewId,
      customerId: signal.customerId,
      contractorUserId: signal.contractorUserId,
      signals: signal.signalsJson ? JSON.parse(signal.signalsJson) : [],
      riskScore: signal.riskScore,
      flaggedForModeration: signal.flaggedForModeration,
      metadata: signal.metadataJson ? JSON.parse(signal.metadataJson) : undefined,
      createdAt: new Date(signal.createdAt),
    }));
  } catch (error) {
    console.error("[Fraud Signals] Get contractor history error:", error);
    return [];
  }
}

/**
 * Get fraud statistics for a customer
 */
export async function getCustomerFraudStats(customerId: number): Promise<{
  totalSignals: number;
  flaggedReviews: number;
  averageRiskScore: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalSignals: 0,
      flaggedReviews: 0,
      averageRiskScore: 0,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
    };
  }

  try {
    const rows = await db.select().from(fraudSignals).where(eq(fraudSignals.customerId, customerId));

    const totalSignals = rows.length;
    const flaggedReviews = rows.filter((r) => r.flaggedForModeration).length;
    const averageRiskScore = totalSignals > 0 ? rows.reduce((sum, r) => sum + r.riskScore, 0) / totalSignals : 0;
    const highRiskCount = rows.filter((r) => r.riskScore >= 70).length;
    const mediumRiskCount = rows.filter((r) => r.riskScore >= 40 && r.riskScore < 70).length;
    const lowRiskCount = rows.filter((r) => r.riskScore < 40).length;

    return {
      totalSignals,
      flaggedReviews,
      averageRiskScore: Math.round(averageRiskScore * 100) / 100,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
    };
  } catch (error) {
    console.error("[Fraud Signals] Get stats error:", error);
    return {
      totalSignals: 0,
      flaggedReviews: 0,
      averageRiskScore: 0,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
    };
  }
}

/**
 * Get all flagged reviews for moderation
 */
export async function getFlaggedReviewsForModeration(limit: number = 50): Promise<FraudSignalRecord[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const rows = await db
      .select()
      .from(fraudSignals)
      .where(eq(fraudSignals.flaggedForModeration, true))
      .orderBy(desc(fraudSignals.riskScore), desc(fraudSignals.createdAt))
      .limit(limit);

    return rows.map((signal) => ({
      id: signal.id,
      reviewId: signal.reviewId,
      customerId: signal.customerId,
      contractorUserId: signal.contractorUserId,
      signals: signal.signalsJson ? JSON.parse(signal.signalsJson) : [],
      riskScore: signal.riskScore,
      flaggedForModeration: signal.flaggedForModeration,
      metadata: signal.metadataJson ? JSON.parse(signal.metadataJson) : undefined,
      createdAt: new Date(signal.createdAt),
    }));
  } catch (error) {
    console.error("[Fraud Signals] Get flagged reviews error:", error);
    return [];
  }
}

/**
 * Mark fraud signal as reviewed
 */
export async function markFraudSignalReviewed(signalId: number, reviewedByUserId: number, action: "approved" | "rejected" | "escalated"): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const rows = await db.select().from(fraudSignals).where(eq(fraudSignals.id, signalId)).limit(1);
    const signal = rows[0];
    if (!signal) return false;

    await db
      .update(fraudSignals)
      .set({
        flaggedForModeration: false,
        metadataJson: JSON.stringify({
          ...(signal.metadataJson ? JSON.parse(signal.metadataJson) : {}),
          reviewedByUserId,
          reviewedAction: action,
          reviewedAt: new Date().toISOString(),
        }),
      })
      .where(eq(fraudSignals.id, signalId));

    await writeAuditLog({
      actorUserId: reviewedByUserId,
      action: "fraud.signal_reviewed",
      entityType: "fraud_signal",
      entityId: signalId,
      metadata: {
        reviewAction: action,
      },
    });

    return true;
  } catch (error) {
    console.error("[Fraud Signals] Mark reviewed error:", error);
    return false;
  }
}
