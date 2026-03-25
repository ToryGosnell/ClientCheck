import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenBackground } from "@/components/screen-background";
import { ScreenContainer } from "@/components/screen-container";
import { AdminShell, AdminGlobalSearchBar } from "@/components/admin/AdminShell";
import { adminShellNavItems } from "@/components/admin/admin-sidebar-nav";
import { navigateAdminSidebarSelection } from "@/components/admin/navigate-admin-sidebar";
import { ADMIN_VISUAL } from "@/components/admin/admin-visual-tokens";
import { useColors } from "@/hooks/use-colors";
import { useAdminRouteGate } from "@/hooks/use-admin-route-gate";
import { trpc } from "@/lib/trpc";

function riskBadgeVariant(level: string | undefined | null): "success" | "warning" | "error" | "neutral" {
  const s = String(level ?? "").toLowerCase();
  if (s === "high") return "error";
  if (s === "medium") return "warning";
  if (s === "low") return "success";
  return "neutral";
}

function StatusBadge({ label, variant }: { label: string; variant: "success" | "warning" | "error" | "neutral" | "pending" }) {
  const map = {
    success: { bg: ADMIN_VISUAL.greenMuted, fg: ADMIN_VISUAL.green },
    warning: { bg: ADMIN_VISUAL.amberMuted, fg: ADMIN_VISUAL.amber },
    error: { bg: ADMIN_VISUAL.redMuted, fg: ADMIN_VISUAL.red },
    neutral: { bg: ADMIN_VISUAL.surfaceRaised, fg: ADMIN_VISUAL.textSubtle },
    pending: { bg: ADMIN_VISUAL.amberMuted, fg: ADMIN_VISUAL.amber },
  }[variant];
  return (
    <View style={[s.statusPill, { backgroundColor: map.bg, borderColor: map.fg + "33" }]}>
      <Text style={[s.statusPillText, { color: map.fg }]}>{label}</Text>
    </View>
  );
}

function disputeBadgeVariant(status: string): "success" | "warning" | "error" | "neutral" | "pending" {
  const u = String(status).toLowerCase();
  if (u.includes("resolved") || u.includes("dismissed") || u.includes("closed")) return "success";
  if (u.includes("open") || u.includes("pending") || u.includes("review")) return "pending";
  if (u.includes("escalat")) return "error";
  return "neutral";
}

function moderationBadgeVariant(status: string | undefined | null): "success" | "warning" | "error" | "neutral" | "pending" {
  const u = String(status ?? "").toLowerCase();
  if (u.includes("hidden") || u.includes("removed") || u.includes("flag")) return "error";
  if (u.includes("pending") || u.includes("queue")) return "pending";
  if (u === "active" || u === "") return "success";
  return "neutral";
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.88 }]}>
      <Text style={s.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        s.secondaryBtn,
        { borderColor: ADMIN_VISUAL.borderStrong },
        (pressed || hovered) && { backgroundColor: ADMIN_VISUAL.surfaceHover },
      ]}
    >
      <Text style={[s.secondaryBtnText, { color: ADMIN_VISUAL.textSubtle }]}>{label}</Text>
    </Pressable>
  );
}

function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.ghostBtn, pressed && { opacity: 0.75 }]}>
      <Text style={[s.ghostBtnText, { color: ADMIN_VISUAL.blue }]}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({
  message,
  hint,
  actionLabel,
  onAction,
}: {
  message: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={s.emptyState}>
      <View style={s.emptyIconCircle}>
        <Ionicons name="people-outline" size={28} color={ADMIN_VISUAL.textMuted} />
      </View>
      <Text style={s.emptyTitle}>No records</Text>
      <Text style={s.emptyText}>{message}</Text>
      {hint ? <Text style={s.emptyHint}>{hint}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={s.emptyAction}>
          <Text style={s.emptyActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ListEmpty({
  rawCount,
  filteredCount,
  debouncedQ,
  onClearSearch,
  onShowAllRisk,
}: {
  rawCount: number;
  filteredCount: number;
  debouncedQ: string;
  onClearSearch: () => void;
  onShowAllRisk: () => void;
}) {
  const filteredOut = rawCount > 0 && filteredCount === 0;
  const noServerRows = rawCount === 0;

  if (filteredOut) {
    return (
      <EmptyState
        message="No customers match the current risk filter."
        hint="Your search returned results — narrow filters are hiding them."
        actionLabel="Show all risk"
        onAction={onShowAllRisk}
      />
    );
  }

  if (noServerRows && debouncedQ) {
    return (
      <EmptyState
        message="No customers match your search."
        hint="Try another name, phone fragment, or city."
        actionLabel="Clear search"
        onAction={onClearSearch}
      />
    );
  }

  if (noServerRows) {
    return (
      <EmptyState
        message="No customer records in directory."
        hint="New profiles will appear here as they are created."
      />
    );
  }

  return null;
}

export default function AdminCustomersScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ customerId?: string | string[] }>();
  const customerIdRaw = Array.isArray(params.customerId) ? params.customerId[0] : params.customerId;
  const customerIdNum = customerIdRaw ? parseInt(String(customerIdRaw), 10) : NaN;
  const detailId = Number.isFinite(customerIdNum) ? customerIdNum : null;

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "high" | "medium" | "low">("all");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 320);
    return () => clearTimeout(t);
  }, [q]);

  const routeGate = useAdminRouteGate();
  const adminReady = routeGate.blocked === null;

  const listQuery = trpc.admin.listCustomersAdmin.useQuery(
    { query: debouncedQ, limit: 60 },
    { enabled: adminReady },
  );
  const detailQuery = trpc.admin.getCustomerAdmin.useQuery(
    { customerId: detailId! },
    { enabled: adminReady && detailId != null },
  );

  const filteredRows = useMemo(() => {
    const raw = listQuery.data ?? [];
    if (riskFilter === "all") return raw;
    return raw.filter((row) => String(row.riskLevel ?? "").toLowerCase() === riskFilter);
  }, [listQuery.data, riskFilter]);

  const handleSidebarNav = (key: string) =>
    navigateAdminSidebarSelection(router, key, { context: "standalone", current: "customers" });

  if (routeGate.blocked) return routeGate.blocked;
  const user = routeGate.user;

  const navItems = adminShellNavItems();

  const shellUserLabel = user.name ?? user.email ?? `User #${user.id}`;

  if (detailId != null) {
    const d = detailQuery.data;
    const displayName = d ? `${d.customer.firstName} ${d.customer.lastName}`.trim() : "Customer detail";

    return (
      <ScreenBackground backgroundKey="dashboard" overlayOpacity={0.96}>
        <ScreenContainer edges={["top", "left", "right"]}>
          <AdminShell
            colors={colors}
            userLabel={shellUserLabel}
            breadcrumbCurrent={d ? `Customer #${d.customer.id}` : "Customer detail"}
            pageTitle={displayName}
            pageSubtitle={
              d
                ? `${d.customer.city}, ${d.customer.state} · ${d.customer.reviewCount} reviews · ${(d.disputes as any[]).length} disputes`
                : "Loading profile context…"
            }
            navItems={navItems}
            activeNavKey="customers"
            onNav={handleSidebarNav}
            onExit={() => router.replace("/(tabs)" as never)}
            globalSearchSlot={
              <AdminGlobalSearchBar colors={colors} value={q} onChangeText={setQ} placeholder="Search directory…" />
            }
          >
            {detailQuery.isLoading ? (
              <View style={s.detailLoading}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={[s.mutedLine, { marginTop: 16 }]}>Loading customer intelligence…</Text>
              </View>
            ) : !d ? (
              <EmptyState
                message="This customer ID is not in the directory or you may lack access."
                hint="Return to the list and pick another record."
                actionLabel="Back to directory"
                onAction={() => router.replace("/admin-customers" as any)}
              />
            ) : (
              <ScrollView contentContainerStyle={s.detailScroll} showsVerticalScrollIndicator={false}>
                <View style={s.detailActions}>
                  <GhostButton label="← Customer directory" onPress={() => router.replace("/admin-customers" as any)} />
                  <SecondaryButton label="Admin home" onPress={() => router.push("/admin" as any)} />
                </View>

                <View style={[s.heroCard, { borderColor: ADMIN_VISUAL.border }]}>
                  <Text style={[s.eyebrow, { color: ADMIN_VISUAL.textMuted }]}>IDENTITY</Text>
                  <View style={s.heroRow}>
                    <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                      <Text style={[s.heroName, { color: colors.foreground }]}>
                        {d.customer.firstName} {d.customer.lastName}
                      </Text>
                      <Text style={[s.meta, { color: ADMIN_VISUAL.textMuted }]}>Record #{d.customer.id}</Text>
                      <Text style={[s.bodyLine, { color: colors.foreground }]}>{d.customer.phone}</Text>
                    </View>
                    <StatusBadge label={`Risk · ${String(d.customer.riskLevel ?? "—")}`} variant={riskBadgeVariant(d.customer.riskLevel)} />
                  </View>
                  <View style={[s.divider, { backgroundColor: ADMIN_VISUAL.border }]} />
                  <Text style={[s.eyebrow, { color: ADMIN_VISUAL.textMuted, marginBottom: 6 }]}>LOCATION</Text>
                  <Text style={[s.bodyLine, { color: ADMIN_VISUAL.textSubtle }]}>
                    {d.customer.address}
                    {"\n"}
                    {d.customer.city}, {d.customer.state} {d.customer.zip}
                  </Text>
                  <View style={s.statRow}>
                    <View style={s.statChip}>
                      <Text style={s.statLabel}>Reviews</Text>
                      <Text style={[s.statValue, { color: colors.foreground }]}>{d.customer.reviewCount}</Text>
                    </View>
                    <View style={s.statChip}>
                      <Text style={s.statLabel}>Flags</Text>
                      <Text style={[s.statValue, { color: colors.foreground }]}>{d.customer.redFlagCount ?? 0}</Text>
                    </View>
                  </View>
                </View>

                <View style={[s.panel, { borderColor: ADMIN_VISUAL.border }]}>
                  <View style={s.panelHead}>
                    <Text style={[s.panelTitle, { color: colors.foreground }]}>Disputes</Text>
                    <Text style={[s.panelSub, { color: ADMIN_VISUAL.textMuted }]}>Linked challenges and resolution state</Text>
                  </View>
                  {(d.disputes as any[]).length === 0 ? (
                    <Text style={[s.mutedLine, { paddingVertical: 8 }]}>No disputes on file — clean record.</Text>
                  ) : (
                    (d.disputes as any[]).map((dis) => (
                      <View key={dis.id} style={[s.disputeRow, { borderColor: ADMIN_VISUAL.border }]}>
                        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                          <Text style={[s.rowTitle, { color: colors.foreground }]}>Dispute #{dis.id}</Text>
                          <Text style={[s.meta, { color: ADMIN_VISUAL.textMuted }]}>Review #{dis.reviewId}</Text>
                        </View>
                        <StatusBadge label={String(dis.status)} variant={disputeBadgeVariant(String(dis.status))} />
                      </View>
                    ))
                  )}
                </View>

                <View style={[s.panel, { borderColor: ADMIN_VISUAL.border }]}>
                  <View style={s.panelHead}>
                    <Text style={[s.panelTitle, { color: colors.foreground }]}>Reviews ({d.reviews.length})</Text>
                    <Text style={[s.panelSub, { color: ADMIN_VISUAL.textMuted }]}>Moderation context and contractor attribution</Text>
                  </View>
                  {d.reviews.map((rev: any) => (
                    <View key={rev.id} style={[s.reviewCard, { borderColor: ADMIN_VISUAL.border }]}>
                      <View style={s.reviewTop}>
                        <Text style={[s.rowTitle, { color: colors.foreground }]}>#{rev.id}</Text>
                        <StatusBadge
                          label={rev.moderationStatus ? String(rev.moderationStatus) : "Active"}
                          variant={moderationBadgeVariant(rev.moderationStatus)}
                        />
                        <Text style={[s.ratingPill, { color: ADMIN_VISUAL.textSubtle }]}>{rev.overallRating}/5</Text>
                      </View>
                      <Text style={[s.meta, { color: ADMIN_VISUAL.textMuted }]} numberOfLines={1}>
                        {rev.contractorName ?? "Contractor"}
                      </Text>
                      {rev.redFlags ? (
                        <View style={[s.flagStrip, { backgroundColor: ADMIN_VISUAL.redMuted, borderColor: ADMIN_VISUAL.red + "33" }]}>
                          <Text style={[s.flagText, { color: ADMIN_VISUAL.red }]} numberOfLines={3}>
                            {rev.redFlags}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={[s.reviewBody, { color: ADMIN_VISUAL.textSubtle }]} numberOfLines={6}>
                        {rev.reviewText ?? "—"}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </AdminShell>
        </ScreenContainer>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground backgroundKey="dashboard" overlayOpacity={0.96}>
      <ScreenContainer edges={["top", "left", "right"]}>
        <AdminShell
          colors={colors}
          userLabel={shellUserLabel}
          breadcrumbCurrent="Customer records"
          pageTitle="Customer records"
          pageSubtitle="Directory of customer profiles with reviews, disputes, and moderation context for admin decisions."
          navItems={navItems}
          activeNavKey="customers"
          onNav={handleSidebarNav}
          onExit={() => router.replace("/(tabs)" as never)}
          globalSearchSlot={
            <AdminGlobalSearchBar colors={colors} value={q} onChangeText={setQ} placeholder="Name, phone, city…" />
          }
        >
          <View style={s.listIntro}>
            <Text style={[s.eyebrow, { color: ADMIN_VISUAL.textMuted }]}>DIRECTORY</Text>
            <Text style={[s.introHint, { color: ADMIN_VISUAL.textMuted }]}>
              Search updates automatically. Risk filter applies to the current result set.
            </Text>
          </View>

          <View style={s.utilityRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillRow}>
              {(
                [
                  { id: "all", label: "All risk" },
                  { id: "high", label: "High" },
                  { id: "medium", label: "Medium" },
                  { id: "low", label: "Low" },
                ] as const
              ).map((opt) => {
                const on = riskFilter === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setRiskFilter(opt.id)}
                    style={({ pressed, hovered }: any) => [
                      s.filterPill,
                      {
                        borderColor: on ? colors.primary + "55" : ADMIN_VISUAL.border,
                        backgroundColor: on ? colors.primary + "20" : pressed || hovered ? ADMIN_VISUAL.surfaceHover : ADMIN_VISUAL.surface,
                      },
                    ]}
                  >
                    <Text style={{ color: on ? colors.foreground : ADMIN_VISUAL.textSubtle, fontSize: 12, fontWeight: "700" }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {riskFilter !== "all" || q.length > 0 ? (
              <GhostButton
                label="Reset filters"
                onPress={() => {
                  setRiskFilter("all");
                  setQ("");
                }}
              />
            ) : null}
          </View>

          <View style={[s.tableHeaderBar, { borderColor: ADMIN_VISUAL.border }]}>
            <Text style={[s.thCell, s.thWide, { color: ADMIN_VISUAL.textMuted }]}>Customer</Text>
            <Text style={[s.thCell, s.thGrow, { color: ADMIN_VISUAL.textMuted }]}>Contact / market</Text>
            <Text style={[s.thCell, s.thRisk, { color: ADMIN_VISUAL.textMuted }]}>Risk</Text>
            <Text style={[s.thCell, s.thAction, { color: ADMIN_VISUAL.textMuted }]}> </Text>
          </View>

          {listQuery.isLoading ? (
            <View style={s.listLoading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[s.mutedLine, { marginTop: 12 }]}>Syncing directory…</Text>
            </View>
          ) : (
            <FlatList
              data={filteredRows}
              keyExtractor={(row) => String(row.id)}
              style={s.tableList}
              contentContainerStyle={s.listContent}
              ListEmptyComponent={
                <ListEmpty
                  rawCount={(listQuery.data ?? []).length}
                  filteredCount={filteredRows.length}
                  debouncedQ={debouncedQ}
                  onClearSearch={() => setQ("")}
                  onShowAllRisk={() => setRiskFilter("all")}
                />
              }
              renderItem={({ item }) => (
                <View style={[s.tableRow, { borderBottomColor: ADMIN_VISUAL.border }]}>
                  <Pressable
                    onPress={() => router.push(`/admin-customers?customerId=${item.id}` as any)}
                    style={({ pressed, hovered }: any) => [
                      s.rowTap,
                      (pressed || hovered) && { backgroundColor: ADMIN_VISUAL.surfaceHover, borderRadius: ADMIN_VISUAL.radiusSm },
                    ]}
                  >
                    <View style={s.thWide}>
                      <Text style={[s.cellPrimary, { color: colors.foreground }]} numberOfLines={1}>
                        {item.firstName} {item.lastName}
                      </Text>
                      <Text style={[s.cellSecondary, { color: ADMIN_VISUAL.textMuted }]}>#{item.id}</Text>
                    </View>
                    <View style={s.thGrow}>
                      <Text style={[s.cellSecondary, { color: ADMIN_VISUAL.textSubtle }]} numberOfLines={1}>
                        {item.phone}
                      </Text>
                      <Text style={[s.cellSecondary, { color: ADMIN_VISUAL.textMuted }]} numberOfLines={1}>
                        {item.city}, {item.state}
                      </Text>
                    </View>
                    <View style={s.thRisk}>
                      <StatusBadge label={String(item.riskLevel ?? "—")} variant={riskBadgeVariant(item.riskLevel)} />
                    </View>
                  </Pressable>
                  <View style={s.thAction}>
                    <PrimaryButton label="Open" onPress={() => router.push(`/admin-customers?customerId=${item.id}` as any)} />
                  </View>
                </View>
              )}
            />
          )}
        </AdminShell>
      </ScreenContainer>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  listIntro: { marginBottom: 14, gap: 4 },
  introHint: { fontSize: 12, lineHeight: 17, maxWidth: 560 },
  utilityRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  pillRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 8 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: ADMIN_VISUAL.radiusSm,
    borderWidth: 1,
  },
  tableHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    marginBottom: 0,
  },
  thCell: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
  thWide: { flex: 1, minWidth: 108, paddingHorizontal: 8 },
  thGrow: { flex: 2, minWidth: 96, paddingHorizontal: 8 },
  thRisk: { width: 100, paddingHorizontal: 4 },
  thAction: { width: 88, alignItems: "flex-end", paddingRight: 4 },
  tableList: { flex: 1 },
  listContent: { paddingBottom: 40 },
  tableRow: { flexDirection: "row", alignItems: "stretch", borderBottomWidth: StyleSheet.hairlineWidth },
  rowTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 4,
  },
  cellPrimary: { fontSize: 14, fontWeight: "700" },
  cellSecondary: { fontSize: 11, marginTop: 2 },
  listLoading: { paddingVertical: 40, alignItems: "center" },
  detailLoading: { paddingVertical: 48, alignItems: "center" },
  detailScroll: { paddingBottom: 48, gap: 16 },
  detailActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 4 },
  heroCard: {
    borderWidth: 1,
    borderRadius: ADMIN_VISUAL.radiusLg,
    padding: 18,
    backgroundColor: ADMIN_VISUAL.surface,
    gap: 10,
  },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  heroName: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  meta: { fontSize: 12 },
  bodyLine: { fontSize: 14, lineHeight: 21 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  statChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: ADMIN_VISUAL.radiusSm,
    borderWidth: 1,
    borderColor: ADMIN_VISUAL.border,
    backgroundColor: ADMIN_VISUAL.surfaceRaised,
    minWidth: 100,
  },
  statLabel: { fontSize: 10, fontWeight: "800", color: ADMIN_VISUAL.textMuted, letterSpacing: 0.4 },
  statValue: { fontSize: 18, fontWeight: "800", marginTop: 4 },
  panel: {
    borderWidth: 1,
    borderRadius: ADMIN_VISUAL.radiusLg,
    padding: 16,
    backgroundColor: ADMIN_VISUAL.surface,
    gap: 12,
  },
  panelHead: { gap: 4, marginBottom: 4 },
  panelTitle: { fontSize: 16, fontWeight: "800" },
  panelSub: { fontSize: 12, lineHeight: 17 },
  disputeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowTitle: { fontSize: 14, fontWeight: "700" },
  reviewCard: {
    borderWidth: 1,
    borderRadius: ADMIN_VISUAL.radiusMd,
    padding: 14,
    backgroundColor: ADMIN_VISUAL.surfaceRaised,
    marginBottom: 10,
    gap: 8,
  },
  reviewTop: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  ratingPill: { fontSize: 12, fontWeight: "800", marginLeft: "auto" },
  flagStrip: { borderWidth: 1, borderRadius: ADMIN_VISUAL.radiusSm, padding: 10 },
  flagText: { fontSize: 11, lineHeight: 16 },
  reviewBody: { fontSize: 13, lineHeight: 20 },
  statusPill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusPillText: { fontSize: 10, fontWeight: "800", textTransform: "capitalize" },
  primaryBtn: {
    backgroundColor: "rgba(96, 165, 250, 0.22)",
    borderWidth: 1,
    borderColor: ADMIN_VISUAL.blue + "55",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: ADMIN_VISUAL.radiusSm,
    alignItems: "center",
  },
  primaryBtnText: { color: ADMIN_VISUAL.blue, fontSize: 12, fontWeight: "800" },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: ADMIN_VISUAL.radiusSm,
    borderWidth: 1,
    backgroundColor: ADMIN_VISUAL.surface,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: "700" },
  ghostBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  ghostBtnText: { fontSize: 13, fontWeight: "700" },
  mutedLine: { fontSize: 13, color: ADMIN_VISUAL.textMuted },
  emptyState: { paddingVertical: 40, paddingHorizontal: 24, alignItems: "center" },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ADMIN_VISUAL.surface,
    borderWidth: 1,
    borderColor: ADMIN_VISUAL.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: ADMIN_VISUAL.textSubtle, marginBottom: 6 },
  emptyText: { fontSize: 13, color: ADMIN_VISUAL.textMuted, textAlign: "center", lineHeight: 19, maxWidth: 300 },
  emptyHint: { fontSize: 12, color: ADMIN_VISUAL.textMuted, textAlign: "center", marginTop: 8, lineHeight: 17, maxWidth: 320 },
  emptyAction: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 18, borderRadius: ADMIN_VISUAL.radiusSm, borderWidth: 1, borderColor: ADMIN_VISUAL.blue + "55" },
  emptyActionText: { color: ADMIN_VISUAL.blue, fontSize: 13, fontWeight: "800" },
});
