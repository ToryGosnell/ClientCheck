/**
 * Review Service
 * Handles review submission and management for contractors/tradespeople
 */

export interface ReviewRatings {
  payment: number; // 1-5: Payment reliability
  communication: number; // 1-5: Communication quality
  scope: number; // 1-5: Scope clarity and adherence
  professionalism: number; // 1-5: Professionalism and quality
  followup: number; // 1-5: Follow-up and issue resolution
  disputes: number; // 1-5: Dispute history (1=many disputes, 5=no disputes)
}

export interface ReviewSubmission {
  id: string;
  contractorId: string;
  contractorLicenseNumber: string;
  contractorLicenseState: string; // State where license is valid
  customerName: string;
  ratings: ReviewRatings;
  summary: string;
  timestamp: number;
  status: "pending" | "approved" | "rejected";
  moderationNotes?: string;
}

export interface ReviewProfile {
  customerId: string;
  customerName: string;
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
}

export class ReviewService {
  /**
   * Submit a review from a contractor/tradesperson
   */
  static async submitReview(data: {
    contractorId: string;
    contractorLicenseNumber: string;
    contractorLicenseState: string;
    customerName: string;
    ratings: ReviewRatings;
    summary: string;
  }): Promise<{ success: boolean; reviewId?: string; error?: string }> {
    try {
      // Validate license state
      if (!this.isValidUSState(data.contractorLicenseState)) {
        return { success: false, error: "Invalid license state" };
      }

      // Validate ratings
      if (!this.validateRatings(data.ratings)) {
        return { success: false, error: "Invalid ratings" };
      }

      // In production, save to database
      const reviewId = `review_${Date.now()}`;

      console.log(
        `Review submitted by contractor (License: ${data.contractorLicenseNumber} in ${data.contractorLicenseState})`
      );

      return { success: true, reviewId };
    } catch (error) {
      console.error("Failed to submit review:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get reviews for a specific customer
   */
  static async getCustomerReviews(customerName: string): Promise<ReviewSubmission[]> {
    try {
      // In production, query database
      console.log(`Fetching reviews for customer: ${customerName}`);
      return [];
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
      return [];
    }
  }

  /**
   * Get review profile for a customer
   */
  static async getCustomerProfile(customerName: string): Promise<ReviewProfile | null> {
    try {
      // In production, aggregate reviews and calculate scores
      return null;
    } catch (error) {
      console.error("Failed to get customer profile:", error);
      return null;
    }
  }

  /**
   * Verify contractor license
   * In production, this would call state licensing board APIs
   */
  static async verifyLicense(
    licenseNumber: string,
    state: string
  ): Promise<{ valid: boolean; contractorName?: string; expirationDate?: string }> {
    try {
      // In production, call state licensing board API
      // Different states have different APIs:
      // - California: CSLB API
      // - Texas: TDLR API
      // - Florida: DBPR API
      // etc.

      console.log(`Verifying license ${licenseNumber} in ${state}`);

      return { valid: true };
    } catch (error) {
      console.error("Failed to verify license:", error);
      return { valid: false };
    }
  }

  /**
   * Validate ratings are in range 1-5
   */
  static validateRatings(ratings: ReviewRatings): boolean {
    const values = Object.values(ratings);
    return values.every((rating) => typeof rating === "number" && rating >= 1 && rating <= 5);
  }

  /**
   * Check if state code is valid US state
   */
  static isValidUSState(state: string): boolean {
    const usStates = [
      "AL",
      "AK",
      "AZ",
      "AR",
      "CA",
      "CO",
      "CT",
      "DE",
      "FL",
      "GA",
      "HI",
      "ID",
      "IL",
      "IN",
      "IA",
      "KS",
      "KY",
      "LA",
      "ME",
      "MD",
      "MA",
      "MI",
      "MN",
      "MS",
      "MO",
      "MT",
      "NE",
      "NV",
      "NH",
      "NJ",
      "NM",
      "NY",
      "NC",
      "ND",
      "OH",
      "OK",
      "OR",
      "PA",
      "RI",
      "SC",
      "SD",
      "TN",
      "TX",
      "UT",
      "VT",
      "VA",
      "WA",
      "WV",
      "WI",
      "WY",
    ];
    return usStates.includes(state.toUpperCase());
  }

  /**
   * Calculate average rating from all categories
   */
  static calculateAverageRating(ratings: ReviewRatings): number {
    const values = Object.values(ratings);
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / values.length) * 10) / 10;
  }

  /**
   * Identify red flags based on ratings
   */
  static identifyRedFlags(ratings: ReviewRatings): string[] {
    const flags: string[] = [];

    if (ratings.payment <= 2) {
      flags.push("Payment issues");
    }

    if (ratings.communication <= 2) {
      flags.push("Poor communication");
    }

    if (ratings.scope <= 2) {
      flags.push("Scope creep or unclear terms");
    }

    if (ratings.professionalism <= 2) {
      flags.push("Quality concerns");
    }

    if (ratings.followup <= 2) {
      flags.push("Poor follow-up");
    }

    if (ratings.disputes <= 2) {
      flags.push("History of disputes");
    }

    return flags;
  }

  /**
   * Get state display name
   */
  static getStateDisplayName(stateCode: string): string {
    const stateNames: Record<string, string> = {
      AL: "Alabama",
      AK: "Alaska",
      AZ: "Arizona",
      AR: "Arkansas",
      CA: "California",
      CO: "Colorado",
      CT: "Connecticut",
      DE: "Delaware",
      FL: "Florida",
      GA: "Georgia",
      HI: "Hawaii",
      ID: "Idaho",
      IL: "Illinois",
      IN: "Indiana",
      IA: "Iowa",
      KS: "Kansas",
      KY: "Kentucky",
      LA: "Louisiana",
      ME: "Maine",
      MD: "Maryland",
      MA: "Massachusetts",
      MI: "Michigan",
      MN: "Minnesota",
      MS: "Mississippi",
      MO: "Missouri",
      MT: "Montana",
      NE: "Nebraska",
      NV: "Nevada",
      NH: "New Hampshire",
      NJ: "New Jersey",
      NM: "New Mexico",
      NY: "New York",
      NC: "North Carolina",
      ND: "North Dakota",
      OH: "Ohio",
      OK: "Oklahoma",
      OR: "Oregon",
      PA: "Pennsylvania",
      RI: "Rhode Island",
      SC: "South Carolina",
      SD: "South Dakota",
      TN: "Tennessee",
      TX: "Texas",
      UT: "Utah",
      VT: "Vermont",
      VA: "Virginia",
      WA: "Washington",
      WV: "West Virginia",
      WI: "Wisconsin",
      WY: "Wyoming",
    };

    return stateNames[stateCode.toUpperCase()] || stateCode;
  }

  /**
   * Format license info for display
   */
  static formatLicenseInfo(licenseNumber: string, state: string): string {
    const stateName = this.getStateDisplayName(state);
    return `License #${licenseNumber} (${state}) - Valid in ${stateName}`;
  }
}
