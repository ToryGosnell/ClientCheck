import type { RiskLevel } from "@/shared/types";

export interface RiskScoreResult {
  level: RiskLevel;
  score: number;
  label: string;
  color: string;
  emoji: string;
  factors: string[];
}

/**
 * Computes a 0–100 risk score from customer data.
 * Higher score = higher risk.
 */
export function computeRiskScore(customer: {
  overallRating?: string | number | null;
  totalReviews?: number | null;
  reviewCount?: number | null;
  flagCount?: number | null;
  flaggedByContractors?: number | null;
  redFlags?: string | null;
  greenFlags?: string | null;
  ratingPaidOnTime?: string | number | null;
  ratingWouldWorkAgain?: string | null;
}): RiskScoreResult {
  const factors: string[] = [];
  let score = 50;

  const rating = parseFloat(String(customer.overallRating ?? "0"));
  const reviews = customer.totalReviews ?? customer.reviewCount ?? 0;
  const flags = customer.flagCount ?? 0;
  const flaggedBy = customer.flaggedByContractors ?? 0;
  const redFlagList = customer.redFlags?.split(",").filter(Boolean) ?? [];
  const greenFlagList = customer.greenFlags?.split(",").filter(Boolean) ?? [];
  const paidOnTime = parseFloat(String(customer.ratingPaidOnTime ?? "0"));

  if (rating > 0) {
    const ratingImpact = (5 - rating) * 12;
    score += ratingImpact;
    if (rating < 2.5) factors.push("Low overall rating");
    if (rating >= 4.0) factors.push("Strong overall rating");
  }

  if (paidOnTime > 0 && paidOnTime < 3) {
    score += 15;
    factors.push("Poor payment reliability");
  } else if (paidOnTime >= 4.5) {
    score -= 10;
    factors.push("Excellent payment history");
  }

  if (flags > 0) {
    score += flags * 8;
    factors.push(`${flags} red flag${flags > 1 ? "s" : ""} reported`);
  }

  if (flaggedBy > 1) {
    score += flaggedBy * 5;
    factors.push(`Flagged by ${flaggedBy} contractors`);
  }

  for (const flag of redFlagList) {
    const f = flag.trim().toLowerCase();
    if (f.includes("refused to pay") || f.includes("no-show")) score += 10;
    if (f.includes("threatened") || f.includes("false complaint")) score += 8;
  }

  if (greenFlagList.length > 0) {
    score -= greenFlagList.length * 5;
    if (greenFlagList.length >= 3) factors.push("Multiple positive signals");
  }

  if (customer.ratingWouldWorkAgain === "no") {
    score += 15;
    factors.push("Contractors would not work again");
  } else if (customer.ratingWouldWorkAgain === "yes") {
    score -= 10;
  }

  if (reviews === 0) {
    score = 50;
    factors.length = 0;
    factors.push("No reviews yet");
  } else if (reviews === 1) {
    score = Math.round(score * 0.7 + 50 * 0.3);
    factors.push("Limited data (1 review)");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let level: RiskLevel;
  let label: string;
  let color: string;
  let emoji: string;

  if (reviews === 0) {
    level = "unknown";
    label = "No Data";
    color = "#6b7280";
    emoji = "⚪";
  } else if (score >= 70) {
    level = "high";
    label = "High Risk";
    color = "#DC2626";
    emoji = "🔴";
  } else if (score >= 40) {
    level = "medium";
    label = "Caution";
    color = "#F59E0B";
    emoji = "🟡";
  } else {
    level = "low";
    label = "Low Risk";
    color = "#16A34A";
    emoji = "🟢";
  }

  return { level, score, label, color, emoji, factors };
}
