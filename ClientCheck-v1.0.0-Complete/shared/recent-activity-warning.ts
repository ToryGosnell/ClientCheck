/**
 * Client-only copy + priority for the profile “Recent activity” banner.
 * Uses existing computeCustomerScore with filtered reviews (presentation / urgency only).
 */

import { computeCustomerScore, type ScoreInput } from "./customer-score";

const SEVEN_D_MS = 7 * 24 * 60 * 60 * 1000;

export type RecentActivitySeverity = "standard" | "medium" | "high";

export interface RecentActivityWarning {
  message: string;
  severity: RecentActivitySeverity;
}

type ReviewLike = {
  overallRating?: number | null;
  ratingPaymentReliability?: number | null;
  createdAt: string | Date;
  redFlags?: string | null;
};

type DisputeLike = {
  createdAt: string | Date;
  status?: string | null;
};

function toScoreInputs(reviews: ReviewLike[]): ScoreInput["reviews"] {
  return reviews.map((r) => ({
    overallRating: r.overallRating ?? 0,
    ratingPaymentReliability: r.ratingPaymentReliability ?? 3,
    createdAt: r.createdAt,
    redFlags: r.redFlags ?? null,
  }));
}

function disputeResolved(d: DisputeLike): boolean {
  return d.status === "resolved";
}

/**
 * Single highest-priority line: disputes (last 7d) > score pullback from new reports > new report count.
 */
export function getRecentActivityWarning(
  reviews: ReviewLike[],
  disputes: DisputeLike[] | null | undefined,
  isAuthenticated: boolean,
): RecentActivityWarning | null {
  const now = Date.now();
  const cutoff = now - SEVEN_D_MS;

  const disputeList = disputes ?? [];
  const recentDisputes = disputeList.filter((d) => new Date(d.createdAt).getTime() >= cutoff);

  if (isAuthenticated && recentDisputes.length >= 1) {
    const severity: RecentActivitySeverity =
      recentDisputes.length >= 2 ? "high" : "medium";
    const message =
      recentDisputes.length === 1
        ? "Recent dispute filed — review this profile before you schedule or start work."
        : `${recentDisputes.length} disputes filed in the last 7 days — review details on this profile before you commit.`;
    return { message, severity };
  }

  const dCount = disputeList.length;
  const dResolved = disputeList.filter(disputeResolved).length;

  const mapped = toScoreInputs(reviews);
  const olderOnly = mapped.filter((r) => new Date(r.createdAt).getTime() < cutoff);

  if (olderOnly.length >= 1 && mapped.length > olderOnly.length) {
    const full = computeCustomerScore({
      reviews: mapped,
      disputeCount: dCount,
      disputesResolvedForCustomer: dResolved,
    });
    const withoutRecent = computeCustomerScore({
      reviews: olderOnly,
      disputeCount: dCount,
      disputesResolvedForCustomer: dResolved,
    });
    const drop = withoutRecent.score - full.score;
    if (drop >= 3) {
      const rounded = Math.round(drop);
      let severity: RecentActivitySeverity = "standard";
      if (rounded >= 12) severity = "high";
      else if (rounded >= 6) severity = "medium";
      return {
        severity,
        message: `Score dropped about ${rounded} points in the last 7 days as new verified reports were added — check recent activity.`,
      };
    }
  }

  const newIn7d = reviews.filter((r) => new Date(r.createdAt).getTime() >= cutoff).length;
  if (newIn7d >= 1) {
    const severity: RecentActivitySeverity = newIn7d >= 2 ? "medium" : "standard";
    const message =
      newIn7d === 1
        ? "1 new report in the last 7 days — review before your next job."
        : `${newIn7d} new reports in the last 7 days — review before your next job.`;
    return { message, severity };
  }

  return null;
}
