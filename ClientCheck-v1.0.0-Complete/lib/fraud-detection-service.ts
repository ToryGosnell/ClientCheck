/**
 * Fraud Detection Service
 * Detects suspicious review patterns and flags them for moderation
 */

export interface ReviewData {
  id: string;
  contractorId: string;
  contractorEmail: string;
  contractorIp: string;
  customerId: string;
  rating: number;
  text: string;
  createdAt: number;
}

export interface FraudFlags {
  flags: string[];
  riskScore: number; // 0-100, higher = more suspicious
  requiresModeration: boolean;
}

export class FraudDetectionService {
  /**
   * Analyze a review for fraud indicators
   */
  static analyzeReview(review: ReviewData, allReviews: ReviewData[]): FraudFlags {
    const flags: string[] = [];
    let riskScore = 0;

    // Check for revenge reviews (same person leaving multiple 1-star reviews)
    const sameContractorReviews = allReviews.filter((r) => r.contractorId === review.contractorId);
    if (sameContractorReviews.length > 0) {
      const lowRatingCount = sameContractorReviews.filter((r) => r.rating <= 2).length;
      if (lowRatingCount >= 3) {
        flags.push("Revenge review pattern (multiple 1-2 star reviews)");
        riskScore += 25;
      }
    }

    // Check for coordinated fake reviews (multiple accounts from same IP)
    const sameIpReviews = allReviews.filter((r) => r.contractorIp === review.contractorIp);
    if (sameIpReviews.length > 2) {
      flags.push("Coordinated fake reviews (multiple accounts from same IP)");
      riskScore += 30;
    }

    // Check for extremely low ratings with no context
    if (review.rating === 1 && review.text.length < 20) {
      flags.push("Extremely low rating with minimal explanation");
      riskScore += 15;
    }

    // Check for all-caps aggressive language
    const capsRatio = (review.text.match(/[A-Z]/g) || []).length / review.text.length;
    if (capsRatio > 0.5 && review.text.length > 50) {
      flags.push("Aggressive language (excessive caps)");
      riskScore += 10;
    }

    // Check for competitor sabotage keywords
    const sabotageKeywords = [
      "scam",
      "fraud",
      "illegal",
      "criminal",
      "lawsuit",
      "arrest",
      "prison",
      "fake",
      "liar",
      "thief",
    ];
    const hasSabotageKeywords = sabotageKeywords.some((keyword) =>
      review.text.toLowerCase().includes(keyword)
    );
    if (hasSabotageKeywords && review.rating <= 2) {
      flags.push("Competitor sabotage indicators (serious accusations)");
      riskScore += 20;
    }

    // Check for identical reviews from different accounts
    const identicalReviews = allReviews.filter(
      (r) => r.text === review.text && r.contractorId !== review.contractorId
    );
    if (identicalReviews.length > 0) {
      flags.push("Identical review text from multiple accounts");
      riskScore += 35;
    }

    // Check for reviews posted in rapid succession from same IP
    const recentSameIpReviews = sameIpReviews.filter(
      (r) => Math.abs(r.createdAt - review.createdAt) < 1000 * 60 * 5 // 5 minutes
    );
    if (recentSameIpReviews.length > 1) {
      flags.push("Rapid-fire reviews from same IP");
      riskScore += 25;
    }

    // Check for suspicious rating pattern (all 1s or all 5s)
    const ratingCounts = allReviews.reduce(
      (acc, r) => {
        acc[r.rating] = (acc[r.rating] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );

    const totalReviews = allReviews.length;
    if (totalReviews > 0) {
      const oneStarRatio = (ratingCounts[1] || 0) / totalReviews;
      const fiveStarRatio = (ratingCounts[5] || 0) / totalReviews;

      if (oneStarRatio > 0.7) {
        flags.push("Suspicious rating pattern (70%+ one-star reviews)");
        riskScore += 20;
      }

      if (fiveStarRatio > 0.9) {
        flags.push("Suspicious rating pattern (90%+ five-star reviews)");
        riskScore += 15;
      }
    }

    // Check for review bombing (multiple reviews in short time period)
    const oneHourAgo = Date.now() - 1000 * 60 * 60;
    const recentReviews = allReviews.filter((r) => r.createdAt > oneHourAgo);
    if (recentReviews.length > 10) {
      flags.push("Review bombing detected (10+ reviews in 1 hour)");
      riskScore += 25;
    }

    // Check for profanity
    const profanityList = ["damn", "hell", "crap", "sucks", "worst"];
    const hasProfanity = profanityList.some((word) =>
      review.text.toLowerCase().includes(word)
    );
    if (hasProfanity) {
      flags.push("Profanity detected");
      riskScore += 5;
    }

    // Check for personal attacks
    const personalAttackKeywords = ["stupid", "idiot", "moron", "incompetent", "useless"];
    const hasPersonalAttacks = personalAttackKeywords.some((keyword) =>
      review.text.toLowerCase().includes(keyword)
    );
    if (hasPersonalAttacks) {
      flags.push("Personal attacks detected");
      riskScore += 15;
    }

    // Normalize risk score to 0-100
    riskScore = Math.min(100, riskScore);

    // Require moderation if risk score is high or multiple flags
    const requiresModeration = riskScore >= 40 || flags.length >= 2;

    return {
      flags,
      riskScore,
      requiresModeration,
    };
  }

  /**
   * Get fraud risk level description
   */
  static getRiskLevel(riskScore: number): "low" | "medium" | "high" | "critical" {
    if (riskScore < 20) return "low";
    if (riskScore < 40) return "medium";
    if (riskScore < 70) return "high";
    return "critical";
  }

  /**
   * Get fraud risk level color
   */
  static getRiskLevelColor(riskScore: number): string {
    const level = this.getRiskLevel(riskScore);
    switch (level) {
      case "low":
        return "#22C55E"; // green
      case "medium":
        return "#F59E0B"; // amber
      case "high":
        return "#EF4444"; // red
      case "critical":
        return "#7C2D12"; // dark red
    }
  }

  /**
   * Get fraud risk level emoji
   */
  static getRiskLevelEmoji(riskScore: number): string {
    const level = this.getRiskLevel(riskScore);
    switch (level) {
      case "low":
        return "✅";
      case "medium":
        return "⚠️";
      case "high":
        return "🚨";
      case "critical":
        return "🔴";
    }
  }

  /**
   * Check if contractor has history of fraud
   */
  static hasContractorFraudHistory(contractorId: string, allReviews: ReviewData[]): boolean {
    const contractorReviews = allReviews.filter((r) => r.contractorId === contractorId);

    // If contractor has more than 5 flagged reviews, they have a fraud history
    const flaggedReviews = contractorReviews.filter((r) => {
      const analysis = this.analyzeReview(r, allReviews);
      return analysis.requiresModeration;
    });

    return flaggedReviews.length > 5;
  }

  /**
   * Get fraud statistics for a contractor
   */
  static getContractorFraudStats(contractorId: string, allReviews: ReviewData[]): {
    totalReviews: number;
    flaggedReviews: number;
    averageRiskScore: number;
    hasHistory: boolean;
  } {
    const contractorReviews = allReviews.filter((r) => r.contractorId === contractorId);

    const analyses = contractorReviews.map((r) => this.analyzeReview(r, allReviews));

    const flaggedCount = analyses.filter((a) => a.requiresModeration).length;
    const avgRiskScore =
      analyses.reduce((sum, a) => sum + a.riskScore, 0) / analyses.length || 0;

    return {
      totalReviews: contractorReviews.length,
      flaggedReviews: flaggedCount,
      averageRiskScore: avgRiskScore,
      hasHistory: this.hasContractorFraudHistory(contractorId, allReviews),
    };
  }

  /**
   * Detect coordinated attack (multiple fake reviews from same source)
   */
  static detectCoordinatedAttack(customerId: string, allReviews: ReviewData[]): {
    isAttack: boolean;
    attackerIps: string[];
    reviewCount: number;
  } {
    const reviewsAboutCustomer = allReviews.filter((r) => r.customerId === customerId);

    // Group by IP
    const ipGroups = reviewsAboutCustomer.reduce(
      (acc, r) => {
        if (!acc[r.contractorIp]) acc[r.contractorIp] = [];
        acc[r.contractorIp].push(r);
        return acc;
      },
      {} as Record<string, ReviewData[]>
    );

    // Find IPs with multiple reviews
    const suspiciousIps = Object.entries(ipGroups)
      .filter(([_, reviews]) => reviews.length >= 3)
      .map(([ip, _]) => ip);

    // Check if reviews are all low ratings
    const lowRatingReviews = reviewsAboutCustomer.filter((r) => r.rating <= 2);
    const isAttack = suspiciousIps.length > 0 && lowRatingReviews.length >= 3;

    return {
      isAttack,
      attackerIps: suspiciousIps,
      reviewCount: lowRatingReviews.length,
    };
  }

  /**
   * Get recommended action for flagged review
   */
  static getRecommendedAction(riskScore: number, flagCount: number): string {
    if (riskScore >= 80) {
      return "Reject immediately - Critical fraud indicators";
    }
    if (riskScore >= 60) {
      return "Reject - High fraud risk";
    }
    if (riskScore >= 40) {
      return "Manual review required - Moderate fraud risk";
    }
    if (flagCount >= 2) {
      return "Manual review recommended - Multiple flags";
    }
    return "Approve - Low fraud risk";
  }
}
