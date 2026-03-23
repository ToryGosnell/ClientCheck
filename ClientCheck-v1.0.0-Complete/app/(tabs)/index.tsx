import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { API_BASE_URL, apiUrl } from "@/lib/api";
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
  addRecentSearch,
  hydrateUserDataFromDevice,
  type WatchedCustomer,
} from "@/lib/user-data";
import { track } from "@/lib/analytics";
import { isAlgoliaClientSearchConfigured, searchCustomersViaAlgolia } from "@/lib/algolia-customer-search";
import type { ReviewWithContractor } from "@/shared/types";

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

function useDebounced(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const HOME_SEARCH_DEBOUNCE_MS = 300;

function HighlightMatch({ text, query, baseStyle, tint }: { text: string; query: string; baseStyle: any; tint: string }) {
  const q = query.trim();
  if (!q || q.length < 2) return <Text style={baseStyle}>{text}</Text>;
  const lower = text.toLowerCase();
  const qi = lower.indexOf(q.toLowerCase());
  if (qi === -1) return <Text style={baseStyle}>{text}</Text>;
  return (
    <Text style={baseStyle}>
      {text.slice(0, qi)}
      <Text style={{ backgroundColor: tint }}>{text.slice(qi, qi + q.length)}</Text>
      {text.slice(qi + q.length)}
    </Text>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [landingQuery, setLandingQuery] = useState("");
  const [watched, setWatched] = useState<WatchedCustomer[]>([]);
  const [recentSearchTerms, setRecentSearchTerms] = useState<string[]>([]);
  const { scope, userState, userCity, setScope, filter: filterByLoc, locationLabel } = useLocationScope();

  // Live autocomplete: GET /api/customers?search= (debounced)
  const debouncedLanding = useDebounced(landingQuery.trim(), HOME_SEARCH_DEBOUNCE_MS);
  const canAutoSearch = debouncedLanding.length >= 2;
  const [homeSearchResults, setHomeSearchResults] = useState<Record<string, unknown>[]>([]);
  const [homeSearchLoading, setHomeSearchLoading] = useState(false);
  const [homeSearchError, setHomeSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!canAutoSearch) {
      setHomeSearchResults([]);
      setHomeSearchError(null);
      setHomeSearchLoading(false);
      return;
    }
    const ac = new AbortController();
    setHomeSearchLoading(true);
    setHomeSearchError(null);
    (async () => {
      if (isAlgoliaClientSearchConfigured()) {
        try {
          const rows = await searchCustomersViaAlgolia({
            query: debouncedLanding,
            state: userState && userState.length === 2 ? userState : undefined,
            hitsPerPage: 15,
          });
          if (ac.signal.aborted) return;
          setHomeSearchResults(rows as unknown as Record<string, unknown>[]);
          setHomeSearchError(null);
          setHomeSearchLoading(false);
          return;
        } catch {
          if (ac.signal.aborted) return;
          // fall through to REST fallback
        }
      }

      const url = apiUrl(`/api/customers?search=${encodeURIComponent(debouncedLanding)}`);
      try {
        // Public search: omit credentials avoids cross-site cookie / credentialed-CORS edge cases (localhost → Railway).
        const res = await fetch(url, { signal: ac.signal, credentials: "omit" });
        const text = await res.text();
        if (ac.signal.aborted) return;
        let data: { results?: unknown[]; error?: string } = {};
        try {
          data = text ? (JSON.parse(text) as { results?: unknown[]; error?: string }) : {};
        } catch {
          setHomeSearchError(
            __DEV__
              ? `HTTP ${res.status} ${res.statusText} — response not JSON. Body: ${text.slice(0, 160)}… | URL: ${url}`
              : "Search failed. Check your connection and try again.",
          );
          setHomeSearchResults([]);
          return;
        }
        if (!res.ok) {
          setHomeSearchError(
            __DEV__
              ? `HTTP ${res.status} ${res.statusText}: ${data?.error ?? text.slice(0, 200)} | URL: ${url}`
              : "Search failed. Check your connection and try again.",
          );
          setHomeSearchResults([]);
          return;
        }
        const list = Array.isArray(data.results) ? data.results : [];
        setHomeSearchResults(list as Record<string, unknown>[]);
      } catch (e: unknown) {
        if (ac.signal.aborted) return;
        const err = e as { name?: string; message?: string };
        if (err?.name === "AbortError") return;
        const msg = err?.message ?? String(e);
        if (__DEV__) {
          const corsHint =
            /failed to fetch|networkerror|load failed|network request failed/i.test(msg)
              ? " (often CORS, offline, or blocked request — check DevTools Network)"
              : "";
          setHomeSearchError(`Fetch error: ${msg}${corsHint} | API_BASE: ${API_BASE_URL || "(empty)"} | URL: ${url}`);
        } else {
          setHomeSearchError("Search failed. Check your connection and try again.");
        }
        setHomeSearchResults([]);
      } finally {
        if (!ac.signal.aborted) setHomeSearchLoading(false);
      }
    })();
    return () => ac.abort();
  }, [debouncedLanding, canAutoSearch, userState]);

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
  const membershipDisplay = membership ? getMembershipDisplayState(membership) : null;

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

  const handleLandingSearch = () => {
    if (landingQuery.trim().length >= 2) {
      addRecentSearch(landingQuery.trim());
      router.push({ pathname: "/(tabs)/search", params: { q: landingQuery.trim() } } as never);
    } else {
      router.push("/(tabs)/search" as never);
    }
  };

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
              Search a customer to get started — see contractor-reported experiences, risk signals, and dispute-aware context.
            </Text>

            {/* Inline search with autocomplete */}
            <View style={st.landingSearchWrap}>
              <Text style={st.landingHint}>
                Search a customer to get started — type a name; results appear as you type.
              </Text>
              <TextInput
                style={st.landingSearchInput}
                placeholder="Search by customer name…"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={landingQuery}
                onChangeText={setLandingQuery}
                onSubmitEditing={handleLandingSearch}
                returnKeyType="search"
              />

              {/* Autocomplete dropdown — GET /api/customers?search= */}
              {canAutoSearch && (
                <View style={st.autoDropdown}>
                  {homeSearchLoading ? (
                    <View style={st.autoRow}>
                      <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 10 }} />
                      <Text style={st.autoHint}>Searching…</Text>
                    </View>
                  ) : homeSearchError ? (
                    <View style={[st.autoRow, { flexDirection: "column", alignItems: "stretch" }]}>
                      <Text style={[st.autoHint, st.autoError]}>{homeSearchError}</Text>
                      {!__DEV__ ? (
                        <Text style={[st.autoHint, { marginTop: 6, opacity: 0.9 }]}>Change your search and try again.</Text>
                      ) : null}
                    </View>
                  ) : homeSearchResults.length === 0 ? (
                    <View style={[st.autoRow, { flexDirection: "column", alignItems: "stretch", gap: 6 }]}>
                      <Text style={st.autoHint}>No customer profiles matched that search.</Text>
                      <Text style={[st.autoHint, { opacity: 0.85, fontSize: 12 }]}>
                        Try another spelling, widen what you type, or tap Open customer search for the full Search tab.
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      style={st.autoListScroll}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                    >
                      {homeSearchResults.map((raw) => {
                        const c = raw as {
                          id: number;
                          firstName?: string;
                          lastName?: string;
                          city?: string | null;
                          state?: string | null;
                          reviewCount?: number;
                          overallRating?: string | null;
                        };
                        const risk = computeRiskScore(c as any);
                        const fullName = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
                        const loc = [c.city, c.state].filter(Boolean).join(", ");
                        const highlightTint = colors.primary + "35";
                        return (
                          <Pressable
                            key={String(c.id)}
                            onPress={() => {
                              setLandingQuery("");
                              addRecentSearch(fullName || debouncedLanding);
                              router.push(`/customer/${c.id}?from=search` as never);
                            }}
                            style={({ pressed }) => [st.autoItem, pressed && { backgroundColor: "rgba(255,255,255,0.08)" }]}
                          >
                            <View style={[st.autoAvatar, { backgroundColor: risk.color }]}>
                              <Text style={st.autoInitials}>
                                {(c.firstName?.[0] ?? "?")}{(c.lastName?.[0] ?? "?")}
                              </Text>
                            </View>
                            <View style={st.autoItemBody}>
                              <HighlightMatch
                                text={fullName || "Unknown"}
                                query={debouncedLanding}
                                baseStyle={st.autoName}
                                tint={highlightTint}
                              />
                              <HighlightMatch
                                text={loc || "—"}
                                query={debouncedLanding}
                                baseStyle={st.autoLoc}
                                tint={highlightTint}
                              />
                              {(c.reviewCount ?? 0) > 0 && (
                                <Text style={st.autoReviews}>
                                  {c.reviewCount} review{(c.reviewCount ?? 0) !== 1 ? "s" : ""}
                                </Text>
                              )}
                            </View>
                            <View style={st.autoScoreCol}>
                              <Text style={[st.autoScore, { color: risk.color }]}>{risk.score}</Text>
                              <Text style={[st.autoScoreLabel, { color: risk.color }]}>Risk</Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              )}

              <Pressable
                onPress={handleLandingSearch}
                style={({ pressed }) => [st.landingSearchBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }]}
              >
                <Text style={st.landingSearchBtnText}>Open customer search</Text>
              </Pressable>
            </View>
            <Text style={st.ctaSub}>Sign in for full customer profiles, tracking, and Alerts.</Text>
            <View style={st.signInActions}>
              <Pressable
                onPress={() => router.push({ pathname: "/select-account", params: { preset: "contractor" } } as never)}
                style={({ pressed }) => [st.signInPrimaryBtn, { backgroundColor: colors.primary, borderColor: colors.primary }, pressed && { opacity: 0.88 }]}
              >
                <Text style={st.signInPrimaryBtnText}>Contractor sign in</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push({ pathname: "/select-account", params: { preset: "customer" } } as never)}
                style={({ pressed }) => [st.signInSecondaryBtn, { borderColor: "rgba(255,255,255,0.35)" }, pressed && { opacity: 0.88 }]}
              >
                <Text style={[st.signInSecondaryBtnText, { color: colors.foreground }]}>Customer sign in</Text>
              </Pressable>
              <Text style={[st.signInHint, { color: colors.muted }]}>Same secure sign-in for new and returning users</Text>
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
                const demoQuery = `${c.firstName} ${c.lastName}`.trim();
                return (
                  <Pressable
                    key={i}
                    onPress={() =>
                      router.push({ pathname: "/(tabs)/search", params: { q: demoQuery } } as never)
                    }
                    style={({ pressed }) => [st.previewCard, { borderColor: risk.color + "44" }, pressed && { opacity: 0.8 }]}
                  >
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
                  </Pressable>
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
            <Text style={[st.verifyTitle, { color: colors.primary }]}>12 months free for verified contractors</Text>
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
                    <Text style={[st.watchedName, { color: colors.foreground }]} numberOfLines={1}>{c.firstName} {c.lastName}</Text>
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
                    <Text style={[st.flaggedName, { color: colors.foreground }]} numberOfLines={1}>{c.firstName} {c.lastName}</Text>
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
              return (
                <Pressable key={review.id} onPress={() => router.push(`/customer/${review.customerId}?from=direct` as never)}>
                  <ReviewCard
                    review={review}
                    showCustomerName
                    customerName={custName}
                    customerLocation={custLoc}
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
  heroSub: { color: "rgba(255,255,255,0.65)", fontSize: 15, textAlign: "center", lineHeight: 22, marginTop: 10, maxWidth: 340 },
  landingHint: { color: "rgba(255,255,255,0.5)", fontSize: 13, textAlign: "center", lineHeight: 18 },
  landingSearchWrap: { width: "100%", maxWidth: 400, marginTop: 20, gap: 10 },
  landingSearchInput: { backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: "#fff", fontSize: 16 },
  landingSearchBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  landingSearchBtnText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  autoDropdown: { backgroundColor: "rgba(20,20,25,0.95)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 12, overflow: "hidden" },
  autoListScroll: { maxHeight: 320 },
  autoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  autoHint: { color: "rgba(255,255,255,0.4)", fontSize: 13, flex: 1 },
  autoError: { color: "#fca5a5" },
  autoItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  autoAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginRight: 12 },
  autoInitials: { color: "#fff", fontSize: 12, fontWeight: "700" },
  autoItemBody: { flex: 1, minWidth: 0 },
  autoName: { color: "#fff", fontSize: 14, fontWeight: "600" },
  autoLoc: { color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 1 },
  autoReviews: { color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 },
  autoScoreCol: { alignItems: "flex-end", minWidth: 44, marginLeft: 8 },
  autoScore: { fontSize: 16, fontWeight: "800" },
  autoScoreLabel: { fontSize: 9, fontWeight: "600", textTransform: "uppercase" as const, opacity: 0.85 },
  ctaSub: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 8, textAlign: "center" },
  signInActions: { width: "100%", maxWidth: 400, marginTop: 16, gap: 12, alignSelf: "center" },
  signInPrimaryBtn: {
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
  },
  signInPrimaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  signInSecondaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
  },
  signInSecondaryBtnText: { fontSize: 16, fontWeight: "700" },
  signInHint: { fontSize: 12, textAlign: "center", lineHeight: 17, marginTop: 2 },
  trustStrip: { flexDirection: "row", gap: 16, marginTop: 28, flexWrap: "wrap", justifyContent: "center" },
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
