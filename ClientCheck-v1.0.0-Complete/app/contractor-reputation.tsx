import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";

const { width } = Dimensions.get("window");

export default function ContractorReputationScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [reputation, setReputation] = useState<any>(null);
  const [trend, setTrend] = useState<any>(null);

  useEffect(() => {
    // Mock reputation data
    setReputation({
      contractorId: 1,
      overallScore: 82,
      scoreBreakdown: {
        disputeHistory: 28,
        reviewAccuracy: 30,
        paymentReliability: 24,
      },
      tier: "gold",
      trustLevel: "high",
      redFlags: ["Payment reliability concerns - late payment once in 2024"],
      strengths: [
        "Excellent dispute history - very few disputes",
        "High review accuracy - customers trust your reviews",
      ],
      lastUpdated: new Date(),
    });

    setTrend({
      currentScore: 82,
      previousScore: 78,
      trend: "improving",
      change: 4,
    });
  }, []);

  if (!reputation) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.foreground }]}>
            Loading reputation...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "platinum":
        return "#FFD700";
      case "gold":
        return "#FFD700";
      case "silver":
        return "#C0C0C0";
      case "bronze":
        return "#CD7F32";
      default:
        return colors.primary;
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "platinum":
        return "⭐⭐⭐⭐⭐";
      case "gold":
        return "⭐⭐⭐⭐";
      case "silver":
        return "⭐⭐⭐";
      case "bronze":
        return "⭐⭐";
      default:
        return "⭐";
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Your Reputation Score
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Based on disputes, accuracy, and payment history
          </Text>
        </View>

        {/* Overall Score Card */}
        <View
          style={[
            styles.scoreCard,
            {
              backgroundColor: colors.surface,
              borderColor: getTierColor(reputation.tier),
            },
          ]}
        >
          <View style={styles.scoreHeader}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreNumber}>{reputation.overallScore}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
            <View style={styles.tierInfo}>
              <Text style={styles.tierIcon}>{getTierIcon(reputation.tier)}</Text>
              <Text
                style={[
                  styles.tierName,
                  { color: getTierColor(reputation.tier) },
                ]}
              >
                {reputation.tier.toUpperCase()}
              </Text>
              <Text style={[styles.trustLevel, { color: colors.muted }]}>
                {reputation.trustLevel.replace("_", " ").toUpperCase()} TRUST
              </Text>
            </View>
          </View>

          {/* Trend */}
          {trend && (
            <View style={styles.trendContainer}>
              <View
                style={[
                  styles.trendBadge,
                  {
                    backgroundColor:
                      trend.trend === "improving"
                        ? colors.success + "20"
                        : colors.error + "20",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.trendText,
                    {
                      color:
                        trend.trend === "improving"
                          ? colors.success
                          : colors.error,
                    },
                  ]}
                >
                  {trend.trend === "improving" ? "📈" : "📉"} {trend.change > 0 ? "+" : ""}
                  {trend.change} points ({trend.trend})
                </Text>
              </View>
              <Text style={[styles.trendMeta, { color: colors.muted }]}>
                vs. 30 days ago
              </Text>
            </View>
          )}
        </View>

        {/* Score Breakdown */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Score Breakdown
          </Text>

          {/* Dispute History */}
          <View style={styles.scoreItem}>
            <View style={styles.scoreItemHeader}>
              <Text style={[styles.scoreItemLabel, { color: colors.foreground }]}>
                Dispute History
              </Text>
              <Text
                style={[
                  styles.scoreItemValue,
                  { color: colors.primary },
                ]}
              >
                {reputation.scoreBreakdown.disputeHistory}/30
              </Text>
            </View>
            <View
              style={[
                styles.scoreBar,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.scoreBarFill,
                  {
                    width: `${(reputation.scoreBreakdown.disputeHistory / 30) * 100}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          </View>

          {/* Review Accuracy */}
          <View style={styles.scoreItem}>
            <View style={styles.scoreItemHeader}>
              <Text style={[styles.scoreItemLabel, { color: colors.foreground }]}>
                Review Accuracy
              </Text>
              <Text
                style={[
                  styles.scoreItemValue,
                  { color: colors.primary },
                ]}
              >
                {reputation.scoreBreakdown.reviewAccuracy}/35
              </Text>
            </View>
            <View
              style={[
                styles.scoreBar,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.scoreBarFill,
                  {
                    width: `${(reputation.scoreBreakdown.reviewAccuracy / 35) * 100}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          </View>

          {/* Payment Reliability */}
          <View style={styles.scoreItem}>
            <View style={styles.scoreItemHeader}>
              <Text style={[styles.scoreItemLabel, { color: colors.foreground }]}>
                Payment Reliability
              </Text>
              <Text
                style={[
                  styles.scoreItemValue,
                  { color: colors.primary },
                ]}
              >
                {reputation.scoreBreakdown.paymentReliability}/35
              </Text>
            </View>
            <View
              style={[
                styles.scoreBar,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.scoreBarFill,
                  {
                    width: `${(reputation.scoreBreakdown.paymentReliability / 35) * 100}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Strengths */}
        {reputation.strengths.length > 0 && (
          <View
            style={[
              styles.section,
              { backgroundColor: colors.success + "10", borderColor: colors.success },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.success }]}>
              ✅ Your Strengths
            </Text>
            {reputation.strengths.map((strength: string, index: number) => (
              <View key={index} style={styles.listItem}>
                <Text style={[styles.listItemText, { color: colors.foreground }]}>
                  • {strength}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Red Flags */}
        {reputation.redFlags.length > 0 && (
          <View
            style={[
              styles.section,
              { backgroundColor: colors.error + "10", borderColor: colors.error },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.error }]}>
              ⚠️ Red Flags
            </Text>
            {reputation.redFlags.map((flag: string, index: number) => (
              <View key={index} style={styles.listItem}>
                <Text style={[styles.listItemText, { color: colors.foreground }]}>
                  • {flag}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* How to Improve */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            💡 How to Improve Your Score
          </Text>
          <View style={styles.improvementItem}>
            <Text style={[styles.improvementTitle, { color: colors.foreground }]}>
              1. Maintain Accurate Reviews
            </Text>
            <Text style={[styles.improvementDesc, { color: colors.muted }]}>
              Only submit reviews that are truthful and verifiable. Disputes lower your accuracy score.
            </Text>
          </View>
          <View style={styles.improvementItem}>
            <Text style={[styles.improvementTitle, { color: colors.foreground }]}>
              2. Pay on Time
            </Text>
            <Text style={[styles.improvementDesc, { color: colors.muted }]}>
              Ensure all payments are made by the due date. Late payments impact your reliability score.
            </Text>
          </View>
          <View style={styles.improvementItem}>
            <Text style={[styles.improvementTitle, { color: colors.foreground }]}>
              3. Respond to Disputes
            </Text>
            <Text style={[styles.improvementDesc, { color: colors.muted }]}>
              If a dispute is filed, respond promptly with evidence. This shows accountability.
            </Text>
          </View>
        </View>

        {/* Last Updated */}
        <Text style={[styles.lastUpdated, { color: colors.muted }]}>
          Last updated: {new Date(reputation.lastUpdated).toLocaleDateString()}
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
  },
  scoreCard: {
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
  },
  scoreHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFD700",
  },
  scoreMax: {
    fontSize: 12,
    color: "#FFD700",
  },
  tierInfo: {
    flex: 1,
    gap: 4,
  },
  tierIcon: {
    fontSize: 20,
  },
  tierName: {
    fontSize: 16,
    fontWeight: "700",
  },
  trustLevel: {
    fontSize: 11,
  },
  trendContainer: {
    gap: 6,
  },
  trendBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  trendText: {
    fontSize: 12,
    fontWeight: "600",
  },
  trendMeta: {
    fontSize: 11,
  },
  section: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  scoreItem: {
    gap: 6,
  },
  scoreItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreItemLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  scoreItemValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  scoreBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
  },
  scoreBarFill: {
    height: "100%",
  },
  listItem: {
    paddingVertical: 6,
  },
  listItemText: {
    fontSize: 12,
    lineHeight: 18,
  },
  improvementItem: {
    gap: 4,
    paddingVertical: 8,
  },
  improvementTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  improvementDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  lastUpdated: {
    fontSize: 11,
    textAlign: "center",
    marginBottom: 20,
  },
});
