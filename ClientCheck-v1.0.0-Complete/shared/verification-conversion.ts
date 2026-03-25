/**
 * Customer identity verification paywall — stats, triggers, and risk thresholds.
 * Tune via EXPO_PUBLIC_* (client) or env on server if you later mirror stats from analytics.
 */

export type VerificationPaywallTrigger =
  | "submit_review_first_time"
  | "high_risk_flag"
  | "profile_viewed_by_contractor"
  | "manual";

const TRIGGER_VALUES: VerificationPaywallTrigger[] = [
  "submit_review_first_time",
  "high_risk_flag",
  "profile_viewed_by_contractor",
  "manual",
];

export function parseVerificationPaywallTriggerParam(
  raw: string | string[] | undefined,
): VerificationPaywallTrigger {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (s && TRIGGER_VALUES.includes(s as VerificationPaywallTrigger)) {
    return s as VerificationPaywallTrigger;
  }
  return "manual";
}

export type VerificationStats = {
  contractorPreferencePercent: number;
  /** Scarcity line; set env to "off" to hide in UI */
  verifiedCustomerPercent: number | null;
};

export function getVerificationStats(): VerificationStats {
  const env =
    typeof process !== "undefined" && process.env
      ? (process.env as Record<string, string | undefined>)
      : ({} as Record<string, string | undefined>);
  const contractorPreferencePercent = clampPercent(
    readNumberEnv(env.EXPO_PUBLIC_VERIFICATION_CONTRACTOR_PREF_PERCENT, 87),
  );
  const verifiedRaw = env.EXPO_PUBLIC_VERIFICATION_VERIFIED_CUSTOMERS_PERCENT;
  const verifiedCustomerPercent =
    verifiedRaw === undefined || verifiedRaw === ""
      ? 27
      : String(verifiedRaw).toLowerCase() === "off"
        ? null
        : clampPercent(readNumberEnv(String(verifiedRaw), 27));

  return {
    contractorPreferencePercent,
    verifiedCustomerPercent,
  };
}

function readNumberEnv(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function clampPercent(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * `customer_risk_scores.riskScore` is 0–100 where higher = safer (see risk-score-engine).
 * At or below this value is treated as elevated risk for paywall triggers.
 */
export const VERIFICATION_PAYWALL_HIGH_RISK_ENGINE_SCORE_MAX = 60;

export type VerificationPaywallExtra = {
  /** Reviews on the matched directory customer row */
  directoryReviewCount?: number;
  contractorProfileViewCount?: number;
  /** From `customer_risk_scores` / engine — higher = lower risk */
  riskScore?: number | null;
  /** `customers.riskLevel` (aggregate) */
  riskLevel?: "low" | "medium" | "high" | "unknown";
  /** `customer_risk_scores.riskLevel` */
  engineRiskLevel?: "critical" | "high" | "medium" | "low" | null;
  criticalRedFlagCount?: number;
};

/**
 * Central trigger evaluation. Extend `triggers` when adding new contexts.
 * Caller handles deduplication (session storage) and navigation.
 */
export function shouldShowVerificationPaywall(
  context: VerificationPaywallTrigger,
  user: { isVerified?: boolean; role?: string } | null | undefined,
  extra?: VerificationPaywallExtra,
): boolean {
  if (!user || user.isVerified) return false;
  if (user.role === "admin") return false;
  if (user.role !== "customer") return false;

  const engineScore = extra?.riskScore;
  const engineElevated =
    engineScore != null && engineScore <= VERIFICATION_PAYWALL_HIGH_RISK_ENGINE_SCORE_MAX;
  const dirHigh = extra?.riskLevel === "high";
  const engineLevel = extra?.engineRiskLevel;
  const engineLevelBad =
    engineLevel === "critical" || engineLevel === "high";
  const highRisk =
    engineElevated ||
    dirHigh ||
    engineLevelBad ||
    (extra?.criticalRedFlagCount ?? 0) >= 1;

  const triggers = [
    context === "submit_review_first_time" && (extra?.directoryReviewCount ?? 0) === 1,
    context === "high_risk_flag" && highRisk,
    context === "profile_viewed_by_contractor" && (extra?.contractorProfileViewCount ?? 0) > 2,
    context === "manual",
  ];

  return triggers.some(Boolean);
}
