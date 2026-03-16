import { eq } from "drizzle-orm";
import { customers, preJobRiskChecks } from "../../drizzle/schema";
import { getDb } from "../db";
import { calculateCustomerRiskScore, saveRiskScore } from "./risk-score-engine";

export interface PartnerRiskCheckInput {
  contractorUserId?: number;
  customerId?: number;
  phone?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  jobAmount?: string;
}

export async function runPartnerRiskCheck(input: PartnerRiskCheckInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let customerId = input.customerId;
  if (!customerId && input.phone) {
    const match = await db.select({ id: customers.id }).from(customers).where(eq(customers.phone, input.phone)).limit(1);
    customerId = match[0]?.id;
  }
  if (!customerId) throw new Error("Customer not found. Provide customerId or a matching phone number.");

  const score = await calculateCustomerRiskScore(customerId);
  await saveRiskScore(customerId, score);

  if (input.contractorUserId) {
    await db.insert(preJobRiskChecks).values({
      contractorUserId: input.contractorUserId,
      customerId,
      riskScoreAtCheck: score.riskScore,
      riskLevelAtCheck: score.riskLevel,
      jobAmount: input.jobAmount,
    });
  }

  return {
    customerId,
    riskScore: score.riskScore,
    riskLevel: score.riskLevel,
    componentScores: {
      paymentReliability: score.paymentReliabilityScore,
      communication: score.communicationScore,
      scopeManagement: score.scopeManagementScore,
      propertyRespect: score.propertyRespectScore,
    },
    factors: {
      missedPayments: score.missedPayments,
      noShows: score.noShows,
      disputes: score.disputes,
      latePayments: score.latePayments,
      redFlagCount: score.redFlagCount,
      reviewsAnalyzed: score.reviewsAnalyzed,
    },
  };
}
