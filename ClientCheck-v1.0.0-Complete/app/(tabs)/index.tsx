import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { CustomerCard } from "@/components/customer-card";
import { ReviewCard } from "@/components/review-card";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import type { Customer } from "@/drizzle/schema";
import type { ReviewWithContractor } from "@/shared/types";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const { data: flaggedCustomers, isLoading: loadingFlagged } = trpc.customers.getFlagged.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: recentReviews, isLoading: loadingReviews, refetch } = trpc.reviews.getRecent.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const markHelpful = trpc.reviews.markHelpful.useMutation({ onSuccess: () => refetch() });

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="p-6">
        <View style={styles.authPrompt}>
          <Text style={[styles.authTitle, { color: colors.foreground }]}>ClientCheck</Text>
          <Text style={[styles.authSubtitle, { color: colors.muted }]}>
            The contractor's tool to vet customers before accepting jobs.
          </Text>
          <Text style={[styles.authDesc, { color: colors.muted }]}>
            Search customer reviews, check payment history, and protect yourself from problem clients.
          </Text>
          <Pressable
            onPress={() => router.push("/oauth/callback" as never)}
            style={({ pressed }) => [
              styles.loginBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.loginBtnText}>Sign In to Continue</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.muted }]}>
              Welcome back,
            </Text>
            <Text style={[styles.userName, { color: colors.foreground }]}>
              {user?.name?.split(' ')[0] ?? "Contractor"}!
            </Text>
          </View>
          <View style={[styles.shieldBadge, { backgroundColor: colors.primary + "18" }]}>
            <Text style={[styles.shieldText, { color: colors.primary }]}>🛡️ Protected</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.success + "15", borderColor: colors.success }]}>
            <Text style={styles.statEmoji}>🟢</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>3</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Safe</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.error + "15", borderColor: colors.error }]}>
            <Text style={styles.statEmoji}>⚠️</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>2</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Flags</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.primary + "15", borderColor: colors.primary }]}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>12</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Reviews</Text>
          </View>
        </View>

        {/* Quick search bar */}
        <Pressable
          onPress={() => router.push("/(tabs)/search" as never)}
          style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.searchIcon, { color: colors.muted }]}>🔍</Text>
          <Text style={[styles.searchPlaceholder, { color: colors.muted }]}>
            Search customers by name or phone...
          </Text>
        </Pressable>

        {/* Platform Expansion */}
        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>🚀 Growth & Infrastructure</Text>
        </View>
        <View style={styles.quickGrid}>
          {[
            { label: "Network Value", path: "/network-value" },
            { label: "Payment Protection", path: "/payment-protection" },
            { label: "Integrations", path: "/software-integrations" },
            { label: "Trust Network", path: "/trust-network" },
            { label: "Industry Intel", path: "/industry-intelligence" },
          ].map((item) => (
            <Pressable
              key={item.path}
              onPress={() => router.push(item.path as never)}
              style={({ pressed }) => [styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.8 }]}
            >
              <Text style={[styles.quickCardText, { color: colors.foreground }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>💼 Revenue & Retention</Text>
        </View>
        <View style={styles.quickGrid}>
          {[
            { label: "Collections", path: "/collections-recovery" },
            { label: "Deposits", path: "/deposit-prepay-tools" },
            { label: "Benchmarks", path: "/contractor-benchmarking" },
            { label: "Intake AI", path: "/smart-intake-assistant" },
            { label: "Passport", path: "/market-reputation-passport" },
            { label: "Partners", path: "/b2b-partnerships" },
            { label: "Enterprise", path: "/enterprise-platform" },
            { label: "Review→Claim", path: "/review-to-claim" },
            { label: "Territories", path: "/predictive-territory-intelligence" },
            { label: "Payment Rail", path: "/payment-control" },
          ].map((item) => (
            <Pressable
              key={item.path}
              onPress={() => router.push(item.path as never)}
              style={({ pressed }) => [styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.8 }]}
            >
              <Text style={[styles.quickCardText, { color: colors.foreground }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Recently Flagged */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            🔴 Recently Flagged
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/alerts" as never)}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </Pressable>
        </View>

        {loadingFlagged ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
        ) : flaggedCustomers && flaggedCustomers.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {flaggedCustomers.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => router.push(`/customer/${c.id}` as never)}
                style={({ pressed }) => [
                  styles.flaggedCard,
                  { backgroundColor: colors.surface, borderColor: colors.error + "66" },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <View style={[styles.flaggedAvatar, { backgroundColor: colors.error }]}>
                  <Text style={styles.flaggedAvatarText}>
                    {c.firstName[0]}{c.lastName[0]}
                  </Text>
                </View>
                <Text style={[styles.flaggedName, { color: colors.foreground }]} numberOfLines={1}>
                  {c.firstName} {c.lastName}
                </Text>
                {c.city && (
                  <Text style={[styles.flaggedCity, { color: colors.muted }]} numberOfLines={1}>
                    {c.city}, {c.state}
                  </Text>
                )}
                <View style={[styles.flaggedRating, { backgroundColor: colors.error + "18" }]}>
                  <Text style={[styles.flaggedRatingText, { color: colors.error }]}>
                    ⭐ {parseFloat(c.overallRating ?? "0").toFixed(1)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              No high-risk customers flagged yet. The community is clean! 🎉
            </Text>
          </View>
        )}

        {/* Recent Community Reviews */}
        <View style={[styles.sectionHeader, { marginTop: 8 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            📋 Recent Reviews
          </Text>
        </View>

        {loadingReviews ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
        ) : recentReviews && recentReviews.length > 0 ? (
          <View>
            {(recentReviews as (ReviewWithContractor & {
              customerFirstName?: string | null;
              customerLastName?: string | null;
              customerCity?: string | null;
              customerState?: string | null;
              customerRiskLevel?: string | null;
              customerId: number;
            })[]).map((review) => (
              <Pressable
                key={review.id}
                onPress={() => router.push(`/customer/${review.customerId}` as never)}
              >
                <ReviewCard
                  review={review}
                  showCustomerName
                  customerName={
                    review.customerFirstName && review.customerLastName
                      ? `${review.customerFirstName} ${review.customerLastName}`
                      : undefined
                  }
                  onHelpful={() => markHelpful.mutate({ reviewId: review.id })}
                />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              No reviews yet. Start by adding a review for a customer you've worked with.
            </Text>
            <Pressable
              onPress={() => router.push("/add-review" as never)}
              style={[styles.addFirstBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.addFirstBtnText}>Add First Review</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => router.push("/add-review" as never)}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary },
          pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] },
        ]}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 100,
  },
  authPrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 8,
  },
  authTitle: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  authSubtitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  authDesc: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  loginBtn: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
  },
  shieldBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  shieldText: {
    fontSize: 13,
    fontWeight: "600",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  searchIcon: {
    fontSize: 18,
  },
  searchPlaceholder: {
    fontSize: 15,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "500",
  },
  horizontalScroll: {
    paddingRight: 16,
    gap: 12,
    marginBottom: 20,
  },
  flaggedCard: {
    width: 140,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  flaggedAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  flaggedAvatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  flaggedName: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  flaggedCity: {
    fontSize: 11,
    textAlign: "center",
  },
  flaggedRating: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  flaggedRatingText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  addFirstBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addFirstBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "300",
    lineHeight: 32,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statEmoji: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
});
