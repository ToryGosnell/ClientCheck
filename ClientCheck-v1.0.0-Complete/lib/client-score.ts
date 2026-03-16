/**
 * Calculate client score (0-100) based on weighted review ratings
 * Hidden numerical values aggregate to visible score
 * Color-coded: Black (0-20) Not Recommended, Red (21-40) Warning, Yellow (41-70) Caution, Green (71-100) Good
 */

import { RATING_WEIGHTS, RATING_SCALE } from "@/shared/types";

export interface ClientScoreInput {
  ratingPaymentReliability?: number;
  ratingCommunication?: number;
  ratingScopeChanges?: number;
  ratingPropertyRespect?: number;
  ratingPermitPulling?: number;
  ratingOverallJobExperience?: number;
}

export interface ClientScoreResult {
  score: number;
  level: "not_recommended" | "warning" | "caution" | "good";
  color: string;
  description: string;
  breakdown: Record<string, number>; // Hidden numerical values
}

/**
 * Calculate weighted client score using hidden numerical values
 * Each category has a weight that contributes to the final score
 */
export function calculateClientScore(ratings: ClientScoreInput): ClientScoreResult {
  const breakdown: Record<string, number> = {};
  let totalWeightedScore = 0;
  let totalWeight = 0;

  // Process each rating category with its weight
  for (const [key, weight] of Object.entries(RATING_WEIGHTS)) {
    const ratingValue = (ratings as any)[key] || 0;
    
    if (ratingValue > 0) {
      // Convert 1-5 scale to 0-100 scale, then apply weight
      const normalizedValue = (ratingValue / RATING_SCALE) * 100;
      const weightedValue = (normalizedValue * weight) / 100;
      
      breakdown[key] = Math.round(normalizedValue);
      totalWeightedScore += weightedValue;
      totalWeight += weight;
    }
  }

  // Calculate final score
  let score = 0;
  if (totalWeight > 0) {
    score = Math.round(totalWeightedScore / (totalWeight / 100));
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine level and color
  let level: "not_recommended" | "warning" | "caution" | "good";
  let color: string;
  let description: string;

  if (score <= 20) {
    level = "not_recommended";
    color = "#1F2937"; // Black/Dark Gray
    description = "Not Recommended";
  } else if (score <= 40) {
    level = "warning";
    color = "#DC2626"; // Red
    description = "Red Flag Warning";
  } else if (score <= 70) {
    level = "caution";
    color = "#F59E0B"; // Yellow/Amber
    description = "Caution: Moderate Risk";
  } else {
    level = "good";
    color = "#22C55E"; // Green
    description = "Great Customer";
  }

  return {
    score,
    level,
    color,
    description,
    breakdown,
  };
}

export function getScoreLabel(score: number): string {
  if (score <= 20) return "Not Recommended";
  if (score <= 40) return "Red Flag";
  if (score <= 70) return "Caution";
  return "Great";
}

export function getScoreColor(score: number): string {
  if (score <= 20) return "#1F2937"; // Black/Dark Gray
  if (score <= 40) return "#DC2626"; // Red
  if (score <= 70) return "#F59E0B"; // Yellow
  return "#22C55E"; // Green
}
