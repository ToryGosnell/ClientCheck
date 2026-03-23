import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenBackground } from "@/components/screen-background";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";

export default function AnalyticsScreen() {
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);

  const analyticsQuery = trpc.analytics.getMyAnalytics.useQuery();
  const recalculateMutation = trpc.analytics.recalculateAnalytics.useMutation();

  useFocusEffect(
    useCallback(() => {
      analyticsQuery.refetch();
    }, [analyticsQuery])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await recalculateMutation.mutateAsync();
    await analyticsQuery.refetch();
    setRefreshing(false);
  };

  const analytics = analyticsQuery.data;

  if (analyticsQuery.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text style={{ color: colors.foreground }}>Loading analytics...</Text>
      </ScreenContainer>
    );
  }

  if (!analytics) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text style={{ color: colors.foreground }}>No analytics data available</Text>
      </ScreenContainer>
    );
  }

  const redFlagCounts = (analytics.redFlagCounts as Record<string, number>) || {};
  const topRedFlags = Object.entries(redFlagCounts)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 5);

  return (
    <ScreenBackground backgroundKey="analytics">
    <ScreenContainer className="p-4" containerClassName="bg-transparent">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Your Analytics</Text>
          <Pressable
            onPress={handleRefresh}
            disabled={refreshing}
            style={({ pressed }) => [
              styles.refreshBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.refreshBtnText}>{refreshing ? "Updating..." : "Refresh"}</Text>
          </Pressable>
        </View>

        {/* Key Metrics */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Key Metrics</Text>

          <View style={styles.metricRow}>
            <View style={styles.metric}>
              <Text style={[styles.metricValue, { color: colors.primary }]}>
                {String(analytics.totalReviewsSubmitted ?? 0)}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Total Reviews</Text>
            </View>
            <View style={styles.metric}>
              <Text style={[styles.metricValue, { color: colors.success }]}>
                {String(analytics.averageReputationScore ?? 0)}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Reputation</Text>
            </View>
            <View style={styles.metric}>
              <Text style={[styles.metricValue, { color: colors.warning }]}>
                {String((analytics.disputeResponseRate as any) ?? 0)}%
              </Text>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Dispute Response</Text>
            </View>
          </View>
        </View>

        {/* Activity */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Activity</Text>

          <View style={styles.activityRow}>
            <View style={styles.activityItem}>
              <Text style={[styles.activityLabel, { color: colors.muted }]}>This Month</Text>
              <Text style={[styles.activityValue, { color: colors.foreground }]}>
                {String(analytics.reviewsThisMonth ?? 0)} reviews
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.activityItem}>
              <Text style={[styles.activityLabel, { color: colors.muted }]}>Last Month</Text>
              <Text style={[styles.activityValue, { color: colors.foreground }]}>
                {String(analytics.reviewsLastMonth ?? 0)} reviews
              </Text>
            </View>
          </View>
        </View>

        {/* Disputes */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Disputes</Text>

          <View style={styles.activityRow}>
            <View style={styles.activityItem}>
              <Text style={[styles.activityLabel, { color: colors.muted }]}>Received</Text>
              <Text style={[styles.activityValue, { color: colors.error }]}>
                {String(analytics.totalDisputesReceived ?? 0)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.activityItem}>
              <Text style={[styles.activityLabel, { color: colors.muted }]}>Responded</Text>
              <Text style={[styles.activityValue, { color: colors.success }]}>
                {String(analytics.totalDisputesResponded ?? 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Top Red Flags */}
        {topRedFlags.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Most Common Issues</Text>

            {topRedFlags.map(([flag, count], index) => (
              <View key={flag} style={[styles.flagRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: 0.5 }]}>
                <Text style={[styles.flagName, { color: colors.foreground }]}>{String(flag)}</Text>
                <Text style={[styles.flagCount, { color: colors.error }]}>{String(count)} times</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Client Score System ─────────────────────────────── */}
        <View style={styles.scoreSystemHeader}>
          <Text style={[styles.scoreSystemTitle, { color: colors.foreground }]}>Your Client Score</Text>
          <Text style={[styles.scoreSystemSubtitle, { color: colors.muted }]}>
            Think of this like a credit score — but for how contractors experience working with you.
          </Text>
        </View>

        {/* Section 1: How It's Calculated */}
        <View style={[styles.csCard, { backgroundColor: colors.surface, borderColor: "rgba(255,255,255,0.06)" }]}>
          <Text style={[styles.csCardTitle, { color: colors.foreground }]}>How Your Score Is Calculated</Text>
          <Text style={[styles.csBody, { color: colors.muted }]}>
            Your Client Score ranges from 0–100 and is built from real contractor reviews.
          </Text>
          <Text style={[styles.csSubhead, { color: colors.foreground }]}>Your score is influenced by:</Text>
          <View style={styles.csBullets}>
            <Text style={[styles.csBullet, { color: colors.muted }]}>• Payment behavior (on-time vs slow or disputed)</Text>
            <Text style={[styles.csBullet, { color: colors.muted }]}>• Communication and responsiveness</Text>
            <Text style={[styles.csBullet, { color: colors.muted }]}>• Scope control (avoiding constant changes)</Text>
            <Text style={[styles.csBullet, { color: colors.muted }]}>• Jobsite readiness and conditions</Text>
            <Text style={[styles.csBullet, { color: colors.muted }]}>• Professionalism and respect</Text>
            <Text style={[styles.csBullet, { color: colors.muted }]}>• "Would Work Again" decisions</Text>
            <Text style={[styles.csBullet, { color: colors.muted }]}>• Red flags reported by contractors</Text>
          </View>
          <View style={[styles.csNote, { borderTopColor: "rgba(255,255,255,0.06)" }]}>
            <Text style={[styles.csNoteText, { color: colors.muted }]}>
              Recent reviews carry more weight than older ones.{"\n"}Consistent behavior matters — patterns raise or lower your score over time.
            </Text>
          </View>
        </View>

        {/* Section 2: What Affects Most */}
        <View style={[styles.csCard, { backgroundColor: colors.surface, borderColor: "rgba(255,255,255,0.06)" }]}>
          <Text style={[styles.csCardTitle, { color: colors.foreground }]}>What Affects Your Score Most</Text>

          <Text style={[styles.csImpactLabel, { color: "#DC2626" }]}>Major Negative Impacts</Text>
          <View style={styles.csBullets}>
            <Text style={[styles.csBullet, { color: "#DC2626" }]}>🚨 "Would NOT Work Again"</Text>
            <Text style={[styles.csBullet, { color: "#DC2626" }]}>🚨 Do Not Work With flag</Text>
            <Text style={[styles.csBullet, { color: "#DC2626" }]}>🚨 Payment disputes or non-payment</Text>
            <Text style={[styles.csBullet, { color: "#DC2626" }]}>🚨 Legal threats or chargeback behavior</Text>
          </View>

          <Text style={[styles.csImpactLabel, { color: colors.warning }]}>Moderate Negative Impacts</Text>
          <View style={styles.csBullets}>
            <Text style={[styles.csBullet, { color: colors.muted }]}>• Repeated scope creep</Text>
            <Text style={[styles.csBullet, { color: colors.muted }]}>• Slow payments</Text>
            <Text style={[styles.csBullet, { color: colors.muted }]}>• Poor communication</Text>
            <Text style={[styles.csBullet, { color: colors.muted }]}>• Delayed decisions</Text>
          </View>

          <Text style={[styles.csImpactLabel, { color: "#22C55E" }]}>Positive Impacts</Text>
          <View style={styles.csBullets}>
            <Text style={[styles.csBullet, { color: "#22C55E" }]}>✅ Fast, reliable payment</Text>
            <Text style={[styles.csBullet, { color: "#22C55E" }]}>✅ Clear communication</Text>
            <Text style={[styles.csBullet, { color: "#22C55E" }]}>✅ Respectful jobsite behavior</Text>
            <Text style={[styles.csBullet, { color: "#22C55E" }]}>✅ Contractors willing to work with you again</Text>
          </View>
        </View>

        {/* Section 3: Why It Matters */}
        <View style={[styles.csCard, { backgroundColor: colors.surface, borderColor: "rgba(255,255,255,0.06)" }]}>
          <Text style={[styles.csCardTitle, { color: colors.foreground }]}>Why It Matters</Text>
          <Text style={[styles.csBody, { color: colors.muted }]}>
            Your score directly affects how likely contractors are to accept your job.
          </Text>

          <View style={[styles.csImpactBox, { backgroundColor: "#22C55E0C", borderColor: "#22C55E33" }]}>
            <Text style={[styles.csImpactBoxTitle, { color: "#22C55E" }]}>Higher Score</Text>
            <Text style={[styles.csImpactBoxItem, { color: "#22C55E" }]}>• More contractors willing to work with you</Text>
            <Text style={[styles.csImpactBoxItem, { color: "#22C55E" }]}>• Faster responses</Text>
            <Text style={[styles.csImpactBoxItem, { color: "#22C55E" }]}>• Better pricing opportunities</Text>
          </View>

          <View style={[styles.csImpactBox, { backgroundColor: "#DC26260C", borderColor: "#DC262633" }]}>
            <Text style={[styles.csImpactBoxTitle, { color: "#DC2626" }]}>Lower Score</Text>
            <Text style={[styles.csImpactBoxItem, { color: "#DC2626" }]}>• Contractors may decline work</Text>
            <Text style={[styles.csImpactBoxItem, { color: "#DC2626" }]}>• Limited interest or slower responses</Text>
            <Text style={[styles.csImpactBoxItem, { color: "#DC2626" }]}>• Increased scrutiny before accepting jobs</Text>
          </View>
        </View>

        {/* Section 4: Disputes */}
        <View style={[styles.csCard, { backgroundColor: colors.surface, borderColor: "rgba(255,255,255,0.06)" }]}>
          <Text style={[styles.csCardTitle, { color: colors.foreground }]}>Disputes & Accountability</Text>
          <View style={styles.csBullets}>
            <Text style={[styles.csBody, { color: colors.muted }]}>
              You can dispute reviews you believe are inaccurate.
            </Text>
            <Text style={[styles.csBody, { color: colors.muted }]}>
              Your dispute response rate reflects how often you respond and resolve issues.
            </Text>
            <Text style={[styles.csBody, { color: "#22C55E" }]}>
              Fast, professional responses improve your standing.
            </Text>
            <Text style={[styles.csBody, { color: "#DC2626" }]}>
              Ignoring disputes or repeated issues can lower your score further.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 100,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  refreshBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 12,
  },
  metric: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  metricLabel: {
    fontSize: 12,
  },
  activityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activityItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  activityLabel: {
    fontSize: 12,
  },
  activityValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: "#ccc",
  },
  flagRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  flagName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  flagCount: {
    fontSize: 14,
    fontWeight: "600",
  },
  explanation: {
    fontSize: 13,
    lineHeight: 18,
  },

  scoreSystemHeader: {
    paddingVertical: 8,
    gap: 6,
  },
  scoreSystemTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  scoreSystemSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
  },

  csCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  csCardTitle: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  csSubhead: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  csBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  csBullets: {
    gap: 5,
    paddingLeft: 4,
  },
  csBullet: {
    fontSize: 13,
    lineHeight: 20,
  },
  csNote: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 2,
  },
  csNoteText: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: "italic",
  },
  csImpactLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginTop: 4,
  },
  csImpactBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  csImpactBoxTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  csImpactBoxItem: {
    fontSize: 13,
    lineHeight: 19,
  },
});
