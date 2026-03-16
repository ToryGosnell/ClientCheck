import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { StarRating } from "@/components/star-rating";
import { RiskBadge } from "@/components/risk-badge";
import { ReviewCard } from "@/components/review-card";
import { CategoryRating } from "@/components/category-rating";
import { RatingBreakdown } from "@/components/rating-breakdown";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import type { RiskLevel, ReviewWithContractor } from "@/shared/types";

const CATEGORY_LABELS = [
  { key: "ratingPaidOnTime", label: "Paid on Time", description: "Did they pay promptly?" },
  { key: "ratingCommunication", label: "Communication", description: "Were they responsive?" },
  { key: "ratingKnewWhatTheyWanted", label: "Clear Scope", description: "Did they know what they wanted?" },
  { key: "ratingProfessionalism", label: "Professionalism", description: "Were they respectful?" },
  { key: "ratingInvoiceAccuracy", label: "Invoice Accuracy", description: "Did they dispute charges?" },
  { key: "ratingWouldWorkAgain", label: "Would Work Again", description: "Overall recommendation?" },
] as const;

export default function CustomerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const customerId = parseInt(id ?? "0", 10);

  const { data: customer, isLoading: loadingCustomer } = trpc.customers.getById.useQuery(
    { id: customerId },
    { enabled: !!customerId }
  );
  const { data: reviewsData, isLoading: loadingReviews, refetch: refetchReviews } = trpc.reviews.getForCustomer.useQuery(
    { customerId },
    { enabled: !!customerId }
  );
  const reviews = reviewsData?.reviews ?? [];
  const aggregatedRatings = reviewsData?.aggregatedRatings ?? {};
  const markHelpful = trpc.reviews.markHelpful.useMutation({ onSuccess: () => refetchReviews() });
  const [sortBy, setSortBy] = useState<"recent" | "rating" | "helpful">("recent");
  const [groupByLocation, setGroupByLocation] = useState(true);

  // Group reviews by location if enabled
  const groupedReviews = groupByLocation
    ? reviews.reduce((acc, review) => {
        const location = `${(review as any).city || "Unknown"}, ${(review as any).state || ""}`.trim();
        if (!acc[location]) acc[location] = [];
        acc[location].push(review);
        return acc;
      }, {} as Record<string, typeof reviews>)
    : { "All Reviews": reviews };

  // Sort reviews based on selected sort option
  const sortedGroupedReviews = Object.entries(groupedReviews).map(([location, locationReviews]) => {
    const sorted = [...locationReviews];
    if (sortBy === "recent") {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "rating") {
      sorted.sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0));
    } else if (sortBy === "helpful") {
      sorted.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
    }
    return [location, sorted] as const;
  });


  if (loadingCustomer) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (!customer) {
    return (
      <ScreenContainer className="p-6">
        <Text style={[styles.errorText, { color: colors.error }]}>Customer not found.</Text>
      </ScreenContainer>
    );
  }

  const overallRating = parseFloat(customer.overallRating ?? "0");
  const initials = `${customer.firstName[0] ?? ""}${customer.lastName[0] ?? ""}`.toUpperCase();
  const avatarBg =
    customer.riskLevel === "high"
      ? colors.error
      : customer.riskLevel === "medium"
      ? colors.warning
      : customer.riskLevel === "low"
      ? colors.success
      : colors.muted;

  // Build star distribution
  const dist = [5, 4, 3, 2, 1].map(
    (star) => (reviews ?? []).filter((r) => r.overallRating === star).length
  );

  // Use aggregated overall rating if available, otherwise use customer's rating
  const displayOverallRating = (aggregatedRatings as any)?.overallRating ?? overallRating;

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]} numberOfLines={1}>
          Customer Profile
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[styles.heroAvatar, { backgroundColor: avatarBg }]}>
            <Text style={styles.heroAvatarText}>{initials}</Text>
          </View>
          <Text style={[styles.heroName, { color: colors.foreground }]}>
            {customer.firstName} {customer.lastName}
          </Text>
          {(customer.city || customer.state) && (
            <Text style={[styles.heroLocation, { color: colors.muted }]}>
              📍 {[customer.city, customer.state].filter(Boolean).join(", ")}
            </Text>
          )}
          {customer.phone && (
            <Text style={[styles.heroPhone, { color: colors.muted }]}>📞 {customer.phone}</Text>
          )}

          <View style={styles.ratingHero}>
            <Text style={[styles.ratingNumber, { color: colors.foreground }]}>
              {overallRating > 0 ? overallRating.toFixed(1) : "—"}
            </Text>
            <View style={styles.ratingStarsCol}>
              <StarRating rating={overallRating} size={20} />
              <Text style={[styles.reviewCountText, { color: colors.muted }]}>
                {customer.reviewCount} {customer.reviewCount === 1 ? "review" : "reviews"}
              </Text>
            </View>
          </View>

          <RiskBadge riskLevel={customer.riskLevel as RiskLevel} />
        </View>

        {/* Rating Breakdown */}
        {customer.reviewCount > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Rating Breakdown</Text>
            <RatingBreakdown reviewCount={customer.reviewCount} distribution={dist} />
          </View>
        )}

        {/* Category Ratings */}
        {customer.reviewCount > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Category Averages</Text>
            {CATEGORY_LABELS.map(({ key, label, description }) => (
              <CategoryRating
                key={key}
                label={label}
                description={description}
                rating={parseFloat((customer as Record<string, unknown>)[key] as string ?? "0")}
              />
            ))}
          </View>
        )}

        {/* Reviews */}
        <View style={styles.reviewsSection}>
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Reviews ({customer.reviewCount})
            </Text>

            {/* Sorting Options */}
            {reviews.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 12, color: colors.muted, fontWeight: "600" }}>Sort by:</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(["recent", "rating", "helpful"] as const).map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => setSortBy(option)}
                      style={({ pressed }) => [{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 20,
                        backgroundColor: sortBy === option ? colors.primary : colors.surface,
                        opacity: pressed ? 0.7 : 1,
                      }]}
                    >
                      <Text style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: sortBy === option ? colors.background : colors.foreground,
                      }}>
                        {option === "recent" ? "Recent" : option === "rating" ? "Highest Rated" : "Most Helpful"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Location Grouping Toggle */}
            {reviews.length > 0 && (
              <Pressable
                onPress={() => setGroupByLocation(!groupByLocation)}
                style={({ pressed }) => [{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.7 : 1,
                }]}
              >
                <Text style={{ fontSize: 12, color: colors.foreground, fontWeight: "600" }}>
                  {groupByLocation ? "✓ Grouped by Location" : "Show All Reviews"}
                </Text>
              </Pressable>
            )}
          </View>

          {loadingReviews ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : reviews?.length > 0 ? (
            <View style={styles.reviewsList}>
              {sortedGroupedReviews.map(([location, locationReviews]) => (
                <View key={location} style={{ gap: 12 }}>
                  {groupByLocation && (
                    <View style={{ paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                        {location} ({locationReviews.length})
                      </Text>
                    </View>
                  )}
                  {(locationReviews as ReviewWithContractor[]).map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      onHelpful={() => markHelpful.mutate({ reviewId: review.id })}
                    />
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyReviews}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                No reviews yet. Be the first to review this customer.
              </Text>
            </View>
          )}
        </View>

        {/* Add Review CTA */}
        <View style={styles.ctaContainer}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/add-review",
                params: { customerId: customer.id, customerName: `${customer.firstName} ${customer.lastName}` },
              })
            }
            style={({ pressed }) => [
              styles.ctaBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={styles.ctaBtnText}>+ Add Your Review</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 60,
  },
  backText: {
    fontSize: 17,
    fontWeight: "500",
  },
  topTitle: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  scroll: {
    paddingBottom: 100,
  },
  hero: {
    alignItems: "center",
    padding: 24,
    gap: 8,
    borderBottomWidth: 0.5,
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroAvatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
  },
  heroName: {
    fontSize: 24,
    fontWeight: "700",
  },
  heroLocation: {
    fontSize: 15,
  },
  heroPhone: {
    fontSize: 14,
  },
  ratingHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 8,
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: "700",
    lineHeight: 56,
  },
  ratingStarsCol: {
    gap: 4,
  },
  reviewCountText: {
    fontSize: 13,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
  },
  reviewsSection: {
    marginTop: 20,
    gap: 8,
  },
  reviewsList: {
    paddingHorizontal: 16,
  },
  emptyReviews: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  ctaContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  ctaBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  ctaBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
});
