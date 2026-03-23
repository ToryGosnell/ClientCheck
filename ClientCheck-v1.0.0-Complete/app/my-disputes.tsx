import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";

export default function MyDisputesScreen() {
  const colors = useColors();
  const router = useRouter();

  // Mock disputes data
  const [disputes] = useState([
    {
      id: 1,
      reviewId: 101,
      customerName: "ABC Plumbing",
      reason: "False Information",
      status: "approved",
      submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      decidedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      message: "Your dispute was approved. The review has been removed.",
    },
    {
      id: 2,
      reviewId: 102,
      customerName: "John's Construction",
      reason: "Defamatory",
      status: "under_review",
      submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      daysRemaining: 12,
      message: "Your dispute is being reviewed. Decision expected in 12 days.",
    },
    {
      id: 3,
      reviewId: 103,
      customerName: "Smith Enterprises",
      reason: "Privacy Violation",
      status: "rejected",
      submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      decidedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      canAppeal: true,
      message: "Your dispute was rejected. You can submit an appeal within 30 days.",
    },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return colors.success;
      case "rejected":
        return colors.error;
      case "under_review":
        return colors.warning;
      case "appealed":
        return colors.primary;
      default:
        return colors.muted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return "✓";
      case "rejected":
        return "✕";
      case "under_review":
        return "⏳";
      case "appealed":
        return "→";
      default:
        return "•";
    }
  };

  const renderDisputeCard = ({ item }: any) => (
    <TouchableOpacity
      onPress={() => router.push("/my-disputes")}
      style={[
        styles.disputeCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={[styles.customerName, { color: colors.foreground }]}>
            {item.customerName}
          </Text>
          <Text style={[styles.reason, { color: colors.muted }]}>{item.reason}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + "20" },
          ]}
        >
          <Text style={[styles.statusIcon, { color: getStatusColor(item.status) }]}>
            {getStatusIcon(item.status)}
          </Text>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status === "under_review" ? "Reviewing" : item.status}
          </Text>
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        <Text style={[styles.timelineText, { color: colors.muted }]}>
          📅 Submitted: {item.submittedAt.toLocaleDateString()}
        </Text>
        {!!item.decidedAt && (
          <Text style={[styles.timelineText, { color: colors.muted }]}>
            ✓ Decided: {item.decidedAt.toLocaleDateString()}
          </Text>
        )}
        {!!item.daysRemaining && (
          <Text style={[styles.timelineText, { color: colors.warning }]}>
            ⏱️ {item.daysRemaining} days remaining
          </Text>
        )}
      </View>

      {/* Message */}
      <Text style={[styles.message, { color: colors.foreground }]}>
        {item.message}
      </Text>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: colors.primary }]}
          onPress={() => router.push("/my-disputes")}
        >
          <Text style={[styles.actionButtonText, { color: colors.primary }]}>
            View Details
          </Text>
        </TouchableOpacity>

        {item.canAppeal && (
          <TouchableOpacity
            style={[styles.actionButton, { borderColor: colors.warning }]}
            onPress={() => router.push(`/dispute-appeal?disputeId=${item.id}`)}
          >
            <Text style={[styles.actionButtonText, { color: colors.warning }]}>
              Appeal Decision
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>My Disputes</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Track the status of all your disputes
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.success + "15", borderColor: colors.success },
            ]}
          >
            <Text style={[styles.statNumber, { color: colors.success }]}>1</Text>
            <Text style={[styles.statLabel, { color: colors.foreground }]}>Approved</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.warning + "15", borderColor: colors.warning },
            ]}
          >
            <Text style={[styles.statNumber, { color: colors.warning }]}>1</Text>
            <Text style={[styles.statLabel, { color: colors.foreground }]}>
              Under Review
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.error + "15", borderColor: colors.error },
            ]}
          >
            <Text style={[styles.statNumber, { color: colors.error }]}>1</Text>
            <Text style={[styles.statLabel, { color: colors.foreground }]}>Rejected</Text>
          </View>
        </View>

        {/* Disputes List */}
        {disputes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              You haven't filed any disputes yet.
            </Text>
          </View>
        ) : (
          <FlatList
            data={disputes}
            renderItem={renderDisputeCard}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        {/* Help Section */}
        <View
          style={[
            styles.helpBox,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.helpTitle, { color: colors.foreground }]}>
            Need Help?
          </Text>
          <Text style={[styles.helpText, { color: colors.muted }]}>
            • Disputes are reviewed within 2-4 weeks
            • You can appeal a rejected dispute within 30 days
            • Check your email for status updates
          </Text>
          <TouchableOpacity>
            <Text style={[styles.helpLink, { color: colors.primary }]}>
              View Dispute FAQ →
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 20,
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
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  disputeCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  customerName: {
    fontSize: 15,
    fontWeight: "700",
  },
  reason: {
    fontSize: 12,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusIcon: {
    fontSize: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  timeline: {
    gap: 4,
  },
  timelineText: {
    fontSize: 11,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: "600",
  },
  separator: {
    height: 8,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
  },
  helpBox: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  helpText: {
    fontSize: 12,
    lineHeight: 16,
  },
  helpLink: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
});
