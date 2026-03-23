import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { StarRating } from "@/components/star-rating";
import type { ReviewWithContractor } from "@/shared/types";
import {
  REVIEW_CATEGORIES,
  WOULD_WORK_AGAIN_BADGE,
  deserializeNewCategories,
  legacyToCategories,
  legacyToWouldWorkAgain,
  type WouldWorkAgainValue,
  type ReviewCategoryRatings,
} from "@/shared/review-categories";
import {
  parseFlags,
  getFlagLabel,
  isCriticalFlag,
} from "@/shared/review-flags";
import { getModerationUi } from "@/shared/review-moderation-labels";
import {
  TRUST_LABEL,
  isContractorVerificationBadge,
  meetsVerifiedReportCriteria,
} from "@/shared/trust-labels";

const MAX_PREVIEW_CHARS = 280;

function truncateReview(text: string): string {
  if (text.length <= MAX_PREVIEW_CHARS) return text;
  const truncated = text.slice(0, MAX_PREVIEW_CHARS);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 200 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

interface ReviewCardProps {
  review: ReviewWithContractor;
  onHelpful?: () => void;
  onDispute?: () => void;
  showCustomerName?: boolean;
  customerName?: string;
  customerLocation?: string;
  showCategories?: boolean;
  showViewHint?: boolean;
  isContractorVerified?: boolean;
  /** At least one dispute record exists for this review (from parent query). */
  disputeSubmitted?: boolean;
  /** Customer posted a public response (optional; omit if unknown). */
  hasCustomerResponse?: boolean;
}

export function ReviewCard({
  review,
  onHelpful,
  onDispute,
  showCustomerName,
  customerName,
  customerLocation,
  showCategories = false,
  showViewHint = false,
  isContractorVerified = false,
  disputeSubmitted = false,
  hasCustomerResponse = false,
}: ReviewCardProps) {
  const colors = useColors();
  const { redFlags, greenFlags } = parseFlags(review.redFlags);
  const date = new Date(review.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const parsed = deserializeNewCategories(review.categoryDataJson ?? null);
  const categories: ReviewCategoryRatings =
    parsed?.categories ?? legacyToCategories(review as unknown as Record<string, unknown>);
  const wwa: WouldWorkAgainValue =
    (parsed?.wouldWorkAgain as WouldWorkAgainValue) ??
    legacyToWouldWorkAgain(review as unknown as Record<string, unknown>);
  const wwaBadge = WOULD_WORK_AGAIN_BADGE[wwa];

  const criticalRedFlags = redFlags.filter(isCriticalFlag);
  const normalRedFlags = redFlags.filter((f) => !isCriticalFlag(f));

  const reviewBody = review.reviewText || (review as any).comment || null;

  const moderationStatus = ((review as any).moderationStatus as string | undefined) ?? "active";
  const modUi = getModerationUi(moderationStatus);
  const showStatusBadge = moderationStatus !== "active";
  const verifiedReport = meetsVerifiedReportCriteria(review);
  const showVerifiedContractor =
    isContractorVerified || isContractorVerificationBadge(review.contractorVerified);
  const underReviewFlow =
    moderationStatus === "hidden_flagged" || moderationStatus === "under_investigation";

  return (
    <View style={[
      styles.card,
      { backgroundColor: colors.surface, borderColor: colors.border },
      underReviewFlow && styles.underReviewCard,
    ]}>
      {showStatusBadge && (
        <View style={[styles.statusBadge, { backgroundColor: modUi.bg, borderColor: modUi.accent + "55" }]}>
          <Text style={[styles.statusBadgeLabel, { color: modUi.accent }]}>{modUi.label}</Text>
          <Text style={[styles.statusBadgeSub, { color: colors.muted }]}>{modUi.sublabel}</Text>
        </View>
      )}

      {/* Customer header — who the review is about */}
      {showCustomerName && customerName ? (
        <View style={styles.customerHeader}>
          <View style={styles.customerHeaderLeft}>
            <Text style={[styles.reviewForLabel, { color: colors.muted }]}>Reviewed for:</Text>
            <Text style={[styles.customerName, { color: colors.foreground }]}>{customerName}</Text>
            {!!customerLocation && (
              <Text style={[styles.customerLocation, { color: colors.muted }]}>📍 {customerLocation}</Text>
            )}
          </View>
          <View style={styles.ratingCol}>
            <StarRating rating={review.overallRating} size={14} positionalColors />
            <Text style={[styles.date, { color: colors.muted }]}>{date}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.headerRow}>
          <StarRating rating={review.overallRating} size={14} positionalColors />
          <Text style={[styles.date, { color: colors.muted }]}>{date}</Text>
        </View>
      )}

      {/* Contractor line — who wrote the review */}
      <View style={styles.contractorRow}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {(review.contractorName ?? "C")[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.reviewByLabel, { color: colors.muted }]}>Review by:</Text>
          <Text style={[styles.contractorName, { color: colors.foreground }]}>
            {review.contractorName ?? "Anonymous Contractor"}
          </Text>
        </View>
      </View>

      {/* Trust badges */}
      <View style={styles.trustRow}>
        {showVerifiedContractor && (
          <View style={[styles.trustBadge, { backgroundColor: "#3b82f618", borderColor: "#3b82f644" }]}>
            <Text style={{ color: "#3b82f6", fontSize: 11, fontWeight: "700" }}>
              ✓ {TRUST_LABEL.VERIFIED_CONTRACTOR}
            </Text>
          </View>
        )}
        {verifiedReport && (
          <View style={[styles.trustBadge, { backgroundColor: "#10b98118", borderColor: "#10b98144" }]}>
            <Text style={{ color: "#10b981", fontSize: 11, fontWeight: "700" }}>
              ✓ {TRUST_LABEL.VERIFIED_REPORT}
            </Text>
          </View>
        )}
        {hasCustomerResponse && (
          <View style={[styles.trustBadge, { backgroundColor: "#8b5cf618", borderColor: "#8b5cf644" }]}>
            <Text style={{ color: "#a78bfa", fontSize: 11, fontWeight: "700" }}>
              💬 {TRUST_LABEL.CUSTOMER_RESPONSE}
            </Text>
          </View>
        )}
        {disputeSubmitted && (
          <View style={[styles.trustBadge, { backgroundColor: "#ca8a0418", borderColor: "#ca8a0444" }]}>
            <Text style={{ color: "#ca8a04", fontSize: 11, fontWeight: "700" }}>
              ⚖️ {TRUST_LABEL.DISPUTE_SUBMITTED}
            </Text>
          </View>
        )}
      </View>

      {/* Would Work Again badge */}
      {wwaBadge && (
        <View style={[styles.wwaBadge, { backgroundColor: wwaBadge.color + "18", borderColor: wwaBadge.color + "44" }]}>
          <Text style={[styles.wwaBadgeText, { color: wwaBadge.color }]}>{wwaBadge.label}</Text>
        </View>
      )}

      {!!(review.jobType || review.jobDate) && (
        <View style={styles.jobRow}>
          {!!review.jobType && (
            <Text style={[styles.jobTag, { backgroundColor: colors.primary + "18", color: colors.primary }]}>
              {review.jobType}
            </Text>
          )}
          {!!review.jobDate && (
            <Text style={[styles.jobDate, { color: colors.muted }]}>{review.jobDate}</Text>
          )}
          {!!review.jobAmount && (
            <Text style={[styles.jobDate, { color: colors.muted }]}>{review.jobAmount}</Text>
          )}
        </View>
      )}

      {/* Category breakdown (opt-in) */}
      {showCategories && (
        <View style={[styles.catSection, { borderTopColor: colors.border }]}>
          {REVIEW_CATEGORIES.map(({ key, label }) => {
            const val = categories[key];
            if (!val || val.notApplicable) return null;
            if (val.score == null) return null;
            return (
              <View key={key} style={styles.catRow}>
                <Text style={[styles.catLabel, { color: colors.muted }]}>{label}</Text>
                <StarRating rating={val.score} size={12} positionalColors />
              </View>
            );
          })}
        </View>
      )}

      {/* Review text preview */}
      {reviewBody ? (
        <Text style={[styles.reviewText, { color: colors.foreground }]}>
          "{truncateReview(reviewBody)}"
        </Text>
      ) : (
        <Text style={[styles.noReviewText, { color: colors.muted }]}>
          No written review provided.
        </Text>
      )}

      {/* Critical red flags first */}
      {criticalRedFlags.length > 0 && (
        <View style={styles.flagsContainer}>
          {criticalRedFlags.map((flag) => (
            <View
              key={flag}
              style={[styles.flagChip, { backgroundColor: "#DC262630", borderColor: "#DC2626", borderWidth: 2 }]}
            >
              <Text style={[styles.flagText, { color: "#DC2626", fontWeight: "800" }]}>
                {"⚠️ "}{getFlagLabel(flag)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Normal red flags */}
      {normalRedFlags.length > 0 && (
        <View style={styles.flagsContainer}>
          {normalRedFlags.map((flag) => (
            <View
              key={flag}
              style={[styles.flagChip, { backgroundColor: colors.error + "18", borderColor: colors.error + "44" }]}
            >
              <Text style={[styles.flagText, { color: colors.error }]}>
                {"🚩 "}{getFlagLabel(flag)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Green flags */}
      {greenFlags.length > 0 && (
        <View style={styles.flagsContainer}>
          {greenFlags.map((flag) => (
            <View
              key={flag}
              style={[styles.flagChip, { backgroundColor: "#22C55E18", borderColor: "#22C55E44" }]}
            >
              <Text style={[styles.flagText, { color: "#22C55E" }]}>
                {"✅ "}{getFlagLabel(flag)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Pressable
            onPress={onHelpful}
            style={({ pressed }) => [
              styles.helpfulBtn,
              { borderColor: colors.border },
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.helpfulText, { color: colors.muted }]}>
              Helpful ({review.helpfulCount})
            </Text>
          </Pressable>
          {onDispute && (
            <Pressable
              onPress={onDispute}
              style={({ pressed }) => [
                styles.disputeBtn,
                { borderColor: "#ca8a0444" },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={[styles.disputeText, { color: "#ca8a04" }]}>⚖️ Dispute</Text>
            </Pressable>
          )}
        </View>
        {showViewHint && (
          <Text style={[styles.viewHint, { color: colors.primary }]}>View full review ›</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12, gap: 12 },
  underReviewCard: { opacity: 0.92, borderColor: "#f59e0b44" },

  statusBadge: {
    alignSelf: "stretch",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 2,
  },
  statusBadgeLabel: { fontSize: 12, fontWeight: "800" },
  statusBadgeSub: { fontSize: 10, fontWeight: "600", marginTop: 2 },

  trustRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  trustBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },

  customerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  customerHeaderLeft: { flex: 1, gap: 1 },
  reviewForLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  customerName: { fontSize: 16, fontWeight: "700" },
  customerLocation: { fontSize: 12, marginTop: 1 },
  ratingCol: { alignItems: "flex-end", gap: 2 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { fontSize: 11 },

  contractorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  reviewByLabel: { fontSize: 10, fontWeight: "500" },
  contractorName: { fontSize: 13, fontWeight: "600" },

  wwaBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  wwaBadgeText: { fontSize: 12, fontWeight: "600" },

  jobRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
  jobTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, fontSize: 12, fontWeight: "600", overflow: "hidden" },
  jobDate: { fontSize: 12 },

  catSection: { borderTopWidth: 1, paddingTop: 8, gap: 4 },
  catRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  catLabel: { fontSize: 12 },

  reviewText: { fontSize: 14, lineHeight: 21, fontStyle: "italic" },
  noReviewText: { fontSize: 13, fontStyle: "italic" },

  flagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  flagChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  flagText: { fontSize: 11, fontWeight: "600" },

  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  footerLeft: { flexDirection: "row", gap: 8, alignItems: "center" },
  helpfulBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  helpfulText: { fontSize: 12 },
  disputeBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  disputeText: { fontSize: 12, fontWeight: "600" },
  viewHint: { fontSize: 12, fontWeight: "600" },
});
