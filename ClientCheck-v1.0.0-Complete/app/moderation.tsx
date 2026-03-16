import { ScrollView, StyleSheet, Text, View, Pressable, TextInput } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function ModerationScreen() {
  const colors = useColors();
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const pendingQuery = trpc.moderation.getPendingReviews.useQuery();
  const statsQuery = trpc.moderation.getModerationStats.useQuery();
  const approveMutation = trpc.moderation.approveReview.useMutation();
  const rejectMutation = trpc.moderation.rejectReview.useMutation();
  const requestChangesMutation = trpc.moderation.requestChanges.useMutation();

  const handleApprove = async (reviewId: number) => {
    try {
      await approveMutation.mutateAsync({ reviewId });
      await pendingQuery.refetch();
      await statsQuery.refetch();
    } catch (error) {
      console.error("Failed to approve review:", error);
    }
  };

  const handleReject = async () => {
    if (!selectedReviewId) return;
    try {
      await rejectMutation.mutateAsync({
        reviewId: selectedReviewId,
        reason: rejectReason,
      });
      setShowRejectForm(false);
      setRejectReason("");
      setSelectedReviewId(null);
      await pendingQuery.refetch();
      await statsQuery.refetch();
    } catch (error) {
      console.error("Failed to reject review:", error);
    }
  };

  const handleRequestChanges = async (reviewId: number) => {
    try {
      await requestChangesMutation.mutateAsync({
        reviewId,
        reason: "Please revise your review and resubmit.",
      });
      await pendingQuery.refetch();
      await statsQuery.refetch();
    } catch (error) {
      console.error("Failed to request changes:", error);
    }
  };

  const stats = statsQuery.data;
  const pendingReviews = pendingQuery.data || [];

  if (pendingQuery.isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text style={{ color: colors.foreground }}>Loading moderation queue...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Review Moderation</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Admin Panel</Text>
        </View>

        {/* Stats */}
        {stats && (
          <View style={[styles.statsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.error }]}>{stats.pending}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.success }]}>{stats.approved}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Approved</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.warning }]}>{stats.rejected}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Rejected</Text>
            </View>
          </View>
        )}

        {/* Pending Reviews */}
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Pending Reviews ({pendingReviews.length})
          </Text>

          {pendingReviews.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>No pending reviews to moderate</Text>
            </View>
          ) : (
            pendingReviews.map((review: any) => (
              <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.reviewHeader}>
                  <Text style={[styles.reviewId, { color: colors.foreground }]}>Review #{review.reviewId}</Text>
                  <Text style={[styles.reviewDate, { color: colors.muted }]}>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <Text style={[styles.reviewContent, { color: colors.foreground }]}>
                  Status: {review.status}
                </Text>

                {/* Actions */}
                <View style={styles.actionButtons}>
                  <Pressable
                    onPress={() => handleApprove(review.reviewId)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      { backgroundColor: colors.success },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={styles.actionBtnText}>Approve</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleRequestChanges(review.reviewId)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      { backgroundColor: colors.warning },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={styles.actionBtnText}>Request Changes</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setSelectedReviewId(review.reviewId);
                      setShowRejectForm(true);
                    }}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      { backgroundColor: colors.error },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Reject Form Modal */}
        {showRejectForm && (
          <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Reject Review</Text>
            <TextInput
              style={[styles.reasonInput, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="Reason for rejection..."
              placeholderTextColor={colors.muted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowRejectForm(false)}
                style={({ pressed }) => [
                  styles.modalBtn,
                  { backgroundColor: colors.muted },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleReject}
                style={({ pressed }) => [
                  styles.modalBtn,
                  { backgroundColor: colors.error },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.modalBtnText}>Reject</Text>
              </Pressable>
            </View>
          </View>
        )}
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
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  emptyState: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
  },
  reviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reviewId: {
    fontSize: 16,
    fontWeight: "600",
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  modal: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
