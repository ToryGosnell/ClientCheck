import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenBackground } from "@/components/screen-background";
import { CustomerCard } from "@/components/customer-card";
import { LocationScopeBar } from "@/components/location-scope-bar";
import { useColors } from "@/hooks/use-colors";
import { useLocationScope } from "@/hooks/use-location-scope";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import {
  getAlerts,
  getWatchedCustomers,
  markAlertRead,
  markAllAlertsRead,
  shouldThrottleWatchAutoSync,
  setLastWatchAlertsSyncMs,
  type CustomerAlert,
} from "@/lib/user-data";
import { applyRetentionSnapshot } from "@/lib/watch-alert-sync";
import type { Customer } from "@/drizzle/schema";
import { track } from "@/lib/analytics";

type AlertsTab = "community" | "saved";

const AUTO_SYNC_MS = 5 * 60 * 1000;

function startOfLocalDayMs(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Today (local calendar) vs prior 7 days vs older */
function bucketAlertTimestamp(ts: number): "today" | "week" | "earlier" {
  const sod = startOfLocalDayMs();
  if (ts >= sod) return "today";
  const weekStart = sod - 7 * 86400000;
  if (ts >= weekStart) return "week";
  return "earlier";
}

function isAlertHighPriority(a: CustomerAlert): boolean {
  if (a.priority === "high") return true;
  if (a.type === "dispute") return true;
  if (a.type === "score_change" && /dropped/i.test(a.message)) return true;
  return false;
}

function formatAlertTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AlertsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useFocusEffect(
    useCallback(() => {
      track("alerts_viewed");
    }, []),
  );
  const { scope, userState, userCity, setScope, filter: filterByLoc, locationLabel } = useLocationScope();
  const [tab, setTab] = useState<AlertsTab>("community");
  const [personalAlerts, setPersonalAlerts] = useState(getAlerts());
  const [syncing, setSyncing] = useState(false);

  const utils = trpc.useUtils();

  const {
    data: flaggedCustomers,
    isLoading,
    isError: flaggedError,
    refetch: refetchFlagged,
  } = trpc.customers.getFlagged.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const filteredFlagged = useMemo(
    () => filterByLoc((flaggedCustomers ?? []) as Customer[]),
    [flaggedCustomers, filterByLoc],
  );

  const refreshPersonalList = useCallback(() => {
    setPersonalAlerts(getAlerts());
  }, []);

  const syncSavedCustomerAlerts = useCallback(async () => {
    const watched = getWatchedCustomers();
    if (watched.length === 0) {
      refreshPersonalList();
      return;
    }
    setSyncing(true);
    try {
      for (const w of watched) {
        const snap = await utils.customers.getRetentionSnapshot.fetch({ customerId: w.id });
        if (snap) {
          applyRetentionSnapshot(w.id, `${w.firstName} ${w.lastName}`, {
            reviewCount: snap.reviewCount,
            disputeCount: snap.disputeCount,
            customerScore: snap.customerScore,
            anyReviewUnderReview: snap.anyReviewUnderReview,
          });
        }
      }
      setLastWatchAlertsSyncMs(Date.now());
      refreshPersonalList();
    } finally {
      setSyncing(false);
    }
  }, [utils.customers.getRetentionSnapshot, refreshPersonalList]);

  useEffect(() => {
    if (tab !== "saved" || !isAuthenticated) return;
    if (getWatchedCustomers().length === 0) return;
    if (shouldThrottleWatchAutoSync(AUTO_SYNC_MS)) return;
    void syncSavedCustomerAlerts();
  }, [tab, isAuthenticated, syncSavedCustomerAlerts]);

  const unreadPersonal = personalAlerts.filter((a) => !a.read).length;

  const groupedPersonal = useMemo(() => {
    const sorted = [...personalAlerts].sort((a, b) => b.timestamp - a.timestamp);
    const today: CustomerAlert[] = [];
    const week: CustomerAlert[] = [];
    const earlier: CustomerAlert[] = [];
    for (const a of sorted) {
      const bucket = bucketAlertTimestamp(a.timestamp);
      if (bucket === "today") today.push(a);
      else if (bucket === "week") week.push(a);
      else earlier.push(a);
    }
    return { today, week, earlier };
  }, [personalAlerts]);

  /** Requirement: only “Today” and “This week” — older items roll into the second group. */
  const thisWeekAlerts = useMemo(
    () => [...groupedPersonal.week, ...groupedPersonal.earlier],
    [groupedPersonal.week, groupedPersonal.earlier],
  );

  const renderTrackedAlert = (a: CustomerAlert) => {
    const high = isAlertHighPriority(a);
    const isDispute = a.type === "dispute";
    const isScoreDrop = a.type === "score_change" && high;
    const accent = isDispute ? colors.error : isScoreDrop ? "#f59e0b" : colors.primary;
    const priorityLabel = isDispute ? "High priority" : isScoreDrop ? "Score drop" : "Time-sensitive";
    return (
      <Pressable
        key={a.id}
        onPress={() => {
          markAlertRead(a.id);
          refreshPersonalList();
          router.push(`/customer/${a.customerId}?from=alerts` as never);
        }}
        style={[
          styles.alertCard,
          {
            backgroundColor: high ? accent + "0c" : colors.surface,
            borderColor: high ? accent + "55" : colors.border,
            borderLeftWidth: high ? 4 : 1,
            borderLeftColor: high ? accent : colors.border,
          },
        ]}
      >
        <View style={styles.alertCardTop}>
          <View style={styles.alertTypeRow}>
            <Text style={[styles.alertType, { color: high ? accent : colors.muted }]}>{typeLabel(a.type)}</Text>
            {high ? (
              <View style={[styles.priorityBadge, { backgroundColor: accent + "22" }]}>
                <Text style={[styles.priorityBadgeText, { color: accent }]}>{priorityLabel}</Text>
              </View>
            ) : null}
          </View>
          {!a.read ? (
            <View style={styles.unreadPill}>
              <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.unreadLabel, { color: colors.primary }]}>Unread</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.alertName, { color: colors.foreground }]}>{a.customerName}</Text>
        <Text style={[styles.alertMsg, { color: colors.foreground }]}>{a.message}</Text>
        <Text style={[styles.alertTime, { color: colors.muted }]}>{formatAlertTime(a.timestamp)}</Text>
      </Pressable>
    );
  };

  const renderAlertSection = (title: string, items: CustomerAlert[], subtitle?: string) => {
    if (items.length === 0) return null;
    const unreadHere = items.filter((x) => !x.read).length;
    return (
      <View style={styles.alertSection}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>{subtitle}</Text>
            ) : null}
          </View>
          {unreadHere > 0 ? (
            <View style={[styles.sectionUnreadBadge, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.sectionUnreadText, { color: colors.primary }]}>
                {unreadHere} unread
              </Text>
            </View>
          ) : null}
        </View>
        {items.map(renderTrackedAlert)}
      </View>
    );
  };

  return (
    <ScreenBackground backgroundKey="alerts">
      <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-transparent">
        <View style={[styles.titleBar, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Alerts</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Community signals here; use Track customer on a profile so job-related updates show under Tracked customers
          </Text>
        </View>

        <View style={styles.segmentRow}>
          {(
            [
              ["community", "Community"],
              ["saved", "Tracked customers"],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={[
                styles.segment,
                {
                  backgroundColor: tab === key ? colors.primary + "22" : colors.surface,
                  borderColor: tab === key ? colors.primary + "55" : colors.border,
                },
              ]}
            >
              <View style={styles.segmentInner}>
                <Text
                  style={[
                    styles.segmentText,
                    { color: tab === key ? colors.primary : colors.foreground },
                  ]}
                >
                  {label}
                </Text>
                {key === "saved" && unreadPersonal > 0 ? (
                  <View style={[styles.segmentUnread, { backgroundColor: colors.error + "22" }]}>
                    <Text style={[styles.segmentUnreadText, { color: colors.error }]}>{unreadPersonal}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>

        {tab === "community" ? (
          <>
            <View style={[styles.alertBanner, { backgroundColor: colors.error + "10", borderColor: colors.error + "33" }]}>
              <Text style={[styles.alertBannerText, { color: colors.foreground }]}>
                These profiles have weaker average ratings from verified contractors. Use them as one input alongside your
                own intake and contract terms.
              </Text>
            </View>

            <LocationScopeBar scope={scope} onScopeChange={setScope} userCity={userCity} userState={userState} />

            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : flaggedError ? (
              <View style={[styles.emptyContainer, { marginTop: 24 }]}>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Couldn&apos;t load community alerts</Text>
                <Text style={[styles.emptyDesc, { color: colors.muted }]}>
                  Check your connection and try again.
                </Text>
                <Pressable
                  onPress={() => void refetchFlagged()}
                  style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
                >
                  <Text style={styles.primaryBtnText}>Retry</Text>
                </Pressable>
              </View>
            ) : filteredFlagged.length > 0 ? (
              <FlatList
                data={filteredFlagged}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <CustomerCard
                    customer={item}
                    onPress={() => router.push(`/customer/${item.id}?from=alerts` as never)}
                  />
                )}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  <Text style={[styles.count, { color: colors.muted }]}>
                    {filteredFlagged.length} {filteredFlagged.length === 1 ? "profile" : "profiles"} in {locationLabel}
                  </Text>
                }
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>✓</Text>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  {scope === "national" ? "No community alerts in this list" : `No community alerts in ${locationLabel}`}
                </Text>
                <Text style={[styles.emptyDesc, { color: colors.muted }]}>
                  This tab shows region-wide signals when available. Next: go to Search, look up a customer for your job, then
                  open their profile for scores and Track customer.
                </Text>
                {scope !== "national" && (
                  <Pressable onPress={() => setScope("national")} style={{ marginTop: 8 }}>
                    <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>View all states</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => router.push("/(tabs)/search" as never)} style={{ marginTop: 10 }}>
                  <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>Go to Search →</Text>
                </Pressable>
              </View>
            )}
          </>
        ) : (
          <ScrollView contentContainerStyle={styles.personalScroll} showsVerticalScrollIndicator={false}>
            {!isAuthenticated ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in for tracked-customer updates</Text>
                <Text style={[styles.emptyDesc, { color: colors.muted }]}>
                  After you sign in, use Track customer on any customer profile. Alerts for those customers show here — grouped
                  by day so you can scan before a site visit.
                </Text>
                <Pressable
                  onPress={() => router.push("/select-account" as never)}
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.primaryBtnText}>Sign in</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={[styles.personalIntro, { color: colors.muted }]}>
                  Build a habit: glance here before you head to a job. Disputes and score drops are marked clearly; unread
                  counts show what still needs your eyes.
                </Text>
                <View style={styles.personalActions}>
                  <Pressable
                    onPress={() => void syncSavedCustomerAlerts()}
                    disabled={syncing}
                    style={[styles.secondaryBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
                      {syncing ? "Checking…" : "Refresh updates now"}
                    </Text>
                  </Pressable>
                  {unreadPersonal > 0 ? (
                    <Pressable onPress={() => { markAllAlertsRead(); refreshPersonalList(); }} style={{ paddingVertical: 10 }}>
                      <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>Mark all read</Text>
                    </Pressable>
                  ) : null}
                </View>

                {getWatchedCustomers().length === 0 ? (
                  <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No alerts yet — nothing tracked</Text>
                    <Text style={[styles.emptyDesc, { color: colors.muted }]}>
                      Search a customer, open their profile, then tap Track customer. You’ll see new reports, score changes, and
                      disputes here so nothing surprises you before the next job.
                    </Text>
                    <Pressable onPress={() => router.push("/(tabs)/search" as never)} style={{ marginTop: 12, alignSelf: "flex-start" }}>
                      <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600" }}>Go to Search →</Text>
                    </Pressable>
                  </View>
                ) : personalAlerts.length === 0 ? (
                  <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No alerts right now</Text>
                    <Text style={[styles.emptyDesc, { color: colors.muted }]}>
                      You’re caught up on tracked customers. Tap Refresh updates now before a site visit, or we’ll sync
                      periodically while you use the app.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 4 }}>
                    {renderAlertSection("Today", groupedPersonal.today)}
                    {renderAlertSection(
                      "This week",
                      thisWeekAlerts,
                      "Everything before today, newest first — includes older updates so nothing hides in another tab.",
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}
      </ScreenContainer>
    </ScreenBackground>
  );
}

function typeLabel(t: string): string {
  switch (t) {
    case "new_review":
      return "New report";
    case "score_change":
      return "Score change";
    case "dispute":
      return "Dispute filed";
    case "moderation_status":
      return "Moderation";
    default:
      return "Update";
  }
}

const styles = StyleSheet.create({
  titleBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  segmentInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  segmentText: { fontSize: 13, fontWeight: "700" },
  segmentUnread: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentUnreadText: { fontSize: 11, fontWeight: "800" },
  alertBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertBannerText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  count: {
    fontSize: 13,
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  personalScroll: { paddingHorizontal: 16, paddingBottom: 120, gap: 12 },
  personalIntro: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  personalActions: { flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 8 },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: "600" },
  primaryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  emptyCard: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
  alertSection: { marginBottom: 8 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: "800", letterSpacing: -0.2 },
  sectionSubtitle: { fontSize: 11, lineHeight: 15, marginTop: 2, fontWeight: "500" },
  sectionUnreadBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  sectionUnreadText: { fontSize: 11, fontWeight: "800" },
  alertCard: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10, gap: 6 },
  alertCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  alertTypeRow: { flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  alertType: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  priorityBadgeText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3 },
  unreadPill: { flexDirection: "row", alignItems: "center", gap: 5 },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  unreadLabel: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3 },
  alertName: { fontSize: 16, fontWeight: "700" },
  alertMsg: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
  alertTime: { fontSize: 11 },
});
