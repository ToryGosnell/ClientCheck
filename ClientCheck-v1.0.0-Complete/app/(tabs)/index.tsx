import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenBackground } from "@/components/screen-background";
import { ReviewCard } from "@/components/review-card";
import { LocationScopeBar } from "@/components/location-scope-bar";
import { RenewalReminderModal } from "@/components/renewal-reminder-modal";
import { useColors } from "@/hooks/use-colors";
import { useLocationScope } from "@/hooks/use-location-scope";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { getMembershipDisplayState, getCurrentReminderMilestone, getDaysRemaining } from "@/shared/membership";
import { computeRiskScore } from "@/lib/risk-score";
import {
  getRecentSearches,
  getWatchedCustomers,
  hydrateUserDataFromDevice,
  type WatchedCustomer,
} from "@/lib/user-data";
import { track } from "@/lib/analytics";
import type { ReviewWithContractor } from "@/shared/types";
import { CustomerIdentityVerifiedBadge } from "@/components/customer-identity-verified-badge";

/** Top/bottom gradient stops from theme primary (subtle highlight → deeper red). */
function primaryGradientStops(primary: string): [string, string] {
  const raw = primary.replace(/^#/, "");
  if (raw.length !== 6 || !/^[0-9a-fA-F]+$/.test(raw)) {
    return [primary, primary];
  }
  const n = parseInt(raw, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lift = (c: number) => Math.min(255, Math.round(c + (255 - c) * 0.14));
  const shade = (c: number) => Math.max(0, Math.round(c * 0.82));
  const toHex = (rr: number, gg: number, bb: number) =>
    `#${[rr, gg, bb].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
  return [toHex(lift(r), lift(g), lift(b)), toHex(shade(r), shade(g), shade(b))];
}

function LandingSignInButton({
  label,
  onPress,
  primaryColor,
}: {
  label: string;
  onPress: () => void;
  primaryColor: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const gradientColors = useMemo(() => primaryGradientStops(primaryColor), [primaryColor]);

  const targetScale = pressed ? 0.98 : hovered ? 1.02 : 1;
  useEffect(() => {
    Animated.spring(scale, {
      toValue: targetScale,
      friction: 8,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [targetScale, scale]);

  const webShadow = hovered
    ? "0 10px 28px rgba(0,0,0,0.28), 0 4px 10px rgba(0,0,0,0.14)"
    : "0 6px 20px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.1)";

  return (
    <Animated.View
      style={[
        st.landingBtnOuter,
        { transform: [{ scale }] },
        Platform.OS === "web"
          ? ({
              boxShadow: webShadow,
              transition: "box-shadow 0.22s ease-out",
            } as object)
          : {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: hovered ? 8 : 5 },
              shadowOpacity: hovered ? 0.3 : 0.22,
              shadowRadius: hovered ? 16 : 12,
              elevation: hovered ? 10 : 7,
            },
      ]}
    >
      <Pressable
        onPress={onPress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={({ pressed: p }) => [
          st.landingBtnInner,
          Platform.OS === "web" ? ({ cursor: "pointer" } as object) : {},
          p && Platform.OS !== "web" ? { opacity: 0.94 } : {},
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={st.signInPrimaryBtnText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const PREVIEW_CUSTOMERS = [
  {
    id: 0, firstName: "Karen", lastName: "M.", city: "Phoenix", state: "AZ",
    overallRating: "1.8", reviewCount: 4, flagCount: 3, riskLevel: "high" as const,
    redFlags: "Disputed invoice after work completed, Threatened negative review for discount, Refused final payment",
    greenFlags: null, ratingWouldWorkAgain: "no",
  },
  {
    id: 0, firstName: "Robert", lastName: "D.", city: "Mesa", state: "AZ",
    overallRating: "2.1", reviewCount: 5, flagCount: 2, riskLevel: "high" as const,
    redFlags: "No-show after scheduling, Filed false complaint",
    greenFlags: null, ratingWouldWorkAgain: "no",
  },
  {
    id: 0, firstName: "Sarah", lastName: "T.", city: "Chandler", state: "AZ",
    overallRating: "4.9", reviewCount: 12, flagCount: 0, riskLevel: "low" as const,
    redFlags: null, greenFlags: "Excellent communicator, Pays same day, Refers clients",
    ratingWouldWorkAgain: "yes",
  },
];

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [watched, setWatched] = useState<WatchedCustomer[]>([]);
  const [recentSearchTerms, setRecentSearchTerms] = useState<string[]>([]);
  const { scope, userState, userCity, setScope, filter: filterByLoc, locationLabel } = useLocationScope();

  const { data: flaggedCustomers, isLoading: loadingFlagged } = trpc.customers.getFlagged.useQuery(
    undefined, { enabled: isAuthenticated }
  );
  const { data: recentReviews, isLoading: loadingReviews, refetch } = trpc.reviews.getRecent.useQuery(
    undefined, { enabled: isAuthenticated }
  );
  const markHelpful = trpc.reviews.markHelpful.useMutation({ onSuccess: () => refetch() });
  const { data: membership } = trpc.subscription.getMembership.useQuery(
    undefined, { enabled: isAuthenticated }
  );
  const membershipDisplay =
    membership && user?.role !== "customer" ? getMembershipDisplayState(membership) : null;

  useEffect(() => {
    void (async () => {
      await hydrateUserDataFromDevice();
      setWatched(getWatchedCustomers());
      setRecentSearchTerms(getRecentSearches().map((s) => s.query));
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setWatched(getWatchedCustomers());
      setRecentSearchTerms(getRecentSearches().map((s) => s.query));
    }, []),
  );

  const handleShareFlag = useCallback(async (name: string) => {
    track("share_flagged_customer");
    const msg = `⚠️ Heads up — "${name}" has been flagged on ClientCheck by multiple contractors. Check before you take the job.\n\nhttps://dist-web-alpha.vercel.app`;
    if (Platform.OS === "web") {
      if (navigator.share) { try { await navigator.share({ text: msg }); } catch {} }
      else { try { await navigator.clipboard.writeText(msg); } catch {} }
    } else {
      try { await Share.share({ message: msg }); } catch {}
    }
  }, []);

  // ── LANDING (unauthenticated) ────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <ScreenBackground backgroundKey="auth">
        <ScrollView contentContainerStyle={st.landingScroll} showsVerticalScrollIndicator={false}>
          <View style={st.landingContent}>
            <Text style={st.logoText}>ClientCheck</Text>
            <Text style={st.heroKicker}>For contractors</Text>
            <Text style={st.heroHeadline}>Check customer history before you take a job.</Text>
            <Text style={st.heroSub}>
              Sign in to access customer history, risk insights, and contractor reviews.
            </Text>

            <View style={st.signInActions}>
              <LandingSignInButton
                label="Contractor Sign In"
                primaryColor={colors.primary}
                onPress={() => router.push({ pathname: "/select-account", params: { preset: "contractor" } } as never)}
              />
              <LandingSignInButton
                label="Customer Sign In"
                primaryColor={colors.primary}
                onPress={() => router.push({ pathname: "/select-account", params: { preset: "customer" } } as never)}
              />
              <Text style={st.landingAccountsNote}>
                Create an account to access customer history, reviews, and alerts.
              </Text>
            </View>

            {/* Trust strip */}
            <View style={st.trustStrip}>
              {[
                { icon: "🛡️", label: "Verified Contractors" },
                { icon: "⚖️", label: "Fair Dispute System" },
                { icon: "🔒", label: "Data You Can Trust" },
              ].map((t, i) => (
                <View key={i} style={st.trustItem}>
                  <Text style={st.trustIcon}>{t.icon}</Text>
                  <Text style={st.trustLabel}>{t.label}</Text>
                </View>
              ))}
            </View>

            {/* Preview data */}
            <View style={st.previewSection}>
              <Text style={st.previewTitle}>Contractor Reports</Text>
              <Text style={st.previewSubtitle}>Real experiences shared by verified contractors to help you evaluate jobs</Text>

              {PREVIEW_CUSTOMERS.map((c, i) => {
                const risk = computeRiskScore(c);
                return (
                  <View key={i} style={[st.previewCard, { borderColor: risk.color + "44" }]}>
                    <View style={st.previewCardTop}>
                      <View style={[st.previewAvatar, { backgroundColor: risk.color }]}>
                        <Text style={st.previewInitials}>{c.firstName[0]}{c.lastName[0]}</Text>
                      </View>
                      <View style={st.previewInfo}>
                        <Text style={st.previewName}>{c.firstName} {c.lastName}</Text>
                        <Text style={st.previewLocation}>📍 {c.city}, {c.state}</Text>
                      </View>
                      <View style={st.previewScoreBox}>
                        <Text style={[st.previewScoreNum, { color: risk.color }]}>{risk.score}</Text>
                        <Text style={st.previewScoreLabel}>Risk</Text>
                      </View>
                    </View>
                    <View style={st.previewMeta}>
                      <View style={[st.previewBadge, { backgroundColor: risk.color + "18" }]}>
                        <Text style={[st.previewBadgeText, { color: risk.color }]}>{risk.emoji} {risk.label}</Text>
                      </View>
                      <Text style={st.previewRating}>⭐ {parseFloat(c.overallRating).toFixed(1)} · {c.reviewCount} reviews</Text>
                    </View>
                    {c.redFlags && (
                      <View style={st.previewFlags}>
                        {c.redFlags.split(",").slice(0, 2).map((f, fi) => (
                          <Text key={fi} style={st.previewFlag}>🚩 {f.trim()}</Text>
                        ))}
                      </View>
                    )}
                    {c.greenFlags && (
                      <View style={st.previewFlags}>
                        {c.greenFlags.split(",").slice(0, 2).map((f, fi) => (
                          <Text key={fi} style={st.previewGreenFlag}>✅ {f.trim()}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={st.proofRow}>
              <Text style={st.proofText}>Trusted by contractors · Fair for customers</Text>
            </View>
          </View>
        </ScrollView>
      </ScreenBackground>
    );
  }

  // ── RENEWAL REMINDER ──────────────────────────────────────────────────────────
  const [showRenewalReminder, setShowRenewalReminder] = useState(false);
  const expirationDate = (membership as any)?.freeTrialEndAt ?? (membership as any)?.subscriptionEndsAt ?? null;
  const lastMilestone = (membership as any)?.lastReminderDaysMilestone ?? null;

  useEffect(() => {
    if (!membership || !isAuthenticated) return;
    const days = getDaysRemaining(expirationDate);
    const milestone = getCurrentReminderMilestone(days, lastMilestone);
    if (milestone !== null) setShowRenewalReminder(true);
  }, [membership, expirationDate, lastMilestone, isAuthenticated]);

  const markReminderSeen = trpc.subscription.markReminderSeen.useMutation();
  const handleReminderAcknowledge = (milestone: number) => {
    setShowRenewalReminder(false);
    markReminderSeen.mutate({ milestone });
  };

  // ── DASHBOARD (authenticated) ────────────────────────────────────────────────
  const rawFlagged = flaggedCustomers ?? [];
  const rawReviews = recentReviews ?? [];

  const flaggedList = useMemo(() => filterByLoc(rawFlagged), [rawFlagged, filterByLoc]);
  const reviewList = useMemo(() => {
    const enriched = rawReviews.map((r: any) => ({
      ...r,
      city: r.customerCity ?? r.city ?? null,
      state: r.customerState ?? r.state ?? null,
    }));
    return filterByLoc(enriched);
  }, [rawReviews, filterByLoc]);

  return (
    <ScreenBackground backgroundKey="dashboard" overlayOpacity={0.85}>
      <RenewalReminderModal
        visible={showRenewalReminder}
        expirationDate={expirationDate}
        lastReminderDaysMilestone={lastMilestone}
        onDismiss={() => setShowRenewalReminder(false)}
        onAcknowledge={handleReminderAcknowledge}
      />
      <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-transparent">
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={st.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[st.greeting, { color: colors.muted }]}>Welcome back,</Text>
            <Text style={[st.userName, { color: colors.foreground }]}>{user?.name?.split(" ")[0] ?? "Contractor"}!</Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 16, marginTop: 6, maxWidth: 280 }}>
              Search a customer to get started — open their profile for scores, Track customer, Submit a review, and Alerts.
            </Text>
          </View>
          <View style={[st.shieldBadge, { backgroundColor: colors.primary + "18" }]}>
            <Text style={[st.shieldText, { color: colors.primary }]}>🛡️ Verified</Text>
          </View>
        </View>

        {/* Membership banner */}
        {membershipDisplay?.showRenewalReminder && !!membershipDisplay.renewalReminderText ? (
          <Pressable onPress={() => router.push("/subscription")} style={st.renewalBanner}>
            <Text style={st.renewalTitle}>Membership Expiring Soon</Text>
            <Text style={st.renewalBody}>{membershipDisplay.renewalReminderText}</Text>
          </Pressable>
        ) : membershipDisplay?.statusColor === "gray" ? (
          <Pressable onPress={() => router.push("/(tabs)/profile")} style={[st.verifyBanner, { borderColor: colors.primary + "33" }]}>
            <Text style={[st.verifyTitle, { color: colors.primary }]}>Verify to unlock the contractor free tier</Text>
            <Text style={[st.verifyBody, { color: colors.muted }]}>Submit your license number to get started →</Text>
          </Pressable>
        ) : null}

        {/* Quick Stats */}
        <View style={st.statsContainer}>
          <View style={[st.statCard, { backgroundColor: colors.success + "15", borderColor: colors.success }]}>
            <Text style={st.statEmoji}>🟢</Text>
            <Text style={[st.statValue, { color: colors.foreground }]}>{Math.max(0, (reviewList.length || 3) - flaggedList.length)}</Text>
            <Text style={[st.statLabel, { color: colors.muted }]}>Safe</Text>
          </View>
          <View style={[st.statCard, { backgroundColor: colors.error + "15", borderColor: colors.error }]}>
            <Text style={st.statEmoji}>⚠️</Text>
            <Text style={[st.statValue, { color: colors.foreground }]}>{flaggedList.length}</Text>
            <Text style={[st.statLabel, { color: colors.muted }]}>Flagged</Text>
          </View>
          <View style={[st.statCard, { backgroundColor: colors.primary + "15", borderColor: colors.primary }]}>
            <Text style={st.statEmoji}>⭐</Text>
            <Text style={[st.statValue, { color: colors.foreground }]}>{reviewList.length || 0}</Text>
            <Text style={[st.statLabel, { color: colors.muted }]}>Reviews</Text>
          </View>
        </View>

        {/* Search bar */}
        <Pressable onPress={() => router.push("/(tabs)/search" as never)} style={[st.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[st.searchIcon, { color: colors.muted }]}>🔍</Text>
          <Text style={[st.searchPlaceholder, { color: colors.muted }]}>Search customers — tap to type a name</Text>
        </Pressable>

        {/* Location scope selector */}
        <LocationScopeBar scope={scope} onScopeChange={setScope} userCity={userCity} userState={userState} compact />

        {/* Watched Customers */}
        {watched.length > 0 && (
          <>
            <View style={st.sectionHeader}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[st.sectionTitle, { color: colors.foreground }]}>Tracked customers</Text>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 16 }}>
                  Alerts → Tracked customers for disputes & score drops before your next job
                </Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.horizontalScroll}>
              {watched.map((c) => {
                const risk = computeRiskScore(c as any);
                return (
                  <Pressable key={c.id} onPress={() => router.push(`/customer/${c.id}?from=direct` as never)}
                    style={({ pressed }) => [st.watchedCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}>
                    <View style={[st.watchedAvatar, { backgroundColor: risk.color }]}>
                      <Text style={st.watchedInitials}>{c.firstName[0]}{c.lastName[0]}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, maxWidth: 120 }}>
                      <Text style={[st.watchedName, { color: colors.foreground, flexShrink: 1 }]} numberOfLines={1}>
                        {c.firstName} {c.lastName}
                      </Text>
                      {c.identityVerified ? <CustomerIdentityVerifiedBadge size="sm" /> : null}
                    </View>
                    <View style={[st.riskScorePill, { backgroundColor: risk.color + "18" }]}>
                      <Text style={[st.riskScoreText, { color: risk.color }]}>{risk.emoji} {risk.label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* Recent Searches */}
        {recentSearchTerms.length > 0 && (
          <>
            <View style={st.sectionHeader}>
              <Text style={[st.sectionTitle, { color: colors.foreground }]}>🕐 Recent Searches</Text>
            </View>
            <View style={st.recentSearchRow}>
              {recentSearchTerms.slice(0, 5).map((q, i) => (
                <Pressable key={i} onPress={() => router.push({ pathname: "/(tabs)/search", params: { q } } as never)}
                  style={({ pressed }) => [st.recentChip, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}>
                  <Text style={[st.recentChipText, { color: colors.foreground }]}>🔍 {q}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Flagged Customers */}
        <View style={st.sectionHeader}>
          <Text style={[st.sectionTitle, { color: colors.foreground }]}>🔴 Flagged Customers</Text>
          <Pressable onPress={() => router.push("/(tabs)/alerts" as never)}>
            <Text style={[st.seeAll, { color: colors.primary }]}>See all</Text>
          </Pressable>
        </View>

        {loadingFlagged ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
        ) : flaggedList.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.horizontalScroll}>
            {flaggedList.map((c) => {
              const risk = computeRiskScore(c as any);
              return (
                <View key={c.id} style={[st.flaggedCard, { backgroundColor: colors.surface, borderColor: colors.error + "66" }]}>
                  <Pressable onPress={() => router.push(`/customer/${c.id}?from=direct` as never)} style={{ alignItems: "center", gap: 6 }}>
                    <View style={[st.flaggedAvatar, { backgroundColor: colors.error }]}>
                      <Text style={st.flaggedAvatarText}>{c.firstName[0]}{c.lastName[0]}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, maxWidth: 128 }}>
                      <Text style={[st.flaggedName, { color: colors.foreground, flexShrink: 1 }]} numberOfLines={1}>
                        {c.firstName} {c.lastName}
                      </Text>
                      {(c as { identityVerified?: boolean }).identityVerified ? (
                        <CustomerIdentityVerifiedBadge size="sm" />
                      ) : null}
                    </View>
                    {!!c.city && <Text style={[st.flaggedCity, { color: colors.muted }]} numberOfLines={1}>{c.city}, {c.state}</Text>}
                    <View style={[st.riskScorePill, { backgroundColor: risk.color + "18" }]}>
                      <Text style={[st.riskScoreText, { color: risk.color }]}>{risk.emoji} {risk.score}/100</Text>
                    </View>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>⚠️ {(c as any).flaggedByContractors ?? (c as any).flagCount ?? 0} contractors flagged</Text>
                  </Pressable>
                  <Pressable onPress={() => handleShareFlag(`${c.firstName} ${c.lastName}`)} style={({ pressed }) => [st.shareBtn, pressed && { opacity: 0.6 }]}>
                    <Text style={[st.shareBtnText, { color: colors.primary }]}>📤 Warn Others</Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <View style={[st.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[st.emptyText, { color: colors.muted }]}>
              {scope === "national"
                ? "No flagged customers in this list right now. Use Search to look up someone before your next job."
                : `No flagged customers in ${locationLabel}. Try Search for a specific name, or view all states below.`}
            </Text>
            {scope !== "national" && (
              <Pressable onPress={() => setScope("national")} style={{ marginTop: 6 }}>
                <Text style={{ color: colors.primary, fontSize: 13 }}>Search All States →</Text>
              </Pressable>
            )}
            <Pressable onPress={() => router.push("/(tabs)/search" as never)} style={{ marginTop: 10 }}>
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>Go to Search →</Text>
            </Pressable>
          </View>
        )}

        {/* Recent Reviews */}
        <View style={[st.sectionHeader, { marginTop: 8 }]}>
          <Text style={[st.sectionTitle, { color: colors.foreground }]}>📋 Recent Reviews</Text>
        </View>
        {loadingReviews ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
        ) : reviewList.length > 0 ? (
          <View>
            {(reviewList as (ReviewWithContractor & {
              customerFirstName?: string | null;
              customerLastName?: string | null;
              customerCity?: string | null;
              customerState?: string | null;
              customerId: number;
            })[]).map((review) => {
              const custName = review.customerFirstName && review.customerLastName
                ? `${review.customerFirstName} ${review.customerLastName}`
                : undefined;
              const custLoc = [review.customerCity, review.customerState].filter(Boolean).join(", ") || undefined;
              const custVerified = (review as { customerIdentityVerified?: boolean }).customerIdentityVerified;
              return (
                <Pressable key={review.id} onPress={() => router.push(`/customer/${review.customerId}?from=direct` as never)}>
                  <ReviewCard
                    review={review}
                    showCustomerName
                    customerName={custName}
                    customerLocation={custLoc}
                    customerIdentityVerified={!!custVerified}
                    onHelpful={() => markHelpful.mutate({ reviewId: review.id })}
                  />
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={[st.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[st.emptyText, { color: colors.muted }]}>
              {scope === "national" ? "No reviews yet. Add your first review to get started." : `No reviews in ${locationLabel}.`}
            </Text>
            {scope !== "national" ? (
              <Pressable onPress={() => setScope("national")} style={{ marginTop: 6 }}>
                <Text style={{ color: colors.primary, fontSize: 13 }}>Search All States →</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => router.push("/add-review" as never)} style={[st.addFirstBtn, { backgroundColor: colors.primary }]}>
                <Text style={st.addFirstBtnText}>Add First Review</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={st.reliabilityFooter}>
          <Text style={st.reliabilityText}>All reviews from verified contractors · Fair dispute system · Data you can trust</Text>
        </View>
      </ScrollView>

      <Pressable onPress={() => router.push("/add-review" as never)} style={({ pressed }) => [st.fab, { backgroundColor: colors.primary }, pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] }]}>
        <Text style={st.fabText}>+</Text>
      </Pressable>
    </ScreenContainer>
    </ScreenBackground>
  );
}

const st = StyleSheet.create({
  landingScroll: { flexGrow: 1 },
  landingContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingVertical: 40 },
  logoText: { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", opacity: 0.5, marginBottom: 12 },
  heroKicker: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    textTransform: "uppercase" as const,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  heroHeadline: { color: "#fff", fontSize: 28, fontWeight: "900", textAlign: "center", lineHeight: 35, letterSpacing: -0.5 },
  heroSub: { color: "rgba(255,255,255,0.65)", fontSize: 15, textAlign: "center", lineHeight: 22, marginTop: 14, maxWidth: 340 },
  signInActions: { width: "100%", maxWidth: 400, marginTop: 36, gap: 18, alignSelf: "center" },
  landingBtnOuter: {
    borderRadius: 16,
    width: "100%",
    overflow: "visible",
  },
  landingBtnInner: {
    borderRadius: 16,
    overflow: "hidden",
    paddingVertical: 18,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  signInPrimaryBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.2,
    zIndex: 1,
  },
  landingAccountsNote: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 14,
    paddingHorizontal: 8,
  },
  trustStrip: { flexDirection: "row", gap: 16, marginTop: 36, flexWrap: "wrap", justifyContent: "center" },
  trustItem: { alignItems: "center", gap: 4 },
  trustIcon: { fontSize: 22 },
  trustLabel: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "600" },
  previewSection: { width: "100%", marginTop: 36 },
  previewTitle: { color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 4 },
  previewSubtitle: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 16 },
  previewCard: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  previewCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  previewAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  previewInitials: { color: "#fff", fontSize: 16, fontWeight: "700" },
  previewInfo: { flex: 1, gap: 2 },
  previewName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  previewLocation: { color: "rgba(255,255,255,0.55)", fontSize: 12 },
  previewScoreBox: { alignItems: "center", minWidth: 44 },
  previewScoreNum: { fontSize: 22, fontWeight: "900" },
  previewScoreLabel: { fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: "600", textTransform: "uppercase" },
  previewMeta: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  previewBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  previewBadgeText: { fontSize: 12, fontWeight: "600" },
  previewRating: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  previewFlags: { marginTop: 8, gap: 4 },
  previewFlag: { color: "#F87171", fontSize: 12 },
  previewGreenFlag: { color: "#4ADE80", fontSize: 12 },
  proofRow: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)", width: "100%" },
  proofText: { color: "rgba(255,255,255,0.35)", fontSize: 12, textAlign: "center" },

  scroll: { padding: 16, paddingBottom: 100 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  greeting: { fontSize: 14 },
  userName: { fontSize: 22, fontWeight: "700" },
  shieldBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  shieldText: { fontSize: 13, fontWeight: "600" },
  renewalBanner: { backgroundColor: "#f59e0b18", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#f59e0b44", marginBottom: 12 },
  renewalTitle: { color: "#f59e0b", fontSize: 14, fontWeight: "600", marginBottom: 4 },
  renewalBody: { color: "#f59e0b", fontSize: 13, lineHeight: 18 },
  verifyBanner: { backgroundColor: "rgba(59,130,246,0.08)", borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 12 },
  verifyTitle: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  verifyBody: { fontSize: 12 },
  statsContainer: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center", gap: 4 },
  statEmoji: { fontSize: 24 },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 11, fontWeight: "500", textAlign: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 20 },
  searchIcon: { fontSize: 18 },
  searchPlaceholder: { fontSize: 15, flex: 1 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  seeAll: { fontSize: 14, fontWeight: "500" },
  horizontalScroll: { paddingRight: 16, gap: 12, marginBottom: 20 },
  recentSearchRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 20 },
  recentChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  recentChipText: { fontSize: 13 },
  watchedCard: { width: 120, borderRadius: 12, borderWidth: 1, padding: 10, alignItems: "center", gap: 4 },
  watchedAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  watchedInitials: { color: "#fff", fontSize: 14, fontWeight: "700" },
  watchedName: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  flaggedCard: { width: 150, borderRadius: 14, borderWidth: 1.5, padding: 14, alignItems: "center", gap: 6 },
  flaggedAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  flaggedAvatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  flaggedName: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  flaggedCity: { fontSize: 11, textAlign: "center" },
  riskScorePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  riskScoreText: { fontSize: 12, fontWeight: "700" },
  shareBtn: { marginTop: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  shareBtnText: { fontSize: 11, fontWeight: "600" },
  emptyCard: { borderRadius: 14, borderWidth: 1, padding: 20, alignItems: "center", gap: 12, marginBottom: 20 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  addFirstBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  addFirstBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  reliabilityFooter: { marginTop: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  reliabilityText: { color: "rgba(255,255,255,0.3)", fontSize: 11, textAlign: "center", lineHeight: 16 },
  fab: { position: "absolute", bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  fabText: { color: "#fff", fontSize: 28, fontWeight: "300", lineHeight: 32 },
});
