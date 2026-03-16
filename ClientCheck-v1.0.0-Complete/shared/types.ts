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

export const RED_FLAGS = [
  "scope_creep",
  "no_deposits",
  "micromanages",
  "refuses_change_orders",
  "disputes_invoices",
] as const;

export type RedFlag = (typeof RED_FLAGS)[number];

export const RED_FLAG_LABELS: Record<RedFlag, string> = {
  scope_creep: "Scope Creep",
  no_deposits: "Doesn't Pay Deposits",
  micromanages: "Micromanages Work",
  refuses_change_orders: "Refuses Change Orders",
  disputes_invoices: "Disputes Invoices",
};

// Rating category weights for client score calculation (hidden from user)
export const RATING_WEIGHTS: Record<string, number> = {
  ratingPaymentReliability: 25,  // Most important
  ratingCommunication: 20,
  ratingPermitPulling: 15,
  ratingPropertyRespect: 15,
  ratingScopeChanges: 15,
  ratingOverallJobExperience: 10,
};

export const RATING_SCALE = 5; // 1-5 star scale

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
  ratingPaymentReliability: number;
  ratingCommunication: number;
  ratingScopeChanges: number;
  ratingPropertyRespect: number;
  ratingPermitPulling: number;
  ratingOverallJobExperience: number;
  reviewText: string | null;
  jobType: string | null;
  jobDate: string | null;
  jobAmount: string | null;
  redFlags: string | null;
  helpfulCount: number;
  createdAt: Date;
  contractorName?: string | null;
  contractorTrade?: string | null;
}

export function parseRedFlags(flagsStr: string | null): RedFlag[] {
  if (!flagsStr) return [];
  return flagsStr.split(",").filter((f): f is RedFlag =>
    (RED_FLAGS as readonly string[]).includes(f)
  );
}

export function serializeRedFlags(flags: RedFlag[]): string {
  return flags.join(",");
}

export function getRiskLevel(rating: number): RiskLevel {
  if (rating === 0) return "unknown";
  if (rating >= 4.0) return "low";
  if (rating >= 2.5) return "medium";
  return "high";
}
