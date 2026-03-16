import { getDb } from "../db";
import { reviews, reviewDisputes, customerRiskScores } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Risk Score Engine
 * 
 * Calculates a comprehensive risk score (0-100) for customers based on:
 * - Payment reliability (from reviews and disputes)
 * - Communication quality
 * - Scope management (scope creep incidents)
 * - Property respect
 * - Late payments and missed payments
 * - Disputes and red flags
 * 
 * Score Levels:
 * 0-30:   Critical Risk (avoid)
 * 31-60:  High Risk (proceed with caution)
 * 61-85:  Medium Risk (acceptable)
 * 86-100: Low Risk (safe to work with)
 */

interface RiskFactors {
  missedPayments: number;
  noShows: number;
  disputes: number;
  latePayments: number;
  redFlagCount: number;
  paymentReliabilityRating: number;
  communicationRating: number;
  scopeManagementRating: number;
  propertyRespectRating: number;
  reviewCount: number;
}

interface RiskScoreResult {
  riskScore: number;
  riskLevel: "critical" | "high" | "medium" | "low";
  paymentReliabilityScore: number;
  communicationScore: number;
  scopeManagementScore: number;
  propertyRespectScore: number;
  missedPayments: number;
  noShows: number;
  disputes: number;
  latePayments: number;
  redFlagCount: number;
  reviewsAnalyzed: number;
}

/**
 * Calculate risk score for a customer
 * Formula:
 * baseScore = 100
 * baseScore -= (missedPayments * 15)
 * baseScore -= (noShows * 10)
 * baseScore -= (disputes * 12)
 * baseScore -= (latePayments * 5)
 * baseScore -= (redFlagCount * 3)
 * 
 * Then apply category ratings (1-5 scale converted to 0-100):
 * paymentReliabilityScore = (rating / 5) * 100
 * communicationScore = (rating / 5) * 100
 * scopeManagementScore = (rating / 5) * 100
 * propertyRespectScore = (rating / 5) * 100
 * 
 * Final score = average of all component scores
 */
export async function calculateCustomerRiskScore(
  customerId: number
): Promise<RiskScoreResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Get all reviews for this customer
  const customerReviews = await db
    .select()
    .from(reviews)
    .where(eq(reviews.customerId, customerId));

  // Get all disputes for this customer
  const customerDisputes = await db
    .select()
    .from(reviewDisputes)
    .where(eq(reviewDisputes.customerId, customerId));

  // Aggregate risk factors
  const factors: RiskFactors = {
    missedPayments: 0,
    noShows: 0,
    disputes: customerDisputes.length,
    latePayments: 0,
    redFlagCount: 0,
    paymentReliabilityRating: 0,
    communicationRating: 0,
    scopeManagementRating: 0,
    propertyRespectRating: 0,
    reviewCount: customerReviews.length,
  };

  // Analyze reviews for risk factors
  let totalPaymentReliability = 0;
  let totalCommunication = 0;
  let totalScopeManagement = 0;
  let totalPropertyRespect = 0;

  for (const review of customerReviews) {
    // Count red flags (stored as comma-separated string)
    if (review.redFlags) {
      const flags = review.redFlags.split(",").filter((f) => f.trim());
      factors.redFlagCount += flags.length;

      // Categorize red flags
      flags.forEach((flag) => {
        const lowerFlag = flag.toLowerCase().trim();
        if (
          lowerFlag.includes("payment") ||
          lowerFlag.includes("paid") ||
          lowerFlag.includes("invoice")
        ) {
          factors.missedPayments++;
        } else if (
          lowerFlag.includes("no show") ||
          lowerFlag.includes("no-show") ||
          lowerFlag.includes("absent")
        ) {
          factors.noShows++;
        } else if (
          lowerFlag.includes("late") ||
          lowerFlag.includes("delay")
        ) {
          factors.latePayments++;
        }
      });
    }

    // Aggregate category ratings
    totalPaymentReliability += review.ratingPaymentReliability || 0;
    totalCommunication += review.ratingCommunication || 0;
    totalScopeManagement += review.ratingScopeChanges || 0;
    totalPropertyRespect += review.ratingPropertyRespect || 0;
  }

  // Calculate average ratings
  const reviewCount = Math.max(customerReviews.length, 1);
  factors.paymentReliabilityRating = totalPaymentReliability / reviewCount;
  factors.communicationRating = totalCommunication / reviewCount;
  factors.scopeManagementRating = totalScopeManagement / reviewCount;
  factors.propertyRespectRating = totalPropertyRespect / reviewCount;

  // Calculate component scores (convert 1-5 rating to 0-100)
  const paymentReliabilityScore = (factors.paymentReliabilityRating / 5) * 100;
  const communicationScore = (factors.communicationRating / 5) * 100;
  const scopeManagementScore = (factors.scopeManagementRating / 5) * 100;
  const propertyRespectScore = (factors.propertyRespectRating / 5) * 100;

  // Calculate base risk score using formula
  let riskScore = 100;
  riskScore -= factors.missedPayments * 15;
  riskScore -= factors.noShows * 10;
  riskScore -= factors.disputes * 12;
  riskScore -= factors.latePayments * 5;
  riskScore -= factors.redFlagCount * 3;

  // Blend with category scores (weight: 60% formula, 40% category average)
  const categoryAverage =
    (paymentReliabilityScore +
      communicationScore +
      scopeManagementScore +
      propertyRespectScore) /
    4;
  riskScore = riskScore * 0.6 + categoryAverage * 0.4;

  // Clamp to 0-100
  riskScore = Math.max(0, Math.min(100, riskScore));

  // Determine risk level
  let riskLevel: "critical" | "high" | "medium" | "low";
  if (riskScore <= 30) {
    riskLevel = "critical";
  } else if (riskScore <= 60) {
    riskLevel = "high";
  } else if (riskScore <= 85) {
    riskLevel = "medium";
  } else {
    riskLevel = "low";
  }

  return {
    riskScore: Math.round(riskScore),
    riskLevel,
    paymentReliabilityScore: Math.round(paymentReliabilityScore),
    communicationScore: Math.round(communicationScore),
    scopeManagementScore: Math.round(scopeManagementScore),
    propertyRespectScore: Math.round(propertyRespectScore),
    missedPayments: factors.missedPayments,
    noShows: factors.noShows,
    disputes: factors.disputes,
    latePayments: factors.latePayments,
    redFlagCount: factors.redFlagCount,
    reviewsAnalyzed: customerReviews.length,
  };
}

/**
 * Save or update risk score in database
 */
export async function saveRiskScore(
  customerId: number,
  scoreResult: RiskScoreResult
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(customerRiskScores)
    .where(eq(customerRiskScores.customerId, customerId))
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    await db
      .update(customerRiskScores)
      .set({
        riskScore: scoreResult.riskScore,
        riskLevel: scoreResult.riskLevel,
        paymentReliabilityScore: scoreResult.paymentReliabilityScore,
        communicationScore: scoreResult.communicationScore,
        scopeManagementScore: scoreResult.scopeManagementScore,
        propertyRespectScore: scoreResult.propertyRespectScore,
        missedPayments: scoreResult.missedPayments,
        noShows: scoreResult.noShows,
        disputes: scoreResult.disputes,
        latePayments: scoreResult.latePayments,
        redFlagCount: scoreResult.redFlagCount,
        reviewsAnalyzed: scoreResult.reviewsAnalyzed,
        lastCalculatedAt: new Date(),
      })
      .where(eq(customerRiskScores.customerId, customerId));
  } else {
    // Insert new
    await db.insert(customerRiskScores).values({
      customerId,
      riskScore: scoreResult.riskScore,
      riskLevel: scoreResult.riskLevel,
      paymentReliabilityScore: scoreResult.paymentReliabilityScore,
      communicationScore: scoreResult.communicationScore,
      scopeManagementScore: scoreResult.scopeManagementScore,
      propertyRespectScore: scoreResult.propertyRespectScore,
      missedPayments: scoreResult.missedPayments,
      noShows: scoreResult.noShows,
      disputes: scoreResult.disputes,
      latePayments: scoreResult.latePayments,
      redFlagCount: scoreResult.redFlagCount,
      reviewsAnalyzed: scoreResult.reviewsAnalyzed,
    });
  }
}

/**
 * Get cached risk score for a customer
 */
export async function getRiskScore(customerId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(customerRiskScores)
    .where(eq(customerRiskScores.customerId, customerId))
    .limit(1);

  return result[0] || null;
}

/**
 * Recalculate and save risk score for a customer
 */
export async function updateCustomerRiskScore(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const scoreResult = await calculateCustomerRiskScore(customerId);
  await saveRiskScore(customerId, scoreResult);
  return scoreResult;
}
