import { db } from "@/server/_core/db";
import { reviews, fraudSignals, customers } from "@/drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

/**
 * Advanced Fraud Detection Engine
 * Multi-signal scoring system for detecting suspicious activity
 */

export interface FraudSignalInput {
  reviewId: number;
  customerId: number;
  contractorUserId: number;
  reviewText: string;
  rating: number;
  redFlags: string[];
  jobAmount?: number;
  tradeType?: string;
}

export interface FraudScore {
  totalScore: number;
  signals: FraudSignal[];
  riskLevel: "low" | "medium" | "high" | "critical";
  flaggedForModeration: boolean;
  reasoning: string;
}

export interface FraudSignal {
  name: string;
  score: number;
  weight: number;
  description: string;
  detected: boolean;
}

export class FraudDetectionEngine {
  private static readonly SIGNALS = {
    EXTREME_RATING: { weight: 15, threshold: 1 },
    EXTREME_RATING_HIGH: { weight: 10, threshold: 5 },
    AGGRESSIVE_LANGUAGE: { weight: 20, threshold: 1 },
    CAPS_LOCK_ABUSE: { weight: 15, threshold: 1 },
    REVIEW_VELOCITY: { weight: 25, threshold: 5 }, // 5+ reviews in 24h
    DUPLICATE_ACCOUNT: { weight: 30, threshold: 1 },
    DEVICE_REUSE: { weight: 20, threshold: 1 },
    IP_CLUSTERING: { weight: 25, threshold: 1 },
    SUSPICIOUS_PATTERN: { weight: 20, threshold: 1 },
    PAYMENT_DISPUTE: { weight: 25, threshold: 1 },
    NO_SHOW_HISTORY: { weight: 20, threshold: 1 },
    MISSED_PAYMENT: { weight: 20, threshold: 1 },
    INCONSISTENT_DETAILS: { weight: 15, threshold: 1 },
    RED_FLAG_KEYWORDS: { weight: 18, threshold: 1 },
    UNUSUAL_JOB_AMOUNT: { weight: 12, threshold: 1 },
  };

  /**
   * Calculate fraud score for review
   */
  static async calculateFraudScore(input: FraudSignalInput): Promise<FraudScore> {
    const signals: FraudSignal[] = [];
    let totalScore = 0;

    // 1. Check extreme ratings
    const extremeRatingLow = this.checkExtremeRatingLow(input.rating);
    if (extremeRatingLow) {
      signals.push({
        name: "EXTREME_RATING",
        score: 20,
        weight: this.SIGNALS.EXTREME_RATING.weight,
        description: "1-star rating may indicate false negative review",
        detected: true,
      });
      totalScore += 20;
    }

    const extremeRatingHigh = this.checkExtremeRatingHigh(input.rating);
    if (extremeRatingHigh) {
      signals.push({
        name: "EXTREME_RATING_HIGH",
        score: 10,
        weight: this.SIGNALS.EXTREME_RATING_HIGH.weight,
        description: "5-star rating may indicate fake positive review",
        detected: true,
      });
      totalScore += 10;
    }

    // 2. Check text-based signals
    const aggressiveLanguage = this.detectAggressiveLanguage(input.reviewText);
    if (aggressiveLanguage) {
      signals.push({
        name: "AGGRESSIVE_LANGUAGE",
        score: 25,
        weight: this.SIGNALS.AGGRESSIVE_LANGUAGE.weight,
        description: "Review contains aggressive or threatening language",
        detected: true,
      });
      totalScore += 25;
    }

    const capsLockAbuse = this.detectCapsLockAbuse(input.reviewText);
    if (capsLockAbuse) {
      signals.push({
        name: "CAPS_LOCK_ABUSE",
        score: 15,
        weight: this.SIGNALS.CAPS_LOCK_ABUSE.weight,
        description: "Review contains excessive capital letters",
        detected: true,
      });
      totalScore += 15;
    }

    // 3. Check red flag keywords
    const redFlagKeywords = this.detectRedFlagKeywords(input.reviewText);
    if (redFlagKeywords) {
      signals.push({
        name: "RED_FLAG_KEYWORDS",
        score: 18,
        weight: this.SIGNALS.RED_FLAG_KEYWORDS.weight,
        description: "Review contains suspicious keywords",
        detected: true,
      });
      totalScore += 18;
    }

    // 4. Check review velocity
    const reviewVelocity = await this.checkReviewVelocity(input.customerId);
    if (reviewVelocity) {
      signals.push({
        name: "REVIEW_VELOCITY",
        score: 30,
        weight: this.SIGNALS.REVIEW_VELOCITY.weight,
        description: "Customer submitted multiple reviews in short timeframe",
        detected: true,
      });
      totalScore += 30;
    }

    // 5. Check for duplicate accounts
    const duplicateAccount = await this.checkDuplicateAccount(input.customerId);
    if (duplicateAccount) {
      signals.push({
        name: "DUPLICATE_ACCOUNT",
        score: 35,
        weight: this.SIGNALS.DUPLICATE_ACCOUNT.weight,
        description: "Customer profile matches existing account",
        detected: true,
      });
      totalScore += 35;
    }

    // 6. Check payment history
    const paymentDispute = await this.checkPaymentDispute(input.customerId);
    if (paymentDispute) {
      signals.push({
        name: "PAYMENT_DISPUTE",
        score: 25,
        weight: this.SIGNALS.PAYMENT_DISPUTE.weight,
        description: "Customer has payment disputes or chargebacks",
        detected: true,
      });
      totalScore += 25;
    }

    // 7. Check no-show history
    const noShowHistory = await this.checkNoShowHistory(input.customerId);
    if (noShowHistory) {
      signals.push({
        name: "NO_SHOW_HISTORY",
        score: 20,
        weight: this.SIGNALS.NO_SHOW_HISTORY.weight,
        description: "Customer has history of no-shows",
        detected: true,
      });
      totalScore += 20;
    }

    // 8. Check unusual job amount
    const unusualJobAmount = this.checkUnusualJobAmount(input.jobAmount);
    if (unusualJobAmount) {
      signals.push({
        name: "UNUSUAL_JOB_AMOUNT",
        score: 12,
        weight: this.SIGNALS.UNUSUAL_JOB_AMOUNT.weight,
        description: "Job amount is unusually high or low",
        detected: true,
      });
      totalScore += 12;
    }

    // 9. Check inconsistent details
    const inconsistentDetails = this.checkInconsistentDetails(input.redFlags);
    if (inconsistentDetails) {
      signals.push({
        name: "INCONSISTENT_DETAILS",
        score: 15,
        weight: this.SIGNALS.INCONSISTENT_DETAILS.weight,
        description: "Review contains conflicting information",
        detected: true,
      });
      totalScore += 15;
    }

    // Determine risk level
    let riskLevel: "low" | "medium" | "high" | "critical";
    if (totalScore >= 70) {
      riskLevel = "critical";
    } else if (totalScore >= 50) {
      riskLevel = "high";
    } else if (totalScore >= 30) {
      riskLevel = "medium";
    } else {
      riskLevel = "low";
    }

    const flaggedForModeration = totalScore >= 40;

    return {
      totalScore: Math.min(totalScore, 100),
      signals,
      riskLevel,
      flaggedForModeration,
      reasoning: this.generateReasoning(signals, totalScore),
    };
  }

  /**
   * Check for extreme low rating (1 star)
   */
  private static checkExtremeRatingLow(rating: number): boolean {
    return rating === 1;
  }

  /**
   * Check for extreme high rating (5 stars)
   */
  private static checkExtremeRatingHigh(rating: number): boolean {
    return rating === 5;
  }

  /**
   * Detect aggressive language patterns
   */
  private static detectAggressiveLanguage(text: string): boolean {
    const aggressivePatterns = [
      /scam/i,
      /fraud/i,
      /criminal/i,
      /lawsuit/i,
      /report.*police/i,
      /!!+/,
      /\?\?+/,
    ];

    return aggressivePatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Detect excessive caps lock usage
   */
  private static detectCapsLockAbuse(text: string): boolean {
    if (text.length < 10) return false;

    const capsCount = (text.match(/[A-Z]/g) || []).length;
    const capsRatio = capsCount / text.length;

    return capsRatio > 0.5; // More than 50% caps
  }

  /**
   * Detect red flag keywords
   */
  private static detectRedFlagKeywords(text: string): boolean {
    const redFlags = [
      /never.*again/i,
      /worst.*ever/i,
      /do.*not.*use/i,
      /stay.*away/i,
      /rip.*off/i,
      /total.*waste/i,
    ];

    return redFlags.some((flag) => flag.test(text));
  }

  /**
   * Check review velocity (multiple reviews in short time)
   */
  private static async checkReviewVelocity(customerId: number): Promise<boolean> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentReviews = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.customerId, customerId), gte(reviews.createdAt, oneDayAgo)));

    return recentReviews.length >= 5;
  }

  /**
   * Check for duplicate accounts
   */
  private static async checkDuplicateAccount(customerId: number): Promise<boolean> {
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer.length) return false;

    const cust = customer[0];

    // Look for similar customers by phone or email
    const duplicates = await db
      .select()
      .from(customers)
      .where(
        and(
          // Same phone or email
          cust.phone ? eq(customers.phone, cust.phone) : undefined,
          // Different customer ID
          cust.id ? undefined : eq(customers.id, customerId)
        )
      );

    return duplicates.length > 1;
  }

  /**
   * Check payment dispute history
   */
  private static async checkPaymentDispute(customerId: number): Promise<boolean> {
    // In production, check against payment processor (Stripe, etc.)
    // For now, check local dispute records
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer.length) return false;

    // Check if customer has any dispute records
    return (customer[0] as any).disputeCount > 0;
  }

  /**
   * Check no-show history
   */
  private static async checkNoShowHistory(customerId: number): Promise<boolean> {
    const customer = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer.length) return false;

    // Check if customer has no-show records
    return (customer[0] as any).noShowCount >= 2;
  }

  /**
   * Check for unusual job amount
   */
  private static checkUnusualJobAmount(jobAmount?: number): boolean {
    if (!jobAmount) return false;

    // Unusually low (< $100)
    if (jobAmount < 100) return true;

    // Unusually high (> $50,000)
    if (jobAmount > 50000) return true;

    return false;
  }

  /**
   * Check for inconsistent details
   */
  private static checkInconsistentDetails(redFlags: string[]): boolean {
    // Check if red flags contradict each other
    const hasPositiveFlags = redFlags.some((f) => f.includes("good") || f.includes("great"));
    const hasNegativeFlags = redFlags.some((f) => f.includes("bad") || f.includes("poor"));

    return hasPositiveFlags && hasNegativeFlags;
  }

  /**
   * Generate human-readable reasoning
   */
  private static generateReasoning(signals: FraudSignal[], totalScore: number): string {
    if (signals.length === 0) {
      return "No fraud signals detected. Review appears legitimate.";
    }

    const topSignals = signals.slice(0, 3);
    const reasons = topSignals.map((s) => s.description).join("; ");

    if (totalScore >= 70) {
      return `CRITICAL: ${reasons}. Immediate review recommended.`;
    } else if (totalScore >= 50) {
      return `HIGH RISK: ${reasons}. Should be reviewed by moderator.`;
    } else if (totalScore >= 30) {
      return `MEDIUM RISK: ${reasons}. Monitor for patterns.`;
    } else {
      return `LOW RISK: ${reasons}. Likely legitimate.`;
    }
  }

  /**
   * Get fraud statistics for customer
   */
  static async getCustomerFraudStats(customerId: number) {
    const allSignals = await db
      .select()
      .from(fraudSignals)
      .where(eq(fraudSignals.customerId, customerId));

    const flaggedSignals = allSignals.filter((s) => (s as any).flaggedForModeration);
    const averageScore =
      allSignals.length > 0
        ? allSignals.reduce((sum, s) => sum + ((s as any).riskScore || 0), 0) / allSignals.length
        : 0;

    return {
      totalSignals: allSignals.length,
      flaggedReviews: flaggedSignals.length,
      averageRiskScore: Math.round(averageScore),
      riskLevel:
        averageScore >= 50
          ? "high"
          : averageScore >= 30
            ? "medium"
            : averageScore >= 10
              ? "low"
              : "minimal",
    };
  }

  /**
   * Get fraud statistics for contractor
   */
  static async getContractorFraudStats(contractorUserId: number) {
    const allSignals = await db
      .select()
      .from(fraudSignals)
      .where(eq(fraudSignals.contractorUserId, contractorUserId));

    const flaggedSignals = allSignals.filter((s) => (s as any).flaggedForModeration);
    const averageScore =
      allSignals.length > 0
        ? allSignals.reduce((sum, s) => sum + ((s as any).riskScore || 0), 0) / allSignals.length
        : 0;

    return {
      totalSignals: allSignals.length,
      flaggedReviews: flaggedSignals.length,
      averageRiskScore: Math.round(averageScore),
      riskLevel:
        averageScore >= 50
          ? "high"
          : averageScore >= 30
            ? "medium"
            : averageScore >= 10
              ? "low"
              : "minimal",
    };
  }
}
