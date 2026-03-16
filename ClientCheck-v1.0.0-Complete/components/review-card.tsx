import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { StarRating } from "@/components/star-rating";
import { RED_FLAG_LABELS, parseRedFlags, type ReviewWithContractor } from "@/shared/types";

interface ReviewCardProps {
  review: ReviewWithContractor;
  onHelpful?: () => void;
  showCustomerName?: boolean;
  customerName?: string;
}

export function ReviewCard({ review, onHelpful, showCustomerName, customerName }: ReviewCardProps) {
  const colors = useColors();
  const flags = parseRedFlags(review.redFlags);
  const date = new Date(review.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {(review.contractorName ?? "C")[0].toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.contractorName, { color: colors.foreground }]}>
              {review.contractorName ?? "Anonymous Contractor"}
            </Text>
            {review.contractorTrade && (
              <Text style={[styles.trade, { color: colors.muted }]}>
                {review.contractorTrade}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          <StarRating rating={review.overallRating} size={14} />
          <Text style={[styles.date, { color: colors.muted }]}>{date}</Text>
        </View>
      </View>

      {/* Customer name if shown in feed context */}
      {showCustomerName && customerName && (
        <Text style={[styles.customerRef, { color: colors.primary }]}>
          Review for: {customerName}
        </Text>
      )}

      {/* Job info */}
      {(review.jobType || review.jobDate) && (
        <View style={styles.jobRow}>
          {review.jobType && (
            <Text style={[styles.jobTag, { backgroundColor: colors.primary + "18", color: colors.primary }]}>
              {review.jobType}
            </Text>
          )}
          {review.jobDate && (
            <Text style={[styles.jobDate, { color: colors.muted }]}>
              📅 {review.jobDate}
            </Text>
          )}
          {review.jobAmount && (
            <Text style={[styles.jobDate, { color: colors.muted }]}>
              💰 {review.jobAmount}
            </Text>
          )}
        </View>
      )}

      {/* Review text */}
      {review.reviewText ? (
        <Text style={[styles.reviewText, { color: colors.foreground }]}>
          "{review.reviewText}"
        </Text>
      ) : null}

      {/* Red flags */}
      {flags.length > 0 && (
        <View style={styles.flagsContainer}>
          {flags.map((flag) => (
            <View
              key={flag}
              style={[styles.flagChip, { backgroundColor: colors.error + "18", borderColor: colors.error + "44" }]}
            >
              <Text style={[styles.flagText, { color: colors.error }]}>
                🚩 {RED_FLAG_LABELS[flag]}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Helpful */}
      <View style={styles.footer}>
        <Pressable
          onPress={onHelpful}
          style={({ pressed }) => [
            styles.helpfulBtn,
            { borderColor: colors.border },
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text style={[styles.helpfulText, { color: colors.muted }]}>
            👍 Helpful ({review.helpfulCount})
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  contractorName: {
    fontSize: 14,
    fontWeight: "600",
  },
  trade: {
    fontSize: 12,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  date: {
    fontSize: 11,
  },
  customerRef: {
    fontSize: 13,
    fontWeight: "600",
  },
  jobRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  jobTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
  },
  jobDate: {
    fontSize: 12,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
  },
  flagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  flagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  flagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 2,
  },
  helpfulBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  helpfulText: {
    fontSize: 12,
  },
});
