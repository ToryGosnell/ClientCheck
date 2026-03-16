/**
 * Contractor Reputation Score Service
 * Calculates and displays contractor reputation based on dispute history,
 * review accuracy, and payment reliability
 */

export interface ReputationScore {
  contractorId: number;
  overallScore: number; // 0-100
  scoreBreakdown: {
    disputeHistory: number; // 0-30
    reviewAccuracy: number; // 0-35
    paymentReliability: number; // 0-35
  };
  tier: "bronze" | "silver" | "gold" | "platinum";
  trustLevel: "low" | "medium" | "high" | "very_high";
  redFlags: string[];
  strengths: string[];
  lastUpdated: Date;
}

/**
 * Calculate contractor reputation score
 */
export async function calculateReputationScore(
  contractorId: number
): Promise<ReputationScore> {
  const disputeScore = await calculateDisputeScore(contractorId);
  const accuracyScore = await calculateReviewAccuracyScore(contractorId);
  const paymentScore = await calculatePaymentReliabilityScore(contractorId);

  const overallScore = disputeScore + accuracyScore + paymentScore;

  const tier = getTierFromScore(overallScore);
  const trustLevel = getTrustLevelFromScore(overallScore);
  const redFlags = await identifyRedFlags(contractorId, {
    disputeScore,
    accuracyScore,
    paymentScore,
  });
  const strengths = identifyStrengths({
    disputeScore,
    accuracyScore,
    paymentScore,
  });

  return {
    contractorId,
    overallScore,
    scoreBreakdown: {
      disputeHistory: disputeScore,
      reviewAccuracy: accuracyScore,
      paymentReliability: paymentScore,
    },
    tier,
    trustLevel,
    redFlags,
    strengths,
    lastUpdated: new Date(),
  };
}

/**
 * Calculate dispute history score (0-30 points)
 * Lower disputes = higher score
 */
async function calculateDisputeScore(contractorId: number): Promise<number> {
  // Mock implementation
  // In production:
  // - Get total disputes filed against contractor
  // - Get approved disputes (actual violations)
  // - Get rejection rate (contractor's accuracy)
  // - Calculate score based on formula

  const totalDisputes = 5; // Mock
  const approvedDisputes = 2; // Mock
  const disputeRate = totalDisputes > 0 ? approvedDisputes / totalDisputes : 0;

  // Score calculation:
  // 0-1% dispute rate = 30 points
  // 1-5% = 25 points
  // 5-10% = 20 points
  // 10-20% = 15 points
  // 20%+ = 5 points

  if (disputeRate < 0.01) return 30;
  if (disputeRate < 0.05) return 25;
  if (disputeRate < 0.1) return 20;
  if (disputeRate < 0.2) return 15;
  return 5;
}

/**
 * Calculate review accuracy score (0-35 points)
 * Based on review approval rate and customer satisfaction
 */
async function calculateReviewAccuracyScore(contractorId: number): Promise<number> {
  // Mock implementation
  // In production:
  // - Get total reviews submitted
  // - Get approved reviews (not disputed)
  // - Get average customer satisfaction
  // - Calculate score based on formula

  const totalReviews = 45; // Mock
  const approvedReviews = 42; // Mock
  const approvalRate = totalReviews > 0 ? approvedReviews / totalReviews : 0;

  // Score calculation:
  // 95%+ approval = 35 points
  // 90-95% = 30 points
  // 85-90% = 25 points
  // 80-85% = 20 points
  // 75-80% = 15 points
  // <75% = 5 points

  if (approvalRate >= 0.95) return 35;
  if (approvalRate >= 0.9) return 30;
  if (approvalRate >= 0.85) return 25;
  if (approvalRate >= 0.8) return 20;
  if (approvalRate >= 0.75) return 15;
  return 5;
}

/**
 * Calculate payment reliability score (0-35 points)
 * Based on payment history and on-time payment rate
 */
async function calculatePaymentReliabilityScore(contractorId: number): Promise<number> {
  // Mock implementation
  // In production:
  // - Get payment history from Stripe/payment provider
  // - Calculate on-time payment rate
  // - Get average days late (if any)
  // - Calculate score based on formula

  const onTimePaymentRate = 0.98; // Mock
  const daysLateAverage = 0; // Mock

  // Score calculation:
  // 100% on-time = 35 points
  // 95-100% on-time = 30 points
  // 90-95% on-time = 25 points
  // 85-90% on-time = 20 points
  // 80-85% on-time = 15 points
  // <80% on-time = 5 points

  if (onTimePaymentRate >= 1.0) return 35;
  if (onTimePaymentRate >= 0.95) return 30;
  if (onTimePaymentRate >= 0.9) return 25;
  if (onTimePaymentRate >= 0.85) return 20;
  if (onTimePaymentRate >= 0.8) return 15;
  return 5;
}

/**
 * Determine tier based on overall score
 */
function getTierFromScore(score: number): "bronze" | "silver" | "gold" | "platinum" {
  if (score >= 90) return "platinum";
  if (score >= 75) return "gold";
  if (score >= 60) return "silver";
  return "bronze";
}

/**
 * Determine trust level based on overall score
 */
function getTrustLevelFromScore(score: number): "low" | "medium" | "high" | "very_high" {
  if (score >= 85) return "very_high";
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}

/**
 * Identify red flags for contractor
 */
async function identifyRedFlags(
  contractorId: number,
  scores: {
    disputeScore: number;
    accuracyScore: number;
    paymentScore: number;
  }
): Promise<string[]> {
  const redFlags: string[] = [];

  if (scores.disputeScore < 15) {
    redFlags.push("High dispute rate - multiple disputes filed");
  }

  if (scores.accuracyScore < 20) {
    redFlags.push("Low review accuracy - many reviews disputed");
  }

  if (scores.paymentScore < 20) {
    redFlags.push("Payment reliability concerns - late or missed payments");
  }

  // Check for suspension history
  const isSuspended = await checkIfSuspended(contractorId);
  if (isSuspended) {
    redFlags.push("Account currently suspended");
  }

  // Check for repeated violations
  const violationCount = await getRepeatedViolationCount(contractorId);
  if (violationCount >= 3) {
    redFlags.push("Repeated policy violations");
  }

  return redFlags;
}

/**
 * Identify strengths for contractor
 */
function identifyStrengths(scores: {
  disputeScore: number;
  accuracyScore: number;
  paymentScore: number;
}): string[] {
  const strengths: string[] = [];

  if (scores.disputeScore >= 25) {
    strengths.push("Excellent dispute history - very few disputes");
  }

  if (scores.accuracyScore >= 30) {
    strengths.push("High review accuracy - customers trust your reviews");
  }

  if (scores.paymentScore >= 30) {
    strengths.push("Reliable payment history - always pays on time");
  }

  return strengths;
}

/**
 * Check if contractor is currently suspended
 */
async function checkIfSuspended(contractorId: number): Promise<boolean> {
  // Mock implementation
  return false;
}

/**
 * Get count of repeated violations
 */
async function getRepeatedViolationCount(contractorId: number): Promise<number> {
  // Mock implementation
  return 0;
}

/**
 * Get reputation score display info
 */
export function getReputationDisplayInfo(score: ReputationScore): {
  icon: string;
  color: string;
  label: string;
  description: string;
} {
  const displayMap = {
    platinum: {
      icon: "⭐⭐⭐⭐⭐",
      color: "#FFD700",
      label: "Platinum Contractor",
      description: "Exceptional reputation - highly trusted",
    },
    gold: {
      icon: "⭐⭐⭐⭐",
      color: "#FFD700",
      label: "Gold Contractor",
      description: "Excellent reputation - very trustworthy",
    },
    silver: {
      icon: "⭐⭐⭐",
      color: "#C0C0C0",
      label: "Silver Contractor",
      description: "Good reputation - generally trustworthy",
    },
    bronze: {
      icon: "⭐⭐",
      color: "#CD7F32",
      label: "Bronze Contractor",
      description: "New or developing reputation - use caution",
    },
  };

  return displayMap[score.tier];
}

/**
 * Format reputation score for display
 */
export function formatReputationScore(score: ReputationScore): string {
  return `${score.overallScore}/100 (${score.tier.toUpperCase()})`;
}

/**
 * Get reputation trend
 */
export async function getReputationTrend(
  contractorId: number,
  days: number = 30
): Promise<{
  currentScore: number;
  previousScore: number;
  trend: "improving" | "declining" | "stable";
  change: number;
}> {
  // Mock implementation
  const currentScore = 78;
  const previousScore = 75;

  return {
    currentScore,
    previousScore,
    trend: currentScore > previousScore ? "improving" : "declining",
    change: currentScore - previousScore,
  };
}
