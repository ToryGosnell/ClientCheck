/**
 * Review Moderation Service
 * Handles review approval, rejection, and moderation workflows
 */

export interface PendingReview {
  id: string;
  contractorId: string;
  contractorName: string;
  contractorLicense: string;
  contractorLicenseState: string;
  customerId: string;
  customerName: string;
  ratings: {
    payment: number;
    communication: number;
    scope: number;
    professionalism: number;
    followup: number;
    disputes: number;
  };
  summary: string;
  submittedAt: number;
  flaggedReasons: string[];
  averageRating: number;
}

export interface ModerationAction {
  id: string;
  reviewId: string;
  moderatorId: string;
  action: "approved" | "rejected";
  reason?: string;
  timestamp: number;
}

export class ModerationService {
  /**
   * Get all pending reviews
   */
  static async getPendingReviews(limit: number = 50, offset: number = 0): Promise<{
    reviews: PendingReview[];
    total: number;
  }> {
    try {
      // In production, query database
      // SELECT * FROM reviews WHERE status = 'pending' ORDER BY submitted_at DESC LIMIT limit OFFSET offset
      console.log(`Fetching pending reviews: limit=${limit}, offset=${offset}`);
      return { reviews: [], total: 0 };
    } catch (error) {
      console.error("Failed to get pending reviews:", error);
      return { reviews: [], total: 0 };
    }
  }

  /**
   * Get reviews flagged for moderation
   */
  static async getFlaggedReviews(): Promise<PendingReview[]> {
    try {
      // In production, query database
      // SELECT * FROM reviews WHERE flagged = true AND status = 'pending'
      console.log("Fetching flagged reviews");
      return [];
    } catch (error) {
      console.error("Failed to get flagged reviews:", error);
      return [];
    }
  }

  /**
   * Approve a review
   */
  static async approveReview(
    reviewId: string,
    moderatorId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // In production, update database
      // UPDATE reviews SET status = 'approved', moderated_at = NOW(), moderator_id = moderatorId WHERE id = reviewId
      console.log(`Approving review ${reviewId} by moderator ${moderatorId}`);
      return { success: true };
    } catch (error) {
      console.error("Failed to approve review:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Reject a review with reason
   */
  static async rejectReview(
    reviewId: string,
    moderatorId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // In production, update database
      // UPDATE reviews SET status = 'rejected', moderation_reason = reason, moderated_at = NOW(), moderator_id = moderatorId WHERE id = reviewId
      console.log(`Rejecting review ${reviewId} - Reason: ${reason}`);
      return { success: true };
    } catch (error) {
      console.error("Failed to reject review:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Flag a review for manual review
   */
  static async flagReview(
    reviewId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // In production, update database
      // UPDATE reviews SET flagged = true, flag_reason = reason WHERE id = reviewId
      console.log(`Flagging review ${reviewId} - Reason: ${reason}`);
      return { success: true };
    } catch (error) {
      console.error("Failed to flag review:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Auto-detect suspicious reviews
   */
  static detectSuspiciousReview(review: PendingReview): string[] {
    const flags: string[] = [];

    // Check for extreme ratings (all 1s or all 5s)
    const ratings = Object.values(review.ratings);
    const allSame = ratings.every((r) => r === ratings[0]);
    if (allSame) {
      flags.push("All ratings are identical");
    }

    // Check for very short summaries
    if (review.summary.trim().length < 30) {
      flags.push("Summary is very short");
    }

    // Check for extremely long summaries (spam)
    if (review.summary.length > 5000) {
      flags.push("Summary is extremely long");
    }

    // Check for suspicious patterns (all low ratings from same contractor)
    const averageRating = Object.values(review.ratings).reduce((a, b) => a + b, 0) / 6;
    if (averageRating <= 1.5) {
      flags.push("Extremely low ratings (potential revenge review)");
    }

    // Check for suspicious patterns (all high ratings)
    if (averageRating >= 4.8) {
      flags.push("Suspiciously high ratings (potential self-promotion)");
    }

    // Check for common spam keywords
    const spamKeywords = [
      "click here",
      "buy now",
      "visit website",
      "contact me",
      "dm for details",
      "whatsapp",
    ];
    const lowerSummary = review.summary.toLowerCase();
    if (spamKeywords.some((keyword) => lowerSummary.includes(keyword))) {
      flags.push("Contains promotional content");
    }

    // Check for profanity/abuse (basic check)
    const profanity = ["hate", "stupid", "idiot", "scam", "fraud"];
    if (profanity.some((word) => lowerSummary.includes(word))) {
      flags.push("Contains potentially abusive language");
    }

    // Check for duplicate reviews from same contractor
    // In production, query database for similar reviews
    flags.push("(Check for duplicates in database)");

    return flags.filter((f) => !f.includes("Check for duplicates"));
  }

  /**
   * Get moderation statistics
   */
  static async getModerationStats(): Promise<{
    pendingCount: number;
    approvedToday: number;
    rejectedToday: number;
    flaggedCount: number;
    averageReviewTime: number; // in minutes
  } | null> {
    try {
      // In production, query database
      console.log("Fetching moderation statistics");
      return null;
    } catch (error) {
      console.error("Failed to get moderation stats:", error);
      return null;
    }
  }

  /**
   * Get moderation history for a review
   */
  static async getReviewHistory(reviewId: string): Promise<ModerationAction[]> {
    try {
      // In production, query database
      console.log(`Fetching history for review ${reviewId}`);
      return [];
    } catch (error) {
      console.error("Failed to get review history:", error);
      return [];
    }
  }

  /**
   * Verify contractor license
   */
  static async verifyContractorLicense(
    licenseNumber: string,
    state: string
  ): Promise<{ valid: boolean; contractorName?: string; expirationDate?: string; error?: string }> {
    try {
      // In production, call state licensing board APIs
      console.log(`Verifying license ${licenseNumber} in ${state}`);
      return { valid: true };
    } catch (error) {
      console.error("Failed to verify license:", error);
      return { valid: false, error: String(error) };
    }
  }

  /**
   * Get rejection reasons
   */
  static getRejectionReasons(): string[] {
    return [
      "Spam or promotional content",
      "Abusive or threatening language",
      "Duplicate review",
      "Unverified license",
      "Suspicious pattern (revenge review)",
      "Suspicious pattern (self-promotion)",
      "Violates terms of service",
      "Contains personal information",
      "Off-topic content",
      "Other (specify in notes)",
    ];
  }

  /**
   * Get moderation guidelines
   */
  static getModerationGuidelines(): string[] {
    return [
      "Verify contractor license is valid in stated state",
      "Check for duplicate reviews from same contractor",
      "Look for extreme ratings (all 1s or all 5s)",
      "Check for spam keywords or promotional content",
      "Verify summary is substantive (minimum 30 characters)",
      "Flag reviews with abusive language for review",
      "Approve reviews that meet all criteria",
      "Reject reviews that violate guidelines",
      "Document reason for all rejections",
      "Process reviews within 24 hours when possible",
    ];
  }

  /**
   * Calculate moderation priority
   */
  static calculatePriority(review: PendingReview): "high" | "medium" | "low" {
    const flags = this.detectSuspiciousReview(review);

    if (flags.length >= 3) return "high";
    if (flags.length >= 1) return "medium";
    return "low";
  }
}
