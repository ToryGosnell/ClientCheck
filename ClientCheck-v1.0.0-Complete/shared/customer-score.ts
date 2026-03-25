/**
 * Customer Score — 0–100 score based on aggregated contractor review data.
 *
 * Categories:
 *   Payment Behavior   (40 pts)
 *   Review Ratings      (25 pts)
 *   Disputes            (20 pts)
 *   Review Volume       (10 pts)
 *   Recent Activity      (5 pts)
 */

export interface ScoreBreakdown {
  payment: number;
  rating: number;
  disputes: number;
  volume: number;
  recency: number;
}

export type ScoreTrend = "improving" | "declining" | "stable" | "new";

/** For insight card ordering only (presentation). */
export type InsightTopic = "payment" | "disputes" | "risk" | "trend" | "volume";

export interface ScoreInsight {
  type: "positive" | "negative" | "neutral";
  text: string;
  topic?: InsightTopic;
}

export type PrimaryStatementTone = "critical" | "caution" | "positive";

export interface CustomerScoreResult {
  score: number;
  label: string;
  breakdown: ScoreBreakdown;
  trend: ScoreTrend;
  trendDelta: number;
  insights: ScoreInsight[];
  /** Single high-priority line for profile UI (derived from existing breakdown/trend/label). */
  primaryStatement: string;
  primaryStatementTone: PrimaryStatementTone;
}

export interface ScoreInput {
  reviews: Array<{
    overallRating: number;
    /** Omit from payment subscore when null (N/A). */
    ratingPaymentReliability: number | null;
    createdAt: string | Date;
    redFlags?: string | null;
  }>;
  disputeCount: number;
  disputesResolvedForCustomer: number;
}

const RECENCY_WINDOW_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Reliable";
  if (score >= 60) return "Mixed Feedback";
  return "High Risk Activity";
}

export function computeCustomerScore(input: ScoreInput): CustomerScoreResult {
  const { reviews, disputeCount, disputesResolvedForCustomer } = input;
  const reviewCount = reviews.length;

  if (reviewCount === 0) {
    return {
      score: 0,
      label: "No Data",
      breakdown: { payment: 0, rating: 0, disputes: 20, volume: 0, recency: 0 },
      trend: "new" as const,
      trendDelta: 0,
      insights: [],
      primaryStatement: "No verified reports yet — score will populate as contractors contribute.",
      primaryStatementTone: "caution",
    };
  }

  // ── 1. Payment Behavior (0–40) ──────────────────────────────────────────
  let paymentRaw = 0;
  for (const r of reviews) {
    const pr = r.ratingPaymentReliability;
    if (pr != null && pr >= 1 && pr <= 5) {
      if (pr >= 4) {
        paymentRaw += 5; // paid_on_time
      } else if (pr >= 2) {
        paymentRaw -= 10; // late_payment
      } else if (pr >= 1) {
        paymentRaw -= 25; // non_payment
      }
    }

    const flags = (r.redFlags ?? "").toLowerCase();
    if (flags.includes("refused to pay") || flags.includes("non-payment")) {
      paymentRaw -= 25;
    }
  }
  const paymentBase = 40;
  const payment = clamp(paymentBase + paymentRaw, 0, 40);

  // ── 2. Review Ratings (0–25) ────────────────────────────────────────────
  const avgRating =
    reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviewCount;
  const rating = clamp((avgRating / 5) * 25, 0, 25);

  // ── 3. Disputes (0–20) ──────────────────────────────────────────────────
  let disputeRaw = 20;
  disputeRaw -= disputeCount * 5;
  disputeRaw += disputesResolvedForCustomer * 2;
  const disputes = clamp(disputeRaw, 0, 20);

  // ── 4. Review Volume (0–10) ─────────────────────────────────────────────
  let volume: number;
  if (reviewCount >= 6) volume = 10;
  else if (reviewCount >= 3) volume = 7;
  else volume = 5;

  // ── 5. Recency (0–5) ───────────────────────────────────────────────────
  const now = Date.now();
  const recentReviews = reviews.filter(
    (r) => now - new Date(r.createdAt).getTime() < RECENCY_WINDOW_MS,
  );
  let recency = 0;
  if (recentReviews.length > 0) {
    const avgRecent =
      recentReviews.reduce((s, r) => s + r.overallRating, 0) / recentReviews.length;
    recency = avgRecent >= 3.5 ? 5 : -5;
  }
  recency = clamp(recency + 5, 0, 5);

  // ── Final ───────────────────────────────────────────────────────────────
  const score = clamp(payment + rating + disputes + volume + recency, 0, 100);

  // ── Trend ──────────────────────────────────────────────────────────────
  const { trend, trendDelta } = computeTrend(reviews);

  // ── Insights (topics + sort for UI priority; does not change point math) ─
  const rawInsights = generateInsights(score, payment, rating, disputes, disputeCount, volume, reviewCount, avgRating, trend);
  const seen = new Set<string>();
  const deduped = rawInsights.filter((i) => {
    if (seen.has(i.text)) return false;
    seen.add(i.text);
    return true;
  });
  const insights = sortInsightsByPriority(deduped);
  const primary = derivePrimaryStatement(score, { payment, rating, disputes, volume, recency }, trend, getScoreLabel(score));

  return {
    score,
    label: getScoreLabel(score),
    breakdown: { payment, rating, disputes, volume, recency },
    trend,
    trendDelta,
    insights,
    primaryStatement: primary.text,
    primaryStatementTone: primary.tone,
  };
}

function computeTrend(
  reviews: ScoreInput["reviews"],
): { trend: ScoreTrend; trendDelta: number } {
  if (reviews.length < 2) return { trend: "new", trendDelta: 0 };

  const sorted = [...reviews].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const mid = Math.floor(sorted.length / 2);
  const olderHalf = sorted.slice(0, mid);
  const newerHalf = sorted.slice(mid);

  const avgOld =
    olderHalf.reduce((s, r) => s + r.overallRating, 0) / Math.max(olderHalf.length, 1);
  const avgNew =
    newerHalf.reduce((s, r) => s + r.overallRating, 0) / Math.max(newerHalf.length, 1);
  const delta = Math.round((avgNew - avgOld) * 10);

  if (delta >= 3) return { trend: "improving", trendDelta: delta };
  if (delta <= -3) return { trend: "declining", trendDelta: delta };
  return { trend: "stable", trendDelta: delta };
}

const TOPIC_ORDER: Record<InsightTopic, number> = {
  payment: 1,
  disputes: 2,
  risk: 3,
  trend: 4,
  volume: 5,
};

const TYPE_ORDER: Record<ScoreInsight["type"], number> = {
  negative: 0,
  neutral: 1,
  positive: 2,
};

function sortInsightsByPriority(list: ScoreInsight[]): ScoreInsight[] {
  const ranked = [...list].sort((a, b) => {
    const ta = a.topic ? TOPIC_ORDER[a.topic] : 99;
    const tb = b.topic ? TOPIC_ORDER[b.topic] : 99;
    if (ta !== tb) return ta - tb;
    return TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
  });
  return ranked.slice(0, 6);
}

/** One-line priority signal for profile header (uses same breakdown/trend as score; presentation only). */
function derivePrimaryStatement(
  score: number,
  breakdown: ScoreBreakdown,
  trend: ScoreTrend,
  label: string,
): { text: string; tone: PrimaryStatementTone } {
  if (breakdown.payment <= 15) {
    return {
      text: "Top signal: payment reliability concerns in verified contractor experiences.",
      tone: "critical",
    };
  }
  if (breakdown.disputes <= 10) {
    return {
      text: "Top signal: dispute activity on file — review outcomes before you commit.",
      tone: "critical",
    };
  }
  if (breakdown.payment <= 25) {
    return {
      text: "Watch: some verified reports mention payment timing — lock terms in writing.",
      tone: "caution",
    };
  }
  if (breakdown.disputes <= 14) {
    return {
      text: "Note: disputes present — confirm status; some items may be under review.",
      tone: "caution",
    };
  }
  if (trend === "declining" && score < 75) {
    return {
      text: "Trajectory: newer verified reports are softer than older ones.",
      tone: "caution",
    };
  }
  if (score >= 80 && breakdown.payment >= 35) {
    return {
      text: "Strong signal: payment and ratings look solid in verified contractor experiences.",
      tone: "positive",
    };
  }
  if (label === "Reliable") {
    return {
      text: "Verified contractor experiences skew dependable on this profile.",
      tone: "positive",
    };
  }
  if (label === "Mixed Feedback") {
    return {
      text: "Mixed verified signals — scan breakdown and recent reports before you decide.",
      tone: "caution",
    };
  }
  return {
    text: "Elevated caution in verified reports — read details before taking the job.",
    tone: "critical",
  };
}

function generateInsights(
  score: number,
  payment: number,
  rating: number,
  disputes: number,
  disputeCount: number,
  volume: number,
  reviewCount: number,
  avgRating: number,
  trend: ScoreTrend,
): ScoreInsight[] {
  const insights: ScoreInsight[] = [];

  if (payment >= 35) {
    insights.push({
      type: "positive",
      topic: "payment",
      text: "Verified reports describe reliable payment behavior on recent jobs.",
    });
  } else if (payment <= 25 && payment > 15) {
    insights.push({
      type: "neutral",
      topic: "payment",
      text: "Some verified reports mention payment delays — confirm terms before you start.",
    });
  } else if (payment <= 15) {
    insights.push({
      type: "negative",
      topic: "payment",
      text: "Several verified reports cite payment issues; use clear contracts and milestones.",
    });
  }

  if (avgRating >= 4.0) {
    insights.push({
      type: "positive",
      topic: "risk",
      text: `Strong average rating (${avgRating.toFixed(1)}) across ${reviewCount} verified reports.`,
    });
  } else if (avgRating > 0 && avgRating < 2.5) {
    insights.push({
      type: "negative",
      topic: "risk",
      text: `Lower average stars (${avgRating.toFixed(1)}) — read individual verified reports for context.`,
    });
  }

  if (disputeCount > 0 && disputes >= 15) {
    insights.push({
      type: "neutral",
      topic: "disputes",
      text: `${disputeCount} dispute(s) on file; several were resolved through the dispute process.`,
    });
  } else if (disputeCount === 1 || disputeCount === 2) {
    insights.push({
      type: "neutral",
      topic: "disputes",
      text: `Recent dispute activity (${disputeCount}) — some matters may still be under review.`,
    });
  } else if (disputeCount > 2) {
    insights.push({
      type: "negative",
      topic: "disputes",
      text: `Multiple disputes filed — review dispute threads and verified reports for patterns.`,
    });
  }

  if (reviewCount >= 5) {
    insights.push({
      type: "positive",
      topic: "volume",
      text: "Multiple independent contractor reports increase confidence in this score.",
    });
  } else if (reviewCount >= 3) {
    insights.push({
      type: "neutral",
      topic: "volume",
      text: "Growing number of verified reports — weigh alongside your own intake.",
    });
  } else if (reviewCount <= 2) {
    insights.push({
      type: "neutral",
      topic: "volume",
      text: "Fewer verified reports on file — treat the score as directional, not final.",
    });
  }

  if (trend === "improving") {
    insights.push({
      type: "positive",
      topic: "trend",
      text: "Recent positive trend: newer verified reports average higher than older ones.",
    });
  } else if (trend === "declining") {
    insights.push({
      type: "negative",
      topic: "trend",
      text: "Recent trend: newer verified reports average lower than older ones.",
    });
  } else if (trend === "stable" && reviewCount >= 4) {
    insights.push({
      type: "neutral",
      topic: "trend",
      text: "Ratings stable across older vs newer verified reports.",
    });
  }

  return insights;
}

export const SCORE_CATEGORIES = [
  {
    key: "payment" as const,
    label: "Payment Behavior",
    max: 40,
    /** Always-visible short line in UI */
    helper: "Earned from payment reliability fields in verified contractor reports (on-time, delays, disputes).",
  },
  {
    key: "rating" as const,
    label: "Review Ratings",
    max: 25,
    helper: "Earned from average stars across all verified reports on this profile.",
  },
  {
    key: "disputes" as const,
    label: "Disputes",
    max: 20,
    helper: "Adjusted for disputes filed and outcomes; open items may still be under review.",
  },
  {
    key: "volume" as const,
    label: "Review Volume",
    max: 10,
    helper: "More independent contractor reports mean a more stable score (capped at this band).",
  },
  {
    key: "recency" as const,
    label: "Recent Activity",
    max: 5,
    helper: "Small weight for how recent verified reports look vs the rest of the history.",
  },
] as const;
