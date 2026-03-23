/**
 * Centralized review category definitions, types, scoring metadata,
 * legacy mapping, and validation helpers.
 */

import { getFlagScoreAdjustment } from "./review-flags";

// ─── Category keys ────────────────────────────────────────────────────────────

export const REVIEW_CATEGORY_KEYS = [
  "paymentReliability",
  "paymentTimeliness",
  "scopeChanges",
  "communication",
  "decisionMaking",
  "jobsiteConditions",
  "respectProfessionalism",
  "interference",
  "contractCompliance",
  "overallExperience",
] as const;

export type ReviewCategoryKey = (typeof REVIEW_CATEGORY_KEYS)[number];

// ─── Category value types ─────────────────────────────────────────────────────

export type ReviewCategoryValue = {
  score: number | null;
  notApplicable: boolean;
};

export type WouldWorkAgainValue = "yes" | "no" | "na";

export type ReviewCategoryRatings = Record<ReviewCategoryKey, ReviewCategoryValue>;

export type ContractorClientReviewRatings = {
  overallRating: number | null;
  categories: ReviewCategoryRatings;
  wouldWorkAgain: WouldWorkAgainValue;
};

// ─── Category metadata ────────────────────────────────────────────────────────

export interface CategoryMeta {
  key: ReviewCategoryKey;
  label: string;
  description: string;
  weight: number;
}

export const REVIEW_CATEGORIES: CategoryMeta[] = [
  {
    key: "paymentReliability",
    label: "Payment Reliability",
    description: "Did they actually pay like they said they would?",
    weight: 20,
  },
  {
    key: "paymentTimeliness",
    label: "Payment Timeliness",
    description: "Did they pay on time or drag it out?",
    weight: 15,
  },
  {
    key: "scopeChanges",
    label: "Scope Changes",
    description: "Did they keep changing the job after the price was set?",
    weight: 10,
  },
  {
    key: "communication",
    label: "Communication",
    description: "Were they responsive, clear, and reachable?",
    weight: 12,
  },
  {
    key: "decisionMaking",
    label: "Decision Making",
    description: "Did they make decisions fast enough to keep the job moving?",
    weight: 8,
  },
  {
    key: "jobsiteConditions",
    label: "Jobsite Conditions",
    description: "Was the jobsite ready, accessible, and workable?",
    weight: 5,
  },
  {
    key: "respectProfessionalism",
    label: "Respect / Professionalism",
    description: "Did they treat you and your crew with basic respect?",
    weight: 10,
  },
  {
    key: "interference",
    label: "Interference With Work",
    description: "Did they get in the way, micromanage, or disrupt the job?",
    weight: 5,
  },
  {
    key: "contractCompliance",
    label: "Contract Compliance",
    description: "Did they follow the contract, approvals, and agreed terms?",
    weight: 10,
  },
  {
    key: "overallExperience",
    label: "Overall Experience",
    description: "Overall, how was it working with this client?",
    weight: 5,
  },
];

export const CATEGORY_META_MAP: Record<ReviewCategoryKey, CategoryMeta> =
  Object.fromEntries(REVIEW_CATEGORIES.map((c) => [c.key, c])) as Record<
    ReviewCategoryKey,
    CategoryMeta
  >;

// ─── Would-work-again labels ──────────────────────────────────────────────────

export const WOULD_WORK_AGAIN_LABELS: Record<WouldWorkAgainValue, string> = {
  yes: "Would work again",
  no: "Would not work again",
  na: "N/A",
};

export const WOULD_WORK_AGAIN_BADGE: Record<
  WouldWorkAgainValue,
  { label: string; color: string } | null
> = {
  yes: { label: "Would work again", color: "#22C55E" },
  no: { label: "Would not work again", color: "#DC2626" },
  na: null,
};

// ─── Default / empty values ───────────────────────────────────────────────────

export function emptyCategory(): ReviewCategoryValue {
  return { score: null, notApplicable: false };
}

export function emptyCategoryRatings(): ReviewCategoryRatings {
  return Object.fromEntries(
    REVIEW_CATEGORY_KEYS.map((k) => [k, emptyCategory()]),
  ) as ReviewCategoryRatings;
}

export function naCategory(): ReviewCategoryValue {
  return { score: null, notApplicable: true };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Raw weighted average from category scores (1-5 scale).
 * N/A and null scores are excluded — they never count as 0.
 * `wouldWorkAgain` is NOT part of this calculation.
 */
export function getCalculatedOverallRating(categories: ReviewCategoryRatings): number | null {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const meta of REVIEW_CATEGORIES) {
    const cat = categories[meta.key];
    if (!cat || cat.notApplicable || cat.score == null) continue;
    totalWeightedScore += (cat.score / 5) * meta.weight;
    totalWeight += meta.weight;
  }

  if (totalWeight === 0) return null;
  return (totalWeightedScore / totalWeight) * 5;
}

/** @deprecated Use getCalculatedOverallRating instead */
export const computeCategoryAverage = getCalculatedOverallRating;

/**
 * Category average adjusted by red/green flag weights. Clamped to 0-5.
 */
export function getAdjustedOverallRating(
  categories: ReviewCategoryRatings,
  redFlags: string[],
  greenFlags: string[],
): number | null {
  const base = getCalculatedOverallRating(categories);
  if (base == null) return null;
  const adj = getFlagScoreAdjustment(redFlags, greenFlags);
  return Math.max(0, Math.min(5, base + adj.netAdjustment));
}

/**
 * Final published overall rating after flag adjustments and override rule:
 *   - If wouldWorkAgain === "no" → 0
 *   - Otherwise → category average + flag adjustments, clamped 0-5
 */
export function getFinalOverallRating(
  categories: ReviewCategoryRatings,
  wouldWorkAgain: WouldWorkAgainValue,
  redFlags: string[] = [],
  greenFlags: string[] = [],
): number {
  if (wouldWorkAgain === "no") return 0;
  return getAdjustedOverallRating(categories, redFlags, greenFlags) ?? 0;
}

/**
 * Explanation text for the overall rating display.
 */
export function getOverallRatingExplanation(
  categories: ReviewCategoryRatings,
  wouldWorkAgain: WouldWorkAgainValue,
  redFlags: string[] = [],
  greenFlags: string[] = [],
): string | null {
  if (wouldWorkAgain === "no") {
    return "Overall rating forced to 0 because \"Would Work With Them Again\" is set to No";
  }
  const avg = getCalculatedOverallRating(categories);
  if (avg == null) return null;
  if (redFlags.length > 0 || greenFlags.length > 0) {
    return "Adjusted by red and green flags";
  }
  return "Calculated from rated categories";
}

/**
 * Per-position star color: 1-2 = red, 3-4 = yellow, 5 = green.
 * Returns the inactive/muted color when the star is not filled.
 */
export function getStarColorByPosition(
  position: number,
  filled: boolean,
  mutedColor: string,
): string {
  if (!filled) return mutedColor;
  if (position <= 2) return "#DC2626";
  if (position <= 4) return "#F59E0B";
  return "#22C55E";
}

/**
 * Compute a 0-100 client score from category values (for weighted scoring).
 */
export function computeClientScore100(categories: ReviewCategoryRatings): number {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const meta of REVIEW_CATEGORIES) {
    const cat = categories[meta.key];
    if (!cat || cat.notApplicable || cat.score == null) continue;
    const normalized = (cat.score / 5) * 100;
    totalWeightedScore += (normalized * meta.weight) / 100;
    totalWeight += meta.weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round(totalWeightedScore / (totalWeight / 100));
}

/**
 * Aggregate multiple reviews' category ratings into a single average.
 * Each category is averaged only across reviews that have a numeric score for it.
 */
export function aggregateCategoryRatings(
  reviewsList: ReviewCategoryRatings[],
): ReviewCategoryRatings {
  const result = emptyCategoryRatings();
  if (reviewsList.length === 0) return result;

  for (const key of REVIEW_CATEGORY_KEYS) {
    const numericScores = reviewsList
      .map((r) => r[key])
      .filter((v) => v && !v.notApplicable && v.score != null)
      .map((v) => v.score as number);

    if (numericScores.length > 0) {
      result[key] = {
        score: numericScores.reduce((a, b) => a + b, 0) / numericScores.length,
        notApplicable: false,
      };
    } else {
      result[key] = naCategory();
    }
  }
  return result;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ReviewValidationError {
  field: string;
  message: string;
}

export function validateReviewRatings(
  ratings: ContractorClientReviewRatings,
): ReviewValidationError[] {
  const errors: ReviewValidationError[] = [];

  // overallRating is now auto-calculated; 0 is valid when wouldWorkAgain === "no"
  if (ratings.overallRating == null) {
    errors.push({ field: "overallRating", message: "Rate at least one category to generate an overall rating." });
  } else if (ratings.wouldWorkAgain !== "no" && (ratings.overallRating < 1 || ratings.overallRating > 5)) {
    errors.push({ field: "overallRating", message: "Rate at least one category to generate an overall rating." });
  }

  for (const meta of REVIEW_CATEGORIES) {
    const cat = ratings.categories[meta.key];
    if (!cat) {
      errors.push({ field: meta.key, message: `Rate "${meta.label}" or mark it N/A.` });
      continue;
    }
    if (cat.notApplicable) {
      if (cat.score != null) {
        errors.push({
          field: meta.key,
          message: `"${meta.label}" can't have a score and be N/A at the same time.`,
        });
      }
      continue;
    }
    if (cat.score == null || cat.score < 1 || cat.score > 5) {
      errors.push({ field: meta.key, message: `Rate "${meta.label}" (1-5) or mark it N/A.` });
    }
  }

  if (!["yes", "no", "na"].includes(ratings.wouldWorkAgain)) {
    errors.push({
      field: "wouldWorkAgain",
      message: 'Pick "Yes", "No", or "N/A" for Would Work Again.',
    });
  }

  return errors;
}

// ─── Legacy compatibility ─────────────────────────────────────────────────────

/** Old DB column names → new category keys */
const LEGACY_FIELD_MAP: Record<string, ReviewCategoryKey | null> = {
  ratingPaymentReliability: "paymentReliability",
  ratingCommunication: "communication",
  ratingScopeChanges: "scopeChanges",
  ratingPropertyRespect: "respectProfessionalism",
  ratingPermitPulling: "contractCompliance",
  ratingOverallJobExperience: "overallExperience",
  // Alternate legacy names from old UI / update route
  ratingPaidOnTime: "paymentReliability",
  ratingKnewWhatTheyWanted: "scopeChanges",
  ratingProfessionalism: "respectProfessionalism",
  ratingInvoiceAccuracy: "contractCompliance",
  ratingWouldWorkAgain: null, // Cannot map to a star category
  // 1:1 new keys (in case data already uses new format)
  paymentReliability: "paymentReliability",
  paymentTimeliness: "paymentTimeliness",
  scopeChanges: "scopeChanges",
  communication: "communication",
  decisionMaking: "decisionMaking",
  jobsiteConditions: "jobsiteConditions",
  respectProfessionalism: "respectProfessionalism",
  interference: "interference",
  contractCompliance: "contractCompliance",
  overallExperience: "overallExperience",
};

/**
 * Convert a flat legacy review row (old DB columns with int values)
 * into the new `ReviewCategoryRatings` structure.
 * Missing new categories get `{ score: null, notApplicable: true }`.
 */
export function legacyToCategories(row: Record<string, unknown>): ReviewCategoryRatings {
  const cats = emptyCategoryRatings();
  const seen = new Set<ReviewCategoryKey>();

  for (const [legacyKey, newKey] of Object.entries(LEGACY_FIELD_MAP)) {
    if (!newKey || seen.has(newKey)) continue;
    const val = row[legacyKey];
    if (typeof val === "number" && val >= 1 && val <= 5) {
      cats[newKey] = { score: val, notApplicable: false };
      seen.add(newKey);
    }
  }

  // Also check for new-format nested `categories` object
  const nested = row["categories"];
  if (nested && typeof nested === "object") {
    for (const key of REVIEW_CATEGORY_KEYS) {
      const v = (nested as Record<string, unknown>)[key];
      if (v && typeof v === "object") {
        const cv = v as { score?: unknown; notApplicable?: unknown };
        if (typeof cv.score === "number" || cv.notApplicable === true) {
          cats[key] = {
            score: typeof cv.score === "number" ? cv.score : null,
            notApplicable: cv.notApplicable === true,
          };
          seen.add(key);
        }
      }
    }
  }

  // Mark unmapped categories as N/A
  for (const key of REVIEW_CATEGORY_KEYS) {
    if (!seen.has(key)) {
      cats[key] = naCategory();
    }
  }

  return cats;
}

/**
 * Extract `wouldWorkAgain` from a legacy row.
 * Old data doesn't have this field; default to "na".
 */
export function legacyToWouldWorkAgain(row: Record<string, unknown>): WouldWorkAgainValue {
  const v = row["wouldWorkAgain"];
  if (v === "yes" || v === "no" || v === "na") return v;
  return "na";
}

/**
 * Convert new `ReviewCategoryRatings` into the flat old DB column format
 * for backward-compatible inserts / denormalized storage.
 */
export function categoriesToLegacyFlat(
  categories: ReviewCategoryRatings,
): Record<string, number> {
  return {
    ratingPaymentReliability: categories.paymentReliability?.score ?? 0,
    ratingCommunication: categories.communication?.score ?? 0,
    ratingScopeChanges: categories.scopeChanges?.score ?? 0,
    ratingPropertyRespect: categories.respectProfessionalism?.score ?? 0,
    ratingPermitPulling: categories.contractCompliance?.score ?? 0,
    ratingOverallJobExperience: categories.overallExperience?.score ?? 0,
  };
}

/**
 * Serialize the new-format categories + wouldWorkAgain as a JSON string
 * for storage in a single TEXT column alongside the legacy int columns.
 */
export function serializeNewCategories(
  categories: ReviewCategoryRatings,
  wouldWorkAgain: WouldWorkAgainValue,
  redFlags: string[] = [],
  greenFlags: string[] = [],
): string {
  const calculatedOverallRating = getCalculatedOverallRating(categories);
  const adjustedOverallRating = getAdjustedOverallRating(categories, redFlags, greenFlags);
  return JSON.stringify({ categories, wouldWorkAgain, calculatedOverallRating, adjustedOverallRating, redFlags, greenFlags });
}

/**
 * Deserialize new-format category data from a JSON TEXT column.
 * Returns null if the data is missing or malformed.
 */
export function deserializeNewCategories(
  json: string | null | undefined,
): { categories: ReviewCategoryRatings; wouldWorkAgain: WouldWorkAgainValue } | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (parsed?.categories && typeof parsed.categories === "object") {
      return {
        categories: parsed.categories,
        wouldWorkAgain: parsed.wouldWorkAgain ?? "na",
      };
    }
  } catch {
    // Corrupt data — fall through
  }
  return null;
}
