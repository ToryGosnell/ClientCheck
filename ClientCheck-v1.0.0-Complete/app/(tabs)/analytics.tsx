import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
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
    <ScreenContainer className="p-4">
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

        {/* Reputation Score Explanation */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>How It Works</Text>
          <Text style={[styles.explanation, { color: colors.muted }]}>
            Your reputation score is calculated from your average overall rating across all reviews. A higher score means contractors are more likely to work with you.
          </Text>
          <Text style={[styles.explanation, { color: colors.muted, marginTop: 8 }]}>
            Your dispute response rate shows how often you respond to customer disputes. Higher rates demonstrate professionalism and commitment to resolution.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
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
});
