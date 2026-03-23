/**
 * Calculate client score (0-100) based on weighted review ratings.
 * Supports both the new ReviewCategoryRatings format and legacy flat fields.
 */

import {
  type ReviewCategoryRatings,
  computeClientScore100,
  legacyToCategories,
} from "@/shared/review-categories";

export interface ClientScoreInput {
  // Legacy flat fields
  ratingPaymentReliability?: number;
  ratingCommunication?: number;
  ratingScopeChanges?: number;
  ratingPropertyRespect?: number;
  ratingPermitPulling?: number;
  ratingOverallJobExperience?: number;
  // New structured categories (takes precedence if present)
  categories?: ReviewCategoryRatings;
}

export interface ClientScoreResult {
  score: number;
  level: "not_recommended" | "warning" | "caution" | "good";
  color: string;
  description: string;
  breakdown: Record<string, number>;
}

export function calculateClientScore(ratings: ClientScoreInput): ClientScoreResult {
  const categories: ReviewCategoryRatings =
    ratings.categories ?? legacyToCategories(ratings as Record<string, unknown>);

  const score = Math.max(0, Math.min(100, computeClientScore100(categories)));

  const breakdown: Record<string, number> = {};
  for (const [key, val] of Object.entries(categories)) {
    if (val && !val.notApplicable && val.score != null) {
      breakdown[key] = Math.round((val.score / 5) * 100);
    }
  }

  let level: ClientScoreResult["level"];
  let color: string;
  let description: string;

  if (score <= 20) {
    level = "not_recommended";
    color = "#1F2937";
    description = "Not Recommended";
  } else if (score <= 40) {
    level = "warning";
    color = "#DC2626";
    description = "Red Flag Warning";
  } else if (score <= 70) {
    level = "caution";
    color = "#F59E0B";
    description = "Caution: Moderate Risk";
  } else {
    level = "good";
    color = "#22C55E";
    description = "Great Customer";
  }

  return { score, level, color, description, breakdown };
}

export function getScoreLabel(score: number): string {
  if (score <= 20) return "Not Recommended";
  if (score <= 40) return "Red Flag";
  if (score <= 70) return "Caution";
  return "Great";
}

export function getScoreColor(score: number): string {
  if (score <= 20) return "#1F2937";
  if (score <= 40) return "#DC2626";
  if (score <= 70) return "#F59E0B";
  return "#22C55E";
}
