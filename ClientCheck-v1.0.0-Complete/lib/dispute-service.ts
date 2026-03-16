/**
 * Dispute Service
 * Handles customer responses and disputes to reviews
 */

export interface Dispute {
  id: string;
  reviewId: string;
  customerId: string;
  customerName: string;
  contractorName: string;
  originalReviewSummary: string;
  disputeReason: string;
  evidence: string; // Description of evidence (photos, documents, etc.)
  status: "pending" | "under_review" | "resolved" | "rejected";
  createdAt: number;
  resolvedAt?: number;
  resolution?: string;
}

export interface DisputeResponse {
  id: string;
  disputeId: string;
  responderId: string;
  responderType: "customer" | "contractor" | "moderator";
  message: string;
  attachments?: string[];
  timestamp: number;
}

export class DisputeService {
  /**
   * File a dispute against a review
   */
  static async fileDispute(data: {
    reviewId: string;
    customerId: string;
    customerName: string;
    contractorName: string;
    originalReviewSummary: string;
    disputeReason: string;
    evidence: string;
  }): Promise<{ success: boolean; disputeId?: string; error?: string }> {
    try {
      // Validate dispute reason
      if (!data.disputeReason.trim() || data.disputeReason.length < 20) {
        return { success: false, error: "Dispute reason must be at least 20 characters" };
      }

      // In production, save to database
      const disputeId = `dispute_${Date.now()}`;
      console.log(`Dispute filed: ${disputeId}`);

      return { success: true, disputeId };
    } catch (error) {
      console.error("Failed to file dispute:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get disputes for a customer
   */
  static async getCustomerDisputes(customerId: string): Promise<Dispute[]> {
    try {
      // In production, query database
      console.log(`Fetching disputes for customer: ${customerId}`);
      return [];
    } catch (error) {
      console.error("Failed to get customer disputes:", error);
      return [];
    }
  }

  /**
   * Get all pending disputes (for moderators)
   */
  static async getPendingDisputes(): Promise<Dispute[]> {
    try {
      // In production, query database
      // SELECT * FROM disputes WHERE status IN ('pending', 'under_review') ORDER BY created_at DESC
      console.log("Fetching pending disputes");
      return [];
    } catch (error) {
      console.error("Failed to get pending disputes:", error);
      return [];
    }
  }

  /**
   * Add response to dispute
   */
  static async addDisputeResponse(
    disputeId: string,
    responderId: string,
    responderType: "customer" | "contractor" | "moderator",
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!message.trim() || message.length < 10) {
        return { success: false, error: "Response must be at least 10 characters" };
      }

      // In production, save to database
      console.log(`Response added to dispute ${disputeId} by ${responderType}`);
      return { success: true };
    } catch (error) {
      console.error("Failed to add dispute response:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get dispute responses
   */
  static async getDisputeResponses(disputeId: string): Promise<DisputeResponse[]> {
    try {
      // In production, query database
      console.log(`Fetching responses for dispute: ${disputeId}`);
      return [];
    } catch (error) {
      console.error("Failed to get dispute responses:", error);
      return [];
    }
  }

  /**
   * Resolve dispute (moderator action)
   */
  static async resolveDispute(
    disputeId: string,
    resolution: "upheld" | "overturned" | "partial",
    details: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // In production, update database and potentially remove/modify review
      console.log(`Resolving dispute ${disputeId}: ${resolution}`);

      if (resolution === "overturned") {
        // Remove the review
        console.log("Review will be removed");
      } else if (resolution === "partial") {
        // Modify the review or add moderator note
        console.log("Review will be modified with moderator note");
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to resolve dispute:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get dispute reasons
   */
  static getDisputeReasons(): string[] {
    return [
      "Review is inaccurate or false",
      "Review is based on false information",
      "Contractor is misrepresenting what happened",
      "Review violates our terms of service",
      "Review contains personal information",
      "Review is defamatory or libelous",
      "Review is from a competitor trying to harm business",
      "I have evidence that contradicts the review",
      "The contractor and I resolved the issue",
      "Other (explain in details)",
    ];
  }

  /**
   * Get dispute status display
   */
  static getStatusDisplay(status: string): string {
    const statusMap: Record<string, string> = {
      pending: "⏳ Pending Review",
      under_review: "🔍 Under Review",
      resolved: "✅ Resolved",
      rejected: "❌ Rejected",
    };
    return statusMap[status] || status;
  }

  /**
   * Calculate dispute priority
   */
  static calculatePriority(dispute: Dispute): "high" | "medium" | "low" {
    // High priority: recent disputes with strong language
    const daysSinceFiled = (Date.now() - dispute.createdAt) / (1000 * 60 * 60 * 24);

    if (daysSinceFiled < 1) return "high";
    if (daysSinceFiled < 7) return "medium";
    return "low";
  }

  /**
   * Get guidelines for customers filing disputes
   */
  static getDisputeGuidelines(): string[] {
    return [
      "Be specific about what is inaccurate in the review",
      "Provide evidence or documentation to support your claim",
      "Remain professional and respectful in your response",
      "Explain what actually happened in your interaction",
      "If you resolved the issue with the contractor, explain how",
      "Do not make personal attacks on the contractor",
      "Do not use this to dispute legitimate negative reviews",
      "Our team will review all evidence before making a decision",
      "Disputes are typically resolved within 5-7 business days",
      "If you disagree with our decision, you can appeal once",
    ];
  }
}
