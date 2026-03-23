import { useLocalSearchParams, useRouter } from "expo-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenBackground } from "@/components/screen-background";
import { StatePicker } from "@/components/state-picker";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useSearchLimit } from "@/hooks/use-search-limit";
import { getApiBaseUrl } from "@/constants/oauth";
import { DEMO_MODE } from "@/lib/demo-data";
import { apiUrl } from "@/lib/api";
import { computeRiskScore } from "@/lib/risk-score";
import {
  addRecentSearch,
  getRecentSearches,
  isWatching,
  toggleWatch,
  type RecentSearch,
  type WatchedCustomer,
} from "@/lib/user-data";
import { track } from "@/lib/analytics";
import { isAlgoliaClientSearchConfigured, searchCustomersViaAlgolia } from "@/lib/algolia-customer-search";
import type { Customer } from "@/drizzle/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MIN_CHARS = 2;
const DEBOUNCE_MS = 280;
const MAX_RESULTS = 15;

/** Surface REST search errors in UI (dev / retry panel). */
function formatRestSearchError(err: unknown): string {
  if (err == null) return "unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  return JSON.stringify(err).slice(0, 600);
}

const RISK_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  high:    { label: "High Risk", color: "#ef4444", bg: "#ef444418" },
  medium:  { label: "Watch",     color: "#f59e0b", bg: "#f59e0b18" },
  low:     { label: "Safe",      color: "#10b981", bg: "#10b98118" },
  unknown: { label: "New",       color: "#6b7280", bg: "#6b728018" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

function firstSearchParam(q: string | string[] | undefined): string {
  if (q == null) return "";
  return Array.isArray(q) ? (typeof q[0] === "string" ? q[0] : "") : q;
}

function useDebounced(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─────────────────────────────────────────────────────────────────────────────
// Text highlight helper
// ─────────────────────────────────────────────────────────────────────────────

function HighlightedText({
  text,
  highlight,
  style,
  highlightColor,
}: {
  text: string;
  highlight: string;
  style: any;
  highlightColor: string;
}) {
  const hl = highlight.trim();
  if (!hl || hl.length < 2) return <Text style={style}>{text}</Text>;
  const lower = text.toLowerCase();
  const hlLower = hl.toLowerCase();
  const parts: { str: string; match: boolean }[] = [];
  let start = 0;
  let idx = lower.indexOf(hlLower, start);
  if (idx === -1) return <Text style={style}>{text}</Text>;
  while (idx !== -1) {
    if (idx > start) parts.push({ str: text.slice(start, idx), match: false });
    parts.push({ str: text.slice(idx, idx + hl.length), match: true });
    start = idx + hl.length;
    idx = lower.indexOf(hlLower, start);
  }
  if (start < text.length) parts.push({ str: text.slice(start), match: false });
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.match ? (
          <Text
            key={i}
            style={{
              backgroundColor: highlightColor,
              fontWeight: "800",
            }}
          >
            {p.str}
          </Text>
        ) : (
          p.str
        ),
      )}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string | string[] }>();
  const { isAuthenticated } = useAuth();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState(() => firstSearchParam(params.q));
  const [selectedState, setSelectedState] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [saveUiTick, setSaveUiTick] = useState(0);
  const searchRecorded = useRef(false);

  const isPaid = isAuthenticated;
  const { remaining, limit, isLimited, recordSearch } = useSearchLimit(isPaid);

  useEffect(() => {
    const pq = firstSearchParam(params.q);
    if (!pq) return;
    setQuery((current) => (current !== pq ? pq : current));
  }, [params.q]);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    if (!__DEV__) return;
    console.log("[Search] cfg", { DEMO_MODE, apiBase: getApiBaseUrl() });
  }, []);

  const debouncedQuery = useDebounced(query.trim(), DEBOUNCE_MS);
  /** Must not depend on isLimited — otherwise free web users past daily cap get zero API calls and no list. */
  const searchEnabled = debouncedQuery.length >= MIN_CHARS;

  const algoliaConfigured = isAlgoliaClientSearchConfigured();

  const algoliaQuery = useQuery({
    queryKey: ["algolia-customers-search", debouncedQuery, selectedState, MAX_RESULTS],
    queryFn: () =>
      searchCustomersViaAlgolia({
        query: debouncedQuery,
        state: selectedState || undefined,
        hitsPerPage: MAX_RESULTS,
      }),
    enabled: searchEnabled && algoliaConfigured,
    staleTime: 15_000,
    retry: false,
  });

  const useRestFallback = searchEnabled && (!algoliaConfigured || algoliaQuery.isError);

  const {
    data: restSearchResults,
    isLoading: restLoading,
    isFetching: restFetching,
    isError: restIsError,
    error: restError,
    refetch: refetchRestSearch,
  } = useQuery({
    queryKey: ["rest-customers-search", debouncedQuery, selectedState, MAX_RESULTS],
    queryFn: async (): Promise<Customer[]> => {
      const finalUrl = apiUrl(`/api/customers?search=${encodeURIComponent(debouncedQuery)}`);
      console.log("SEARCH URL", finalUrl);
      const res = await fetch(finalUrl, { credentials: "include" });
      const text = await res.text();
      let data: { results?: unknown[]; error?: string } = {};
      try {
        data = text ? (JSON.parse(text) as { results?: unknown[]; error?: string }) : {};
      } catch {
        throw new Error(`Search response was not JSON (HTTP ${res.status})`);
      }
      if (!res.ok) {
        throw new Error(data?.error ?? `Search failed (${res.status})`);
      }
      let rows = Array.isArray(data.results) ? (data.results as Customer[]) : [];
      const st = selectedState.trim();
      if (st.length === 2) {
        const upper = st.toUpperCase();
        rows = rows.filter((c) => String(c.state ?? "").toUpperCase() === upper);
      }
      return rows.slice(0, MAX_RESULTS);
    },
    enabled: searchEnabled && useRestFallback,
    placeholderData: keepPreviousData,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });

  const displayResults = useMemo(() => {
    if (searchEnabled && algoliaConfigured && algoliaQuery.isSuccess && !algoliaQuery.isError) {
      return algoliaQuery.data ?? [];
    }
    if (searchEnabled && useRestFallback) {
      return (restSearchResults ?? []) as Customer[];
    }
    return [];
  }, [
    searchEnabled,
    algoliaConfigured,
    algoliaQuery.isSuccess,
    algoliaQuery.isError,
    algoliaQuery.data,
    useRestFallback,
    restSearchResults,
  ]);

  const isSearchLoading =
    !!searchEnabled &&
    ((algoliaConfigured && !algoliaQuery.isError && (algoliaQuery.isPending || algoliaQuery.isFetching)) ||
      (useRestFallback && (restLoading || restFetching)));

  const isSearchError = useRestFallback && restIsError;

  const stateFilterApplied = selectedState.trim().length === 2;

  const resolvedSearchSource = useMemo((): "algolia" | "rest_api" | null => {
    if (!searchEnabled || isSearchLoading) return null;
    if (isSearchError) return null;
    if (algoliaConfigured && algoliaQuery.isSuccess && !algoliaQuery.isError) return "algolia";
    if (useRestFallback && !restIsError) return "rest_api";
    return null;
  }, [
    searchEnabled,
    isSearchLoading,
    isSearchError,
    algoliaConfigured,
    algoliaQuery.isSuccess,
    algoliaQuery.isError,
    useRestFallback,
    restIsError,
  ]);

  const searchSessionRef = useRef({
    source: null as "algolia" | "rest_api" | null,
    queryLength: 0,
    stateFilter: false,
  });
  searchSessionRef.current = {
    source: resolvedSearchSource,
    queryLength: debouncedQuery.length,
    stateFilter: stateFilterApplied,
  };

  const hasQuery = debouncedQuery.length >= MIN_CHARS;
  const rawResultsCount = displayResults.length;
  const displayResultsCount = displayResults.length;
  const flatListShouldRender = hasQuery && displayResultsCount > 0;
  const showResults = hasQuery && displayResults.length > 0;
  const showNoResults = hasQuery && !isSearchLoading && !isSearchError && displayResults.length === 0;
  const karenLikeInRaw = useMemo(
    () =>
      displayResults.filter((c) => /karen/i.test(`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim())).length,
    [displayResults],
  );

  useEffect(() => {
    if (!__DEV__) return;
    console.log("[Search]", {
      query,
      debouncedQuery,
      selectedState: selectedState || "(none)",
      searchEnabled,
      algolia: algoliaConfigured,
      algoliaError: algoliaQuery.isError,
      isLimited,
      len: displayResults.length,
      isSearchLoading,
      isSearchError: isSearchError ? formatRestSearchError(restError) : false,
      showResults,
      showNoResults,
      search_source: resolvedSearchSource,
      query_length: debouncedQuery.length,
      state_filter_applied: stateFilterApplied,
    });
  }, [
    query,
    debouncedQuery,
    selectedState,
    searchEnabled,
    algoliaConfigured,
    algoliaQuery.isError,
    isLimited,
    displayResults.length,
    isSearchLoading,
    isSearchError,
    restError,
    showResults,
    showNoResults,
    resolvedSearchSource,
    stateFilterApplied,
  ]);

  useEffect(() => {
    if (debouncedQuery.length >= MIN_CHARS && !isSearchLoading && !searchRecorded.current) {
      addRecentSearch(debouncedQuery);
      setRecentSearches(getRecentSearches());
      if (!isPaid && !isLimited) recordSearch();
      searchRecorded.current = true;
      track("search_performed", {
        query: debouncedQuery,
        result_count: displayResults.length,
        state: selectedState || "all",
        query_length: debouncedQuery.length,
        search_source: resolvedSearchSource ?? undefined,
        state_filter_applied: stateFilterApplied,
      });
      if (!isSearchError && displayResults.length === 0) {
        track("search_no_results", {
          query_length: debouncedQuery.length,
          search_source: resolvedSearchSource ?? undefined,
          state_filter_applied: stateFilterApplied,
        });
      }
    }
  }, [
    debouncedQuery,
    displayResults.length,
    isSearchLoading,
    isPaid,
    isLimited,
    recordSearch,
    selectedState,
    resolvedSearchSource,
    stateFilterApplied,
    isSearchError,
  ]);

  useEffect(() => { searchRecorded.current = false; }, [debouncedQuery]);
  useEffect(() => { setHighlightedIndex(-1); }, [displayResults]);
  useEffect(() => { if (isLimited) track("search_limit_hit"); }, [isLimited]);

  const showRecent = !hasQuery && query.length === 0 && recentSearches.length > 0;

  const handleSelect = useCallback(
    (customer: Customer, position: number) => {
      const ctx = searchSessionRef.current;
      if (debouncedQuery.length >= MIN_CHARS) {
        track("search_result_clicked", {
          customer_id: customer.id,
          position,
          query_length: ctx.queryLength,
          state_filter_applied: ctx.stateFilter,
          search_source: ctx.source ?? undefined,
        });
      }
      Keyboard.dismiss();
      setIsFocused(false);
      if (isLimited && !isPaid) {
        router.push("/select-account" as never);
        return;
      }
      if (!isAuthenticated) {
        router.push({
          pathname: "/unlock-profile",
          params: {
            name: `${customer.firstName} ${customer.lastName}`,
            rating: parseFloat(customer.overallRating ?? "0").toFixed(1),
            risk: customer.riskLevel ?? "unknown",
          },
        } as never);
      } else {
        router.push(`/customer/${customer.id}?from=search` as never);
      }
    },
    [isAuthenticated, isLimited, isPaid, router, debouncedQuery.length],
  );

  const handleToggleSaveSearch = useCallback(
    (customer: Customer) => {
      if (!isAuthenticated) {
        router.push("/select-account" as never);
        return;
      }
      const payload: WatchedCustomer = {
        id: customer.id,
        firstName: customer.firstName ?? "",
        lastName: customer.lastName ?? "",
        riskLevel: customer.riskLevel ?? "unknown",
        overallRating: String(customer.overallRating ?? "0"),
        city: customer.city ?? undefined,
        state: customer.state ?? undefined,
        addedAt: Date.now(),
      };
      const added = toggleWatch(payload);
      setSaveUiTick((n) => n + 1);
      track("watch_toggled_from_search", { customer_id: customer.id, watching: added });
    },
    [isAuthenticated, router],
  );

  const handleRecentPress = useCallback((q: string) => {
    setQuery(q);
    inputRef.current?.focus();
  }, []);

  // Keyboard navigation (web)
  const handleKeyPress = useCallback((e: any) => {
    if (Platform.OS !== "web") return;
    const key = e.nativeEvent?.key;
    if (key === "ArrowDown") {
      e.preventDefault?.();
      setHighlightedIndex(i => Math.min(i + 1, displayResults.length - 1));
    } else if (key === "ArrowUp") {
      e.preventDefault?.();
      setHighlightedIndex(i => Math.max(i - 1, -1));
    } else if (key === "Enter" && highlightedIndex >= 0 && highlightedIndex < displayResults.length) {
      handleSelect(displayResults[highlightedIndex], highlightedIndex);
    } else if (key === "Escape") {
      setIsFocused(false);
      Keyboard.dismiss();
    }
  }, [displayResults, highlightedIndex, handleSelect]);

  const highlightColor = colors.primary + "45";

  // ─── Render ─────────────────────────────────────────────────────────────────
  // RN Web: whitespace/newlines between JSX siblings inside <View> become text
  // nodes and crash. Use array children so only elements are passed (no "\n" nodes).

  return (
    <ScreenBackground backgroundKey="search">
      <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-transparent">
        <View style={st.screenInner}>
          {[
            <View key="hdr" style={st.header}>
              {[
                <Text key="h1" style={[st.headerTitle, { color: colors.foreground }]}>Search</Text>,
                !isAuthenticated && remaining !== undefined ? (
                  <View key="h2" style={[st.limitPill, { backgroundColor: colors.primary + "18" }]}>
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "600" }}>
                      {`${remaining}/${limit} free`}
                    </Text>
                  </View>
                ) : null,
              ]}
            </View>,

            __DEV__ && hasQuery ? (
              <View
                key="search-telemetry"
                style={[st.searchTelemetry, { borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.04)" }]}
              >
                <Text style={[st.searchTelemetryText, { color: "rgba(255,255,255,0.5)" }]}>
                  {[
                    "dev ",
                    "source: ",
                    isSearchLoading
                      ? "…"
                      : isSearchError
                        ? "error"
                        : resolvedSearchSource === "algolia"
                          ? "Algolia"
                          : resolvedSearchSource === "rest_api"
                            ? "REST /api/customers"
                            : "—",
                    ` · state filter: ${stateFilterApplied ? "yes" : "no"}`,
                    ` · results: ${displayResults.length}`,
                  ].join("")}
                </Text>
              </View>
            ) : null,

            <View key="search" style={st.searchSection}>
              {[
                <View
                  key="inp"
                  style={[
                    st.inputContainer,
                    { backgroundColor: colors.surface, borderColor: isFocused ? colors.primary + "60" : colors.border },
                    isFocused && st.inputFocused,
                  ]}
                >
                  {[
                    <Text key="ic" style={st.searchIcon}>🔍</Text>,
                    <TextInput
                      key="ti"
                      ref={inputRef}
                      style={[st.input, { color: colors.foreground }]}
                      placeholder="Type a customer name, phone, or city"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      value={query}
                      editable={true}
                      onChangeText={(text) => {
                        if (__DEV__) console.log("Typing:", text);
                        setQuery(text);
                      }}
                      onFocus={() => setIsFocused(true)}
                      onKeyPress={handleKeyPress}
                      autoCapitalize="words"
                      returnKeyType="search"
                      autoFocus={!!firstSearchParam(params.q)}
                    />,
                    isSearchLoading && hasQuery ? (
                      <ActivityIndicator key="ld" size="small" color={colors.primary} style={{ marginRight: 4 }} />
                    ) : null,
                    query.length > 0 ? (
                      <Pressable key="clr" onPress={() => { setQuery(""); inputRef.current?.focus(); }} hitSlop={8}>
                        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 16 }}>✕</Text>
                      </Pressable>
                    ) : null,
                  ]}
                </View>,
                <Text
                  key="st-label"
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: "rgba(255,255,255,0.38)",
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    marginBottom: 6,
                    marginTop: 4,
                  }}
                >
                  Optional state filter
                </Text>,
                <StatePicker
                  key="st"
                  selectedState={selectedState}
                  onSelect={(abbr) => setSelectedState(abbr)}
                  onClear={() => setSelectedState("")}
                />,
                <Text
                  key="type-hint"
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.38)",
                    marginTop: 2,
                    lineHeight: 17,
                  }}
                >
                  Results update as you type (after 2 characters).
                </Text>,
                __DEV__ ? (
                  <View key="dbgfb" style={st.debugWrap}>
                    {[
                      <View key="dbg" style={st.debugPanel}>
                        {[
                          <Text key="t0" style={st.debugTitle}>DEBUG (dev only)</Text>,
                          <Text key="t1" style={st.debugText}>{`query: ${JSON.stringify(query)}`}</Text>,
                          <Text key="t2" style={st.debugText}>{`debouncedQuery: ${JSON.stringify(debouncedQuery)}`}</Text>,
                          <Text key="t3" style={st.debugText}>{`searchEnabled: ${String(searchEnabled)}`}</Text>,
                          <Text key="t4" style={st.debugText}>{`isLimited: ${String(isLimited)}`}</Text>,
                          <Text key="t5" style={st.debugText}>{`algolia: ${String(algoliaConfigured)}`}</Text>,
                          <Text key="t5b" style={st.debugText}>{`algoliaErr: ${String(algoliaQuery.isError)}`}</Text>,
                          <Text key="t6" style={st.debugText}>{`isSearchLoading: ${String(isSearchLoading)}`}</Text>,
                          <Text key="t7" style={st.debugText}>{`isSearchError: ${String(isSearchError)}`}</Text>,
                          <Text key="t8" style={st.debugText}>{`rawResultsCount: ${rawResultsCount}`}</Text>,
                          <Text key="t9" style={st.debugText}>{`displayResultsCount: ${displayResultsCount}`}</Text>,
                          <Text key="t10" style={st.debugText}>{`flatListShouldRender: ${String(flatListShouldRender)}`}</Text>,
                          <Text key="t11" style={st.debugText}>{`karenLikeInRaw: ${karenLikeInRaw}`}</Text>,
                          <Text key="t12" style={st.debugText}>{`restSearch: ${apiUrl(`/api/customers?search=${encodeURIComponent(debouncedQuery || "…")}`)}`}</Text>,
                          isSearchError ? (
                            <Text key="t13" style={st.debugText}>{`restErr: ${formatRestSearchError(restError)}`}</Text>
                          ) : null,
                        ]}
                      </View>,
                      rawResultsCount > 0 ? (
                        <View key="fb" style={st.fallbackListOuter}>
                          {[
                            <Text key="f0" style={st.fallbackListTitle}>DEBUG plain list (raw rows, not FlatList)</Text>,
                            ...displayResults.map((c) => (
                              <View key={`fb-${c.id}`} style={st.fallbackRow}>
                                {[
                                  <Text key="n" style={st.fallbackRowText}>
                                    {`${c.id} · ${c.firstName} ${c.lastName} · ${c.city ?? ""}, ${c.state ?? ""}`}
                                  </Text>,
                                ]}
                              </View>
                            )),
                          ]}
                        </View>
                      ) : null,
                    ]}
                  </View>
                ) : null,
              ]}
            </View>,

            <View key="drop" style={[st.dropdownArea, st.dropdownFrame]}>
                {[
                  isLimited ? (
                    <View key="limban" style={[st.limitBanner, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "40" }]}>
                      {[
                        <Text key="lb1" style={[st.limitBannerTitle, { color: colors.foreground }]}>
                          {`You've used today's ${limit} free searches. You can still browse results below. Sign in to open full customer profiles, unlock the full report, and get unlimited search.`}
                        </Text>,
                        <Pressable key="lb2" onPress={() => router.push("/select-account" as never)} style={[st.ctaBtn, { backgroundColor: colors.primary, marginTop: 8 }]}>
                          <Text style={st.ctaBtnText}>Sign in</Text>
                        </Pressable>,
                      ]}
                    </View>
                  ) : null,
                  showRecent ? (
                    <View key="recent" style={st.recentSection}>
                      {[
                        <Text key="rl" style={[st.recentLabel, { color: "rgba(255,255,255,0.45)" }]}>Recent Searches</Text>,
                        ...recentSearches.slice(0, 5).map((s) => (
                          <Pressable
                            key={s.query + s.timestamp}
                            onPress={() => handleRecentPress(s.query)}
                            style={({ pressed, hovered }: any) => [st.recentRow, (pressed || hovered) && { backgroundColor: "rgba(255,255,255,0.04)" }]}
                          >
                            {[
                              <Text key="c" style={[st.recentClock, { color: "rgba(255,255,255,0.4)", fontSize: 14 }]}>🕐</Text>,
                              <Text key="q" style={{ color: colors.foreground, fontSize: 14 }}>{s.query}</Text>,
                            ]}
                          </Pressable>
                        )),
                      ]}
                    </View>
                  ) : null,

                  !hasQuery && !showRecent ? (
                    <View key="empty" style={st.emptyCenter}>
                      {[
                        <Text key="e1" style={{ fontSize: 40, marginBottom: 8 }}>🔍</Text>,
                        <Text key="e2" style={[st.emptyTitle, { color: colors.foreground }]}>Search a customer to get started</Text>,
                        <Text key="e3" style={[st.emptyDesc, { color: "rgba(255,255,255,0.45)" }]}>
                          Type at least 2 characters in the field above — results update as you type. Optionally pick a state
                          to narrow the list. Tap a row to open the customer profile; use Track customer for Alerts.
                        </Text>,
                      ]}
                    </View>
                  ) : null,

                  hasQuery && isSearchLoading && displayResults.length === 0 ? (
                    <View key="loading" style={st.emptyCenter}>
                      {[
                        <View key="sk" style={st.loadingPulse}>
                          <ActivityIndicator color={colors.primary} size="large" />
                        </View>,
                        <Text key="lt" style={[st.loadingTitle, { color: colors.foreground }]}>Searching records…</Text>,
                        <Text key="ls" style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 6, textAlign: "center" }}>
                          Matching names, locations, and profiles
                        </Text>,
                      ]}
                    </View>
                  ) : null,

                  hasQuery && isSearchError ? (
                    <View key="err" style={st.emptyCenter}>
                      {[
                        <Text key="et" style={[st.emptyTitle, { color: colors.foreground }]}>Search is temporarily unavailable</Text>,
                        <Text key="ed" style={[st.emptyDesc, { color: "rgba(255,255,255,0.45)" }]}>
                          {__DEV__
                            ? formatRestSearchError(restError)
                            : "Please try again in a moment. If this keeps happening, contact support."}
                        </Text>,
                        <Pressable
                          key="retry"
                          onPress={() => void refetchRestSearch()}
                          style={[st.ctaBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
                        >
                          <Text style={st.ctaBtnText}>Retry search</Text>
                        </Pressable>,
                        __DEV__ ? (
                          <Text key="eu" style={[st.emptyDesc, { color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 8 }]}>
                            {`GET ${apiUrl(`/api/customers?search=${encodeURIComponent(debouncedQuery || "")}`)}`}
                          </Text>
                        ) : null,
                      ]}
                    </View>
                  ) : null,

                  showResults ? (
                    <FlatList
                      key="list"
                      data={displayResults}
                      keyExtractor={(item) => item.id.toString()}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ paddingBottom: 100 }}
                      ListHeaderComponent={
                        <View style={st.resultsHeader}>
                          {[
                            <Text key="rh" style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: "700" }}>
                              {`${displayResults.length} ${displayResults.length === 1 ? "match" : "matches"}${selectedState ? ` · State: ${selectedState}` : ""}`}
                            </Text>,
                            <Text key="rh2" style={{ color: "rgba(255,255,255,0.32)", fontSize: 11, marginTop: 4 }}>
                              Tap a row to open the full profile
                            </Text>,
                            isAuthenticated ? (
                              <Text key="rh3" style={{ color: "rgba(255,255,255,0.28)", fontSize: 11, marginTop: 3 }}>
                                Track customer — get alerts when activity changes (Alerts → Tracked customers)
                              </Text>
                            ) : null,
                          ]}
                        </View>
                      }
                      renderItem={({ item, index }) => {
                        const risk = computeRiskScore(item as any);
                        const badge = RISK_BADGE[item.riskLevel ?? "unknown"] ?? RISK_BADGE.unknown;
                        const initials = `${item.firstName?.[0] ?? ""}${item.lastName?.[0] ?? ""}`.toUpperCase();
                        const fullName = `${item.firstName} ${item.lastName}`;
                        const location = [item.city, item.state].filter(Boolean).join(", ");
                        const isHighlighted = index === highlightedIndex;

                        return (
                          <View style={[st.resultRow, { borderBottomColor: colors.border }]}>
                            <Pressable
                              onPress={() => handleSelect(item, index)}
                              style={({ pressed, hovered }: any) => [
                                st.resultRowMain,
                                (pressed || isHighlighted) && { backgroundColor: "rgba(255,255,255,0.06)" },
                                hovered && { backgroundColor: "rgba(255,255,255,0.04)" },
                              ]}
                            >
                              {[
                                <View key="av" style={[st.avatar, { backgroundColor: badge.color + "28" }]}>
                                  {[
                                    <Text key="ai" style={[st.avatarText, { color: badge.color }]}>{initials}</Text>,
                                  ]}
                                </View>,

                                <View key="bd" style={st.resultBody}>
                                  {[
                                    <HighlightedText
                                      key="nm"
                                      text={fullName}
                                      highlight={debouncedQuery}
                                      style={[st.resultName, { color: colors.foreground }]}
                                      highlightColor={highlightColor}
                                    />,
                                    location ? (
                                      <HighlightedText
                                        key="loc"
                                        text={location}
                                        highlight={debouncedQuery}
                                        style={[st.resultLocation, { color: "rgba(255,255,255,0.5)" }]}
                                        highlightColor={highlightColor}
                                      />
                                    ) : null,
                                    <View key="meta" style={st.resultMeta}>
                                      {[
                                        <View key="pill" style={[st.riskPill, { backgroundColor: badge.bg }]}>
                                          {[
                                            <Text key="pl" style={[st.riskPillText, { color: badge.color }]}>{badge.label}</Text>,
                                          ]}
                                        </View>,
                                        <Text key="rc" style={st.reviewCount}>
                                          {`${item.reviewCount ?? 0} reviews`}
                                        </Text>,
                                        risk.score > 0 ? (
                                          <Text key="sc" style={[st.scoreTag, { color: badge.color }]}>{String(risk.score)}</Text>
                                        ) : null,
                                      ]}
                                    </View>,
                                  ]}
                                </View>,

                                <Text key="ch" style={[st.chevron, { color: "rgba(255,255,255,0.2)", fontSize: 20, fontWeight: "300" }]}>›</Text>,
                              ]}
                            </Pressable>
                            {                            isAuthenticated ? (
                              <View style={st.trackColumn}>
                                <Pressable
                                  onPress={() => handleToggleSaveSearch(item)}
                                  accessibilityLabel={
                                    isWatching(item.id)
                                      ? "Stop tracking this customer"
                                      : "Track customer for activity alerts"
                                  }
                                  style={({ pressed }) => [
                                    st.trackCustomerBtn,
                                    {
                                      borderColor: colors.primary + "44",
                                      backgroundColor: pressed ? colors.primary + "14" : colors.primary + "08",
                                    },
                                  ]}
                                >
                                  <Text
                                    style={{ color: colors.primary, fontSize: 10, fontWeight: "800", textAlign: "center" }}
                                    numberOfLines={2}
                                  >
                                    {isWatching(item.id) ? "Tracking" : "Track customer"}
                                  </Text>
                                </Pressable>
                                <Text style={[st.trackHint, { color: "rgba(255,255,255,0.38)" }]} numberOfLines={2}>
                                  Get alerts when activity changes
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        );
                      }}
                    />
                  ) : null,

                  showNoResults ? (
                    <View key="nor" style={st.emptyCenter}>
                      {[
                        <Text key="n1" style={{ fontSize: 36, marginBottom: 8 }}>📋</Text>,
                        <Text key="n2" style={[st.emptyTitle, { color: colors.foreground }]}>No customer profiles found</Text>,
                        <Text key="n3" style={[st.emptyDesc, { color: "rgba(255,255,255,0.45)" }]}>
                          {`Nothing matched “${debouncedQuery}”${selectedState ? ` in ${selectedState}` : ""}. Next: try a different spelling, search another name, or clear the state filter. Still stuck? Search from the home screen or remove filters.`}
                        </Text>,
                        selectedState ? (
                          <Pressable key="n4" onPress={() => setSelectedState("")} style={[st.ctaBtn, { backgroundColor: colors.primary, marginTop: 8 }]}>
                            <Text style={st.ctaBtnText}>Clear state filter</Text>
                          </Pressable>
                        ) : null,
                      ]}
                    </View>
                  ) : null,
                ]}
              </View>,
          ]}
        </View>
      </ScreenContainer>
    </ScreenBackground>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  screenInner: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  limitPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },

  searchTelemetry: {
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchTelemetryText: { fontSize: 10, fontWeight: "600", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },

  searchSection: { paddingHorizontal: 20, paddingBottom: 12 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  inputFocused: {
    ...(Platform.OS === "web" ? { boxShadow: "0 0 0 3px rgba(59,130,246,0.15)" } : {}),
  } as any,
  searchIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, fontSize: 16, ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}) } as any,

  debugWrap: { marginTop: 10 },
  debugPanel: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(234,179,8,0.7)",
    backgroundColor: "rgba(234,179,8,0.12)",
  },
  debugTitle: { fontSize: 11, fontWeight: "800", color: "#eab308", marginBottom: 6 },
  debugText: { fontSize: 10, color: "rgba(255,255,255,0.85)", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", marginBottom: 2 },
  fallbackListOuter: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.6)",
    backgroundColor: "rgba(59,130,246,0.1)",
  },
  fallbackListTitle: { fontSize: 11, fontWeight: "700", color: "#93c5fd", marginBottom: 8 },
  fallbackRow: { paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.1)" },
  fallbackRowText: { fontSize: 13, color: "#fff" },

  dropdownArea: { flex: 1 },
  dropdownFrame: {
    marginHorizontal: 12,
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flex: 1,
  },
  limitBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  limitBannerTitle: { fontSize: 13, lineHeight: 18, textAlign: "center" },

  // Recent searches
  recentSection: { paddingHorizontal: 20, paddingTop: 8 },
  recentLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  recentRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8 },
  recentClock: { marginRight: 10 },

  // Results
  resultsHeader: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 6 },
  resultRow: {
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
    paddingVertical: 12,
    paddingRight: 8,
    minWidth: 0,
  },
  trackColumn: {
    alignSelf: "center",
    alignItems: "center",
    maxWidth: 108,
    marginRight: 10,
    gap: 4,
  },
  trackCustomerBtn: {
    minWidth: 96,
    maxWidth: 104,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  trackHint: { fontSize: 9, fontWeight: "600", textAlign: "center", lineHeight: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarText: { fontSize: 15, fontWeight: "800" },
  resultBody: { flex: 1, minWidth: 0 },
  resultName: { fontSize: 15, fontWeight: "700" },
  resultLocation: { fontSize: 12, marginTop: 2 },
  resultMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginTop: 3 },
  riskPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
  riskPillText: { fontSize: 10, fontWeight: "700" },
  reviewCount: { fontSize: 11, color: "rgba(255,255,255,0.4)", marginRight: 8 },
  scoreTag: { fontSize: 12, fontWeight: "800" },
  chevron: { marginLeft: 8 },

  // Empty states
  emptyCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  loadingPulse: {
    padding: 16,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  loadingTitle: { fontSize: 15, fontWeight: "700", marginTop: 14, textAlign: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  emptyDesc: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  ctaBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 12 },
  ctaBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
