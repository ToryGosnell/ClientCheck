import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useState } from "react";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";

const { width } = Dimensions.get("window");

export default function AdminDisputeAnalyticsScreen() {
  const colors = useColors();
  const [timeRange, setTimeRange] = useState("30days");

  // Mock analytics data
  const analytics = {
    totalDisputes: 247,
    approvedDisputes: 89,
    rejectedDisputes: 142,
    pendingDisputes: 16,
    averageResolutionDays: 18,
    approvalRate: 36,
    mostCommonReasons: [
      { reason: "False Information", count: 78, percentage: 32 },
      { reason: "Defamatory", count: 54, percentage: 22 },
      { reason: "Privacy Violation", count: 42, percentage: 17 },
      { reason: "Inaccurate Information", count: 38, percentage: 15 },
      { reason: "Other", count: 35, percentage: 14 },
    ],
    disputesByStatus: {
      submitted: 16,
      under_review: 8,
      approved: 89,
      rejected: 142,
    },
    topContractorsWithDisputes: [
      { name: "John Smith", disputes: 12, approvalRate: 25 },
      { name: "ABC Plumbing", disputes: 9, approvalRate: 33 },
      { name: "Tech Solutions", disputes: 8, approvalRate: 38 },
      { name: "Smith Enterprises", disputes: 7, approvalRate: 29 },
      { name: "Green Construction", disputes: 6, approvalRate: 50 },
    ],
    topCustomersWithDisputes: [
      { name: "John's Construction", disputes: 8 },
      { name: "ABC Enterprises", disputes: 6 },
      { name: "Smith Corp", disputes: 5 },
      { name: "Tech Innovations", disputes: 4 },
      { name: "Green Solutions", disputes: 4 },
    ],
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return colors.success;
      case "rejected":
        return colors.error;
      case "under_review":
        return colors.warning;
      case "submitted":
        return colors.primary;
      default:
        return colors.muted;
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Dispute Analytics
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Trends, patterns, and performance metrics
          </Text>
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {["7days", "30days", "90days", "all"].map((range) => (
            <TouchableOpacity
              key={range}
              onPress={() => setTimeRange(range)}
              style={[
                styles.timeRangeButton,
                {
                  backgroundColor:
                    timeRange === range ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  {
                    color: timeRange === range ? "white" : colors.foreground,
                  },
                ]}
              >
                {range === "7days"
                  ? "7 Days"
                  : range === "30days"
                    ? "30 Days"
                    : range === "90days"
                      ? "90 Days"
                      : "All Time"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <View
            style={[
              styles.metricCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.metricValue, { color: colors.primary }]}>
              {analytics.totalDisputes}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>
              Total Disputes
            </Text>
          </View>

          <View
            style={[
              styles.metricCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.metricValue, { color: colors.success }]}>
              {analytics.approvalRate}%
            </Text>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>
              Approval Rate
            </Text>
          </View>

          <View
            style={[
              styles.metricCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.metricValue, { color: colors.warning }]}>
              {analytics.averageResolutionDays}d
            </Text>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>
              Avg Resolution
            </Text>
          </View>

          <View
            style={[
              styles.metricCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.metricValue, { color: colors.error }]}>
              {analytics.pendingDisputes}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>
              Pending Review
            </Text>
          </View>
        </View>

        {/* Dispute Status Breakdown */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Dispute Status Breakdown
          </Text>
          {Object.entries(analytics.disputesByStatus).map(([status, count]) => (
            <View key={status} style={styles.statusRow}>
              <View style={styles.statusInfo}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(status) },
                  ]}
                />
                <Text style={[styles.statusName, { color: colors.foreground }]}>
                  {status === "submitted"
                    ? "Submitted"
                    : status === "under_review"
                      ? "Under Review"
                      : status === "approved"
                        ? "Approved"
                        : "Rejected"}
                </Text>
              </View>
              <Text style={[styles.statusCount, { color: colors.foreground }]}>
                {count}
              </Text>
            </View>
          ))}
        </View>

        {/* Most Common Reasons */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Most Common Dispute Reasons
          </Text>
          {analytics.mostCommonReasons.map((item, index) => (
            <View key={index} style={styles.reasonRow}>
              <View style={styles.reasonInfo}>
                <Text style={[styles.reasonName, { color: colors.foreground }]}>
                  {item.reason}
                </Text>
                <Text style={[styles.reasonCount, { color: colors.muted }]}>
                  {item.count} disputes
                </Text>
              </View>
              <View
                style={[
                  styles.percentageBar,
                  { backgroundColor: colors.primary + "20" },
                ]}
              >
                <View
                  style={[
                    styles.percentageFill,
                    {
                      width: `${item.percentage}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.percentage, { color: colors.foreground }]}>
                {item.percentage}%
              </Text>
            </View>
          ))}
        </View>

        {/* Top Contractors with Disputes */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Top Contractors with Disputes
          </Text>
          {analytics.topContractorsWithDisputes.map((contractor, index) => (
            <View key={index} style={styles.contractorRow}>
              <View style={styles.contractorInfo}>
                <Text style={[styles.contractorName, { color: colors.foreground }]}>
                  {index + 1}. {contractor.name}
                </Text>
                <Text style={[styles.contractorMeta, { color: colors.muted }]}>
                  {contractor.disputes} disputes • {contractor.approvalRate}% approval
                </Text>
              </View>
              <View
                style={[
                  styles.riskBadge,
                  {
                    backgroundColor:
                      contractor.approvalRate > 40
                        ? colors.success + "20"
                        : colors.error + "20",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.riskText,
                    {
                      color:
                        contractor.approvalRate > 40
                          ? colors.success
                          : colors.error,
                    },
                  ]}
                >
                  {contractor.approvalRate > 40 ? "LOW" : "HIGH"} RISK
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Top Customers with Disputes */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Top Customers Filing Disputes
          </Text>
          {analytics.topCustomersWithDisputes.map((customer, index) => (
            <View key={index} style={styles.customerRow}>
              <Text style={[styles.customerName, { color: colors.foreground }]}>
                {index + 1}. {customer.name}
              </Text>
              <Text style={[styles.customerCount, { color: colors.muted }]}>
                {customer.disputes} disputes
              </Text>
            </View>
          ))}
        </View>

        {/* Export Button */}
        <TouchableOpacity
          style={[
            styles.exportButton,
            { backgroundColor: colors.primary, borderColor: colors.border },
          ]}
        >
          <Text style={styles.exportButtonText}>📊 Export Analytics Report</Text>
        </TouchableOpacity>
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
  timeRangeContainer: {
    flexDirection: "row",
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  timeRangeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: (width - 52) / 2,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: "center",
    gap: 6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  metricLabel: {
    fontSize: 11,
  },
  section: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  statusInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusName: {
    fontSize: 13,
  },
  statusCount: {
    fontSize: 13,
    fontWeight: "600",
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  reasonInfo: {
    width: 100,
    gap: 2,
  },
  reasonName: {
    fontSize: 12,
    fontWeight: "600",
  },
  reasonCount: {
    fontSize: 10,
  },
  percentageBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  percentageFill: {
    height: "100%",
  },
  percentage: {
    fontSize: 12,
    fontWeight: "600",
    minWidth: 35,
    textAlign: "right",
  },
  contractorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 8,
  },
  contractorInfo: {
    flex: 1,
    gap: 2,
  },
  contractorName: {
    fontSize: 13,
    fontWeight: "600",
  },
  contractorMeta: {
    fontSize: 11,
  },
  riskBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  riskText: {
    fontSize: 10,
    fontWeight: "700",
  },
  customerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  customerName: {
    fontSize: 13,
    fontWeight: "600",
  },
  customerCount: {
    fontSize: 12,
  },
  exportButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  exportButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
});
