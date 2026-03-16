/**
 * Customer Search Service
 * Allows contractors/tradespeople to search and view customer reviews
 */

export interface CustomerSearchResult {
  id: string;
  name: string;
  averageRating: number;
  reviewCount: number;
  paymentScore: number;
  communicationScore: number;
  scopeScore: number;
  professionalismScore: number;
  followupScore: number;
  disputeScore: number;
  redFlags: string[];
  lastReviewDate?: number;
  riskLevel: "low" | "medium" | "high"; // Based on ratings and red flags
}

export interface CustomerReview {
  id: string;
  contractorName: string;
  contractorLicense: string;
  contractorLicenseState: string;
  ratings: {
    payment: number;
    communication: number;
    scope: number;
    professionalism: number;
    followup: number;
    disputes: number;
  };
  summary: string;
  timestamp: number;
  status: "approved" | "pending" | "rejected";
}

export class CustomerSearchService {
  /**
   * Search customers by name
   */
  static async searchCustomers(query: string): Promise<CustomerSearchResult[]> {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      // In production, query database with full-text search
      // SELECT * FROM customers WHERE name ILIKE '%query%' ORDER BY review_count DESC
      console.log(`Searching customers for: ${query}`);

      // Mock results
      return [];
    } catch (error) {
      console.error("Failed to search customers:", error);
      return [];
    }
  }

  /**
   * Get customer profile with all reviews
   */
  static async getCustomerProfile(customerId: string): Promise<{
    customer: CustomerSearchResult;
    reviews: CustomerReview[];
  } | null> {
    try {
      // In production, query database
      console.log(`Fetching profile for customer: ${customerId}`);
      return null;
    } catch (error) {
      console.error("Failed to get customer profile:", error);
      return null;
    }
  }

  /**
   * Get top reviewed customers (most reviews)
   */
  static async getTopCustomers(limit: number = 10): Promise<CustomerSearchResult[]> {
    try {
      // In production, query database
      // SELECT * FROM customers ORDER BY review_count DESC LIMIT limit
      console.log(`Fetching top ${limit} customers`);
      return [];
    } catch (error) {
      console.error("Failed to get top customers:", error);
      return [];
    }
  }

  /**
   * Get high-risk customers (low ratings)
   */
  static async getHighRiskCustomers(limit: number = 10): Promise<CustomerSearchResult[]> {
    try {
      // In production, query database
      // SELECT * FROM customers WHERE avg_rating < 2.5 ORDER BY review_count DESC LIMIT limit
      console.log(`Fetching high-risk customers`);
      return [];
    } catch (error) {
      console.error("Failed to get high-risk customers:", error);
      return [];
    }
  }

  /**
   * Calculate risk level based on ratings
   */
  static calculateRiskLevel(ratings: {
    payment: number;
    communication: number;
    scope: number;
    professionalism: number;
    followup: number;
    disputes: number;
  }): "low" | "medium" | "high" {
    const average = Object.values(ratings).reduce((a, b) => a + b, 0) / 6;

    if (average >= 4) return "low";
    if (average >= 2.5) return "medium";
    return "high";
  }

  /**
   * Get red flags for customer
   */
  static identifyRedFlags(ratings: {
    payment: number;
    communication: number;
    scope: number;
    professionalism: number;
    followup: number;
    disputes: number;
  }): string[] {
    const flags: string[] = [];

    if (ratings.payment <= 2) flags.push("Payment issues");
    if (ratings.communication <= 2) flags.push("Poor communication");
    if (ratings.scope <= 2) flags.push("Scope creep");
    if (ratings.professionalism <= 2) flags.push("Quality concerns");
    if (ratings.followup <= 2) flags.push("Poor follow-up");
    if (ratings.disputes <= 2) flags.push("History of disputes");

    return flags;
  }

  /**
   * Get reviews for specific customer
   */
  static async getCustomerReviews(customerId: string): Promise<CustomerReview[]> {
    try {
      // In production, query database
      console.log(`Fetching reviews for customer: ${customerId}`);
      return [];
    } catch (error) {
      console.error("Failed to get customer reviews:", error);
      return [];
    }
  }

  /**
   * Filter customers by risk level
   */
  static async getCustomersByRiskLevel(
    riskLevel: "low" | "medium" | "high",
    limit: number = 20
  ): Promise<CustomerSearchResult[]> {
    try {
      // In production, query database
      console.log(`Fetching ${riskLevel} risk customers`);
      return [];
    } catch (error) {
      console.error("Failed to get customers by risk level:", error);
      return [];
    }
  }

  /**
   * Search customers with filters
   */
  static async searchCustomersAdvanced(options: {
    query?: string;
    minRating?: number;
    maxRating?: number;
    riskLevel?: "low" | "medium" | "high";
    minReviews?: number;
    state?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ results: CustomerSearchResult[]; total: number }> {
    try {
      // In production, build complex query with filters
      // SELECT * FROM customers
      // WHERE (name ILIKE '%query%' OR business_name ILIKE '%query%')
      // AND avg_rating >= minRating
      // AND avg_rating <= maxRating
      // AND review_count >= minReviews
      // ORDER BY review_count DESC
      // LIMIT limit OFFSET offset

      console.log("Searching customers with filters:", options);
      return { results: [], total: 0 };
    } catch (error) {
      console.error("Failed to search customers:", error);
      return { results: [], total: 0 };
    }
  }

  /**
   * Get customer statistics
   */
  static async getCustomerStats(): Promise<{
    totalCustomers: number;
    totalReviews: number;
    averageRating: number;
    highRiskCount: number;
  } | null> {
    try {
      // In production, query database
      console.log("Fetching customer statistics");
      return null;
    } catch (error) {
      console.error("Failed to get customer stats:", error);
      return null;
    }
  }

  /**
   * Format rating for display
   */
  static formatRating(rating: number): string {
    return `${rating.toFixed(1)}/5`;
  }

  /**
   * Get rating color based on score
   */
  static getRatingColor(rating: number): string {
    if (rating >= 4) return "#22C55E"; // Green - Good
    if (rating >= 2.5) return "#F59E0B"; // Yellow - Medium
    return "#EF4444"; // Red - Poor
  }

  /**
   * Get risk level icon
   */
  static getRiskLevelIcon(riskLevel: "low" | "medium" | "high"): string {
    if (riskLevel === "low") return "✅";
    if (riskLevel === "medium") return "⚠️";
    return "🚨";
  }
}
