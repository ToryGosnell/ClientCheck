/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// ClientCheck domain types
export type RiskLevel = "low" | "medium" | "high" | "unknown";

export const PAYMENT_RATINGS = [
  "always_pays_on_time",
  "usually_pays_on_time",
  "pays_with_reminders",
  "frequently_late",
  "payment_disputes",
] as const;

export type PaymentRating = (typeof PAYMENT_RATINGS)[number];

export const PAYMENT_RATING_LABELS: Record<PaymentRating, string> = {
  always_pays_on_time: "Always Pays On Time",
  usually_pays_on_time: "Usually Pays On Time",
  pays_with_reminders: "Pays With Reminders",
  frequently_late: "Frequently Late",
  payment_disputes: "Payment Disputes",
};

// ─── Weighted Flag System ────────────────────────────────────────────────────
import { RED_FLAG_VALUES } from "./review-flags";

export {
  RED_FLAGS as RED_FLAGS_CONFIG,
  GREEN_FLAGS as GREEN_FLAGS_CONFIG,
  RED_FLAG_VALUES,
  GREEN_FLAG_VALUES,
  RED_FLAG_MAP,
  GREEN_FLAG_MAP,
  FLAG_MAP,
  ALL_FLAGS,
  getFlagLabel,
  isCriticalFlag,
  sortFlagsForDisplay,
  getFlagScoreAdjustment,
  serializeFlags,
  parseFlags,
  mapLegacyFlags,
  type WeightedFlag,
  type FlagSeverity,
  type FlagCategory,
  type RedFlagValue,
  type GreenFlagValue,
  type FlagScoreAdjustment,
} from "./review-flags";

/**
 * @deprecated Use RED_FLAG_VALUES from review-flags.ts. Kept for backward compat.
 */
export const RED_FLAGS = [
  "scope_creep",
  "no_deposits",
  "micromanages",
  "refuses_change_orders",
  "disputes_invoices",
] as const;

/** @deprecated Use RedFlagValue from review-flags.ts */
export type RedFlag = (typeof RED_FLAGS)[number];

/** @deprecated Use getFlagLabel() or RED_FLAG_MAP from review-flags.ts */
export const RED_FLAG_LABELS: Record<string, string> = {
  scope_creep: "Scope Creep",
  no_deposits: "Doesn't Pay Deposits",
  micromanages: "Micromanages Work",
  refuses_change_orders: "Refuses Change Orders",
  disputes_invoices: "Disputes Invoices",
};

// Re-export new review category system
export {
  REVIEW_CATEGORIES,
  REVIEW_CATEGORY_KEYS,
  CATEGORY_META_MAP,
  WOULD_WORK_AGAIN_LABELS,
  WOULD_WORK_AGAIN_BADGE,
  computeCategoryAverage,
  computeClientScore100,
  aggregateCategoryRatings,
  legacyToCategories,
  legacyToWouldWorkAgain,
  categoriesToLegacyFlat,
  validateReviewRatings,
  type ReviewCategoryKey,
  type ReviewCategoryValue,
  type ReviewCategoryRatings,
  type WouldWorkAgainValue,
  type ContractorClientReviewRatings,
  type CategoryMeta,
} from "./review-categories";

// Legacy compat: old code that imports RATING_WEIGHTS still compiles
export const RATING_WEIGHTS: Record<string, number> = {
  ratingPaymentReliability: 25,
  ratingCommunication: 20,
  ratingPermitPulling: 15,
  ratingPropertyRespect: 15,
  ratingScopeChanges: 15,
  ratingOverallJobExperience: 10,
};

export const RATING_SCALE = 5;

export const TRADE_TYPES = [
  "General Contractor",
  "Plumbing",
  "Electrical",
  "HVAC",
  "Roofing",
  "Painting",
  "Flooring",
  "Landscaping",
  "Masonry",
  "Carpentry",
  "Drywall",
  "Tile / Stone",
  "Concrete",
  "Insulation",
  "Windows / Doors",
  "Other",
] as const;

export type TradeType = (typeof TRADE_TYPES)[number];

export interface ReviewWithContractor {
  id: number;
  customerId: number;
  contractorUserId: number;
  overallRating: number;
  calculatedOverallRating?: string | null;
  // Legacy flat columns (kept for backward compat reads)
  ratingPaymentReliability: number;
  ratingCommunication: number;
  ratingScopeChanges: number;
  ratingPropertyRespect: number;
  ratingPermitPulling: number;
  ratingOverallJobExperience: number;
  // New structured data
  categoryDataJson?: string | null;
  wouldWorkAgain?: string | null;
  reviewText: string | null;
  jobType: string | null;
  jobDate: string | null;
  jobAmount: string | null;
  redFlags: string | null;
  greenFlags: string | null;
  helpfulCount: number;
  createdAt: Date;
  contractorName?: string | null;
  contractorTrade?: string | null;
  contractorVerified?: string | null;
  moderationStatus?: string | null;
  /** Populated when listing reviews for a customer (public response exists). */
  hasCustomerResponse?: boolean;
}

/** @deprecated Use parseFlags() from review-flags.ts for new code */
export function parseRedFlags(flagsStr: string | null): string[] {
  if (!flagsStr) return [];
  const legacyAllowed = new Set<string>(RED_FLAGS as unknown as string[]);
  const modernRed = new Set<string>(RED_FLAG_VALUES as unknown as string[]);
  // Handle new JSON format
  if (flagsStr.startsWith("{")) {
    try {
      const parsed = JSON.parse(flagsStr);
      if (!Array.isArray(parsed.redFlags)) return [];
      return parsed.redFlags.filter(
        (f: unknown): f is string => typeof f === "string" && modernRed.has(f),
      );
    } catch {
      return [];
    }
  }
  // Legacy comma-separated (snake_case set in RED_FLAGS)
  return flagsStr
    .split(",")
    .map((s) => s.trim())
    .filter((f) => f.length > 0 && legacyAllowed.has(f));
}

/** @deprecated Use serializeFlags() from review-flags.ts for new code */
export function serializeRedFlags(flags: string[]): string {
  return flags.join(",");
}

export function getRiskLevel(rating: number): RiskLevel {
  if (rating === 0) return "unknown";
  if (rating >= 4.0) return "low";
  if (rating >= 2.5) return "medium";
  return "high";
}
