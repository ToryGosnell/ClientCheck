import { addAlert, getWatchSnapshot, setWatchSnapshot, type WatchSnapshotState } from "@/lib/user-data";

/**
 * Compares the latest server snapshot with the last stored snapshot and records
 * trust-toned in-app alerts for watched customers (no push — local list only).
 */
export function applyRetentionSnapshot(
  customerId: number,
  customerName: string,
  curr: WatchSnapshotState,
): void {
  const prev = getWatchSnapshot(customerId);
  setWatchSnapshot(customerId, curr);

  if (!prev) return;

  if (curr.reviewCount > prev.reviewCount) {
    addAlert({
      customerId,
      customerName,
      type: "new_review",
      priority: "standard",
      message: "New report added — review before next job.",
    });
  }

  if (curr.disputeCount > prev.disputeCount) {
    addAlert({
      customerId,
      customerName,
      type: "dispute",
      priority: "high",
      message: "Dispute filed — details updated.",
    });
  }

  if (Math.abs(curr.customerScore - prev.customerScore) >= 3) {
    const dropped = curr.customerScore < prev.customerScore;
    addAlert({
      customerId,
      customerName,
      type: "score_change",
      priority: dropped ? "high" : "standard",
      message: dropped
        ? "Score dropped — check recent activity."
        : "Score moved up — still worth a quick look at recent activity.",
    });
  }

  if (curr.anyReviewUnderReview && !prev.anyReviewUnderReview) {
    addAlert({
      customerId,
      customerName,
      type: "moderation_status",
      priority: "standard",
      message: "A report is under moderation — check the profile when you’re planning work.",
    });
  }
}
