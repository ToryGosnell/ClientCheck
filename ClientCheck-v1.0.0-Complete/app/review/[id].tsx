import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenBackground } from "@/components/screen-background";
import { StarRating } from "@/components/star-rating";
import { FlagReviewModal } from "@/components/flag-review-modal";
import { CustomerResponseSection } from "@/components/customer-response-section";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { track } from "@/lib/analytics";
import {
  REVIEW_CATEGORIES,
  WOULD_WORK_AGAIN_BADGE,
  deserializeNewCategories,
  legacyToCategories,
  legacyToWouldWorkAgain,
  type WouldWorkAgainValue,
  type ReviewCategoryRatings,
} from "@/shared/review-categories";
import { parseFlags, getFlagLabel, isCriticalFlag } from "@/shared/review-flags";
import { getModerationUi } from "@/shared/review-moderation-labels";
import {
  TRUST_LABEL,
  isContractorVerificationBadge,
  meetsVerifiedReportCriteria,
} from "@/shared/trust-labels";

export default function ReviewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const reviewId = parseInt(id ?? "0", 10);
  const [showFlagModal, setShowFlagModal] = useState(false);

  const { data: review, isLoading } = trpc.reviews.getById.useQuery(
    { id: reviewId },
    { enabled: !!reviewId },
  );

  const { data: disputeRows } = trpc.disputes.getDisputesByReview.useQuery(
    { reviewId },
    { enabled: reviewId > 0 },
  );
  const { data: customerResp } = trpc.customerResponse.get.useQuery(
    { reviewId },
    { enabled: reviewId > 0 },
  );

  useEffect(() => {
    if (review) track("review_viewed", { review_id: reviewId });
  }, [review?.id]);

  if (isLoading) {
    return (
      <ScreenBackground backgroundKey="dashboard" overlayOpacity={0.9}>
        <ScreenContainer>
          <View style={s.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        </ScreenContainer>
      </ScreenBackground>
    );
  }

  if (!review) {
    return (
      <ScreenBackground backgroundKey="dashboard" overlayOpacity={0.9}>
        <ScreenContainer>
          <View style={[s.topBar, { borderBottomColor: "rgba(255,255,255,0.06)" }]}>
            <Pressable onPress={() => router.back()} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}>
              <Text style={[s.backBtnText, { color: colors.primary }]}>‹ Back</Text>
            </Pressable>
            <Text style={[s.topTitle, { color: colors.foreground }]}>Review</Text>
            <View style={s.backBtn} />
          </View>
          <View style={s.centered}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
            <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}>Review Not Found</Text>
            <Text style={{ color: colors.muted, fontSize: 14, marginTop: 6 }}>This review may have been removed.</Text>
          </View>
        </ScreenContainer>
      </ScreenBackground>
    );
  }

  const { redFlags, greenFlags } = parseFlags(review.redFlags);
  const criticalRedFlags = redFlags.filter(isCriticalFlag);
  const normalRedFlags = redFlags.filter((f) => !isCriticalFlag(f));
  const parsedGreenFlags = parseFlags(review.greenFlags).greenFlags;

  const date = new Date(review.createdAt).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const parsed = deserializeNewCategories((review as any).categoryDataJson ?? null);
  const categories: ReviewCategoryRatings =
    parsed?.categories ?? legacyToCategories(review as unknown as Record<string, unknown>);
  const wwa: WouldWorkAgainValue =
    (parsed?.wouldWorkAgain as WouldWorkAgainValue) ??
    legacyToWouldWorkAgain(review as unknown as Record<string, unknown>);
  const wwaBadge = WOULD_WORK_AGAIN_BADGE[wwa];

  const reviewBody = review.reviewText || (review as any).comment || null;
  const modStatus = ((review as any).moderationStatus as string | undefined) ?? "active";
  const modUi = getModerationUi(modStatus);
  const customerName = (review as any).customerFirstName && (review as any).customerLastName
    ? `${(review as any).customerFirstName} ${(review as any).customerLastName}`
    : null;
  const customerLoc = [(review as any).customerCity, (review as any).customerState].filter(Boolean).join(", ");

  const showVerifiedContractor = isContractorVerificationBadge((review as any).contractorVerified);
  const verifiedReport = meetsVerifiedReportCriteria(review);
  const disputeSubmitted = !!(disputeRows && disputeRows.length > 0);
  const hasCustomerResponse = !!(customerResp?.responseText?.trim());
  const showTrustChips =
    showVerifiedContractor || verifiedReport || hasCustomerResponse || disputeSubmitted;

  return (
    <ScreenBackground backgroundKey="dashboard" overlayOpacity={0.9}>
      <ScreenContainer edges={["top", "left", "right"]}>
        <View style={[s.topBar, { borderBottomColor: "rgba(255,255,255,0.06)" }]}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}>
            <Text style={[s.backBtnText, { color: colors.primary }]}>‹ Back</Text>
          </Pressable>
          <Text style={[s.topTitle, { color: colors.foreground }]}>Full Review</Text>
          <View style={s.backBtn} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {modStatus !== "active" && (
            <View style={[s.modBanner, { backgroundColor: modUi.bg, borderColor: modUi.accent + "44" }]}>
              <Text style={[s.modBannerTitle, { color: modUi.accent }]}>Review status: {modUi.label}</Text>
              <Text style={[s.modBannerSub, { color: colors.muted }]}>{modUi.sublabel}</Text>
            </View>
          )}

          {showTrustChips && (
            <View style={s.trustStrip}>
              <Text style={[s.trustStripLabel, { color: colors.muted }]}>Trust signals</Text>
              <View style={s.trustRow}>
                {showVerifiedContractor && (
                  <View style={[s.trustBadge, { backgroundColor: "#3b82f618", borderColor: "#3b82f644" }]}>
                    <Text style={{ color: "#3b82f6", fontSize: 11, fontWeight: "700" }}>
                      ✓ {TRUST_LABEL.VERIFIED_CONTRACTOR}
                    </Text>
                  </View>
                )}
                {verifiedReport && (
                  <View style={[s.trustBadge, { backgroundColor: "#10b98118", borderColor: "#10b98144" }]}>
                    <Text style={{ color: "#10b981", fontSize: 11, fontWeight: "700" }}>
                      ✓ {TRUST_LABEL.VERIFIED_REPORT}
                    </Text>
                  </View>
                )}
                {hasCustomerResponse && (
                  <View style={[s.trustBadge, { backgroundColor: "#8b5cf618", borderColor: "#8b5cf644" }]}>
                    <Text style={{ color: "#a78bfa", fontSize: 11, fontWeight: "700" }}>
                      💬 {TRUST_LABEL.CUSTOMER_RESPONSE}
                    </Text>
                  </View>
                )}
                {disputeSubmitted && (
                  <View style={[s.trustBadge, { backgroundColor: "#ca8a0418", borderColor: "#ca8a0444" }]}>
                    <Text style={{ color: "#ca8a04", fontSize: 11, fontWeight: "700" }}>
                      ⚖️ {TRUST_LABEL.DISPUTE_SUBMITTED}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Rating hero */}
          <View style={s.ratingHero}>
            <Text style={[s.ratingNum, { color: colors.foreground }]}>
              {review.overallRating > 0 ? Number(review.overallRating).toFixed(1) : "—"}
            </Text>
            <StarRating rating={Number(review.overallRating)} size={22} positionalColors />
            <Text style={[s.dateText, { color: colors.muted }]}>{date}</Text>
          </View>

          {/* Customer reviewed */}
          {customerName && (
            <Pressable
              onPress={() => {
                if (review.customerId) router.push(`/customer/${review.customerId}?from=direct` as never);
              }}
              style={({ pressed }) => [s.sectionCard, { backgroundColor: colors.surface, borderColor: "rgba(255,255,255,0.06)" }, pressed && { opacity: 0.8 }]}
            >
              <Text style={[s.sectionLabel, { color: colors.muted }]}>CUSTOMER REVIEWED</Text>
              <Text style={[s.customerNameText, { color: colors.foreground }]}>{customerName}</Text>
              {!!customerLoc && <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>📍 {customerLoc}</Text>}
            </Pressable>
          )}

          {/* Reviewer */}
          <View style={[s.sectionCard, { backgroundColor: colors.surface, borderColor: "rgba(255,255,255,0.06)" }]}>
            <Text style={[s.sectionLabel, { color: colors.muted }]}>REVIEWED BY</Text>
            <View style={s.contractorRow}>
              <View style={[s.avatar, { backgroundColor: colors.primary }]}>
                <Text style={s.avatarText}>{(review.contractorName ?? "C")[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.contractorName, { color: colors.foreground }]}>
                  {review.contractorName ?? "Anonymous Contractor"}
                </Text>
                {!!(review as any).contractorTrade && (
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>{(review as any).contractorTrade}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Would Work Again */}
          {wwaBadge && (
            <View style={[s.sectionCard, { backgroundColor: colors.surface, borderColor: "rgba(255,255,255,0.06)" }]}>
              <Text style={[s.sectionLabel, { color: colors.muted }]}>WOULD WORK AGAIN</Text>
              <View style={[s.wwaPill, { backgroundColor: wwaBadge.color + "14", borderColor: wwaBadge.color + "44" }]}>
                <Text style={{ color: wwaBadge.color, fontSize: 15, fontWeight: "700" }}>{wwaBadge.label}</Text>
              </View>
            </View>
          )}

          {/* Job info */}
          {!!(review.jobType || review.jobDate || review.jobAmount) && (
            <View style={[s.sectionCard, { backgroundColor: colors.surface, borderColor: "rgba(255,255,255,0.06)" }]}>
              <Text style={[s.sectionLabel, { color: colors.muted }]}>JOB DETAILS</Text>
              <View style={s.jobTags}>
                {!!review.jobType && (
                  <View style={[s.jobTag, { backgroundColor: colors.primary + "14" }]}>
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>{review.jobType}</Text>
                  </View>
                )}
                {!!review.jobDate && (
                  <View style={[s.jobTag, { backgroundColor: "rgba(255,255,255,0.04)" }]}>
                    <Text style={{ color: colors.muted, fontSize: 13 }}>📅 {review.jobDate}</Text>
                  </View>
                )}
                {!!review.jobAmount && (
                  <View style={[s.jobTag, { backgroundColor: "rgba(255,255,255,0.04)" }]}>
                    <Text style={{ color: colors.muted, fontSize: 13 }}>💰 {review.jobAmount}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Written review */}
          <View style={[s.sectionCard, { backgroundColor: colors.surface, borderColor: "rgba(255,255,255,0.06)" }]}>
            <Text style={[s.sectionLabel, { color: colors.muted }]}>WRITTEN REVIEW</Text>
            {reviewBody ? (
              <Text style={[s.fullReviewText, { color: colors.foreground }]}>"{reviewBody}"</Text>
            ) : (
              <Text style={[s.noReviewText, { color: colors.muted }]}>No written review provided.</Text>
            )}
          </View>

          {/* Category ratings */}
          <View style={[s.sectionCard, { backgroundColor: colors.surface, borderColor: "rgba(255,255,255,0.06)" }]}>
            <Text style={[s.sectionLabel, { color: colors.muted }]}>CATEGORY RATINGS</Text>
            <View style={s.catList}>
              {REVIEW_CATEGORIES.map(({ key, label }) => {
                const val = categories[key];
                if (!val || val.notApplicable) return null;
                if (val.score == null) return null;
                return (
                  <View key={key} style={s.catRow}>
                    <Text style={[s.catLabel, { color: colors.foreground }]}>{label}</Text>
                    <View style={s.catRight}>
                      <StarRating rating={val.score} size={14} positionalColors />
                      <Text style={[s.catScore, { color: colors.muted }]}>{val.score.toFixed(1)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Flags */}
          {(criticalRedFlags.length > 0 || normalRedFlags.length > 0 || parsedGreenFlags.length > 0) && (
            <View style={[s.sectionCard, { backgroundColor: colors.surface, borderColor: "rgba(255,255,255,0.06)" }]}>
              <Text style={[s.sectionLabel, { color: colors.muted }]}>FLAGS</Text>
              <View style={s.flagsWrap}>
                {criticalRedFlags.map((flag) => (
                  <View key={flag} style={[s.flagChip, { backgroundColor: "#DC262625", borderColor: "#DC2626" }]}>
                    <Text style={{ color: "#DC2626", fontSize: 12, fontWeight: "800" }}>⚠️ {getFlagLabel(flag)}</Text>
                  </View>
                ))}
                {normalRedFlags.map((flag) => (
                  <View key={flag} style={[s.flagChip, { backgroundColor: colors.error + "14", borderColor: colors.error + "44" }]}>
                    <Text style={{ color: colors.error, fontSize: 12, fontWeight: "600" }}>🚩 {getFlagLabel(flag)}</Text>
                  </View>
                ))}
                {parsedGreenFlags.map((flag) => (
                  <View key={flag} style={[s.flagChip, { backgroundColor: "#22C55E14", borderColor: "#22C55E44" }]}>
                    <Text style={{ color: "#22C55E", fontSize: 12, fontWeight: "600" }}>✅ {getFlagLabel(flag)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Helpful */}
          <View style={[s.sectionCard, { backgroundColor: colors.surface, borderColor: "rgba(255,255,255,0.06)" }]}>
            <View style={s.helpfulRow}>
              <Text style={{ color: colors.muted, fontSize: 13 }}>
                👍 {review.helpfulCount ?? 0} contractor{(review.helpfulCount ?? 0) !== 1 ? "s" : ""} found this helpful
              </Text>
            </View>
          </View>

          {/* Dispute button */}
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <Pressable
              onPress={() => router.push({ pathname: "/dispute-review", params: { reviewId: String(reviewId), customerId: String(review.customerId ?? "") } } as never)}
              style={({ pressed }) => [s.disputeBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={s.disputeBtnText}>⚖️ Dispute This Review</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowFlagModal(true)}
              style={({ pressed }) => [s.flagBtn, pressed && { opacity: 0.8 }]}
            >
              <Text style={s.flagBtnText}>Request review evaluation</Text>
            </Pressable>
          </View>

          {/* Customer Response */}
          <CustomerResponseSection reviewId={reviewId} currentUserId={user?.id} />

          <FlagReviewModal visible={showFlagModal} reviewId={reviewId} onClose={() => setShowFlagModal(false)} />

          {/* Verification footer */}
          <View style={s.verifyFooter}>
            <Text style={s.verifyText}>
              {showVerifiedContractor
                ? `🛡️ Submitted by a ${TRUST_LABEL.VERIFIED_CONTRACTOR} — documented experience for contractor risk intelligence and informed decisions. Subject to ClientCheck content policies.`
                : `📋 Contractor-sourced report for risk intelligence and informed job decisions — documented experiences, not guarantees. Subject to ClientCheck content policies.`}
            </Text>
          </View>
        </ScrollView>
      </ScreenContainer>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { minWidth: 60 },
  backBtnText: { fontSize: 15, fontWeight: "600" },
  topTitle: { fontSize: 16, fontWeight: "700", flex: 1, textAlign: "center", letterSpacing: -0.3 },
  scroll: { paddingBottom: 80 },

  modBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  modBannerTitle: { fontSize: 14, fontWeight: "800" },
  modBannerSub: { fontSize: 12, lineHeight: 17 },

  trustStrip: { marginHorizontal: 16, marginTop: 10, marginBottom: 4, gap: 8 },
  trustStripLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  trustRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  trustBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },

  ratingHero: { alignItems: "center", paddingVertical: 32, gap: 8 },
  ratingNum: { fontSize: 56, fontWeight: "800", letterSpacing: -2, lineHeight: 60 },
  dateText: { fontSize: 13, marginTop: 4 },

  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  customerNameText: { fontSize: 18, fontWeight: "700" },

  contractorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  contractorName: { fontSize: 16, fontWeight: "600" },

  wwaPill: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },

  jobTags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  jobTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },

  fullReviewText: { fontSize: 15, lineHeight: 24, fontStyle: "italic" },
  noReviewText: { fontSize: 14, fontStyle: "italic" },

  catList: { gap: 12 },
  catRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  catLabel: { fontSize: 13, fontWeight: "500", flex: 1 },
  catRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  catScore: { fontSize: 12, fontWeight: "600", width: 28, textAlign: "right" },

  flagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flagChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },

  helpfulRow: { flexDirection: "row", alignItems: "center" },

  disputeBtn: {
    backgroundColor: "#ca8a0414",
    borderWidth: 1,
    borderColor: "#ca8a0444",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  disputeBtnText: { color: "#ca8a04", fontSize: 14, fontWeight: "700" },
  flagBtn: {
    backgroundColor: "#ef444414",
    borderWidth: 1,
    borderColor: "#ef444444",
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 6,
    alignItems: "center",
  },
  flagBtnText: { color: "#ef4444", fontSize: 14, fontWeight: "700" },

  verifyFooter: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    marginBottom: 24,
  },
  verifyText: { color: "rgba(255,255,255,0.25)", fontSize: 11, textAlign: "center", lineHeight: 16 },
});
