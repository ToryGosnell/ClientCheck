/**
 * Customer Search Service
 * Allows contractors/tradespeople to search and view customer reviews
 */

import { apiUrl } from "@/lib/api";

export interface CustomerSearchResult {
  id: string;
  name: string;
  /** Two-letter state when returned from API (used by advanced search filter). */
  state?: string;
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
    const q = (query ?? "").trim();
    if (q.length < 2) return [];

    try {
      const url = apiUrl(`/customers?search=${encodeURIComponent(q)}`);
      const res = await fetch(url, { credentials: "omit" });
      const text = await res.text();
      let data: { results?: Record<string, unknown>[] } = {};
      try {
        data = text ? (JSON.parse(text) as { results?: Record<string, unknown>[] }) : {};
      } catch {
        return [];
      }
      if (!res.ok) return [];
      const rows = Array.isArray(data.results) ? data.results : [];
      return rows.map((row) => CustomerSearchService.mapApiCustomerRow(row));
    } catch (error) {
      console.error("Failed to search customers:", error);
      return [];
    }
  }

  private static mapApiCustomerRow(row: Record<string, unknown>): CustomerSearchResult {
    const risk = row.riskLevel;
    const riskLevel: CustomerSearchResult["riskLevel"] =
      risk === "low" || risk === "medium" || risk === "high" ? risk : "medium";
    const first = row.firstName != null ? String(row.firstName) : "";
    const last = row.lastName != null ? String(row.lastName) : "";
    const name = `${first} ${last}`.trim() || "Unknown";
    return {
      id: String(row.id ?? ""),
      name,
      state: row.state != null && String(row.state).trim() !== "" ? String(row.state).trim() : undefined,
      averageRating: parseFloat(String(row.overallRating ?? "0")) || 0,
      reviewCount: Number(row.reviewCount ?? 0),
      paymentScore: parseFloat(String(row.ratingPaymentReliability ?? "0")) || 0,
      communicationScore: parseFloat(String(row.ratingCommunication ?? "0")) || 0,
      scopeScore: parseFloat(String(row.ratingScopeChanges ?? "0")) || 0,
      professionalismScore: parseFloat(String(row.ratingPropertyRespect ?? "0")) || 0,
      followupScore: parseFloat(String(row.ratingPermitPulling ?? "0")) || 0,
      disputeScore: parseFloat(String(row.ratingOverallJobExperience ?? "0")) || 0,
      redFlags: [],
      riskLevel,
    };
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
      const rawQ = (options.query ?? "").trim();
      let list =
        rawQ.length >= 2 ? await CustomerSearchService.searchCustomers(rawQ) : [];

      if (options.minRating != null) {
        list = list.filter((c) => c.averageRating >= options.minRating!);
      }
      if (options.maxRating != null) {
        list = list.filter((c) => c.averageRating <= options.maxRating!);
      }
      if (options.riskLevel) {
        list = list.filter((c) => c.riskLevel === options.riskLevel);
      }
      if (options.minReviews != null) {
        list = list.filter((c) => c.reviewCount >= options.minReviews!);
      }
      if (options.state && options.state.trim().length === 2) {
        const st = options.state.trim().toUpperCase();
        list = list.filter((c) => (c.state ?? "").toUpperCase() === st);
      }

      const limit = options.limit ?? 20;
      const offset = options.offset ?? 0;
      const total = list.length;
      const results = list.slice(offset, offset + limit);
      return { results, total };
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
