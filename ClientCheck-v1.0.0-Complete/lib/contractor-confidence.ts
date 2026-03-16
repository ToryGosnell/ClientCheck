/**
 * Contractor Confidence Scoring System
 * Weights reviews by contractor verification status and experience
 */

export interface ContractorReview {
  id: number;
  contractorId: number;
  isVerified: boolean;
  reviewCount: number; // Total reviews by this contractor
  rating: number;
}

export interface ConfidenceScore {
  totalScore: number;
  weightedAverage: number;
  reviewCount: number;
  verifiedReviewCount: number;
  confidence: "low" | "medium" | "high";
}

/**
 * Calculate confidence weight for a contractor's review
 * Verified contractors: 2x weight
 * 10+ reviews: 1.5x weight
 * New contractors: 1x weight
 */
export function getReviewWeight(
  isVerified: boolean,
  reviewCount: number
): number {
  let weight = 1;

  if (isVerified) {
    weight *= 2;
  }

  if (reviewCount >= 10) {
    weight *= 1.5;
  }

  return weight;
}

/**
 * Calculate overall confidence score from multiple reviews
 */
export function calculateConfidenceScore(
  reviews: ContractorReview[]
): ConfidenceScore {
  if (reviews.length === 0) {
    return {
      totalScore: 0,
      weightedAverage: 0,
      reviewCount: 0,
      verifiedReviewCount: 0,
      confidence: "low",
    };
  }

  let totalWeightedScore = 0;
  let totalWeight = 0;
  let verifiedCount = 0;

  reviews.forEach((review) => {
    const weight = getReviewWeight(review.isVerified, review.reviewCount);
    totalWeightedScore += review.rating * weight;
    totalWeight += weight;

    if (review.isVerified) {
      verifiedCount++;
    }
  });

  const weightedAverage = totalWeightedScore / totalWeight;

  // Confidence levels based on review count and verification
  let confidence: "low" | "medium" | "high" = "low";
  if (reviews.length >= 5 && verifiedCount >= 2) {
    confidence = "high";
  } else if (reviews.length >= 3) {
    confidence = "medium";
  }

  return {
    totalScore: weightedAverage,
    weightedAverage,
    reviewCount: reviews.length,
    verifiedReviewCount: verifiedCount,
    confidence,
  };
}

/**
 * Get confidence badge text and color
 */
export function getConfidenceBadge(
  confidence: "low" | "medium" | "high"
): {
  label: string;
  color: string;
  icon: string;
} {
  switch (confidence) {
    case "high":
      return {
        label: "High Confidence",
        color: "bg-success",
        icon: "✓✓",
      };
    case "medium":
      return {
        label: "Medium Confidence",
        color: "bg-warning",
        icon: "✓",
      };
    case "low":
      return {
        label: "Low Confidence",
        color: "bg-error",
        icon: "?",
      };
  }
}
