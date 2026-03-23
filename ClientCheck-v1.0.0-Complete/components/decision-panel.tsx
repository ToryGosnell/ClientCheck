import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import type { CustomerScoreResult } from "@/shared/customer-score";

interface Props {
  score: CustomerScoreResult;
  reviewCount: number;
  redFlagCount: number;
  wouldWorkAgainNoCount: number;
  /** Short bullets from recent verified reports (safe, factual tone) */
  recentIssues?: string[];
}

type VerdictHeadline = "Proceed" | "Proceed with caution" | "High risk";

function getJobVerdict(
  score: CustomerScoreResult,
  redFlagCount: number,
  wouldWorkAgainNoCount: number,
): {
  headline: VerdictHeadline;
  color: string;
  detail: string;
} {
  const neg = score.insights.filter((i) => i.type === "negative").length;
  const paymentWeak = score.breakdown.payment <= 15;
  const disputeStress = score.breakdown.disputes <= 10;

  const highRisk =
    score.score < 60 ||
    redFlagCount >= 3 ||
    wouldWorkAgainNoCount >= 3 ||
    neg >= 2 ||
    (paymentWeak && disputeStress) ||
    (paymentWeak && neg >= 1);

  if (highRisk) {
    return {
      headline: "High risk",
      color: "#ef4444",
      detail:
        "Verified contractor experiences and score drivers suggest elevated risk. Document scope, payment milestones, and read recent reports before committing.",
    };
  }

  const proceedClear =
    score.score >= 80 &&
    neg === 0 &&
    redFlagCount === 0 &&
    wouldWorkAgainNoCount === 0 &&
    !paymentWeak &&
    score.trend !== "declining";

  if (proceedClear) {
    return {
      headline: "Proceed",
      color: "#10b981",
      detail:
        "Score and verified reports look solid — still use your standard contracts, deposits, and job intake.",
    };
  }

  return {
    headline: "Proceed with caution",
    color: "#f59e0b",
    detail:
      "Mixed or shifting verified signals — tighten terms in writing, consider deposits, and review insight cards before you decide.",
  };
}

const RISK_ITEMS = [
  {
    check: (p: Props) => p.redFlagCount >= 3,
    text: "Several verified reports include red-flag tags",
    severity: "high" as const,
  },
  {
    check: (p: Props) => p.wouldWorkAgainNoCount >= 2,
    text: "Multiple contractors selected “would not work again”",
    severity: "high" as const,
  },
  {
    check: (p: Props) => p.score.breakdown.payment <= 15,
    text: "Payment behavior section scores low vs max points",
    severity: "high" as const,
  },
  {
    check: (p: Props) => p.score.breakdown.disputes <= 10,
    text: "Dispute-related points reduced — review dispute history if any",
    severity: "medium" as const,
  },
  {
    check: (p: Props) => p.reviewCount <= 2,
    text: "Limited number of verified reports on file",
    severity: "low" as const,
  },
  {
    check: (p: Props) => p.score.trend === "declining",
    text: "Trend: newer verified reports average lower than older ones",
    severity: "medium" as const,
  },
];

const SEV_STYLE = {
  high: { color: "#ef4444", bg: "#ef444414", icon: "⚠" },
  medium: { color: "#f59e0b", bg: "#f59e0b14", icon: "●" },
  low: { color: "#6b7280", bg: "#6b728014", icon: "○" },
};

const TREND_LABEL: Record<string, string> = {
  improving: "Improving",
  stable: "Stable",
  declining: "Declining",
  new: "New data",
};

export function DecisionPanel(props: Props) {
  const colors = useColors();
  const { score, reviewCount, redFlagCount, wouldWorkAgainNoCount, recentIssues = [] } = props;

  if (reviewCount === 0) return null;

  const verdict = getJobVerdict(score, redFlagCount, wouldWorkAgainNoCount);
  const risks = RISK_ITEMS.filter((r) => r.check(props));
  const trendLabel = TREND_LABEL[score.trend] ?? score.trend;

  return (
    <View style={[st.card, { backgroundColor: colors.surface, borderColor: "rgba(255,255,255,0.06)" }]}>
      <View style={[st.verdictBanner, { backgroundColor: verdict.color + "14", borderColor: verdict.color + "55" }]}>
        <Text style={[st.verdictLabel, { color: colors.muted }]}>Recommendation</Text>
        <Text style={[st.verdictHeadline, { color: verdict.color }]}>{verdict.headline}</Text>
      </View>

      <Text style={[st.title, { color: colors.foreground }]}>Would you take this job?</Text>
      <Text style={[st.subtitle, { color: colors.muted }]}>
        Quick read for contractors — from the same verified reports as the customer score (not legal advice).
      </Text>

      <View style={st.summaryRow}>
        <View style={[st.scoreBox, { borderColor: verdict.color }]}>
          <Text style={[st.scoreBoxNum, { color: verdict.color }]}>{score.score}</Text>
        </View>
        <View style={st.summaryMeta}>
          <Text style={[st.summaryLabel, { color: verdict.color }]}>{score.label}</Text>
          <Text style={[st.summaryDetail, { color: colors.muted }]}>
            {reviewCount} verified {reviewCount === 1 ? "report" : "reports"}
            {score.trend !== "new" ? ` · Trend: ${trendLabel}` : ""}
            {score.trendDelta !== 0 && score.trend !== "new"
              ? ` (${score.trendDelta > 0 ? "+" : ""}${score.trendDelta}%)`
              : ""}
          </Text>
        </View>
      </View>

      {recentIssues.length > 0 && (
        <View style={st.recentSection}>
          <Text style={[st.riskTitle, { color: colors.foreground }]}>Recent issues (verified reports)</Text>
          {recentIssues.slice(0, 4).map((line, i) => (
            <View key={i} style={[st.recentRow, { backgroundColor: "rgba(255,255,255,0.04)" }]}>
              <Text style={[st.recentBullet, { color: colors.muted }]}>•</Text>
              <Text style={[st.recentText, { color: colors.muted }]}>{line}</Text>
            </View>
          ))}
        </View>
      )}

      {risks.length > 0 && (
        <View style={st.riskSection}>
          <Text style={[st.riskTitle, { color: colors.foreground }]}>Key risks</Text>
          {risks.map((r, i) => {
            const sv = SEV_STYLE[r.severity];
            return (
              <View key={i} style={[st.riskRow, { backgroundColor: sv.bg }]}>
                <Text style={[st.riskIcon, { color: sv.color }]}>{sv.icon}</Text>
                <Text style={[st.riskText, { color: sv.color }]}>{r.text}</Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={[st.recBox, { backgroundColor: verdict.color + "0C", borderColor: verdict.color + "33" }]}>
        <Text style={[st.recLabel, { color: verdict.color }]}>Why this verdict</Text>
        <Text style={[st.recText, { color: verdict.color }]}>{verdict.detail}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },

  verdictBanner: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    alignItems: "center",
  },
  verdictLabel: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  verdictHeadline: { fontSize: 22, fontWeight: "900", letterSpacing: -0.4 },

  title: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 11, lineHeight: 16, marginTop: 4, marginBottom: 14 },

  summaryRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  scoreBox: { width: 56, height: 56, borderRadius: 14, borderWidth: 2.5, alignItems: "center", justifyContent: "center" },
  scoreBoxNum: { fontSize: 22, fontWeight: "900" },
  summaryMeta: { flex: 1, gap: 4 },
  summaryLabel: { fontSize: 16, fontWeight: "800" },
  summaryDetail: { fontSize: 12, lineHeight: 17 },

  recentSection: { gap: 8, marginBottom: 14 },
  recentRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  recentBullet: { fontSize: 14, lineHeight: 18 },
  recentText: { fontSize: 12, lineHeight: 17, flex: 1 },

  riskSection: { gap: 6, marginBottom: 14 },
  riskTitle: { fontSize: 12, fontWeight: "800", marginBottom: 2 },
  riskRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  riskIcon: { fontSize: 11, fontWeight: "800" },
  riskText: { fontSize: 12, fontWeight: "600", flex: 1 },

  recBox: { borderWidth: 1, borderRadius: 12, padding: 14 },
  recLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  recText: { fontSize: 13, fontWeight: "600", lineHeight: 19 },
});
