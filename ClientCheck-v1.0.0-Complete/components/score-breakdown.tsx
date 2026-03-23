import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  SCORE_CATEGORIES,
  type CustomerScoreResult,
  type ScoreTrend,
  type ScoreInsight,
  type PrimaryStatementTone,
} from "@/shared/customer-score";

interface Props {
  result: CustomerScoreResult;
}

const SCORE_COLORS: Record<string, { main: string; bg: string; subtle: string }> = {
  reliable: { main: "#10b981", bg: "#10b98114", subtle: "rgba(16,185,129,0.35)" },
  mixed: { main: "#f59e0b", bg: "#f59e0b14", subtle: "rgba(245,158,11,0.35)" },
  high_risk: { main: "#ef4444", bg: "#ef444414", subtle: "rgba(239,68,68,0.35)" },
  no_data: { main: "#6b7280", bg: "#6b728014", subtle: "rgba(107,114,128,0.35)" },
};

const TREND_CONFIG: Record<
  ScoreTrend,
  { icon: string; label: string; color: string; hint: string }
> = {
  improving: {
    icon: "▲",
    label: "Improving",
    color: "#10b981",
    hint: "Newer verified reports trend better than older ones.",
  },
  declining: {
    icon: "▼",
    label: "Declining",
    color: "#ef4444",
    hint: "Newer verified reports trend lower than older ones.",
  },
  stable: {
    icon: "—",
    label: "Stable",
    color: "#94a3b8",
    hint: "Little change between older and newer verified reports.",
  },
  new: {
    icon: "●",
    label: "New",
    color: "#3b82f6",
    hint: "Not enough history yet to measure a trend.",
  },
};

const INSIGHT_STYLE: Record<
  ScoreInsight["type"],
  { border: string; iconBg: string; icon: string; iconColor: string }
> = {
  positive: { border: "#10b98155", iconBg: "#10b98122", icon: "✓", iconColor: "#10b981" },
  negative: { border: "#ef444455", iconBg: "#ef444422", icon: "!", iconColor: "#ef4444" },
  neutral: { border: "#64748b55", iconBg: "#64748b22", icon: "i", iconColor: "#94a3b8" },
};

function tierFromScore(score: number): keyof typeof SCORE_COLORS {
  if (score >= 80) return "reliable";
  if (score >= 60) return "mixed";
  if (score > 0) return "high_risk";
  return "no_data";
}

const TONE_BORDER: Record<PrimaryStatementTone, string> = {
  critical: "#ef4444",
  caution: "#f59e0b",
  positive: "#10b981",
};

function BreakdownRow({
  value,
  max,
  label,
  helper,
}: {
  value: number;
  max: number;
  label: string;
  helper: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const barColor = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <View style={st.rowBlock}>
      <View style={st.rowHeader}>
        <Text style={st.rowLabel}>{label}</Text>
        <Text style={[st.rowScore, { color: barColor }]}>
          {value}
          <Text style={st.rowMax}> / {max}</Text>
        </Text>
      </View>
      <View style={st.barTrack}>
        <View style={[st.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={st.rowHelper}>{helper}</Text>
    </View>
  );
}

function InsightCard({ insight }: { insight: ScoreInsight }) {
  const sref = INSIGHT_STYLE[insight.type];
  return (
    <View style={[st.insightCard, { borderColor: sref.border }]}>
      <View style={[st.insightIconWrap, { backgroundColor: sref.iconBg }]}>
        <Text style={[st.insightIcon, { color: sref.iconColor }]}>{sref.icon}</Text>
      </View>
      <Text style={st.insightBody}>{insight.text}</Text>
    </View>
  );
}

export function ScoreBreakdownCard({ result }: Props) {
  const colors = useColors();
  const { score, label, breakdown, trend, trendDelta, insights, primaryStatement, primaryStatementTone } = result;
  const tier = tierFromScore(score);
  const style = SCORE_COLORS[tier];
  const tc = TREND_CONFIG[trend];

  if (label === "No Data") return null;

  return (
    <View style={[st.card, { backgroundColor: colors.surface, borderColor: "rgba(255,255,255,0.06)" }]}>
      {/* Score hero */}
      <View style={st.heroSection}>
        <View style={st.heroLeft}>
          <Text style={[st.kicker, { color: colors.muted }]}>Customer score</Text>
          <Text style={[st.scoreLabel, { color: style.main }]}>{label}</Text>
          <Text style={[st.scoreSubLabel, { color: colors.muted }]}>
            0–100 from verified contractor reports (higher is better for your job decision)
          </Text>
          <View style={[st.trendPill, { backgroundColor: tc.color + "18", borderColor: tc.color + "44" }]}>
            <Text style={[st.trendPillIcon, { color: tc.color }]}>{tc.icon}</Text>
            <View style={st.trendPillTextCol}>
              <Text style={[st.trendPillTitle, { color: tc.color }]}>{tc.label}</Text>
              <Text style={[st.trendPillHint, { color: colors.muted }]}>{tc.hint}</Text>
            </View>
            {trend !== "new" && trendDelta !== 0 ? (
              <Text style={[st.trendDelta, { color: tc.color }]}>
                {trendDelta > 0 ? "+" : ""}
                {trendDelta}%
              </Text>
            ) : null}
          </View>
        </View>
        <View style={[st.scoreCircle, { borderColor: style.main, backgroundColor: style.bg }]}>
          <Text style={[st.scoreNum, { color: style.main }]}>{score}</Text>
          <Text style={[st.scoreOf, { color: style.main + "88" }]}>/100</Text>
        </View>
      </View>

      <View style={[st.primaryStrip, { borderLeftColor: TONE_BORDER[primaryStatementTone] }]}>
        <Text style={[st.primaryStripText, { color: colors.foreground }]}>{primaryStatement}</Text>
      </View>
      <Text style={st.trustLineExact}>Based on verified contractor experiences</Text>

      {/* Insight cards */}
      {insights.length > 0 && (
        <>
          <View style={st.divider} />
          <Text style={[st.subTitle, { color: colors.foreground }]}>Insight cards</Text>
          <Text style={[st.subHint, { color: colors.muted }]}>
            Highest-priority signals first (payment → disputes → patterns → trend → volume).
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.insightScroll}
            style={st.insightScrollView}
          >
            {insights.map((ins, i) => (
              <InsightCard key={`${ins.topic ?? "x"}-${i}-${ins.text.slice(0, 12)}`} insight={ins} />
            ))}
          </ScrollView>
        </>
      )}

      {/* Score breakdown */}
      <View style={st.divider} />
      <Text style={[st.subTitle, { color: colors.foreground }]}>Score breakdown</Text>
      <Text style={[st.subHint, { color: colors.muted }]}>
        Points earned per factor (max shown). Same formula as your overall customer score.
      </Text>
      <View style={st.categoryList}>
        {SCORE_CATEGORIES.map((cat) => (
          <BreakdownRow
            key={cat.key}
            value={breakdown[cat.key]}
            max={cat.max}
            label={cat.label}
            helper={cat.helper}
          />
        ))}
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

  heroSection: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroLeft: { flex: 1, gap: 4, paddingRight: 12 },
  kicker: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  scoreLabel: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3, marginTop: 2 },
  scoreSubLabel: { fontSize: 12, lineHeight: 17, marginTop: 4 },

  primaryStrip: {
    marginTop: 14,
    paddingLeft: 12,
    paddingVertical: 10,
    borderLeftWidth: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
  },
  primaryStripText: { fontSize: 14, fontWeight: "800", lineHeight: 20 },
  trustLineExact: {
    color: "rgba(255,255,255,0.38)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 8,
    letterSpacing: 0.2,
  },

  trendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "stretch",
  },
  trendPillIcon: { fontSize: 14, fontWeight: "800" },
  trendPillTextCol: { flex: 1, gap: 2 },
  trendPillTitle: { fontSize: 13, fontWeight: "800" },
  trendPillHint: { fontSize: 11, lineHeight: 15 },
  trendDelta: { fontSize: 12, fontWeight: "800" },

  scoreCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNum: { fontSize: 26, fontWeight: "900", lineHeight: 30 },
  scoreOf: { fontSize: 10, fontWeight: "600" },

  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.06)", marginVertical: 16 },

  subTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  subHint: { fontSize: 11, lineHeight: 16, marginTop: 4, marginBottom: 12 },

  insightScrollView: { marginHorizontal: -4 },
  insightScroll: { gap: 10, paddingVertical: 4, paddingRight: 8 },
  insightCard: {
    width: 260,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  insightIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  insightIcon: { fontSize: 13, fontWeight: "900" },
  insightBody: { flex: 1, color: "rgba(255,255,255,0.72)", fontSize: 12, lineHeight: 17 },

  categoryList: { gap: 16 },
  rowBlock: { gap: 6 },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { color: "rgba(255,255,255,0.82)", fontSize: 13, fontWeight: "700" },
  rowScore: { fontSize: 15, fontWeight: "800" },
  rowMax: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.32)" },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.06)", overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  rowHelper: { color: "rgba(255,255,255,0.38)", fontSize: 11, lineHeight: 16 },
});
