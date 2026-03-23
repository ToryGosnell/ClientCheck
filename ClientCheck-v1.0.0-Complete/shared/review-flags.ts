/**
 * Centralized weighted flag definitions for the review system.
 * All UI, scoring, summaries, and admin screens pull from this single source.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type FlagSeverity = "normal" | "critical" | "major_negative" | "positive";

export type FlagCategory = "red" | "green";

export interface WeightedFlag {
  value: string;
  label: string;
  severity: FlagSeverity;
  weight: number;
  category: FlagCategory;
  sortOrder: number;
}

// ─── Red Flags ───────────────────────────────────────────────────────────────

export const RED_FLAG_VALUES = [
  "doesntPayDeposits",
  "lateSlowPayment",
  "disputesInvoices",
  "scopeCreep",
  "refusesChangeOrders",
  "micromanagesWork",
  "unrealisticExpectations",
  "poorCommunication",
  "delaysDecisions",
  "jobsiteNotReady",
  "unsafeWorkConditions",
  "threatensBadReviews",
  "threatensLegalAction",
  "doNotWorkWith",
  "nonPayerRisk",
  "chargebackRisk",
  "lawsuitThreat",
] as const;

export type RedFlagValue = (typeof RED_FLAG_VALUES)[number];

export const RED_FLAGS: WeightedFlag[] = [
  // Normal severity
  { value: "doesntPayDeposits", label: "Doesn't Pay Deposits", severity: "normal", weight: 0.15, category: "red", sortOrder: 10 },
  { value: "lateSlowPayment", label: "Late / Slow Payment", severity: "normal", weight: 0.15, category: "red", sortOrder: 11 },
  { value: "scopeCreep", label: "Scope Creep", severity: "normal", weight: 0.15, category: "red", sortOrder: 20 },
  { value: "refusesChangeOrders", label: "Refuses Change Orders", severity: "normal", weight: 0.15, category: "red", sortOrder: 21 },
  { value: "micromanagesWork", label: "Micromanages Work", severity: "normal", weight: 0.15, category: "red", sortOrder: 30 },
  { value: "unrealisticExpectations", label: "Unrealistic Expectations", severity: "normal", weight: 0.15, category: "red", sortOrder: 31 },
  { value: "poorCommunication", label: "Poor Communication", severity: "normal", weight: 0.15, category: "red", sortOrder: 32 },
  { value: "delaysDecisions", label: "Delays Decisions", severity: "normal", weight: 0.15, category: "red", sortOrder: 33 },
  { value: "jobsiteNotReady", label: "Jobsite Not Ready", severity: "normal", weight: 0.15, category: "red", sortOrder: 34 },

  // Critical severity
  { value: "disputesInvoices", label: "Disputes Invoices", severity: "critical", weight: 0.35, category: "red", sortOrder: 40 },
  { value: "unsafeWorkConditions", label: "Unsafe Work Conditions", severity: "critical", weight: 0.35, category: "red", sortOrder: 41 },
  { value: "threatensBadReviews", label: "Threatens Bad Reviews", severity: "critical", weight: 0.35, category: "red", sortOrder: 42 },
  { value: "threatensLegalAction", label: "Threatens Legal Action", severity: "critical", weight: 0.35, category: "red", sortOrder: 43 },

  // Major negative (high-impact)
  { value: "nonPayerRisk", label: "Non-Payer Risk", severity: "major_negative", weight: 0.75, category: "red", sortOrder: 50 },
  { value: "chargebackRisk", label: "Chargeback Risk", severity: "major_negative", weight: 0.75, category: "red", sortOrder: 51 },
  { value: "lawsuitThreat", label: "Lawsuit Threat", severity: "major_negative", weight: 0.75, category: "red", sortOrder: 52 },
  { value: "doNotWorkWith", label: "Do Not Work With", severity: "major_negative", weight: 0.75, category: "red", sortOrder: 53 },
];

// ─── Green Flags ─────────────────────────────────────────────────────────────

export const GREEN_FLAG_VALUES = [
  "paysOnTime",
  "respectsScope",
  "approvesChangeOrders",
  "communicatesClearly",
  "quickDecisionMaker",
  "jobsiteReady",
  "respectfulToCrew",
  "easyToWorkWith",
  "contractHonoring",
  "wouldWorkAgainPositive",
] as const;

export type GreenFlagValue = (typeof GREEN_FLAG_VALUES)[number];

export const GREEN_FLAGS: WeightedFlag[] = [
  { value: "paysOnTime", label: "Pays On Time", severity: "positive", weight: 0.18, category: "green", sortOrder: 10 },
  { value: "respectsScope", label: "Respects Scope", severity: "positive", weight: 0.18, category: "green", sortOrder: 11 },
  { value: "approvesChangeOrders", label: "Approves Change Orders", severity: "positive", weight: 0.18, category: "green", sortOrder: 12 },
  { value: "communicatesClearly", label: "Communicates Clearly", severity: "positive", weight: 0.18, category: "green", sortOrder: 13 },
  { value: "quickDecisionMaker", label: "Quick Decision Maker", severity: "positive", weight: 0.18, category: "green", sortOrder: 14 },
  { value: "jobsiteReady", label: "Jobsite Ready", severity: "positive", weight: 0.18, category: "green", sortOrder: 15 },
  { value: "respectfulToCrew", label: "Respectful To Crew", severity: "positive", weight: 0.18, category: "green", sortOrder: 16 },
  { value: "easyToWorkWith", label: "Easy To Work With", severity: "positive", weight: 0.18, category: "green", sortOrder: 17 },
  { value: "contractHonoring", label: "Honors Agreement", severity: "positive", weight: 0.18, category: "green", sortOrder: 18 },
  { value: "wouldWorkAgainPositive", label: "Would Gladly Work With Again", severity: "positive", weight: 0.18, category: "green", sortOrder: 19 },
];

// ─── Lookup maps ─────────────────────────────────────────────────────────────

export const ALL_FLAGS: WeightedFlag[] = [...RED_FLAGS, ...GREEN_FLAGS];

export const FLAG_MAP: Record<string, WeightedFlag> = Object.fromEntries(
  ALL_FLAGS.map((f) => [f.value, f]),
);

export const RED_FLAG_MAP: Record<string, WeightedFlag> = Object.fromEntries(
  RED_FLAGS.map((f) => [f.value, f]),
);

export const GREEN_FLAG_MAP: Record<string, WeightedFlag> = Object.fromEntries(
  GREEN_FLAGS.map((f) => [f.value, f]),
);

// ─── Display helpers ─────────────────────────────────────────────────────────

export function sortFlagsForDisplay(flags: WeightedFlag[]): WeightedFlag[] {
  return [...flags].sort((a, b) => {
    const severityOrder: Record<FlagSeverity, number> = {
      major_negative: 0,
      critical: 1,
      normal: 2,
      positive: 3,
    };
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return a.sortOrder - b.sortOrder;
  });
}

export function getFlagLabel(value: string): string {
  return FLAG_MAP[value]?.label ?? value;
}

export function isCriticalFlag(value: string): boolean {
  const flag = FLAG_MAP[value];
  return flag?.severity === "critical" || flag?.severity === "major_negative";
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface FlagScoreAdjustment {
  redPenalty: number;
  greenBonus: number;
  netAdjustment: number;
}

export function getFlagScoreAdjustment(
  redFlags: string[],
  greenFlags: string[],
): FlagScoreAdjustment {
  let redPenalty = 0;
  for (const val of redFlags) {
    const flag = RED_FLAG_MAP[val];
    if (flag) redPenalty += flag.weight;
  }

  let greenBonus = 0;
  for (const val of greenFlags) {
    const flag = GREEN_FLAG_MAP[val];
    if (flag) greenBonus += flag.weight;
  }

  return {
    redPenalty,
    greenBonus,
    netAdjustment: greenBonus - redPenalty,
  };
}

// ─── Serialization ───────────────────────────────────────────────────────────

export function serializeFlags(redFlags: string[], greenFlags: string[]): string {
  return JSON.stringify({ redFlags, greenFlags });
}

export function parseFlags(
  flagsStr: string | null | undefined,
): { redFlags: string[]; greenFlags: string[] } {
  if (!flagsStr) return { redFlags: [], greenFlags: [] };

  // New JSON format
  if (flagsStr.startsWith("{")) {
    try {
      const parsed = JSON.parse(flagsStr);
      return {
        redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
        greenFlags: Array.isArray(parsed.greenFlags) ? parsed.greenFlags : [],
      };
    } catch {
      return { redFlags: [], greenFlags: [] };
    }
  }

  // Legacy comma-separated format (old red flags only)
  const legacy = flagsStr.split(",").filter(Boolean);
  return {
    redFlags: mapLegacyFlags(legacy),
    greenFlags: [],
  };
}

// ─── Legacy Compatibility ────────────────────────────────────────────────────

const LEGACY_FLAG_MAP: Record<string, string> = {
  scope_creep: "scopeCreep",
  no_deposits: "doesntPayDeposits",
  micromanages: "micromanagesWork",
  refuses_change_orders: "refusesChangeOrders",
  disputes_invoices: "disputesInvoices",
};

export function mapLegacyFlags(oldFlags: string[]): string[] {
  return oldFlags
    .map((f) => LEGACY_FLAG_MAP[f] ?? f)
    .filter((f) => f in RED_FLAG_MAP || f in GREEN_FLAG_MAP);
}
