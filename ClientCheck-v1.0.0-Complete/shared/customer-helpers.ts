/**
 * Shared customer normalization and aggregation helpers.
 * Used by both server and client code.
 */

// ─── Normalization ───────────────────────────────────────────────────────────

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ");
}

export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 ? digits : null;
}

export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : null;
}

const ADDRESS_ABBREVIATIONS: Record<string, string> = {
  street: "st", avenue: "ave", boulevard: "blvd", drive: "dr",
  lane: "ln", road: "rd", court: "ct", place: "pl",
  circle: "cir", way: "way", north: "n", south: "s",
  east: "e", west: "w", apartment: "apt", suite: "ste",
};

export function normalizeAddress(
  address: string | null | undefined,
  city: string | null | undefined,
  state: string | null | undefined,
  zip: string | null | undefined,
): string | null {
  const parts = [address, city, state, zip].filter(Boolean).join(" ");
  if (!parts.trim()) return null;
  let normalized = parts.trim().toLowerCase().replace(/[.,#]/g, "").replace(/\s+/g, " ");
  for (const [full, abbr] of Object.entries(ADDRESS_ABBREVIATIONS)) {
    normalized = normalized.replace(new RegExp(`\\b${full}\\b`, "g"), abbr);
  }
  return normalized;
}

export function buildCustomerSearchText(customer: {
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string {
  return [
    customer.firstName,
    customer.lastName,
    customer.phone,
    customer.email,
    customer.address,
    customer.city,
    customer.state,
    customer.zip,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

// ─── Aggregate Score Calculation ──────────────────────────────────────────────

export interface ReviewForAggregation {
  overallRating: number;
  wouldWorkAgain?: string | null;
  redFlags?: string | null;
  greenFlags?: string | null;
  categoryDataJson?: string | null;
  calculatedOverallRating?: string | null;
}

export interface CustomerAggregates {
  reviewCount: number;
  overallScore: string;
  calculatedOverallScore: string;
  wouldWorkAgainYesCount: number;
  wouldWorkAgainNoCount: number;
  wouldWorkAgainNaCount: number;
  redFlagCount: number;
  criticalRedFlagCount: number;
  greenFlagCount: number;
  riskLevel: "low" | "medium" | "high" | "unknown";
}

export function computeCustomerAggregates(
  allReviews: ReviewForAggregation[],
): CustomerAggregates {
  if (allReviews.length === 0) {
    return {
      reviewCount: 0,
      overallScore: "0.00",
      calculatedOverallScore: "0.00",
      wouldWorkAgainYesCount: 0,
      wouldWorkAgainNoCount: 0,
      wouldWorkAgainNaCount: 0,
      redFlagCount: 0,
      criticalRedFlagCount: 0,
      greenFlagCount: 0,
      riskLevel: "unknown",
    };
  }

  const overallSum = allReviews.reduce((s, r) => s + (r.overallRating || 0), 0);
  const overallAvg = overallSum / allReviews.length;

  let calcSum = 0;
  let calcCount = 0;
  for (const r of allReviews) {
    const raw = r.calculatedOverallRating
      ? parseFloat(r.calculatedOverallRating)
      : r.overallRating;
    if (raw != null && !isNaN(raw)) {
      calcSum += raw;
      calcCount++;
    }
  }
  const calcAvg = calcCount > 0 ? calcSum / calcCount : 0;

  let wouldWorkAgainYesCount = 0;
  let wouldWorkAgainNoCount = 0;
  let wouldWorkAgainNaCount = 0;
  let redFlagCount = 0;
  let criticalRedFlagCount = 0;
  let greenFlagCount = 0;

  // Lazy-load flag parsing to avoid circular deps in shared code
  let parseFlagsFn: ((s: string | null | undefined) => { redFlags: string[]; greenFlags: string[] }) | null = null;
  let isCriticalFn: ((s: string) => boolean) | null = null;

  try {
    const flagMod = require("./review-flags");
    parseFlagsFn = flagMod.parseFlags;
    isCriticalFn = flagMod.isCriticalFlag;
  } catch {
    // Non-critical — flag counts will be 0
  }

  for (const r of allReviews) {
    if (r.wouldWorkAgain === "yes") wouldWorkAgainYesCount++;
    else if (r.wouldWorkAgain === "no") wouldWorkAgainNoCount++;
    else wouldWorkAgainNaCount++;

    if (parseFlagsFn) {
      const { redFlags: rf, greenFlags: gf } = parseFlagsFn(r.redFlags);
      redFlagCount += rf.length;
      greenFlagCount += gf.length;
      if (isCriticalFn) {
        criticalRedFlagCount += rf.filter(isCriticalFn).length;
      }
    }
  }

  const riskLevel: CustomerAggregates["riskLevel"] =
    overallAvg === 0
      ? "unknown"
      : overallAvg >= 4.0
        ? "low"
        : overallAvg >= 2.5
          ? "medium"
          : "high";

  return {
    reviewCount: allReviews.length,
    overallScore: overallAvg.toFixed(2),
    calculatedOverallScore: calcAvg.toFixed(2),
    wouldWorkAgainYesCount,
    wouldWorkAgainNoCount,
    wouldWorkAgainNaCount,
    redFlagCount,
    criticalRedFlagCount,
    greenFlagCount,
    riskLevel,
  };
}
