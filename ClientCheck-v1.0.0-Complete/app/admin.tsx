import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenBackground } from "@/components/screen-background";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { DisputeThreadView } from "@/components/dispute-thread-view";
import { AdminBetaFunnelTab } from "@/components/admin-beta-funnel-tab";
import { AdminShell, AdminGlobalSearchBar } from "@/components/admin/AdminShell";
import {
  adminShellActiveNavKeyForTab,
  adminShellNavItems,
  parseAdminConsoleTabQueryParam,
  type AdminConsoleTab,
} from "@/components/admin/admin-sidebar-nav";
import { navigateAdminSidebarSelection } from "@/components/admin/navigate-admin-sidebar";
import { ADMIN_VISUAL } from "@/components/admin/admin-visual-tokens";
import { useAdminRouteGate } from "@/hooks/use-admin-route-gate";
import { MODERATION_STATUSES } from "@/shared/roles";

// ─────────────────────────────────────────────────────────────────────────────
// Color system
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  green:  "#10b981",
  greenBg: "#10b98112",
  greenBorder: "#10b98130",
  yellow: "#f59e0b",
  yellowBg: "#f59e0b12",
  yellowBorder: "#f59e0b30",
  red:    "#ef4444",
  redBg:  "#ef444412",
  redBorder: "#ef444430",
  blue:   "#3b82f6",
  blueBg: "#3b82f612",
  blueBorder: "#3b82f630",
  purple: "#8b5cf6",
  muted:  "rgba(255,255,255,0.45)",
  surface: "rgba(255,255,255,0.04)",
  surfaceHover: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.08)",
  borderHover: "rgba(255,255,255,0.14)",
};

type Severity = "green" | "yellow" | "red" | "blue";
function sevColor(s: Severity) { return C[s]; }
function sevBg(s: Severity) { return { green: C.greenBg, yellow: C.yellowBg, red: C.redBg, blue: C.blueBg }[s]; }
function sevBorder(s: Severity) { return { green: C.greenBorder, yellow: C.yellowBorder, red: C.redBorder, blue: C.blueBorder }[s]; }

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Tab = AdminConsoleTab;

const TAB_PAGE_TITLE: Record<Tab, { title: string; subtitle?: string }> = {
  overview: { title: "Admin Control Center", subtitle: "Platform health, trust queues, and revenue signals — one command view." },
  moderation: { title: "Pending review actions", subtitle: "Flagged and hidden content — triage with authority." },
  users: { title: "User directory", subtitle: "Accounts, roles, verification, and subscription posture." },
  reviews: { title: "Reviews", subtitle: "Search, inspect, and enforce visibility policy." },
  disputes: { title: "Disputes", subtitle: "Customer challenges — resolve with full context." },
  verification: { title: "Verification queue", subtitle: "Contractor credentials awaiting decision." },
  payments: { title: "Payments", subtitle: "Stripe ledger and refund controls." },
  subscriptions: { title: "Subscriptions", subtitle: "Seats, renewals, and lifecycle." },
  activity: { title: "Recent activity", subtitle: "Immutable audit trail of admin actions." },
  betaFunnel: { title: "Product analytics", subtitle: "PostHog funnel intelligence." },
  analytics: { title: "Analytics hub", subtitle: "Summary entry — deep metrics live in Product analytics." },
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, colors, eyebrow }: { title: string; subtitle: string; colors: any; eyebrow?: string }) {
  return (
    <View style={st.sectionHeader}>
      {eyebrow ? <Text style={[st.sectionEyebrow, { color: ADMIN_VISUAL.textMuted }]}>{eyebrow}</Text> : null}
      <Text style={[st.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[st.sectionSub, { color: ADMIN_VISUAL.textMuted }]}>{subtitle}</Text>
    </View>
  );
}

function SearchBar({ colors, query, setQuery, placeholder }: { colors: any; query: string; setQuery: (q: string) => void; placeholder: string }) {
  return (
    <View style={[st.adminSearchWrap, { backgroundColor: ADMIN_VISUAL.surface, borderColor: ADMIN_VISUAL.border }]}>
      <Ionicons name="search" size={18} color={ADMIN_VISUAL.textMuted} style={{ marginRight: 10 }} />
      <TextInput
        style={[st.searchInput, { color: colors.foreground }]}
        placeholder={placeholder}
        placeholderTextColor={ADMIN_VISUAL.textMuted}
        value={query}
        onChangeText={setQuery}
      />
      {query.length > 0 ? (
        <Pressable onPress={() => setQuery("")} hitSlop={8} style={st.filterClearHit}>
          <Text style={{ color: ADMIN_VISUAL.textSubtle, fontSize: 12, fontWeight: "700" }}>Clear</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function AdminFilterPills({
  options,
  value,
  onChange,
  colors,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  colors: any;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterPillRow}>
      {options.map((opt) => {
        const on = value === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={({ pressed }) => [
              st.filterPill,
              {
                borderColor: on ? colors.primary + "55" : ADMIN_VISUAL.border,
                backgroundColor: on ? colors.primary + "20" : pressed ? ADMIN_VISUAL.surfaceHover : ADMIN_VISUAL.surface,
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
  );
}

function StatusBadge({
  label,
  variant,
}: {
  label: string;
  variant: "success" | "warning" | "error" | "neutral" | "admin" | "pending";
}) {
  const map = {
    success: { bg: ADMIN_VISUAL.greenMuted, fg: ADMIN_VISUAL.green },
    warning: { bg: ADMIN_VISUAL.amberMuted, fg: ADMIN_VISUAL.amber },
    error: { bg: ADMIN_VISUAL.redMuted, fg: ADMIN_VISUAL.red },
    neutral: { bg: ADMIN_VISUAL.surfaceRaised, fg: ADMIN_VISUAL.textSubtle },
    admin: { bg: ADMIN_VISUAL.purpleMuted, fg: ADMIN_VISUAL.purple },
    pending: { bg: ADMIN_VISUAL.amberMuted, fg: ADMIN_VISUAL.amber },
  }[variant];
  return (
    <View style={[st.statusBadge, { backgroundColor: map.bg, borderColor: map.fg + "33", borderWidth: 1 }]}>
      <Text style={{ color: map.fg, fontSize: 10, fontWeight: "800", textTransform: "capitalize", letterSpacing: 0.2 }}>
        {label}
      </Text>
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.primaryBtn, pressed && { opacity: 0.88 }]}>
      <Text style={st.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.ghostBtnBare, pressed && { opacity: 0.75 }]}>
      <Text style={st.ghostBtnText}>{label}</Text>
    </Pressable>
  );
}

function DestructiveButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.destructiveBtn, pressed && { opacity: 0.85 }]}>
      <Text style={st.destructiveBtnText}>{label}</Text>
    </Pressable>
  );
}

function PositiveButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.positiveBtn, pressed && { opacity: 0.88 }]}>
      <Text style={st.positiveBtnText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.secondaryBtn, pressed && { opacity: 0.88 }]}>
      <Text style={st.secondaryBtnText}>{label}</Text>
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
    <View style={st.emptyState}>
      <View style={st.emptyIconCircle}>
        <Ionicons name="folder-open-outline" size={28} color={ADMIN_VISUAL.textMuted} />
      </View>
      <Text style={st.emptyTitle}>No results</Text>
      <Text style={st.emptyText}>{message}</Text>
      {hint ? <Text style={st.emptyHint}>{hint}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={st.emptyAction}>
          <Text style={st.emptyActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function PremiumMetricCard({
  label,
  value,
  hint,
  accent,
  onPress,
  colors,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent: string;
  onPress?: () => void;
  colors: any;
}) {
  const valStr = typeof value === "number" ? value.toLocaleString() : value;
  const card = (
    <View style={[st.pmCard, { borderColor: ADMIN_VISUAL.border }]}>
      <View style={[st.pmAccentBar, { backgroundColor: accent }]} />
      <Text style={[st.pmLabel, { color: ADMIN_VISUAL.textMuted, paddingLeft: 6 }]}>{label}</Text>
      <Text style={[st.pmValue, { color: colors.foreground, paddingLeft: 6 }]}>{valStr}</Text>
      {hint ? (
        <Text style={[st.pmHint, { color: ADMIN_VISUAL.textSubtle, paddingLeft: 6 }]}>{hint}</Text>
      ) : (
        <View style={{ height: 14 }} />
      )}
    </View>
  );
  if (!onPress) return card;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        st.pmPressable,
        (pressed || hovered) && { transform: [{ translateY: Platform.OS === "web" ? -1 : 0 }] },
        pressed && { opacity: 0.94 },
      ]}
    >
      {card}
    </Pressable>
  );
}

function AdminActionPanel({
  title,
  subtitle,
  onViewAll,
  colors,
  children,
}: {
  title: string;
  subtitle?: string;
  onViewAll?: () => void;
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <View style={[st.apanel, { borderColor: ADMIN_VISUAL.border, backgroundColor: ADMIN_VISUAL.surface }]}>
      <View style={st.apanelHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[st.apanelTitle, { color: colors.foreground }]}>{title}</Text>
          {subtitle ? <Text style={[st.apanelSub, { color: ADMIN_VISUAL.textMuted }]}>{subtitle}</Text> : null}
        </View>
        {onViewAll ? (
          <Pressable onPress={onViewAll} style={({ pressed }) => [st.viewAllBtn, pressed && { opacity: 0.8 }]}>
            <Text style={{ color: ADMIN_VISUAL.blue, fontSize: 12, fontWeight: "800" }}>View all</Text>
            <Ionicons name="chevron-forward" size={16} color={ADMIN_VISUAL.blue} style={{ marginLeft: 2 }} />
          </Pressable>
        ) : null}
      </View>
      <View style={st.apanelBody}>{children}</View>
    </View>
  );
}

function AdminGlobalSearchBlock({
  colors,
  setTab,
  router,
}: {
  colors: any;
  setTab: (t: Tab) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 320);
    return () => clearTimeout(t);
  }, [q]);
  const enabled = debounced.length >= 2;
  const { data, isFetching } = trpc.admin.globalSearch.useQuery({ q: debounced }, { enabled });

  const u = data?.users ?? [];
  const c = data?.customers ?? [];
  const r = data?.reviews ?? [];
  const empty = enabled && !isFetching && u.length === 0 && c.length === 0 && r.length === 0;

  return (
    <View style={{ flex: 1, minWidth: 200, maxWidth: 540 }}>
      <AdminGlobalSearchBar colors={colors} value={q} onChangeText={setQ} placeholder="Search users, customers, reviews…" />
      {enabled ? (
        <View
          style={{
            marginTop: 8,
            maxHeight: 300,
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: 10,
            backgroundColor: "rgba(0,0,0,0.25)",
          }}
        >
          {isFetching ? (
            <ActivityIndicator color={colors.primary} style={{ margin: 16 }} />
          ) : empty ? (
            <Text style={{ color: C.muted, fontSize: 12, padding: 12 }}>No matches.</Text>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 300 }}>
              {u.length > 0 ? (
                <Text style={[st.searchSectionLabel, { color: C.muted }]}>Users</Text>
              ) : null}
              {u.map((row: { id: number; name: string | null; email: string | null; role: string }) => (
                <Pressable
                  key={`u-${row.id}`}
                  onPress={() => {
                    setTab("users");
                    setQ("");
                    setDebounced("");
                  }}
                  style={({ pressed }) => [st.searchHit, pressed && { opacity: 0.75 }]}
                >
                  <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                    {row.name ?? "—"} · {row.email ?? "—"}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 11 }}>#{row.id} · {row.role}</Text>
                </Pressable>
              ))}
              {c.length > 0 ? (
                <Text style={[st.searchSectionLabel, { color: C.muted }]}>Customers</Text>
              ) : null}
              {c.map((row: { id: number; firstName: string; lastName: string; phone: string; city: string; state: string }) => (
                <Pressable
                  key={`c-${row.id}`}
                  onPress={() => {
                    router.push(`/admin-customers?customerId=${row.id}` as any);
                    setQ("");
                    setDebounced("");
                  }}
                  style={({ pressed }) => [st.searchHit, pressed && { opacity: 0.75 }]}
                >
                  <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                    {row.firstName} {row.lastName}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: 11 }} numberOfLines={1}>
                    {row.phone} · {row.city}, {row.state}
                  </Text>
                </Pressable>
              ))}
              {r.length > 0 ? (
                <Text style={[st.searchSectionLabel, { color: C.muted }]}>Reviews</Text>
              ) : null}
              {r.map((row: { id: number; customerId: number; overallRating: number; reviewText: string | null }) => (
                <Pressable
                  key={`r-${row.id}`}
                  onPress={() => {
                    setTab("reviews");
                    Alert.alert(`Review #${row.id}`, (row.reviewText ?? "").slice(0, 500) || "No text", [
                      { text: "OK" },
                    ]);
                    setQ("");
                    setDebounced("");
                  }}
                  style={({ pressed }) => [st.searchHit, pressed && { opacity: 0.75 }]}
                >
                  <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>Review #{row.id}</Text>
                  <Text style={{ color: C.muted, fontSize: 11 }} numberOfLines={2}>
                    {(row.reviewText ?? "").slice(0, 120)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      ) : null}
    </View>
  );
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type BadgeVariant = "success" | "warning" | "error" | "neutral" | "admin" | "pending";

function statusVariant(s: string): BadgeVariant {
  const x = String(s).toLowerCase();
  if (["active", "succeeded", "resolved", "approved", "verified"].includes(x)) return "success";
  if (["trial", "open", "pending", "processing", "under_review", "awaiting_info", "responded"].includes(x)) return "pending";
  if (["cancelled", "failed", "dismissed", "refunded", "expired", "suspended", "deleted", "rejected", "removed", "hidden"].includes(x)) {
    return "error";
  }
  return "neutral";
}

function fmtCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtCurrencyFull(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG Charts
// ─────────────────────────────────────────────────────────────────────────────

function RevenueLineChart({ data, width }: { data: { day: string; cents: number }[]; width: number }) {
  const H = 160;
  const PAD = { top: 20, right: 16, bottom: 28, left: 48 };
  const cw = width - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  const filled = useMemo(() => {
    const map = new Map(data.map(d => [d.day, d.cents]));
    const days: { day: string; cents: number }[] = [];
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const dt = new Date(now - i * 86400000);
      const key = dt.toISOString().slice(0, 10);
      days.push({ day: key, cents: map.get(key) ?? 0 });
    }
    return days;
  }, [data]);

  const maxVal = Math.max(1, ...filled.map(d => d.cents));

  const points = filled.map((d, i) => ({
    x: PAD.left + (i / 29) * cw,
    y: PAD.top + ch - (d.cents / maxVal) * ch,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = linePath + ` L${points[points.length - 1].x.toFixed(1)},${PAD.top + ch} L${points[0].x.toFixed(1)},${PAD.top + ch} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
    y: PAD.top + ch - pct * ch,
    label: fmtCurrency(Math.round(pct * maxVal)),
  }));

  return (
    <Svg width={width} height={H}>
      <Defs>
        <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.blue} stopOpacity="0.22" />
          <Stop offset="1" stopColor={C.blue} stopOpacity="0" />
        </SvgGradient>
      </Defs>
      {gridLines.map((g, i) => (
        <React.Fragment key={i}>
          <Line x1={PAD.left} y1={g.y} x2={width - PAD.right} y2={g.y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <SvgText x={PAD.left - 6} y={g.y + 4} textAnchor="end" fill={C.muted} fontSize={9} fontWeight="500">{g.label}</SvgText>
        </React.Fragment>
      ))}
      <Path d={areaPath} fill="url(#areaGrad)" />
      <Path d={linePath} fill="none" stroke={C.blue} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
      {points.filter((_, i) => i % 5 === 0 || i === 29).map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill={C.blue} />
      ))}
      {filled.filter((_, i) => i % 10 === 0 || i === 29).map((d, idx) => {
        const i = filled.indexOf(d);
        return (
          <SvgText key={idx} x={points[i].x} y={H - 6} textAnchor="middle" fill={C.muted} fontSize={8}>
            {new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </SvgText>
        );
      })}
    </Svg>
  );
}

function ConversionFunnelChart({ freeYear, renewalsDue, paid, width }: { freeYear: number; renewalsDue: number; paid: number; width: number }) {
  const H = 120;
  const PAD = 16;
  const barW = (width - PAD * 2 - 24) / 3;
  const maxVal = Math.max(1, freeYear, renewalsDue, paid);
  const bars = [
    { label: "Free year", value: freeYear, color: C.blue },
    { label: "Renewal window", value: renewalsDue, color: C.yellow },
    { label: "Paid annual", value: paid, color: C.green },
  ];

  return (
    <Svg width={width} height={H}>
      {bars.map((b, i) => {
        const x = PAD + i * (barW + 12);
        const bh = Math.max(4, (b.value / maxVal) * 70);
        const y = H - 28 - bh;
        return (
          <React.Fragment key={i}>
            <Rect x={x} y={y} width={barW} height={bh} rx={6} fill={b.color} opacity={0.8} />
            <SvgText x={x + barW / 2} y={y - 6} textAnchor="middle" fill="#fff" fontSize={13} fontWeight="700">{b.value}</SvgText>
            <SvgText x={x + barW / 2} y={H - 8} textAnchor="middle" fill={C.muted} fontSize={9} fontWeight="500">{b.label}</SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

function DisputeActivityChart({ data, width }: { data: { day: string; opened: number; resolved: number }[]; width: number }) {
  const H = 140;
  const PAD = { top: 16, right: 16, bottom: 28, left: 16 };
  const cw = width - PAD.left - PAD.right;
  if (data.length === 0) {
    return (
      <Svg width={width} height={H}>
        <SvgText x={width / 2} y={H / 2} textAnchor="middle" fill={C.muted} fontSize={12} fontStyle="italic">No dispute activity in the last 30 days</SvgText>
      </Svg>
    );
  }

  const maxVal = Math.max(1, ...data.map(d => Math.max(d.opened, d.resolved)));
  const barW = Math.min(20, (cw / data.length) * 0.35);
  const gap = (cw - barW * 2 * data.length) / (data.length + 1);

  return (
    <Svg width={width} height={H}>
      {data.map((d, i) => {
        const x = PAD.left + gap + i * (barW * 2 + gap);
        const oh = Math.max(2, (d.opened / maxVal) * 80);
        const rh = Math.max(2, (d.resolved / maxVal) * 80);
        return (
          <React.Fragment key={i}>
            <Rect x={x} y={H - PAD.bottom - oh} width={barW} height={oh} rx={3} fill={C.red} opacity={0.75} />
            <Rect x={x + barW + 2} y={H - PAD.bottom - rh} width={barW} height={rh} rx={3} fill={C.green} opacity={0.75} />
            {data.length <= 15 && (
              <SvgText x={x + barW} y={H - 8} textAnchor="middle" fill={C.muted} fontSize={7}>
                {new Date(d.day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
      <Circle cx={width - 90} cy={8} r={4} fill={C.red} opacity={0.75} />
      <SvgText x={width - 82} y={12} fill={C.muted} fontSize={9}>Opened</SvgText>
      <Circle cx={width - 42} cy={8} r={4} fill={C.green} opacity={0.75} />
      <SvgText x={width - 34} y={12} fill={C.muted} fontSize={9}>Resolved</SvgText>
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(() => parseAdminConsoleTabQueryParam(params.tab) ?? "overview");
  const [searchQuery, setSearchQuery] = useState("");

  const routeGate = useAdminRouteGate();
  if (routeGate.blocked) return routeGate.blocked;
  const { user } = routeGate;

  useEffect(() => {
    const next = parseAdminConsoleTabQueryParam(params.tab);
    if (next) setTab(next);
  }, [params.tab]);

  const meta = TAB_PAGE_TITLE[tab];

  const handleSidebarNav = (key: string) => {
    navigateAdminSidebarSelection(router, key, {
      context: "console",
      setTab: (t) => {
        setTab(t);
        setSearchQuery("");
      },
    });
  };

  return (
    <ScreenBackground backgroundKey="dashboard" overlayOpacity={0.96}>
      <ScreenContainer edges={["top", "left", "right"]}>
        <AdminShell
          colors={colors}
          userLabel={user.name ?? user.email ?? `User #${user.id}`}
          breadcrumbCurrent={meta.title}
          pageTitle={meta.title}
          pageSubtitle={meta.subtitle}
          navItems={adminShellNavItems()}
          activeNavKey={adminShellActiveNavKeyForTab(tab)}
          onNav={handleSidebarNav}
          onExit={() => router.back()}
          globalSearchSlot={<AdminGlobalSearchBlock colors={colors} setTab={setTab} router={router} />}
        >
          {tab === "overview" && <OverviewTab colors={colors} onSelectTab={setTab} />}
          {tab === "betaFunnel" && <AdminBetaFunnelTab />}
          {tab === "users" && <UsersTab colors={colors} query={searchQuery} setQuery={setSearchQuery} />}
          {tab === "reviews" && <ReviewsTab colors={colors} query={searchQuery} setQuery={setSearchQuery} />}
          {tab === "disputes" && <DisputesTab colors={colors} />}
          {tab === "verification" && <VerificationTab colors={colors} />}
          {tab === "payments" && <PaymentsTab colors={colors} />}
          {tab === "subscriptions" && <SubscriptionsTab colors={colors} />}
          {tab === "moderation" && <ModerationTab colors={colors} />}
          {tab === "activity" && <ActivityTab colors={colors} />}
          {tab === "analytics" && <AnalyticsTab colors={colors} onOpenBetaFunnel={() => setTab("betaFunnel")} />}
        </AdminShell>
      </ScreenContainer>
    </ScreenBackground>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview — Premium SaaS Dashboard
// ─────────────────────────────────────────────────────────────────────────────

interface KpiDef {
  key: string;
  label: string;
  desc: string;
  severity: Severity;
  getValue: (d: any) => string | number;
  tab?: Tab;
}

/** Order matches product hierarchy: revenue & membership → risk → pipeline → content ops → cash out */
const KPI_DEFS: KpiDef[] = [
  { key: "renewals",      label: "Renewals due soon",       desc: "Paid seats expiring within 30 days",          severity: "yellow", getValue: (d) => d.renewalsDueSoon,                   tab: "subscriptions" },
  { key: "disputes",      label: "Pending disputes",        desc: "Open customer disputes",                      severity: "red",    getValue: (d) => d.pendingDisputes,                   tab: "disputes" },
  { key: "flagged",       label: "Flagged reviews",         desc: "Hidden / removed from public view",          severity: "red",    getValue: (d) => d.flaggedReviews,                    tab: "moderation" },
  { key: "failed",        label: "Failed payments",       desc: "Stripe failures · last 30 days",              severity: "red",    getValue: (d) => d.failedPayments30d,                 tab: "payments" },
  { key: "newUsers",      label: "New contractors (7d)",    desc: "Accounts created in the last week",           severity: "blue",   getValue: (d) => d.newContractors7d,                tab: "users" },
  { key: "freeYear",      label: "Contractors in free year", desc: "Verified contractor free-year trial",      severity: "blue",   getValue: (d) => d.freeYearContractors,               tab: "subscriptions" },
  { key: "conversion",    label: "Conversion to paid",    desc: "Paid annual ÷ active contractor seats",      severity: "green",  getValue: (d) => `${d.conversionToPaidPct}%`,         tab: "subscriptions" },
  { key: "newReviews",    label: "New reviews (7d)",      desc: "Verified reports filed this week",            severity: "blue",   getValue: (d) => d.newReviews7d,                      tab: "reviews" },
  { key: "underReview",   label: "Reviews under review",   desc: "Moderation queue (pending)",                  severity: "yellow", getValue: (d) => d.reviewsUnderReview,                tab: "moderation" },
  { key: "resolved",      label: "Disputes resolved (7d)", desc: "Closed or dismissed · last 7 days",           severity: "green",  getValue: (d) => d.disputesResolved7d,               tab: "disputes" },
  { key: "modBacklog",    label: "Moderation backlog",    desc: "Same as queue — triage in Moderation tab",    severity: "yellow", getValue: (d) => d.moderationBacklog,                 tab: "moderation" },
  { key: "refunds",       label: "Refunds (30d)",         desc: "Total refunded volume",                       severity: "yellow", getValue: (d) => fmtCurrencyFull(d.refunds30d),      tab: "payments" },
];

function KpiCard({ def, data, colors, onPress }: { def: KpiDef; data: any; colors: any; onPress?: () => void }) {
  const val = def.getValue(data);
  const isZero = val === 0 || val === "$0.00" || val === "0%";
  const accent = sevColor(def.severity);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed, hovered }: any) => [
        st.kpiCard,
        { borderLeftColor: accent, borderLeftWidth: 3 },
        {
          backgroundColor: pressed ? C.surfaceHover : hovered ? C.surfaceHover : C.surface,
          borderColor: C.border,
        },
      ]}
    >
      <View style={st.kpiTop}>
        <View style={[st.kpiDot, { backgroundColor: accent }]} />
        <Text style={[st.kpiLabel, { color: C.muted }]}>{def.label}</Text>
      </View>
      <Text style={[st.kpiValue, { color: isZero ? C.muted : colors.foreground }]}>
        {typeof val === "number" ? val.toLocaleString() : val}
      </Text>
      <Text style={[st.kpiDesc, { color: C.muted }]}>{def.desc}</Text>
    </Pressable>
  );
}

function PriorityQueueRow({
  label,
  value,
  severityIfOpen,
  onPress,
}: {
  label: string;
  value: number;
  severityIfOpen: Severity;
  onPress?: () => void;
}) {
  const clear = value === 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed, hovered }: any) => [
        st.alertRow,
        {
          borderColor: clear ? C.greenBorder : sevBorder(severityIfOpen),
          backgroundColor: clear ? C.greenBg : pressed || hovered ? sevBg(severityIfOpen) : "rgba(255,255,255,0.02)",
        },
      ]}
    >
      <View style={[st.alertPulse, { backgroundColor: clear ? C.green : sevColor(severityIfOpen) }]} />
      <Text style={[st.alertLabel, { color: "#fff" }]}>{label}</Text>
      <View style={[st.alertBadge, { backgroundColor: clear ? C.greenBg : sevBg(severityIfOpen) }]}>
        <Text style={[st.alertBadgeText, { color: clear ? C.green : sevColor(severityIfOpen) }]}>
          {clear ? "Clear" : value}
        </Text>
      </View>
    </Pressable>
  );
}

function ChartPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <View style={st.chartPanel}>
      <Text style={st.chartTitle}>{title}</Text>
      <Text style={st.chartSub}>{subtitle}</Text>
      <View style={st.chartBody}>{children}</View>
    </View>
  );
}

function auditActivityAccent(action: string): string {
  const a = action.toLowerCase();
  if (/refund|reject|cancel|hide|remove|dismiss|suspend/.test(a)) return C.red;
  if (/moderat|dispute|flag|restore_review|hide_review/.test(a)) return C.yellow;
  if (/payment|subscription|stripe|refund_payment/.test(a)) return C.blue;
  return C.green;
}

function formatAuditTitle(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function activityDayLabel(iso: string | Date): string {
  const t = new Date(iso).getTime();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const diff = Math.floor((start.getTime() - t) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function OverviewTab({ colors, onSelectTab }: { colors: any; onSelectTab: (t: Tab) => void }) {
  const { data: d, isLoading } = trpc.admin.stats.useQuery();
  const { data: auditData } = trpc.admin.getAuditLog.useQuery({ limit: 14 });
  const { data: feed } = trpc.admin.dashboardFeed.useQuery();

  const chartWidth = useMemo(() => {
    const w = Dimensions.get("window").width;
    return Math.min(w - 48, 600);
  }, []);

  const auditGrouped = useMemo(() => {
    const rows = auditData ?? [];
    const map = new Map<string, any[]>();
    for (const item of rows) {
      const key = activityDayLabel(item.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return [...map.entries()];
  }, [auditData]);

  if (isLoading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />;
  if (!d) return null;

  const pendingActionCount = d.pendingDisputes + d.pendingContractorVerifications + d.flaggedReviews;
  const openDisputes = feed
    ? (feed.recentDisputes as any[]).filter((x) => ["open", "pending", "under_review", "awaiting_info"].includes(String(x.status)))
    : [];

  return (
    <ScrollView contentContainerStyle={st.overviewScroll} showsVerticalScrollIndicator={false}>
      <View style={st.heroPremium}>
        <Text style={[st.heroKicker, { color: ADMIN_VISUAL.textMuted }]}>PLATFORM HEALTH</Text>
        <Text style={[st.heroTitleLg, { color: colors.foreground }]}>Admin Control Center</Text>
        <Text style={[st.heroSubLg, { color: ADMIN_VISUAL.textSubtle }]}>
          Monitor users, reviews, disputes, and platform activity in one place.
        </Text>
        <View style={st.heroPillRow}>
          <View style={[st.statusPill, { borderColor: ADMIN_VISUAL.green + "55", backgroundColor: ADMIN_VISUAL.greenMuted }]}>
            <View style={[st.dotLive, { backgroundColor: ADMIN_VISUAL.green }]} />
            <Text style={{ color: ADMIN_VISUAL.green, fontSize: 11, fontWeight: "800", letterSpacing: 0.3 }}>Live</Text>
          </View>
          <View style={[st.statusPill, { borderColor: ADMIN_VISUAL.border, backgroundColor: ADMIN_VISUAL.surfaceRaised }]}>
            <Text style={{ color: ADMIN_VISUAL.textSubtle, fontSize: 11, fontWeight: "700" }}>
              Pending actions · {pendingActionCount}
            </Text>
          </View>
          <View style={[st.statusPill, { borderColor: ADMIN_VISUAL.border, backgroundColor: ADMIN_VISUAL.surfaceRaised }]}>
            <Text style={{ color: ADMIN_VISUAL.textSubtle, fontSize: 11, fontWeight: "700" }}>
              Verification queue · {d.pendingContractorVerifications}
            </Text>
          </View>
        </View>
      </View>

      <Text style={[st.blockEyebrow, { color: ADMIN_VISUAL.textMuted }]}>PLATFORM SNAPSHOT</Text>
      <View style={st.pmGrid}>
        <PremiumMetricCard label="Total users" value={d.totalUsers} accent={ADMIN_VISUAL.blue} onPress={() => onSelectTab("users")} colors={colors} hint="Directory" />
        <PremiumMetricCard label="Contractors" value={d.totalContractors} accent={ADMIN_VISUAL.blue} onPress={() => onSelectTab("users")} colors={colors} hint="Seats & roles" />
        <PremiumMetricCard label="Customers" value={d.totalCustomers} accent={ADMIN_VISUAL.green} onPress={() => onSelectTab("users")} colors={colors} hint="Account type" />
        <PremiumMetricCard label="Reviews" value={d.totalReviews} accent={ADMIN_VISUAL.purple} onPress={() => onSelectTab("reviews")} colors={colors} hint="Published corpus" />
        <PremiumMetricCard label="Open disputes" value={d.pendingDisputes} accent={ADMIN_VISUAL.amber} onPress={() => onSelectTab("disputes")} colors={colors} hint="Needs resolution" />
        <PremiumMetricCard
          label="Pending verifications"
          value={d.pendingContractorVerifications}
          accent={ADMIN_VISUAL.amber}
          onPress={() => onSelectTab("verification")}
          colors={colors}
          hint="Credential queue"
        />
        <PremiumMetricCard label="Flagged reviews" value={d.flaggedReviews} accent={ADMIN_VISUAL.red} onPress={() => onSelectTab("moderation")} colors={colors} hint="Trust & safety" />
      </View>

      {feed ? (
        <View style={st.apanelStack}>
          <Text style={[st.blockEyebrow, { color: ADMIN_VISUAL.textMuted }]}>HIGH PRIORITY</Text>
          <AdminActionPanel
            title="Recent disputes"
            subtitle="Open and in-progress — newest first"
            onViewAll={() => onSelectTab("disputes")}
            colors={colors}
          >
            {openDisputes.length === 0 ? (
              <Text style={st.apanelEmpty}>No open disputes in the recent feed. Queue is clear.</Text>
            ) : (
              openDisputes.slice(0, 6).map((row: any) => (
                <Pressable
                  key={row.id}
                  onPress={() => onSelectTab("disputes")}
                  style={({ pressed, hovered }: any) => [st.apanelRow, (pressed || hovered) && { backgroundColor: ADMIN_VISUAL.surfaceHover }]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[st.apanelRowTitle, { color: colors.foreground }]}>Dispute #{row.id}</Text>
                    <Text style={[st.apanelRowMeta, { color: ADMIN_VISUAL.textMuted }]} numberOfLines={1}>
                      Review #{row.reviewId} · {row.status}
                    </Text>
                  </View>
                  <StatusBadge label={String(row.status)} variant="pending" />
                </Pressable>
              ))
            )}
          </AdminActionPanel>

          <AdminActionPanel
            title="Verification queue"
            subtitle="Contractor profiles awaiting review"
            onViewAll={() => onSelectTab("verification")}
            colors={colors}
          >
            {(feed.pendingVerifications as any[]).length === 0 ? (
              <Text style={st.apanelEmpty}>No pending contractor verifications. You are fully caught up.</Text>
            ) : (
              (feed.pendingVerifications as any[]).slice(0, 6).map((row: any) => (
                <Pressable
                  key={row.userId}
                  onPress={() => onSelectTab("verification")}
                  style={({ pressed, hovered }: any) => [st.apanelRow, (pressed || hovered) && { backgroundColor: ADMIN_VISUAL.surfaceHover }]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[st.apanelRowTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {row.company ?? row.trade ?? "Contractor"}
                    </Text>
                    <Text style={[st.apanelRowMeta, { color: ADMIN_VISUAL.textMuted }]} numberOfLines={1}>
                      User #{row.userId} · {row.licenseNumber ?? "License pending"}
                    </Text>
                  </View>
                  <StatusBadge label="Pending" variant="pending" />
                </Pressable>
              ))
            )}
          </AdminActionPanel>

          <AdminActionPanel
            title="Flagged reviews"
            subtitle="Hidden or escalated — triage in Moderation"
            onViewAll={() => onSelectTab("moderation")}
            colors={colors}
          >
            {(feed.flaggedReviews as any[]).length === 0 ? (
              <Text style={st.apanelEmpty}>No flagged reviews in this feed.</Text>
            ) : (
              (feed.flaggedReviews as any[]).slice(0, 6).map((row: any) => (
                <Pressable
                  key={row.id}
                  onPress={() => onSelectTab("moderation")}
                  style={({ pressed, hovered }: any) => [st.apanelRow, (pressed || hovered) && { backgroundColor: ADMIN_VISUAL.surfaceHover }]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[st.apanelRowTitle, { color: colors.foreground }]}>Review #{row.id}</Text>
                    <Text style={[st.apanelRowMeta, { color: ADMIN_VISUAL.textMuted }]} numberOfLines={2}>
                      {(row.reviewText ?? "").slice(0, 120)}
                    </Text>
                  </View>
                  <StatusBadge label="Flagged" variant="error" />
                </Pressable>
              ))
            )}
          </AdminActionPanel>

          <AdminActionPanel
            title="Recent signups"
            subtitle="New contractor accounts · rolling 7 days"
            onViewAll={() => onSelectTab("users")}
            colors={colors}
          >
            <View style={st.apanelRow}>
              <View style={{ flex: 1 }}>
                <Text style={[st.apanelRowTitle, { color: colors.foreground }]}>{d.newContractors7d.toLocaleString()} new accounts</Text>
                <Text style={[st.apanelRowMeta, { color: ADMIN_VISUAL.textMuted }]}>Open the user directory to inspect roles and verification.</Text>
              </View>
              <Ionicons name="arrow-forward-circle-outline" size={22} color={ADMIN_VISUAL.blue} />
            </View>
          </AdminActionPanel>
        </View>
      ) : null}

      <Pressable
        onPress={() => onSelectTab("betaFunnel")}
        style={({ pressed, hovered }: any) => [
          st.betaFunnelShortcut,
          { borderColor: C.purple + "44", backgroundColor: pressed || hovered ? C.blueBg : C.surface },
        ]}
      >
        <Text style={{ fontSize: 15, fontWeight: "800", color: colors.foreground }}>Beta funnel analytics</Text>
        <Text style={[st.heroMetricHint, { marginTop: 4 }]}>
          PostHog event counts, drop-off vs prior step, profile sources, and key ratios (server query API).
        </Text>
        <Text style={[st.heroMetricHint, { color: C.purple, marginTop: 8, fontWeight: "700" }]}>Open →</Text>
      </Pressable>

      <View style={st.heroMetricsRow}>
        <Pressable
          onPress={() => onSelectTab("payments")}
          style={({ pressed, hovered }: any) => [
            st.heroMetricCard,
            { borderColor: C.blueBorder, backgroundColor: pressed || hovered ? C.blueBg : C.surface },
          ]}
        >
          <Text style={st.heroMetricLabel}>Revenue · 30 days</Text>
          <Text style={[st.heroMetricValue, { color: colors.foreground }]}>{fmtCurrencyFull(d.revenue30d)}</Text>
          <Text style={st.heroMetricHint}>Collected · net of refunds shown below</Text>
        </Pressable>
        <Pressable
          onPress={() => onSelectTab("subscriptions")}
          style={({ pressed, hovered }: any) => [
            st.heroMetricCard,
            { borderColor: C.greenBorder, backgroundColor: pressed || hovered ? C.greenBg : C.surface },
          ]}
        >
          <Text style={st.heroMetricLabel}>Active paid memberships</Text>
          <Text style={[st.heroMetricValue, { color: colors.foreground }]}>{d.activePaid.toLocaleString()}</Text>
          <Text style={st.heroMetricHint}>Contractor annual seats currently active</Text>
        </Pressable>
      </View>

      <View style={st.alertSection}>
        <View style={st.alertHeader}>
          <Text style={[st.alertSectionTitle, { color: colors.foreground }]}>Priority queues</Text>
          <Text style={[st.alertSectionSub]}>
            Green = clear. Tap a row to open the matching admin tab.
          </Text>
        </View>
        <PriorityQueueRow
          label="Renewals due within 30 days"
          value={d.renewalsDueSoon}
          severityIfOpen="yellow"
          onPress={() => onSelectTab("subscriptions")}
        />
        <PriorityQueueRow
          label="Pending disputes"
          value={d.pendingDisputes}
          severityIfOpen={d.pendingDisputes > 5 ? "red" : "yellow"}
          onPress={() => onSelectTab("disputes")}
        />
        <PriorityQueueRow
          label="Flagged reviews (hidden)"
          value={d.flaggedReviews}
          severityIfOpen="red"
          onPress={() => onSelectTab("moderation")}
        />
        <PriorityQueueRow
          label="Failed payments · 30 days"
          value={d.failedPayments30d}
          severityIfOpen="red"
          onPress={() => onSelectTab("payments")}
        />
        <PriorityQueueRow
          label="Reviews under review (moderation queue)"
          value={d.reviewsUnderReview}
          severityIfOpen="yellow"
          onPress={() => onSelectTab("moderation")}
        />
      </View>

      <View style={st.kpiSectionHead}>
        <Text style={[st.kpiSectionTitle, { color: colors.foreground }]}>Operating metrics</Text>
        <Text style={st.kpiSectionSub}>Renewals through refunds — same order as your weekly review checklist.</Text>
      </View>
      <View style={st.kpiGrid}>
        {KPI_DEFS.map((def) => (
          <KpiCard
            key={def.key}
            def={def}
            data={d}
            colors={colors}
            onPress={def.tab ? () => onSelectTab(def.tab!) : undefined}
          />
        ))}
      </View>

      <View style={st.chartsSection}>
        <ChartPanel
          title="Revenue trend"
          subtitle="Daily collected volume · neutral trend line · last 30 days"
        >
          <RevenueLineChart data={d.revenueTimeline ?? []} width={chartWidth} />
        </ChartPanel>

        <ChartPanel
          title="Free → paid conversion"
          subtitle="Cohort-style snapshot: free-year trial · renewal window · paid annual seats"
        >
          <ConversionFunnelChart
            freeYear={d.funnelData?.freeYear ?? 0}
            renewalsDue={d.funnelData?.renewalsDue ?? 0}
            paid={d.funnelData?.paid ?? 0}
            width={chartWidth}
          />
        </ChartPanel>

        <ChartPanel
          title="Disputes & moderation load"
          subtitle={`Bars: opened (red) vs resolved (green) per day · Queue: ${d.moderationBacklog} backlog · ${d.reviewsUnderReview} reviews under review`}
        >
          <DisputeActivityChart data={d.disputeActivity ?? []} width={chartWidth} />
        </ChartPanel>
      </View>

      <View style={[st.activitySection, { borderColor: ADMIN_VISUAL.border }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[st.blockEyebrow, { color: ADMIN_VISUAL.textMuted, marginTop: 0, marginBottom: 6 }]}>RECENT ACTIVITY</Text>
            <Text style={[st.chartTitle, { marginBottom: 4, color: ADMIN_VISUAL.textSubtle }]}>Audit highlights</Text>
            <Text style={[st.chartSub, { marginBottom: 0 }]}>
              Newest first · grouped by day · open Activity log for the full trail.
            </Text>
          </View>
          <Pressable onPress={() => onSelectTab("activity")} style={st.viewAllBtn}>
            <Text style={{ color: ADMIN_VISUAL.blue, fontSize: 12, fontWeight: "800" }}>View all</Text>
            <Ionicons name="chevron-forward" size={16} color={ADMIN_VISUAL.blue} />
          </Pressable>
        </View>
        {auditGrouped.length === 0 ? (
          <Text style={{ color: ADMIN_VISUAL.textMuted, fontSize: 13, paddingVertical: 12 }}>No admin actions recorded recently.</Text>
        ) : (
          auditGrouped.map(([dayLabel, items]) => (
            <View key={dayLabel} style={{ marginBottom: 10 }}>
              <Text style={st.actDayLabel}>{dayLabel}</Text>
              {items.map((item: any) => {
                const accent = auditActivityAccent(item.action);
                return (
                  <View key={item.id} style={st.actRow}>
                    <View style={[st.actDot, { backgroundColor: accent }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[st.actAction, { color: colors.foreground }]}>{formatAuditTitle(item.action)}</Text>
                      {item.details ? (
                        <Text style={st.actDetails} numberOfLines={2}>
                          {item.details}
                        </Text>
                      ) : null}
                      <Text style={st.actMeta}>
                        {item.targetType} #{item.targetId ?? "—"} · Admin #{item.adminUserId} ·{" "}
                        {new Date(item.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────────────────

function UsersTab({ colors, query, setQuery }: { colors: any; query: string; setQuery: (q: string) => void }) {
  const { width: winW } = useWindowDimensions();
  const { user: me } = useAuth();
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [detailUser, setDetailUser] = useState<any | null>(null);
  const { data, isLoading, refetch } = trpc.admin.listUsersAdmin.useQuery({ query, limit: 50 });
  const updateRole = trpc.admin.updateUserRole.useMutation({ onSuccess: () => refetch() });
  const setStatus = trpc.admin.setUserAccountStatus.useMutation({ onSuccess: () => refetch() });

  const rows = useMemo(() => {
    const r = data ?? [];
    if (roleFilter === "all") return r;
    return r.filter((u: any) => u.role === roleFilter);
  }, [data, roleFilter]);

  const openUserActions = useCallback(
    (item: any) => {
      const sub = [item.subPlan, item.subStatus].filter(Boolean).join(" · ") || "—";
      const ver = item.contractorVerification ? `Contractor verify: ${item.contractorVerification}` : "";
      Alert.alert(
        item.name ?? item.email ?? `User #${item.id}`,
        `Email: ${item.email ?? "—"}\nID: ${item.id}\nVerified: ${item.isVerified ? "yes" : "no"}\nAccount: ${item.accountStatus ?? "active"}\nSubscription: ${sub}${ver ? `\n${ver}` : ""}`,
        [
          { text: "Close", style: "cancel" },
          {
            text: "Set role…",
            onPress: () => {
              Alert.alert("Change role", "Choose a role for this user.", [
                { text: "Cancel", style: "cancel" },
                ...(["user", "contractor", "customer", "admin"] as const).map((role) => ({
                  text: role,
                  onPress: () => updateRole.mutate({ userId: item.id, role }),
                })),
              ]);
            },
          },
          ...(item.id !== me?.id
            ? [
                {
                  text: "Suspend",
                  style: "destructive" as const,
                  onPress: () =>
                    Alert.alert("Suspend user", "They will not be able to use the app until reactivated.", [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Suspend",
                        style: "destructive",
                        onPress: () =>
                          setStatus.mutate({ userId: item.id, status: "suspended", reason: "Admin console" }),
                      },
                    ]),
                },
                {
                  text: "Activate",
                  onPress: () => setStatus.mutate({ userId: item.id, status: "active" }),
                },
              ]
            : []),
        ],
      );
    },
    [me?.id, setStatus, updateRole],
  );

  const drawerW = Math.min(420, winW - 24);

  return (
    <View style={st.tabContent}>
      <SectionHeader
        eyebrow="DIRECTORY"
        title="User directory"
        subtitle="Search, inspect, and govern accounts without leaving context."
        colors={colors}
      />
      <SearchBar colors={colors} query={query} setQuery={setQuery} placeholder="Name or email…" />
      <AdminFilterPills
        colors={colors}
        value={roleFilter}
        onChange={setRoleFilter}
        options={[
          { id: "all", label: "All roles" },
          { id: "admin", label: "Admin" },
          { id: "contractor", label: "Contractor" },
          { id: "customer", label: "Customer" },
          { id: "user", label: "User" },
        ]}
      />
      <View style={[st.tableHeaderBar, { borderColor: ADMIN_VISUAL.border }]}>
        <Text style={[st.thCell, st.thWide, { color: ADMIN_VISUAL.textMuted }]}>User</Text>
        <Text style={[st.thCell, st.thSmall, { color: ADMIN_VISUAL.textMuted }]}>Verified</Text>
        <Text style={[st.thCell, st.thMedium, { color: ADMIN_VISUAL.textMuted }]}>Role</Text>
        <Text style={[st.thCell, st.thMedium, { color: ADMIN_VISUAL.textMuted }]}>Plan</Text>
        <Text style={[st.thCell, st.thSmall, { color: ADMIN_VISUAL.textMuted, textAlign: "right" }]}>Actions</Text>
      </View>
      {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={rows}
          keyExtractor={(item: any) => item.id.toString()}
          style={st.tableList}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }: { item: any }) => (
              <View style={st.tableRow}>
                <Pressable
                  onPress={() => setDetailUser(item)}
                  style={({ pressed, hovered }: any) => [
                    { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 },
                    (pressed || hovered) && { backgroundColor: ADMIN_VISUAL.surfaceHover, borderRadius: ADMIN_VISUAL.radiusSm, marginVertical: -2, paddingVertical: 2, paddingHorizontal: 4, marginHorizontal: -4 },
                  ]}
                >
                  <View style={[st.tdWide]}>
                    <Text style={[st.cellPrimary, { color: colors.foreground }]} numberOfLines={1}>
                      {item.name ?? "—"}
                    </Text>
                    <Text style={[st.cellSecondary, { color: ADMIN_VISUAL.textMuted }]} numberOfLines={1}>
                      {item.email ?? "—"}
                    </Text>
                  </View>
                  <View style={st.tdSmall}>
                    <StatusBadge label={item.isVerified ? "Verified" : "Unverified"} variant={item.isVerified ? "success" : "neutral"} />
                  </View>
                  <View style={st.tdMedium}>
                    <StatusBadge label={item.role} variant={item.role === "admin" ? "admin" : "neutral"} />
                    <View style={{ marginTop: 6, alignSelf: "flex-start" }}>
                      <StatusBadge
                        label={String(item.accountStatus ?? "active")}
                        variant={statusVariant(String(item.accountStatus ?? "active"))}
                      />
                    </View>
                  </View>
                  <View style={st.tdMedium}>
                    <Text style={[st.cellSecondary, { color: colors.foreground, fontSize: 12 }]} numberOfLines={1}>
                      {item.subPlan ?? "—"}
                    </Text>
                    <Text style={[st.cellSecondary, { color: ADMIN_VISUAL.textMuted, fontSize: 10 }]} numberOfLines={1}>
                      {item.subStatus ?? "—"}
                    </Text>
                  </View>
                </Pressable>
                <View style={[st.tdSmall, { alignItems: "flex-end", justifyContent: "center" }]}>
                  <GhostButton label="Manage" onPress={() => openUserActions(item)} />
                </View>
              </View>
            )}
          ListEmptyComponent={
            <EmptyState
              message="No accounts match the current search and filters."
              hint="Clear filters or broaden your search."
              actionLabel="Reset filters"
              onAction={() => {
                setRoleFilter("all");
                setQuery("");
              }}
            />
          }
        />
      )}

      <Modal visible={detailUser != null} animationType="slide" transparent onRequestClose={() => setDetailUser(null)}>
        <View style={st.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetailUser(null)} accessibilityLabel="Close drawer" />
          <View style={[st.drawerPanel, { maxWidth: drawerW }]}>
            <Pressable style={st.drawerCloseHit} onPress={() => setDetailUser(null)} hitSlop={12}>
              <Ionicons name="close" size={24} color={ADMIN_VISUAL.textSubtle} />
            </Pressable>
            {detailUser ? (
              <>
                <Text style={[st.drawerTitle, { color: colors.foreground }]}>
                  {detailUser.name ?? detailUser.email ?? `User #${detailUser.id}`}
                </Text>
                <ScrollView style={{ maxHeight: winW * 1.2 }} showsVerticalScrollIndicator={false}>
                  <View style={st.drawerBody}>
                    <Text style={{ color: ADMIN_VISUAL.textMuted, fontSize: 12 }}>Email</Text>
                    <Text style={{ color: colors.foreground, fontSize: 15 }}>{detailUser.email ?? "—"}</Text>
                    <Text style={{ color: ADMIN_VISUAL.textMuted, fontSize: 12, marginTop: 10 }}>Identifiers</Text>
                    <Text style={{ color: colors.foreground, fontSize: 14 }}>ID #{detailUser.id}</Text>
                    <Text style={{ color: ADMIN_VISUAL.textMuted, fontSize: 12, marginTop: 10 }}>Verification</Text>
                    <StatusBadge label={detailUser.isVerified ? "Verified" : "Unverified"} variant={detailUser.isVerified ? "success" : "neutral"} />
                    <Text style={{ color: ADMIN_VISUAL.textMuted, fontSize: 12, marginTop: 10 }}>Account status</Text>
                    <StatusBadge
                      label={detailUser.accountStatus ?? "active"}
                      variant={statusVariant(detailUser.accountStatus ?? "active")}
                    />
                    <Text style={{ color: ADMIN_VISUAL.textMuted, fontSize: 12, marginTop: 10 }}>Subscription</Text>
                    <Text style={{ color: colors.foreground, fontSize: 14 }}>
                      {[detailUser.subPlan, detailUser.subStatus].filter(Boolean).join(" · ") || "—"}
                    </Text>
                    {detailUser.contractorVerification ? (
                      <>
                        <Text style={{ color: ADMIN_VISUAL.textMuted, fontSize: 12, marginTop: 10 }}>Contractor verification</Text>
                        <Text style={{ color: colors.foreground, fontSize: 14 }}>{detailUser.contractorVerification}</Text>
                      </>
                    ) : null}
                  </View>
                </ScrollView>
                <View style={st.drawerActions}>
                  <PrimaryButton label="Role & account actions" onPress={() => openUserActions(detailUser)} />
                  <SecondaryButton label="Close panel" onPress={() => setDetailUser(null)} />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reviews
// ─────────────────────────────────────────────────────────────────────────────

function ReviewsTab({ colors, query, setQuery }: { colors: any; query: string; setQuery: (q: string) => void }) {
  const { width: winW } = useWindowDimensions();
  const [visFilter, setVisFilter] = useState<"all" | "visible" | "hidden">("all");
  const [detail, setDetail] = useState<any | null>(null);
  const { data, isLoading, refetch } = trpc.admin.listReviews.useQuery({ query, limit: 50 });
  const hideReview = trpc.admin.hideReview.useMutation({ onSuccess: () => refetch() });
  const restoreReview = trpc.admin.restoreReview.useMutation({ onSuccess: () => refetch() });

  const rows = useMemo(() => {
    const r = data ?? [];
    if (visFilter === "all") return r;
    if (visFilter === "hidden") return r.filter((x: any) => !!x.hiddenAt);
    return r.filter((x: any) => !x.hiddenAt);
  }, [data, visFilter]);

  const confirmHide = useCallback((id: number) => {
    Alert.alert("Hide Review", "This review will be removed from public view. It can be restored later. Continue?",
      [{ text: "Keep Visible", style: "cancel" }, { text: "Hide Review", style: "destructive", onPress: () => hideReview.mutate({ reviewId: id, reason: "Admin action" }) }]);
  }, [hideReview]);

  const confirmRestore = useCallback((id: number) => {
    Alert.alert("Restore Review", "This review will be made publicly visible again. Continue?",
      [{ text: "Cancel", style: "cancel" }, { text: "Restore", onPress: () => restoreReview.mutate({ reviewId: id }) }]);
  }, [restoreReview]);

  const drawerW = Math.min(420, winW - 24);

  return (
    <View style={st.tabContent}>
      <SectionHeader
        eyebrow="CONTENT"
        title="Reviews"
        subtitle="Inspect narrative, visibility, and enforcement actions in one scan."
        colors={colors}
      />
      <SearchBar colors={colors} query={query} setQuery={setQuery} placeholder="Search review content…" />
      <AdminFilterPills
        colors={colors}
        value={visFilter}
        onChange={(id) => setVisFilter(id as typeof visFilter)}
        options={[
          { id: "all", label: "All" },
          { id: "visible", label: "Visible" },
          { id: "hidden", label: "Hidden" },
        ]}
      />
      <View style={[st.tableHeaderBar, { borderColor: ADMIN_VISUAL.border }]}>
        <Text style={[st.thCell, st.thSmall, { color: ADMIN_VISUAL.textMuted }]}>ID</Text>
        <Text style={[st.thCell, st.thWide, { color: ADMIN_VISUAL.textMuted }]}>Content</Text>
        <Text style={[st.thCell, st.thSmall, { color: ADMIN_VISUAL.textMuted }]}>Rating</Text>
        <Text style={[st.thCell, st.thMedium, { color: ADMIN_VISUAL.textMuted }]}>Status</Text>
        <Text style={[st.thCell, st.thMedium, { color: ADMIN_VISUAL.textMuted }]}>Actions</Text>
      </View>
      {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={rows}
          keyExtractor={(item: any) => item.id.toString()}
          style={st.tableList}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }: { item: any }) => {
            const hidden = !!item.hiddenAt;
            return (
              <View style={[st.tableRow, hidden && { opacity: 0.55 }]}>
                <Pressable
                  onPress={() => setDetail(item)}
                  style={({ pressed, hovered }: any) => [
                    { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 },
                    (pressed || hovered) && { backgroundColor: ADMIN_VISUAL.surfaceHover, borderRadius: ADMIN_VISUAL.radiusSm, marginVertical: -2, paddingVertical: 2, paddingHorizontal: 4, marginHorizontal: -4 },
                  ]}
                >
                  <Text style={[st.cellSecondary, st.tdSmall, { color: ADMIN_VISUAL.textMuted }]}>#{item.id}</Text>
                  <View style={st.tdWide}>
                    <Text style={[st.cellPrimary, { color: colors.foreground }]} numberOfLines={1}>
                      {item.reviewText?.slice(0, 80) ?? "No written content"}
                    </Text>
                    <Text style={[st.cellSecondary, { color: ADMIN_VISUAL.textMuted }]}>Customer {item.customerId}</Text>
                  </View>
                  <Text style={[st.cellSecondary, st.tdSmall, { color: colors.foreground }]}>{item.overallRating}/5</Text>
                  <View style={st.tdMedium}>
                    <StatusBadge label={hidden ? "Hidden" : "Visible"} variant={hidden ? "error" : "success"} />
                  </View>
                </Pressable>
                <View style={[st.tdMedium, { gap: 6, alignItems: "flex-end" }]}>
                  {hidden ? (
                    <PositiveButton label="Restore" onPress={() => confirmRestore(item.id)} />
                  ) : (
                    <DestructiveButton label="Hide" onPress={() => confirmHide(item.id)} />
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              message="No reviews match the current search or visibility filter."
              actionLabel="Show all"
              onAction={() => {
                setVisFilter("all");
                setQuery("");
              }}
            />
          }
        />
      )}

      <Modal visible={detail != null} animationType="slide" transparent onRequestClose={() => setDetail(null)}>
        <View style={st.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDetail(null)} />
          <View style={[st.drawerPanel, { maxWidth: drawerW }]}>
            <Pressable style={st.drawerCloseHit} onPress={() => setDetail(null)} hitSlop={12}>
              <Ionicons name="close" size={24} color={ADMIN_VISUAL.textSubtle} />
            </Pressable>
            {detail ? (
              <>
                <Text style={[st.drawerTitle, { color: colors.foreground }]}>Review #{detail.id}</Text>
                <ScrollView style={{ maxHeight: winW }} showsVerticalScrollIndicator={false}>
                  <View style={st.drawerBody}>
                    <Text style={{ color: ADMIN_VISUAL.textMuted, fontSize: 12 }}>Customer</Text>
                    <Text style={{ color: colors.foreground, fontSize: 15 }}>#{detail.customerId}</Text>
                    <Text style={{ color: ADMIN_VISUAL.textMuted, fontSize: 12, marginTop: 10 }}>Rating</Text>
                    <Text style={{ color: colors.foreground, fontSize: 15 }}>{detail.overallRating}/5</Text>
                    <Text style={{ color: ADMIN_VISUAL.textMuted, fontSize: 12, marginTop: 10 }}>Body</Text>
                    <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 21 }}>{detail.reviewText ?? "—"}</Text>
                  </View>
                </ScrollView>
                <View style={st.drawerActions}>
                  {detail.hiddenAt ? (
                    <PrimaryButton label="Restore visibility" onPress={() => confirmRestore(detail.id)} />
                  ) : (
                    <DestructiveButton label="Hide from public" onPress={() => confirmHide(detail.id)} />
                  )}
                  <SecondaryButton label="Close" onPress={() => setDetail(null)} />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Disputes
// ─────────────────────────────────────────────────────────────────────────────

function DisputesTab({ colors }: { colors: any }) {
  const [disputeFilter, setDisputeFilter] = useState<"all" | "open" | "closed">("open");
  const { data, isLoading, refetch } = trpc.admin.listDisputes.useQuery({ limit: 50 });
  const resolve = trpc.admin.resolveDispute.useMutation({ onSuccess: () => refetch() });
  const [selectedDisputeId, setSelectedDisputeId] = useState<number | null>(null);

  const rows = useMemo(() => {
    const r = data ?? [];
    if (disputeFilter === "all") return r;
    const openish = (s: string) => ["open", "pending", "under_review", "awaiting_info", "responded"].includes(String(s));
    if (disputeFilter === "open") return r.filter((x: any) => openish(x.status));
    return r.filter((x: any) => !openish(x.status));
  }, [data, disputeFilter]);

  const confirmResolve = useCallback((id: number) => {
    Alert.alert("Resolve Dispute", "Mark this dispute as resolved? The review will remain visible.", [
      { text: "Cancel", style: "cancel" },
      { text: "Resolve", onPress: () => resolve.mutate({ disputeId: id, resolution: "Reviewed and resolved by admin", status: "resolved" }) },
    ]);
  }, [resolve]);

  const confirmDismiss = useCallback((id: number) => {
    Alert.alert("Dismiss Dispute", "Dismiss this dispute? No action will be taken on the review.", [
      { text: "Cancel", style: "cancel" },
      { text: "Dismiss", style: "destructive", onPress: () => resolve.mutate({ disputeId: id, resolution: "Dismissed by admin", status: "dismissed" }) },
    ]);
  }, [resolve]);

  if (selectedDisputeId) {
    return (
      <View style={st.tabContent}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
          <Pressable onPress={() => setSelectedDisputeId(null)} style={{ paddingVertical: 4, paddingRight: 8 }}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>← Back to Disputes</Text>
          </Pressable>
        </View>
        <DisputeThreadView disputeId={selectedDisputeId} isAdmin />
      </View>
    );
  }

  return (
    <View style={st.tabContent}>
      <SectionHeader
        eyebrow="TRUST"
        title="Disputes"
        subtitle="Open a thread for full correspondence, or resolve from the list when the outcome is obvious."
        colors={colors}
      />
      <AdminFilterPills
        colors={colors}
        value={disputeFilter}
        onChange={(id) => setDisputeFilter(id as typeof disputeFilter)}
        options={[
          { id: "open", label: "Open" },
          { id: "closed", label: "Closed" },
          { id: "all", label: "All" },
        ]}
      />
      <View style={[st.tableHeaderBar, { borderColor: ADMIN_VISUAL.border }]}>
        <Text style={[st.thCell, st.thSmall, { color: ADMIN_VISUAL.textMuted }]}>ID</Text>
        <Text style={[st.thCell, st.thSmall, { color: ADMIN_VISUAL.textMuted }]}>Review</Text>
        <Text style={[st.thCell, st.thWide, { color: ADMIN_VISUAL.textMuted }]}>Response</Text>
        <Text style={[st.thCell, st.thMedium, { color: ADMIN_VISUAL.textMuted }]}>Status</Text>
        <Text style={[st.thCell, st.thMedium, { color: ADMIN_VISUAL.textMuted }]}>Actions</Text>
      </View>
      {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={rows}
          keyExtractor={(item: any) => item.id.toString()}
          style={st.tableList}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }: { item: any }) => {
            const isOpen =
              item.status === "open" ||
              item.status === "pending" ||
              item.status === "under_review" ||
              item.status === "awaiting_info" ||
              item.status === "responded";
            return (
              <View style={st.tableRow}>
                <Pressable
                  onPress={() => setSelectedDisputeId(item.id)}
                  style={({ pressed, hovered }: any) => [
                    { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 },
                    (pressed || hovered) && { backgroundColor: ADMIN_VISUAL.surfaceHover, borderRadius: ADMIN_VISUAL.radiusSm, marginVertical: -2, paddingVertical: 2, paddingHorizontal: 4, marginHorizontal: -4 },
                  ]}
                >
                  <Text style={[st.cellSecondary, st.tdSmall, { color: ADMIN_VISUAL.textMuted }]}>#{item.id}</Text>
                  <Text style={[st.cellSecondary, st.tdSmall, { color: colors.foreground }]}>#{item.reviewId}</Text>
                  <Text style={[st.cellSecondary, st.tdWide, { color: ADMIN_VISUAL.textMuted }]} numberOfLines={2}>
                    {item.customerResponse ?? "No response provided"}
                  </Text>
                  <View style={st.tdMedium}>
                    <StatusBadge label={item.status} variant={statusVariant(item.status)} />
                  </View>
                </Pressable>
                <View style={[st.tdMedium, { gap: 6, alignItems: "flex-end" }]}>
                  {isOpen ? (
                    <>
                      <PositiveButton label="Resolve" onPress={() => confirmResolve(item.id)} />
                      <DestructiveButton label="Dismiss" onPress={() => confirmDismiss(item.id)} />
                    </>
                  ) : (
                    <StatusBadge label="Resolved" variant="success" />
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              message="No disputes in this filter."
              actionLabel="Show all disputes"
              onAction={() => setDisputeFilter("all")}
            />
          }
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────────────────────────────────────

function PaymentsTab({ colors }: { colors: any }) {
  const { data, isLoading, refetch } = trpc.admin.listPayments.useQuery({ limit: 50 });
  const refundMut = trpc.admin.refundPayment.useMutation({ onSuccess: () => refetch() });

  const confirmRefund = useCallback((piId: string, amount: number) => {
    Alert.alert("Issue Refund", `Refund ${fmtCurrencyFull(amount)} for payment ${piId.slice(0, 20)}…?\n\nThis action cannot be undone.`,
      [{ text: "Cancel", style: "cancel" }, { text: "Issue Refund", style: "destructive", onPress: () => refundMut.mutate({ paymentIntentId: piId, reason: "Admin-initiated refund" }) }]);
  }, [refundMut]);

  return (
    <View style={st.tabContent}>
      <SectionHeader eyebrow="FINANCE" title="Payments" subtitle="Ledger review and controlled refunds." colors={colors} />
      <View style={[st.tableHeaderBar, { borderColor: ADMIN_VISUAL.border }]}>
        <Text style={[st.thCell, st.thWide, { color: ADMIN_VISUAL.textMuted }]}>Payment ID</Text>
        <Text style={[st.thCell, st.thSmall, { color: ADMIN_VISUAL.textMuted }]}>Amount</Text>
        <Text style={[st.thCell, st.thMedium, { color: ADMIN_VISUAL.textMuted }]}>Status</Text>
        <Text style={[st.thCell, st.thSmall, { color: ADMIN_VISUAL.textMuted }]}>User</Text>
        <Text style={[st.thCell, st.thMedium, { color: ADMIN_VISUAL.textMuted }]}>Action</Text>
      </View>
      {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item: any) => item.id.toString()}
          style={st.tableList}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }: { item: any }) => {
            const amt = item.amountCents ?? 0;
            return (
              <View style={st.tableRow}>
                <Text style={[st.cellSecondary, st.tdWide, { color: colors.foreground }]} numberOfLines={1}>
                  {item.stripePaymentIntentId}
                </Text>
                <Text style={[st.cellPrimary, st.tdSmall, { color: colors.foreground }]}>{fmtCurrencyFull(amt)}</Text>
                <View style={st.tdMedium}>
                  <StatusBadge label={item.status} variant={statusVariant(item.status)} />
                </View>
                <Text style={[st.cellSecondary, st.tdSmall, { color: ADMIN_VISUAL.textMuted }]}>{item.userId ?? "—"}</Text>
                <View style={[st.tdMedium, { alignItems: "flex-end" }]}>
                  {item.status === "succeeded" ? (
                    <DestructiveButton label="Refund" onPress={() => confirmRefund(item.stripePaymentIntentId, amt)} />
                  ) : (
                    <Text style={{ color: ADMIN_VISUAL.textMuted, fontSize: 11 }}>—</Text>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<EmptyState message="No payment records found." />}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscriptions
// ─────────────────────────────────────────────────────────────────────────────

function SubscriptionsTab({ colors }: { colors: any }) {
  const { data, isLoading, refetch } = trpc.admin.listSubscriptions.useQuery({ limit: 50 });
  const cancelMut = trpc.admin.cancelSubscription.useMutation({ onSuccess: () => refetch() });

  const confirmCancel = useCallback((userId: number, plan: string) => {
    Alert.alert("Cancel Subscription", `Cancel the ${plan || "active"} subscription for user ${userId}?\n\nThe user will lose premium access at the end of their current period.`,
      [{ text: "Keep Active", style: "cancel" }, { text: "Cancel Subscription", style: "destructive", onPress: () => cancelMut.mutate({ userId, reason: "Admin cancellation" }) }]);
  }, [cancelMut]);

  return (
    <View style={st.tabContent}>
      <SectionHeader eyebrow="FINANCE" title="Subscriptions" subtitle="Seat health, renewals, and cancellation controls." colors={colors} />
      <View style={[st.tableHeaderBar, { borderColor: ADMIN_VISUAL.border }]}>
        <Text style={[st.thCell, st.thSmall, { color: ADMIN_VISUAL.textMuted }]}>User</Text>
        <Text style={[st.thCell, st.thMedium, { color: ADMIN_VISUAL.textMuted }]}>Plan</Text>
        <Text style={[st.thCell, st.thMedium, { color: ADMIN_VISUAL.textMuted }]}>Status</Text>
        <Text style={[st.thCell, st.thMedium, { color: ADMIN_VISUAL.textMuted }]}>Expires</Text>
        <Text style={[st.thCell, st.thMedium, { color: ADMIN_VISUAL.textMuted }]}>Action</Text>
      </View>
      {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item: any) => item.id.toString()}
          style={st.tableList}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }: { item: any }) => {
            const canCancel = item.status === "active" || item.status === "trial";
            return (
              <View style={st.tableRow}>
                <Text style={[st.cellPrimary, st.tdSmall, { color: colors.foreground }]}>{item.userId}</Text>
                <Text style={[st.cellSecondary, st.tdMedium, { color: colors.foreground }]} numberOfLines={1}>
                  {item.planType ?? "—"}
                </Text>
                <View style={st.tdMedium}>
                  <StatusBadge label={item.status} variant={statusVariant(item.status)} />
                </View>
                <Text style={[st.cellSecondary, st.tdMedium, { color: ADMIN_VISUAL.textMuted }]}>{formatDate(item.subscriptionEndsAt)}</Text>
                <View style={[st.tdMedium, { alignItems: "flex-end" }]}>
                  {canCancel ? (
                    <DestructiveButton label="Cancel" onPress={() => confirmCancel(item.userId, item.planType)} />
                  ) : (
                    <Text style={{ color: ADMIN_VISUAL.textMuted, fontSize: 11 }}>—</Text>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<EmptyState message="No subscriptions found." />}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Moderation
// ─────────────────────────────────────────────────────────────────────────────

function ModerationTab({ colors }: { colors: any }) {
  const { data, isLoading, refetch } = trpc.admin.listReviews.useQuery({ limit: 50 });
  const hideReview = trpc.admin.hideReview.useMutation({ onSuccess: () => refetch() });
  const restoreReview = trpc.admin.restoreReview.useMutation({ onSuccess: () => refetch() });
  const setMod = trpc.admin.setModerationStatus.useMutation({ onSuccess: () => refetch() });

  const moderationQueue = (data ?? []).filter((r: any) => {
    const mStatus = r.moderationStatus ?? "active";
    const hasFlags = (r.redFlags ?? "").toLowerCase();
    return mStatus !== "active" || hasFlags.includes("do_not_work_with") || hasFlags.includes("legal_threats") || hasFlags.includes("non_payment");
  });

  const confirmRemove = useCallback((id: number) => {
    Alert.alert("Remove Review", "Remove this review from public view? It can be reinstated later.",
      [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => hideReview.mutate({ reviewId: id, reason: "Moderation: removed by admin" }) }]);
  }, [hideReview]);

  const confirmReinstate = useCallback((id: number) => {
    Alert.alert("Reinstate Review", "Make this review publicly visible again?",
      [{ text: "Cancel", style: "cancel" }, { text: "Reinstate", onPress: () => restoreReview.mutate({ reviewId: id }) }]);
  }, [restoreReview]);

  const markReviewedActive = useCallback((id: number) => {
    setMod.mutate({ reviewId: id, status: "active" });
  }, [setMod]);

  const showDetail = useCallback((item: any) => {
    const body = [
      `Customer: #${item.customerId}`,
      `Rating: ${item.overallRating}/5`,
      item.redFlags ? `Flags: ${item.redFlags}` : null,
      "",
      item.reviewText ?? "No text",
    ]
      .filter(Boolean)
      .join("\n");
    Alert.alert(`Review #${item.id}`, body.slice(0, 1800));
  }, []);

  const getModStatus = (item: any) => {
    const ms = item.moderationStatus ?? (item.hiddenAt ? "hidden_flagged" : "active");
    return MODERATION_STATUSES[ms as keyof typeof MODERATION_STATUSES] ?? MODERATION_STATUSES.active;
  };

  return (
    <View style={st.tabContent}>
      <SectionHeader
        eyebrow="QUEUES"
        title="Pending review actions"
        subtitle="High-signal items only — escalate, hide, or clear with confidence."
        colors={colors}
      />
      {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : moderationQueue.length === 0 ? (
        <EmptyState message="No items require moderation right now." hint="When contractors flag risk patterns or content is hidden, it lands here." />
      ) : (
        <FlatList
          data={moderationQueue}
          keyExtractor={(item: any) => item.id.toString()}
          style={st.tableList}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }: { item: any }) => {
            const ms = getModStatus(item);
            const isHidden = !!item.hiddenAt || item.moderationStatus === "hidden_flagged" || item.moderationStatus === "removed";
            return (
              <View style={[st.tableRow, isHidden && { opacity: 0.65 }]}>
                <Pressable
                  onPress={() => showDetail(item)}
                  style={({ pressed, hovered }: any) => [
                    { flex: 1, gap: 6, minWidth: 0, paddingVertical: 2, paddingHorizontal: 4, marginVertical: -2, marginHorizontal: -4 },
                    (pressed || hovered) && { backgroundColor: ADMIN_VISUAL.surfaceHover, borderRadius: ADMIN_VISUAL.radiusSm },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Text style={[st.cellPrimary, { color: colors.foreground }]}>Review #{item.id}</Text>
                    <View style={[st.statusBadge, { backgroundColor: ms.color + "22", borderColor: ms.color + "44", borderWidth: 1 }]}>
                      <Text style={{ color: ms.color, fontSize: 10, fontWeight: "800" }}>{ms.label}</Text>
                    </View>
                  </View>
                  <Text style={[st.cellSecondary, { color: ADMIN_VISUAL.textMuted }]} numberOfLines={2}>
                    {item.reviewText?.slice(0, 120) ?? "No text"}
                  </Text>
                  {item.redFlags ? (
                    <Text style={[st.cellSecondary, { color: ADMIN_VISUAL.red, marginTop: 2 }]} numberOfLines={2}>
                      Flags: {item.redFlags?.slice(0, 100)}
                    </Text>
                  ) : null}
                  <Text style={{ color: ADMIN_VISUAL.textSubtle, fontSize: 10, fontWeight: "700", marginTop: 4 }}>Tap to inspect</Text>
                </Pressable>
                <View style={{ gap: 8, flexShrink: 0, alignItems: "flex-end", marginLeft: 12 }}>
                  {isHidden ? (
                    <PositiveButton label="Reinstate" onPress={() => confirmReinstate(item.id)} />
                  ) : (
                    <DestructiveButton label="Hide" onPress={() => confirmRemove(item.id)} />
                  )}
                  {!isHidden && item.moderationStatus && item.moderationStatus !== "active" ? (
                    <SecondaryButton label="Mark reviewed" onPress={() => markReviewedActive(item.id)} />
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function VerificationTab({ colors }: { colors: any }) {
  const router = useRouter();
  const { data, isLoading } = trpc.admin.listPendingContractorVerifications.useQuery({ limit: 50 });
  return (
    <View style={st.tabContent}>
      <SectionHeader
        eyebrow="VERIFICATION"
        title="Verification queue"
        subtitle="Snapshot of pending contractor credentials — full approve / reject lives in the console."
        colors={colors}
      />
      <View style={{ marginBottom: 14 }}>
        <Pressable
          onPress={() => router.push("/admin-verification" as any)}
          style={({ pressed, hovered }: any) => [
            st.betaFunnelShortcut,
            {
              borderColor: ADMIN_VISUAL.blue + "44",
              backgroundColor: pressed || hovered ? ADMIN_VISUAL.surfaceHover : ADMIN_VISUAL.surface,
            },
          ]}
        >
          <Text style={{ fontSize: 14, fontWeight: "800", color: colors.foreground }}>Open verification console</Text>
          <Text style={[st.heroMetricHint, { marginTop: 6, color: ADMIN_VISUAL.textMuted }]}>
            Document review, rejection reasons, and trial activation.
          </Text>
          <Text style={{ color: ADMIN_VISUAL.blue, fontSize: 12, fontWeight: "800", marginTop: 8 }}>Continue →</Text>
        </Pressable>
      </View>
      {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={data ?? []}
          keyExtractor={(row: any) => String(row.userId)}
          style={st.tableList}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={<EmptyState message="Verification queue is clear." hint="New submissions will appear here automatically." />}
          renderItem={({ item }: { item: any }) => (
            <View style={[st.tableRow, { flexDirection: "column", alignItems: "stretch", gap: 6 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={[st.cellPrimary, { color: colors.foreground }]}>User #{item.userId}</Text>
                <StatusBadge label="Pending" variant="pending" />
              </View>
              <Text style={[st.cellSecondary, { color: ADMIN_VISUAL.textMuted }]} numberOfLines={2}>
                {[item.company, item.trade].filter(Boolean).join(" · ") || "—"}
              </Text>
              <Text style={[st.cellSecondary, { color: ADMIN_VISUAL.textSubtle }]}>License: {item.licenseNumber ?? "—"}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function AnalyticsTab({ colors, onOpenBetaFunnel }: { colors: any; onOpenBetaFunnel: () => void }) {
  return (
    <View style={st.tabContent}>
      <SectionHeader
        eyebrow="INSIGHTS"
        title="Analytics hub"
        subtitle="Operational metrics roll up on the dashboard; product analytics live in the funnel workspace."
        colors={colors}
      />
      <Pressable
        onPress={onOpenBetaFunnel}
        style={({ pressed, hovered }: any) => [
          st.betaFunnelShortcut,
          {
            borderColor: ADMIN_VISUAL.purple + "44",
            backgroundColor: pressed || hovered ? ADMIN_VISUAL.surfaceHover : ADMIN_VISUAL.surface,
          },
        ]}
      >
        <Text style={{ fontSize: 15, fontWeight: "800", color: colors.foreground }}>Product analytics (PostHog)</Text>
        <Text style={[st.heroMetricHint, { marginTop: 6, color: ADMIN_VISUAL.textMuted }]}>
          Funnel steps, drop-off, acquisition sources, and ratio diagnostics.
        </Text>
        <Text style={{ color: ADMIN_VISUAL.purple, fontSize: 12, fontWeight: "800", marginTop: 10 }}>Launch workspace →</Text>
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity Log
// ─────────────────────────────────────────────────────────────────────────────

function ActivityTab({ colors }: { colors: any }) {
  const { data, isLoading } = trpc.admin.getAuditLog.useQuery({ limit: 100 });
  return (
    <View style={st.tabContent}>
      <SectionHeader
        eyebrow="AUDIT"
        title="Activity log"
        subtitle="Immutable record of privileged actions — who did what, to which entity, and when."
        colors={colors}
      />
      <View style={[st.tableHeaderBar, { borderColor: ADMIN_VISUAL.border }]}>
        <Text style={[st.thCell, st.thMedium, { color: ADMIN_VISUAL.textMuted }]}>Action</Text>
        <Text style={[st.thCell, st.thMedium, { color: ADMIN_VISUAL.textMuted }]}>Target</Text>
        <Text style={[st.thCell, st.thSmall, { color: ADMIN_VISUAL.textMuted }]}>Admin</Text>
        <Text style={[st.thCell, st.thMedium, { color: ADMIN_VISUAL.textMuted }]}>Date</Text>
      </View>
      {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item: any) => item.id.toString()}
          style={st.tableList}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }: { item: any }) => (
            <View style={st.tableRow}>
              <View style={st.tdMedium}>
                <Text style={[st.cellPrimary, { color: colors.foreground }]}>{item.action.replace(/_/g, " ")}</Text>
                {item.details ? (
                  <Text style={[st.cellSecondary, { color: ADMIN_VISUAL.textMuted }]} numberOfLines={1}>
                    {item.details}
                  </Text>
                ) : null}
              </View>
              <Text style={[st.cellSecondary, st.tdMedium, { color: ADMIN_VISUAL.textMuted }]} numberOfLines={1}>
                {item.targetType} #{item.targetId ?? "—"}
              </Text>
              <Text style={[st.cellSecondary, st.tdSmall, { color: ADMIN_VISUAL.textMuted }]}>{item.adminUserId}</Text>
              <Text style={[st.cellSecondary, st.tdMedium, { color: ADMIN_VISUAL.textSubtle }]}>
                {new Date(item.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </Text>
            </View>
          )}
          ListEmptyComponent={<EmptyState message="No admin actions recorded yet." hint="Actions appear as you moderate, refund, and manage accounts." />}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  lockTitle: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  lockSub: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  lockBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  lockBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  topTitle: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  exitBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: C.border },

  tabRow: { paddingHorizontal: 16, gap: 4, height: 48, alignItems: "center" },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: "transparent", borderWidth: 1, borderColor: "transparent" },
  tabText: { fontSize: 12, fontWeight: "600" },

  tabContent: { flex: 1, minHeight: 0 },
  sectionHeader: { paddingHorizontal: 0, paddingTop: 4, paddingBottom: 14, gap: 4 },
  sectionEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 4 },
  sectionTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  sectionSub: { fontSize: 13, lineHeight: 18, marginTop: 2 },

  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, borderWidth: 1, gap: 8 },
  adminSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "web" ? 11 : 9,
    borderRadius: ADMIN_VISUAL.radiusMd,
    borderWidth: 1,
    gap: 8,
  },
  filterClearHit: { paddingVertical: 4, paddingHorizontal: 4 },
  searchInput: { flex: 1, fontSize: 14 },

  filterPillRow: { flexDirection: "row", gap: 8, paddingBottom: 12, paddingRight: 8 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },

  // Overview
  overviewScroll: {
    paddingBottom: 80,
    maxWidth: ADMIN_VISUAL.contentMaxWidth,
    width: "100%" as any,
    alignSelf: "center",
  },

  heroPremium: { paddingTop: 8, paddingBottom: 28, gap: 10 },
  heroKicker: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  heroTitleLg: { fontSize: 28, fontWeight: "800", letterSpacing: -0.6, lineHeight: 34 },
  heroSubLg: { fontSize: 14, lineHeight: 21, maxWidth: 560 },
  heroPillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  dotLive: { width: 6, height: 6, borderRadius: 3 },
  blockEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 12, marginTop: 8 },

  pmGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 28 },
  pmPressable: { width: "31%" as any, minWidth: 148, flexGrow: 1, maxWidth: 200 as any },
  pmCard: {
    borderRadius: ADMIN_VISUAL.radiusLg,
    borderWidth: 1,
    padding: 16,
    paddingTop: 14,
    overflow: "hidden",
    backgroundColor: ADMIN_VISUAL.surface,
    elevation: 4,
  },
  pmAccentBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderTopLeftRadius: ADMIN_VISUAL.radiusLg, borderBottomLeftRadius: ADMIN_VISUAL.radiusLg },
  pmLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8, marginLeft: 4 },
  pmValue: { fontSize: 26, fontWeight: "800", letterSpacing: -0.8, marginLeft: 4 },
  pmHint: { fontSize: 11, marginTop: 8, marginLeft: 4, lineHeight: 15 },

  apanelStack: { gap: 14, marginBottom: 24 },
  apanel: { borderRadius: ADMIN_VISUAL.radiusLg, borderWidth: 1, overflow: "hidden" },
  apanelHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_VISUAL.border,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  apanelTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  apanelSub: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  viewAllBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 4 },
  apanelBody: { paddingVertical: 4 },
  apanelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ADMIN_VISUAL.border,
    gap: 12,
  },
  apanelRowTitle: { fontSize: 14, fontWeight: "700" },
  apanelRowMeta: { fontSize: 12, marginTop: 3 },
  apanelEmpty: { paddingHorizontal: 16, paddingVertical: 18, fontSize: 13, color: ADMIN_VISUAL.textMuted, lineHeight: 19 },

  primaryBtn: {
    backgroundColor: "rgba(96, 165, 250, 0.22)",
    borderWidth: 1,
    borderColor: ADMIN_VISUAL.blue + "55",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: ADMIN_VISUAL.radiusSm,
    alignItems: "center",
  },
  primaryBtnText: { color: ADMIN_VISUAL.blue, fontSize: 13, fontWeight: "800" },
  secondaryBtn: {
    backgroundColor: ADMIN_VISUAL.surfaceRaised,
    borderWidth: 1,
    borderColor: ADMIN_VISUAL.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: ADMIN_VISUAL.radiusSm,
    alignItems: "center",
  },
  secondaryBtnText: { color: ADMIN_VISUAL.textSubtle, fontSize: 13, fontWeight: "700" },
  ghostBtnBare: { paddingVertical: 8, paddingHorizontal: 4 },
  ghostBtnText: { color: ADMIN_VISUAL.blue, fontSize: 13, fontWeight: "700" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  drawerPanel: {
    width: "100%" as any,
    maxWidth: 420,
    backgroundColor: "#0c0e14",
    borderLeftWidth: 1,
    borderLeftColor: ADMIN_VISUAL.border,
    paddingTop: Platform.OS === "ios" ? 52 : 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  drawerTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  drawerBody: { marginTop: 16, gap: 12 },
  drawerActions: { marginTop: 24, gap: 10 },
  drawerCloseHit: { position: "absolute", top: 16, right: 16, zIndex: 2, padding: 8 },

  tableHeaderBar: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: ADMIN_VISUAL.radiusSm,
    borderWidth: 1,
    borderColor: ADMIN_VISUAL.border,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginBottom: 4,
    gap: 6,
  },

  hero: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20, gap: 6 },
  heroTitle: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  heroSub: { fontSize: 13, lineHeight: 19, color: C.muted },

  betaFunnelShortcut: {
    marginBottom: 16,
    borderRadius: ADMIN_VISUAL.radiusLg,
    borderWidth: 1,
    padding: 16,
    gap: 2,
    backgroundColor: ADMIN_VISUAL.surface,
  },

  heroMetricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  heroMetricCard: {
    flex: 1,
    minWidth: 150,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  heroMetricLabel: { fontSize: 10, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  heroMetricValue: { fontSize: 28, fontWeight: "800", letterSpacing: -0.8 },
  heroMetricHint: { fontSize: 10, lineHeight: 14, color: C.muted, marginTop: 2 },

  kpiSectionHead: { marginBottom: 10, gap: 4 },
  kpiSectionTitle: { fontSize: 13, fontWeight: "800", letterSpacing: -0.2 },
  kpiSectionSub: { fontSize: 11, lineHeight: 15, color: C.muted },

  // Priority Alerts
  alertSection: { marginBottom: 20, borderRadius: ADMIN_VISUAL.radiusLg, borderWidth: 1, padding: 16, backgroundColor: ADMIN_VISUAL.surface, gap: 8 },
  alertHeader: { gap: 2, marginBottom: 4 },
  alertSectionTitle: { fontSize: 15, fontWeight: "700" },
  alertSectionSub: { fontSize: 11, lineHeight: 15, color: C.muted },
  alertRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 10 },
  alertPulse: { width: 8, height: 8, borderRadius: 4 },
  alertLabel: { flex: 1, fontSize: 13, fontWeight: "500" },
  alertBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, minWidth: 36, alignItems: "center" },
  alertBadgeText: { fontSize: 14, fontWeight: "800" },

  // KPI Grid
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  kpiCard: { width: "47%", borderRadius: 12, borderWidth: 1, padding: 14, gap: 2 },
  kpiTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  kpiDot: { width: 6, height: 6, borderRadius: 3 },
  kpiLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  kpiValue: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5, lineHeight: 30 },
  kpiDesc: { fontSize: 10, lineHeight: 14, marginTop: 2 },

  // Charts
  chartsSection: { gap: 16, marginBottom: 24 },
  chartPanel: { borderRadius: ADMIN_VISUAL.radiusLg, borderWidth: 1, borderColor: ADMIN_VISUAL.border, padding: 16, backgroundColor: ADMIN_VISUAL.surface },
  chartTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
  chartSub: { fontSize: 11, lineHeight: 15, color: C.muted, marginBottom: 12 },
  chartBody: { alignItems: "center" },

  // Activity feed
  activitySection: { marginBottom: 24, borderRadius: ADMIN_VISUAL.radiusLg, borderWidth: 1, padding: 16, backgroundColor: ADMIN_VISUAL.surface },
  activityFeedLink: { paddingVertical: 4, paddingHorizontal: 8 },
  actDayLabel: { fontSize: 10, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  actRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 7 },
  actDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  actAction: { fontSize: 12, fontWeight: "700" },
  actDetails: { fontSize: 11, lineHeight: 15, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  actMeta: { fontSize: 10, color: C.muted, marginTop: 2 },

  // Tables
  tableHeader: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  thCell: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  thWide: { flex: 2 },
  thMedium: { flex: 1 },
  thSmall: { width: 44 },

  tableList: { flex: 1 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ADMIN_VISUAL.border, gap: 8 },
  tdWide: { flex: 2 },
  tdMedium: { flex: 1 },
  tdSmall: { width: 44 },

  cellPrimary: { fontSize: 13, fontWeight: "600" },
  cellSecondary: { fontSize: 11 },

  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },

  destructiveBtn: {
    backgroundColor: ADMIN_VISUAL.redMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: ADMIN_VISUAL.radiusSm,
    borderWidth: 1,
    borderColor: ADMIN_VISUAL.red + "44",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  destructiveBtnText: { color: ADMIN_VISUAL.red, fontSize: 12, fontWeight: "800" },

  positiveBtn: {
    backgroundColor: ADMIN_VISUAL.greenMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: ADMIN_VISUAL.radiusSm,
    borderWidth: 1,
    borderColor: ADMIN_VISUAL.green + "44",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  positiveBtnText: { color: ADMIN_VISUAL.green, fontSize: 12, fontWeight: "800" },

  emptyState: { paddingVertical: 48, paddingHorizontal: 24, alignItems: "center" },
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
  emptyText: { fontSize: 13, color: ADMIN_VISUAL.textMuted, textAlign: "center", lineHeight: 19, maxWidth: 280 },
  emptyHint: { fontSize: 12, color: ADMIN_VISUAL.textMuted, textAlign: "center", marginTop: 8, lineHeight: 17 },
  emptyAction: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 18, borderRadius: ADMIN_VISUAL.radiusSm, borderWidth: 1, borderColor: ADMIN_VISUAL.blue + "55" },
  emptyActionText: { color: ADMIN_VISUAL.blue, fontSize: 13, fontWeight: "800" },

  feedBlock: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8, backgroundColor: "rgba(255,255,255,0.02)" },
  feedBlockTitle: { fontSize: 13, fontWeight: "800", marginBottom: 4 },
  feedRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.06)" },

  searchSectionLabel: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4 },
  searchHit: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.06)" },

  compactActionBtn: { paddingVertical: 6, paddingHorizontal: 4 },
});
