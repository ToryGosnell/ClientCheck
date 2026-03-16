import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";

export default function AdminDisputesScreen() {
  const colors = useColors();
  const router = useRouter();

  // Mock disputes data
  const [disputes] = useState([
    {
      id: 1,
      reviewId: 101,
      customerName: "John Smith",
      customerEmail: "john@example.com",
      reason: "false_information",
      description: "This review contains completely false information about my business.",
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: "submitted",
      evidenceCount: 3,
    },
    {
      id: 2,
      reviewId: 102,
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      reason: "defamatory",
      description: "The contractor made defamatory statements about my company.",
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: "submitted",
      evidenceCount: 2,
    },
  ]);

  const [selectedDispute, setSelectedDispute] = useState<number | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState("");

  const handleApprove = (disputeId: number) => {
    Alert.alert(
      "Approve Dispute?",
      "This will remove the review from the platform. The contractor will be notified.",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Approve",
          onPress: () => {
            Alert.alert("Success", "Dispute approved. Review will be removed.");
            setSelectedDispute(null);
            setReviewerNotes("");
          },
        },
      ]
    );
  };

  const handleReject = (disputeId: number) => {
    Alert.alert(
      "Reject Dispute?",
      "The customer will be notified that their dispute was rejected.",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Reject",
          onPress: () => {
            Alert.alert("Success", "Dispute rejected. Customer will be notified.");
            setSelectedDispute(null);
            setReviewerNotes("");
          },
        },
      ]
    );
  };

  const getReasonLabel = (reason: string) => {
    const reasons: Record<string, string> = {
      false_information: "False Information",
      defamatory: "Defamatory",
      privacy_violation: "Privacy Violation",
      not_my_business: "Not My Business",
      other: "Other",
    };
    return reasons[reason] || reason;
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Dispute Moderation
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Review and approve/reject customer disputes
          </Text>
        </View>

        {selectedDispute ? (
          // Dispute Detail View
          <View style={styles.detailView}>
            {disputes
              .filter((d) => d.id === selectedDispute)
              .map((dispute) => (
                <View key={dispute.id}>
                  <TouchableOpacity
                    onPress={() => setSelectedDispute(null)}
                    style={styles.backButton}
                  >
                    <Text style={{ color: colors.primary, fontWeight: "600" }}>
                      ← Back
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                      Dispute Details
                    </Text>

                    <View style={styles.detailRow}>
                      <Text style={[styles.label, { color: colors.muted }]}>
                        Customer Name:
                      </Text>
                      <Text style={[styles.value, { color: colors.foreground }]}>
                        {dispute.customerName}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={[styles.label, { color: colors.muted }]}>
                        Email:
                      </Text>
                      <Text style={[styles.value, { color: colors.foreground }]}>
                        {dispute.customerEmail}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={[styles.label, { color: colors.muted }]}>
                        Reason:
                      </Text>
                      <Text style={[styles.value, { color: colors.foreground }]}>
                        {getReasonLabel(dispute.reason)}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={[styles.label, { color: colors.muted }]}>
                        Submitted:
                      </Text>
                      <Text style={[styles.value, { color: colors.foreground }]}>
                        {dispute.submittedAt.toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                      Customer's Statement
                    </Text>
                    <View
                      style={[
                        styles.statementBox,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={{ color: colors.foreground }}>
                        {dispute.description}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                      Evidence ({dispute.evidenceCount} files)
                    </Text>
                    <View
                      style={[
                        styles.evidenceBox,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={{ color: colors.muted }}>
                        📎 {dispute.evidenceCount} file(s) uploaded
                      </Text>
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                      Reviewer Notes
                    </Text>
                    <TextInput
                      style={[
                        styles.notesInput,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                      placeholder="Add notes about this dispute decision..."
                      placeholderTextColor={colors.muted}
                      value={reviewerNotes}
                      onChangeText={setReviewerNotes}
                      multiline
                      numberOfLines={4}
                    />
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      onPress={() => handleApprove(dispute.id)}
                      style={[
                        styles.approveButton,
                        { backgroundColor: colors.success },
                      ]}
                    >
                      <Text style={styles.buttonText}>✓ Approve Dispute</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleReject(dispute.id)}
                      style={[
                        styles.rejectButton,
                        { backgroundColor: colors.error },
                      ]}
                    >
                      <Text style={styles.buttonText}>✕ Reject Dispute</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
          </View>
        ) : (
          // Disputes List View
          <View>
            {disputes.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.muted }]}>
                  No disputes to review
                </Text>
              </View>
            ) : (
              <View style={styles.disputesList}>
                {disputes.map((dispute) => (
                  <TouchableOpacity
                    key={dispute.id}
                    onPress={() => setSelectedDispute(dispute.id)}
                    style={[
                      styles.disputeCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                        {dispute.customerName}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: colors.warning + "20" },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: colors.warning }]}>
                          {dispute.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.reason, { color: colors.muted }]}>
                      {getReasonLabel(dispute.reason)}
                    </Text>

                    <Text
                      style={[styles.description, { color: colors.foreground }]}
                      numberOfLines={2}
                    >
                      {dispute.description}
                    </Text>

                    <View style={styles.cardFooter}>
                      <Text style={[styles.meta, { color: colors.muted }]}>
                        📎 {dispute.evidenceCount} files
                      </Text>
                      <Text style={[styles.meta, { color: colors.muted }]}>
                        {Math.floor(
                          (Date.now() - dispute.submittedAt.getTime()) /
                            (1000 * 60 * 60 * 24)
                        )}{" "}
                        days ago
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
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
    fontSize: 14,
    lineHeight: 20,
  },
  disputesList: {
    gap: 12,
  },
  disputeCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  reason: {
    fontSize: 12,
    fontWeight: "600",
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  meta: {
    fontSize: 11,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
  },
  detailView: {
    gap: 16,
  },
  backButton: {
    paddingVertical: 8,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  value: {
    fontSize: 13,
    fontWeight: "500",
  },
  statementBox: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  evidenceBox: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  notesInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
  },
  actionButtons: {
    gap: 10,
    marginTop: 8,
  },
  approveButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  rejectButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
});
