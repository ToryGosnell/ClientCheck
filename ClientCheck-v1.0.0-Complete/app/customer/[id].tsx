import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { HeroHeaderBackground } from "@/components/screen-background";
import { StarRating } from "@/components/star-rating";
import { RiskBadge } from "@/components/risk-badge";
import { ReviewCard } from "@/components/review-card";
import { CategoryRating } from "@/components/category-rating";
import { RatingBreakdown } from "@/components/rating-breakdown";
import { ScoreBreakdownCard } from "@/components/score-breakdown";
import { DecisionPanel } from "@/components/decision-panel";
import { PaywallOverlay } from "@/components/paywall-overlay";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { computeRiskScore } from "@/lib/risk-score";
import { track } from "@/lib/analytics";
import { customerProfileShareUrl } from "@/lib/share-links";
import { hydrateUserDataFromDevice, isWatching, toggleWatch, type WatchedCustomer } from "@/lib/user-data";
import type { RiskLevel, ReviewWithContractor } from "@/shared/types";
import { REVIEW_CATEGORIES } from "@/shared/review-categories";
import { parseFlags } from "@/shared/review-flags";
import type { PrimaryStatementTone, ScoreTrend } from "@/shared/customer-score";
import { getRecentActivityWarning, type RecentActivityWarning } from "@/shared/recent-activity-warning";

const TREND_HERO: Record<
  ScoreTrend,
  { label: string; color: string }
> = {
  improving: { label: "Improving", color: "#10b981" },
  stable: { label: "Stable", color: "#94a3b8" },
  declining: { label: "Declining", color: "#ef4444" },
  new: { label: "New", color: "#3b82f6" },
};

const HERO_PRIMARY_TONE: Record<PrimaryStatementTone, string> = {
  critical: "#ef4444",
  caution: "#f59e0b",
  positive: "#10b981",
};

function customerScoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

/** Factual bullets from recent verified reports for the decision panel (safe tone). */
function buildRecentIssueSummaries(reviews: ReviewWithContractor[]): string[] {
  const windowMs = 90 * 86400000;
  const now = Date.now();
  const recent = reviews.filter((r) => now - new Date(r.createdAt).getTime() <= windowMs);
  const lines: string[] = [];

  const lowRated = recent.filter((r) => (r.overallRating ?? 0) <= 2 && (r.overallRating ?? 0) > 0);
  if (lowRated.length >= 2) {
    lines.push(
      `${lowRated.length} recent verified reports (90 days) include low overall ratings — read each for context.`,
    );
  } else if (lowRated.length === 1) {
    lines.push("One recent verified report (90 days) includes a low overall rating.");
  }

  let paymentSignals = 0;
  for (const r of recent) {
    const { redFlags } = parseFlags(r.redFlags);
    const body = `${(r as any).reviewText ?? ""} ${(r as any).comment ?? ""}`.toLowerCase();
    const mentionsPay =
      redFlags.some((f) => /pay|payment|invoice|deposit|check/i.test(f)) ||
      /late pay|slow pay|non-?payment|didn'?t pay|refused to pay/i.test(body);
    if (mentionsPay) paymentSignals++;
  }
  if (paymentSignals >= 2) {
    lines.push("Multiple recent verified reports reference payment timing or billing.");
  } else if (paymentSignals === 1) {
    lines.push("A recent verified report references payment timing or billing.");
  }

  const mod = recent.filter((r) => {
    const st = (r as any).moderationStatus as string | undefined;
    return st === "hidden_flagged" || st === "under_investigation";
  });
  if (mod.length > 0) {
    lines.push("Some recent content is under review per platform moderation.");
  }

  return lines.slice(0, 4);
}

function RecentActivityBanner({ warning }: { warning: RecentActivityWarning }) {
  const borderColor =
    warning.severity === "high"
      ? "rgba(239,68,68,0.55)"
      : warning.severity === "medium"
        ? "rgba(249,115,22,0.5)"
        : "rgba(245,158,11,0.42)";
  const backgroundColor =
    warning.severity === "high"
      ? "rgba(239,68,68,0.14)"
      : warning.severity === "medium"
        ? "rgba(249,115,22,0.12)"
        : "rgba(245,158,11,0.09)";
  const kickerColor =
    warning.severity === "high" ? "#fca5a5" : warning.severity === "medium" ? "#fdba74" : "#fcd34d";

  return (
    <View style={[s.activityBanner, { borderColor, backgroundColor }]}>
      <Text style={[s.activityBannerKicker, { color: kickerColor }]}>Recent activity</Text>
      <Text style={s.activityBannerText}>{warning.message}</Text>
    </View>
  );
}

function PremiumCard({
  children,
  colors,
  style,
}: {
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
  style?: any;
}) {
  return (
    <View
      style={[
        s.card,
        {
          backgroundColor: colors.surface,
          borderColor: "rgba(255,255,255,0.06)",
          shadowColor: "#000",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function profileSourceFromParam(from: string | undefined): "search" | "alerts" | "direct" | "other" {
  if (from === "search" || from === "alerts" || from === "direct") return from;
  return "other";
}

export default function CustomerProfileScreen() {
  const params = useLocalSearchParams<{ id: string | string[]; from?: string | string[] }>();
  const idRaw = firstParam(params.id);
  const fromRaw = firstParam(params.from);
  const router = useRouter();
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const customerId = parseInt(idRaw ?? "0", 10);

  const {
    data: customer,
    isLoading: loadingCustomer,
    isError: customerLoadError,
    error: customerLoadErr,
    refetch: refetchCustomer,
  } = trpc.customers.getById.useQuery({ id: customerId }, { enabled: !!customerId });
  const {
    data: reviewsData,
    isLoading: loadingReviews,
    refetch: refetchReviews,
  } = trpc.reviews.getForCustomer.useQuery({ customerId }, { enabled: !!customerId });
  const reviews = useMemo(() => reviewsData?.reviews ?? [], [reviewsData?.reviews]);
  const aggregatedRatings = reviewsData?.aggregatedRatings ?? {};
  const recentIssueSummaries = useMemo(
    () => buildRecentIssueSummaries(reviews as ReviewWithContractor[]),
    [reviews],
  );
  const { data: customerScore } = trpc.customers.getScore.useQuery(
    { customerId },
    { enabled: !!customerId },
  );
  const { data: customerDisputes } = trpc.disputes.getDisputesByCustomer.useQuery(
    { customerId },
    { enabled: !!customerId && isAuthenticated },
  );
  const disputeReviewIds = useMemo(
    () => new Set((customerDisputes ?? []).map((d: { reviewId: number }) => d.reviewId)),
    [customerDisputes],
  );
  const markHelpful = trpc.reviews.markHelpful.useMutation({ onSuccess: () => refetchReviews() });
  const [sortBy, setSortBy] = useState<"recent" | "rating" | "helpful">("recent");
  const [groupByLocation, setGroupByLocation] = useState(true);
  const [watching, setWatching] = useState(() => isWatching(customerId));

  useEffect(() => {
    void (async () => {
      await hydrateUserDataFromDevice();
      setWatching(isWatching(customerId));
    })();
  }, [customerId]);

  useEffect(() => {
    if (customer) {
      const risk = computeRiskScore(customer as any);
      track("customer_viewed", { customer_id: customerId, risk_level: risk.level });
      track("customer_profile_viewed", {
        customer_id: customerId,
        source: profileSourceFromParam(fromRaw),
      });
    }
    // Intentionally keyed by id + route: avoid re-firing analytics on every React Query cache refresh of the same customer.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dedupe profile view events per navigation
  }, [customer?.id, customerId, fromRaw]);

  const groupedReviews = groupByLocation
    ? reviews.reduce(
        (acc, review) => {
          const location =
            `${(review as any).city || "Unknown"}, ${(review as any).state || ""}`.trim();
          if (!acc[location]) acc[location] = [];
          acc[location].push(review);
          return acc;
        },
        {} as Record<string, typeof reviews>,
      )
    : { "All Reviews": reviews };

  const sortedGroupedReviews = Object.entries(groupedReviews).map(
    ([location, locationReviews]) => {
      const sorted = [...locationReviews];
      if (sortBy === "recent")
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      else if (sortBy === "rating")
        sorted.sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0));
      else if (sortBy === "helpful")
        sorted.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
      return [location, sorted] as const;
    },
  );

  const recentActivityWarning = useMemo(
    () => getRecentActivityWarning(reviews as any, customerDisputes ?? null, isAuthenticated),
    [reviews, customerDisputes, isAuthenticated],
  );

  if (loadingCustomer) {
    return (
      <ScreenContainer>
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.muted, marginTop: 12, fontSize: 14 }}>Loading profile…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (customerLoadError) {
    return (
      <ScreenContainer className="p-6">
        <View style={s.centered}>
          <Text style={[s.errorText, { color: colors.foreground, textAlign: "center", marginBottom: 8 }]}>
            Couldn&apos;t load this profile
          </Text>
          <Text style={{ color: colors.muted, textAlign: "center", marginBottom: 20, fontSize: 14, lineHeight: 20 }}>
            Check your connection and try again.
          </Text>
          <Pressable
            onPress={() => refetchCustomer()}
            style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginBottom: 10 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Retry</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <Text style={{ color: colors.primary, fontWeight: "600" }}>‹ Go back</Text>
          </Pressable>
          {__DEV__ && customerLoadErr != null ? (
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 16, textAlign: "center" }}>
              {String((customerLoadErr as Error).message ?? customerLoadErr)}
            </Text>
          ) : null}
        </View>
      </ScreenContainer>
    );
  }

  if (!customer) {
    return (
      <ScreenContainer className="p-6">
        <View style={s.centered}>
          <Text style={[s.errorText, { color: colors.foreground, textAlign: "center" }]}>
            We couldn&apos;t find this customer profile.
          </Text>
          <Text style={{ color: colors.muted, textAlign: "center", marginTop: 10, fontSize: 14, lineHeight: 20, paddingHorizontal: 12 }}>
            Go back to Search and try another name or spelling.
          </Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ color: colors.primary, fontWeight: "600" }}>‹ Go back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const overallRating = parseFloat(customer.overallRating ?? "0");
  const initials =
    `${customer.firstName[0] ?? ""}${customer.lastName[0] ?? ""}`.toUpperCase();
  const risk = computeRiskScore(customer as any);

  const avatarBg = risk.color;

  const dist = [5, 4, 3, 2, 1].map(
    (star) => (reviews ?? []).filter((r) => r.overallRating === star).length,
  );

  const displayOverallRating = (aggregatedRatings as any)?.overallRating ?? overallRating;

  const handleToggleWatch = () => {
    if (!customer) return;
    const result = toggleWatch({
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      riskLevel: customer.riskLevel ?? "unknown",
      overallRating: customer.overallRating ?? "0",
      city: customer.city ?? undefined,
      state: customer.state ?? undefined,
      addedAt: Date.now(),
    } as WatchedCustomer);
    setWatching(result);
    track("watch_toggled", { customer_id: customer.id, watching: result });
    if (result) track("customer_tracked", { customer_id: customer.id });
  };

  const handleShare = async () => {
    const name = `${customer.firstName} ${customer.lastName}`;
    const url = customerProfileShareUrl(customer.id);
    const msg = `ClientCheck — verified contractor context for ${name}. Ratings, score summary, and dispute visibility are on the profile when your team is signed in.\n\n${url}`;
    if (Platform.OS === "web") {
      if (navigator.share) {
        try {
          await navigator.share({ title: `ClientCheck: ${name}`, text: msg, url });
        } catch {}
      } else {
        try {
          await navigator.clipboard.writeText(msg);
        } catch {}
      }
    } else {
      try {
        await Share.share({ message: msg, title: `ClientCheck: ${name}` });
      } catch {}
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* ── Top bar ────────────────────────────────────────────── */}
      <View style={[s.topBar, { borderBottomColor: "rgba(255,255,255,0.06)" }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [s.topBtn, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={[s.topBtnText, { color: colors.primary }]}>‹ Back</Text>
        </Pressable>

        <Text style={[s.topBarTitle, { color: colors.foreground }]} numberOfLines={1}>
          Customer profile
        </Text>

        <Pressable
          onPress={handleToggleWatch}
          style={({ pressed }) => [s.topBtn, s.topBtnRight, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={watching ? "Tracking this customer" : "Track customer for activity alerts"}
        >
          <Text
            style={[
              s.topBtnText,
              { color: watching ? colors.primary : colors.muted, fontSize: 11, fontWeight: "700" },
            ]}
            numberOfLines={2}
          >
            {watching ? "Tracking" : "Track customer"}
          </Text>
        </Pressable>
      </View>

      {isAuthenticated ? (
        <View style={[s.trackTopHint, { borderBottomColor: colors.border + "66", backgroundColor: colors.surface + "99" }]}>
          <Text style={[s.trackTopHintText, { color: colors.muted }]}>
            Get Alerts when activity changes
            {watching ? " · you’re tracking this customer" : " · tap Track customer above"}
          </Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Hero ──────────────────────────────────────────────── */}
        <HeroHeaderBackground backgroundKey="customers" height={320} overlayOpacity={0.72}>
          <View style={s.hero}>
            {/* Avatar */}
            <View style={[s.avatarOuter, { borderColor: avatarBg + "88" }]}>
              <View style={[s.avatar, { backgroundColor: avatarBg }]}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
            </View>

            {/* Name */}
            <Text style={s.heroName}>
              {customer.firstName} {customer.lastName}
            </Text>

            {/* Location */}
            {!!(customer.city || customer.state) && (
              <Text style={s.heroLocation}>
                {[customer.city, customer.state].filter(Boolean).join(", ")}
              </Text>
            )}

            {/* Rating row */}
            <Text style={s.heroRatingCaption}>Overall rating · from contractors</Text>
            <View style={s.heroRatingRow}>
              <Text style={s.heroRatingNum}>
                {overallRating > 0 ? overallRating.toFixed(1) : "—"}
              </Text>
              <View style={s.heroRatingMeta}>
                <StarRating rating={overallRating} size={18} positionalColors />
                <Text style={s.heroReviewCount}>
                  {customer.reviewCount} verified {customer.reviewCount === 1 ? "review" : "reviews"}
                </Text>
              </View>
            </View>

            {customer.reviewCount > 0 &&
              (isAuthenticated && customerScore && customerScore.score > 0 ? (
                <View style={s.heroCustomerScore}>
                  <View style={s.heroCsRow}>
                    <View style={s.heroCsLeft}>
                      <Text style={s.heroCsKicker}>Customer score</Text>
                      <View style={s.heroCsNumRow}>
                        <Text style={[s.heroCsNum, { color: customerScoreColor(customerScore.score) }]}>
                          {customerScore.score}
                        </Text>
                        <Text style={s.heroCsOutOf}>/100</Text>
                      </View>
                      <Text style={[s.heroCsLabel, { color: customerScoreColor(customerScore.score) }]}>
                        {customerScore.label}
                      </Text>
                    </View>
                    <View
                      style={[
                        s.heroTrendChip,
                        {
                          borderColor: TREND_HERO[customerScore.trend].color + "66",
                          backgroundColor: TREND_HERO[customerScore.trend].color + "18",
                        },
                      ]}
                    >
                      <Text style={[s.heroTrendLabel, { color: TREND_HERO[customerScore.trend].color }]}>
                        {TREND_HERO[customerScore.trend].label}
                      </Text>
                      <Text style={s.heroTrendSub}>Trend</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      s.heroPrimaryStrip,
                      { borderLeftColor: HERO_PRIMARY_TONE[customerScore.primaryStatementTone] },
                    ]}
                  >
                    <Text style={s.heroPrimaryText}>{customerScore.primaryStatement}</Text>
                  </View>
                  {recentActivityWarning ? (
                    <RecentActivityBanner warning={recentActivityWarning} />
                  ) : null}
                  <Text style={s.heroTrustUnderScore}>Based on verified contractor experiences</Text>
                </View>
              ) : (
                <View style={s.heroStatPillsColumn}>
                  <View style={s.heroStatPills}>
                    <View
                      style={[
                        s.heroStatPill,
                        { borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.06)" },
                      ]}
                    >
                      <Text style={s.heroStatPillText}>Risk index {risk.score}/100</Text>
                    </View>
                    <View
                      style={[
                        s.heroStatPill,
                        { borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.06)" },
                      ]}
                    >
                      <Text style={s.heroStatPillText}>{risk.label}</Text>
                    </View>
                  </View>
                  {recentActivityWarning ? (
                    <RecentActivityBanner warning={recentActivityWarning} />
                  ) : null}
                </View>
              ))}

            {customer.reviewCount === 0 && recentActivityWarning ? (
              <RecentActivityBanner warning={recentActivityWarning} />
            ) : null}

            {/* Risk badge */}
            <RiskBadge riskLevel={customer.riskLevel as RiskLevel} />

            <View style={s.heroTrustStrip}>
              <Text style={s.heroTrustText}>✓ Verified contractor reviews</Text>
              <Text style={s.heroTrustDot}>·</Text>
              <Text style={s.heroTrustText}>⚖️ Disputes supported</Text>
              <Text style={s.heroTrustDot}>·</Text>
              <Text style={s.heroTrustText}>💬 Customer responses when shared</Text>
            </View>

            {isAuthenticated && (
              <View style={s.retentionCtaStrip}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/add-review",
                      params: {
                        customerId: String(customer.id),
                        customerName: `${customer.firstName} ${customer.lastName}`,
                      },
                    } as never)
                  }
                  style={({ pressed }) => [s.retentionCtaBtn, pressed && { opacity: 0.85 }]}
                >
                  <Text style={s.retentionCtaBtnText}>Submit a review</Text>
                </Pressable>
                <Pressable onPress={handleShare} style={({ pressed }) => [s.retentionCtaBtn, pressed && { opacity: 0.85 }]}>
                  <Text style={s.retentionCtaBtnText}>Share with team</Text>
                </Pressable>
              </View>
            )}
            {isAuthenticated && (
              <Text style={s.trackHookLine}>
                {watching
                  ? "You’re tracking this customer — new reports, score shifts, and disputes show under the Alerts tab (Tracked customers)."
                  : "Track customer to get notified about new activity. Tap Track customer above when you’re ready."}
              </Text>
            )}
          </View>
        </HeroHeaderBackground>

        {/* ── Risk Assessment ──────────────────────────────────── */}
        {customer.reviewCount > 0 && (
          <PremiumCard colors={colors} style={s.firstCard}>
            <View style={s.riskHeader}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[s.cardTitle, { color: colors.foreground }]}>Risk assessment</Text>
                <View style={s.riskLabelRow}>
                  <Text style={{ fontSize: 18 }}>{risk.emoji}</Text>
                  <Text style={[s.riskLevelText, { color: risk.color }]}>{risk.label}</Text>
                </View>
              </View>

              {/* Score circle */}
              <View style={[s.scoreCircle, { borderColor: risk.color }]}>
                <Text style={[s.scoreNum, { color: risk.color }]}>{risk.score}</Text>
                <Text style={[s.scoreOf, { color: risk.color + "99" }]}>/100</Text>
              </View>
            </View>

            {risk.factors.length > 0 && (
              <View style={s.factorList}>
                {risk.factors.map((f, i) => (
                  <View key={i} style={s.factorRow}>
                    <View style={[s.factorDot, { backgroundColor: risk.color }]} />
                    <Text style={[s.factorText, { color: colors.muted }]}>{f}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={[s.cardFooterDivider, { borderTopColor: "rgba(255,255,255,0.06)" }]}>
              <Text style={s.cardFooterText}>
                Based on {customer.reviewCount} verified contractor{" "}
                {customer.reviewCount === 1 ? "review" : "reviews"}
              </Text>
            </View>
          </PremiumCard>
        )}

        {/* ── Customer Score Breakdown ─────────────────────────── */}
        {customerScore && customerScore.score > 0 && isAuthenticated && (
          <ScoreBreakdownCard result={customerScore} />
        )}

        {/* ── Decision Panel ─────────────────────────────────────── */}
        {customerScore && customerScore.score > 0 && isAuthenticated && (
          <DecisionPanel
            score={customerScore}
            reviewCount={customer.reviewCount}
            redFlagCount={(customer as any).redFlagCount ?? 0}
            wouldWorkAgainNoCount={(customer as any).wouldWorkAgainNoCount ?? 0}
            recentIssues={recentIssueSummaries}
          />
        )}

        {/* ── Paywall for unauthenticated users ──────────────────── */}
        {!isAuthenticated && customer.reviewCount > 0 && (
          <PaywallOverlay
            customerName={`${customer.firstName} ${customer.lastName}`}
            score={customerScore?.score}
            reviewCount={customer.reviewCount}
          />
        )}

        {/* ── Rating Breakdown ─────────────────────────────────── */}
        {customer.reviewCount > 0 && isAuthenticated && (
          <PremiumCard colors={colors}>
            <Text style={[s.cardTitle, { color: colors.foreground }]}>Rating Breakdown</Text>
            <View style={s.breakdownContent}>
              <RatingBreakdown reviewCount={customer.reviewCount} distribution={dist} />
            </View>
          </PremiumCard>
        )}

        {/* ── Category Averages ────────────────────────────────── */}
        {customer.reviewCount > 0 && isAuthenticated && (aggregatedRatings as any)?.categories && (
          <PremiumCard colors={colors}>
            <Text style={[s.cardTitle, { color: colors.foreground }]}>Category Averages</Text>
            <View style={s.categoryList}>
              {REVIEW_CATEGORIES.map(({ key, label, description }) => {
                const cat = (aggregatedRatings as any).categories?.[key];
                if (!cat || cat.notApplicable || cat.score == null) return null;
                return (
                  <CategoryRating key={key} label={label} description={description} rating={cat.score} />
                );
              })}
            </View>
          </PremiumCard>
        )}

        {/* ── Would Work Again ─────────────────────────────────── */}
        {customer.reviewCount > 0 && isAuthenticated && (
          <PremiumCard colors={colors}>
            <Text style={[s.cardTitle, { color: colors.foreground }]}>Would Work Again</Text>
            <View style={s.workAgainRow}>
              {(customer as any).wouldWorkAgainYesCount > 0 && (
                <View style={[s.workAgainPill, { backgroundColor: "#22C55E14", borderColor: "#22C55E44" }]}>
                  <Text style={{ color: "#22C55E", fontSize: 20, fontWeight: "800" }}>
                    {(customer as any).wouldWorkAgainYesCount}
                  </Text>
                  <Text style={{ color: "#22C55E", fontSize: 11, fontWeight: "600", opacity: 0.8 }}>Yes</Text>
                </View>
              )}
              {(customer as any).wouldWorkAgainNoCount > 0 && (
                <View style={[s.workAgainPill, { backgroundColor: "#DC262614", borderColor: "#DC262644" }]}>
                  <Text style={{ color: "#DC2626", fontSize: 20, fontWeight: "800" }}>
                    {(customer as any).wouldWorkAgainNoCount}
                  </Text>
                  <Text style={{ color: "#DC2626", fontSize: 11, fontWeight: "600", opacity: 0.8 }}>No</Text>
                </View>
              )}
              {(customer as any).wouldWorkAgainNaCount > 0 && (
                <View style={[s.workAgainPill, { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }]}>
                  <Text style={{ color: colors.muted, fontSize: 20, fontWeight: "800" }}>
                    {(customer as any).wouldWorkAgainNaCount}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600", opacity: 0.8 }}>N/A</Text>
                </View>
              )}
            </View>
          </PremiumCard>
        )}

        {/* ── Flag Summary ─────────────────────────────────────── */}
        {customer.reviewCount > 0 && isAuthenticated &&
          ((customer as any).redFlagCount > 0 || (customer as any).greenFlagCount > 0) && (
            <PremiumCard colors={colors}>
              <Text style={[s.cardTitle, { color: colors.foreground }]}>Flag Summary</Text>
              <View style={s.flagRow}>
                {(customer as any).criticalRedFlagCount > 0 && (
                  <View style={[s.flagPill, { backgroundColor: "#DC262625", borderColor: "#DC2626" }]}>
                    <Text style={{ color: "#DC2626", fontSize: 13, fontWeight: "800" }}>
                      ⚠️ {(customer as any).criticalRedFlagCount} Critical
                    </Text>
                  </View>
                )}
                {(customer as any).redFlagCount > 0 && (
                  <View style={[s.flagPill, { backgroundColor: colors.error + "14", borderColor: colors.error + "44" }]}>
                    <Text style={{ color: colors.error, fontSize: 13, fontWeight: "600" }}>
                      🚩 {(customer as any).redFlagCount} Red Flags
                    </Text>
                  </View>
                )}
                {(customer as any).greenFlagCount > 0 && (
                  <View style={[s.flagPill, { backgroundColor: "#22C55E14", borderColor: "#22C55E44" }]}>
                    <Text style={{ color: "#22C55E", fontSize: 13, fontWeight: "600" }}>
                      ✅ {(customer as any).greenFlagCount} Green Flags
                    </Text>
                  </View>
                )}
              </View>
            </PremiumCard>
          )}

        {/* ── Reviews ──────────────────────────────────────────── */}
        <View style={s.reviewsWrap}>
          <View style={s.reviewsTitleRow}>
            <Text style={[s.cardTitle, { color: colors.foreground }]}>
              Reviews ({reviews.length})
            </Text>
          </View>

          {reviews.length > 0 && (
            <View style={s.reviewControls}>
              <View style={s.sortRow}>
                {(["recent", "rating", "helpful"] as const).map((opt) => {
                  const label =
                    opt === "recent" ? "Recent" : opt === "rating" ? "Top Rated" : "Most Helpful";
                  const active = sortBy === opt;
                  return (
                    <Pressable
                      key={opt}
                      onPress={() => setSortBy(opt)}
                      style={({ pressed }) => [
                        s.sortChip,
                        {
                          backgroundColor: active ? colors.primary : "rgba(255,255,255,0.05)",
                          borderColor: active ? colors.primary : "rgba(255,255,255,0.08)",
                        },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text
                        style={[s.sortChipText, { color: active ? "#fff" : colors.muted }]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={() => setGroupByLocation(!groupByLocation)}
                style={({ pressed }) => [
                  s.groupToggle,
                  {
                    backgroundColor: groupByLocation
                      ? colors.primary + "18"
                      : "rgba(255,255,255,0.04)",
                    borderColor: groupByLocation ? colors.primary + "44" : "rgba(255,255,255,0.08)",
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: groupByLocation ? colors.primary : colors.muted,
                  }}
                >
                  {groupByLocation ? "📍 Grouped by Location" : "📋 All Reviews"}
                </Text>
              </Pressable>
            </View>
          )}

          {loadingReviews ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : reviews?.length > 0 ? (
            <View style={s.reviewsList}>
              {sortedGroupedReviews.map(([location, locationReviews]) => (
                <View key={location} style={{ gap: 12 }}>
                  {groupByLocation && (
                    <View style={[s.locationGroupHeader, { borderTopColor: "rgba(255,255,255,0.06)" }]}>
                      <Text style={[s.locationGroupText, { color: colors.foreground }]}>
                        📍 {location} ({locationReviews.length})
                      </Text>
                    </View>
                  )}
                  {(locationReviews as ReviewWithContractor[]).map((review) => (
                    <Pressable
                      key={review.id}
                      onPress={() => router.push(`/review/${review.id}` as never)}
                      style={({ pressed }) => [pressed && { opacity: 0.85 }]}
                    >
                      <ReviewCard
                        review={review}
                        onHelpful={() => markHelpful.mutate({ reviewId: review.id })}
                        onDispute={() => router.push({ pathname: "/dispute-review", params: { reviewId: String(review.id), customerId: String(review.customerId ?? customerId) } } as never)}
                        showViewHint
                        isContractorVerified={(review as any).contractorVerified === "verified"}
                        disputeSubmitted={disputeReviewIds.has(review.id)}
                        hasCustomerResponse={!!(review as { hasCustomerResponse?: boolean }).hasCustomerResponse}
                      />
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <View style={s.emptyReviews}>
              <Text style={{ fontSize: 32 }}>📝</Text>
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>No Reviews Yet</Text>
              <Text style={[s.emptyDesc, { color: colors.muted }]}>
                Be the first contractor to review this customer.
              </Text>
            </View>
          )}
        </View>

        {/* ── Add Review CTA ───────────────────────────────────── */}
        <View style={s.ctaWrap}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/add-review",
                params: {
                  customerId: customer.id,
                  customerName: `${customer.firstName} ${customer.lastName}`,
                },
              })
            }
            style={({ pressed }) => [
              s.ctaBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={s.ctaBtnText}>+ Add Your Review</Text>
          </Pressable>
        </View>

        {/* ── Share / warn bar ─────────────────────────────────── */}
        {customer.riskLevel === "high" && (
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [
              s.shareBar,
              { backgroundColor: colors.error + "0C", borderColor: colors.error + "33" },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={{ color: colors.error, fontSize: 15, fontWeight: "700" }}>
              📤 Share profile context
            </Text>
            <Text style={{ color: colors.error, fontSize: 12, marginTop: 3, opacity: 0.6 }}>
              Help your network make informed job decisions
            </Text>
          </Pressable>
        )}

        {/* ── Trust footer ─────────────────────────────────────── */}
        <View style={s.trustFooter}>
          <Text style={s.trustText}>
            🛡️ All reviews submitted by verified contractors · Customers can dispute inaccurate
            content
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 16, textAlign: "center", marginTop: 40 },

  /* ── Top bar ─────────────────────────────────────────────── */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  topBtn: { minWidth: 80 },
  topBtnRight: { alignItems: "flex-end" },
  topBtnText: { fontSize: 14, fontWeight: "600" },
  topBarTitle: { fontSize: 16, fontWeight: "700", flex: 1, textAlign: "center", letterSpacing: -0.3 },
  trackTopHint: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  trackTopHintText: { fontSize: 11, fontWeight: "600", lineHeight: 15, textAlign: "center" },
  scroll: { paddingBottom: 80 },

  /* ── Hero ─────────────────────────────────────────────────── */
  hero: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 16,
    gap: 6,
  },
  avatarOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 34, fontWeight: "800", letterSpacing: 1 },
  heroName: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  heroLocation: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  heroRatingCaption: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 10,
  },
  heroRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
    marginBottom: 4,
  },
  heroStatPillsColumn: { width: "100%", alignItems: "center", gap: 10, marginTop: 6, marginBottom: 4 },
  heroStatPills: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  activityBanner: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 340,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    gap: 6,
  },
  activityBannerKicker: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  activityBannerText: { color: "rgba(255,255,255,0.9)", fontSize: 13, lineHeight: 19, fontWeight: "600" },
  heroStatPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  heroStatPillText: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "700" },

  heroCustomerScore: {
    marginTop: 8,
    marginBottom: 4,
    width: "100%",
    maxWidth: 340,
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  heroCsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  heroCsLeft: { flex: 1, gap: 2 },
  heroCsKicker: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  heroCsNumRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  heroCsNum: { fontSize: 32, fontWeight: "900", letterSpacing: -1 },
  heroCsOutOf: { color: "rgba(255,255,255,0.35)", fontSize: 14, fontWeight: "700" },
  heroCsLabel: { fontSize: 14, fontWeight: "800", marginTop: 2 },
  heroPrimaryStrip: {
    marginTop: 10,
    paddingLeft: 10,
    paddingVertical: 8,
    borderLeftWidth: 3,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 8,
  },
  heroPrimaryText: { color: "rgba(255,255,255,0.95)", fontSize: 13, fontWeight: "800", lineHeight: 18 },
  heroTrustUnderScore: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  heroTrendChip: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 88,
  },
  heroTrendLabel: { fontSize: 13, fontWeight: "900" },
  heroTrendSub: { color: "rgba(255,255,255,0.35)", fontSize: 9, fontWeight: "700", marginTop: 2 },
  heroTrustStrip: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, paddingHorizontal: 12 },
  heroTrustText: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "600" },
  heroTrustDot: { color: "rgba(255,255,255,0.25)", fontSize: 11 },
  retentionCtaStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 10,
  },
  retentionCtaBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  retentionCtaBtnText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    fontWeight: "700",
  },
  trackHookLine: {
    marginTop: 12,
    paddingHorizontal: 16,
    textAlign: "center",
    color: "rgba(255,255,255,0.42)",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
  heroRatingNum: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "800",
    lineHeight: 44,
    letterSpacing: -1,
  },
  heroRatingMeta: { gap: 3 },
  heroReviewCount: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "500" },

  /* ── Shared card ──────────────────────────────────────────── */
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  firstCard: { marginTop: -12 },
  cardTitle: { fontSize: 16, fontWeight: "700", letterSpacing: -0.2, marginBottom: 12 },

  /* ── Risk assessment ──────────────────────────────────────── */
  riskHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  riskLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  riskLevelText: { fontSize: 15, fontWeight: "700" },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNum: { fontSize: 24, fontWeight: "900", lineHeight: 28 },
  scoreOf: { fontSize: 10, fontWeight: "600" },
  factorList: { marginTop: 14, gap: 8 },
  factorRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  factorDot: { width: 5, height: 5, borderRadius: 3, marginTop: 6 },
  factorText: { fontSize: 13, lineHeight: 18, flex: 1 },
  cardFooterDivider: { marginTop: 16, paddingTop: 12, borderTopWidth: 1 },
  cardFooterText: { color: "rgba(255,255,255,0.3)", fontSize: 11, textAlign: "center" },

  /* ── Rating breakdown ─────────────────────────────────────── */
  breakdownContent: { paddingTop: 2 },

  /* ── Category averages ────────────────────────────────────── */
  categoryList: { gap: 4 },

  /* ── Would work again ─────────────────────────────────────── */
  workAgainRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  workAgainPill: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 72,
    gap: 2,
  },

  /* ── Flag summary ─────────────────────────────────────────── */
  flagRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  flagPill: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },

  /* ── Reviews section ──────────────────────────────────────── */
  reviewsWrap: { marginTop: 24, gap: 12 },
  reviewsTitleRow: { paddingHorizontal: 20 },
  reviewControls: { paddingHorizontal: 20, gap: 10 },
  sortRow: { flexDirection: "row", gap: 8 },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortChipText: { fontSize: 12, fontWeight: "600" },
  groupToggle: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  reviewsList: { paddingHorizontal: 16, gap: 4 },
  locationGroupHeader: { paddingTop: 14, marginTop: 4, borderTopWidth: 1 },
  locationGroupText: { fontSize: 13, fontWeight: "700" },
  emptyReviews: { alignItems: "center", padding: 32, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyDesc: { fontSize: 13, textAlign: "center", lineHeight: 18 },

  /* ── CTA ──────────────────────────────────────────────────── */
  ctaWrap: { paddingHorizontal: 20, marginTop: 16 },
  ctaBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  ctaBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  /* ── Share bar ────────────────────────────────────────────── */
  shareBar: { marginHorizontal: 20, marginTop: 12, padding: 16, borderRadius: 14, borderWidth: 1, alignItems: "center" },

  /* ── Trust footer ─────────────────────────────────────────── */
  trustFooter: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    marginBottom: 24,
  },
  trustText: { color: "rgba(255,255,255,0.25)", fontSize: 11, textAlign: "center", lineHeight: 16 },
});
