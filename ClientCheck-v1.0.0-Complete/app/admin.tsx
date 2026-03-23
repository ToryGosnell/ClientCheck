import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import { useRouter } from "expo-router";
import { ScreenBackground } from "@/components/screen-background";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { DisputeThreadView } from "@/components/dispute-thread-view";
import { AdminBetaFunnelTab } from "@/components/admin-beta-funnel-tab";
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

type Tab = "overview" | "users" | "reviews" | "disputes" | "payments" | "subscriptions" | "moderation" | "activity" | "betaFunnel";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "betaFunnel", label: "Beta funnel" },
  { key: "users", label: "Users" },
  { key: "reviews", label: "Reviews" },
  { key: "disputes", label: "Disputes" },
  { key: "payments", label: "Payments" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "moderation", label: "Moderation" },
  { key: "activity", label: "Activity Log" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, colors }: { title: string; subtitle: string; colors: any }) {
  return (
    <View style={st.sectionHeader}>
      <Text style={[st.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[st.sectionSub, { color: C.muted }]}>{subtitle}</Text>
    </View>
  );
}

function SearchBar({ colors, query, setQuery, placeholder }: { colors: any; query: string; setQuery: (q: string) => void; placeholder: string }) {
  return (
    <View style={[st.searchWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
      <Text style={{ color: C.muted, fontSize: 14 }}>Search</Text>
      <TextInput
        style={[st.searchInput, { color: colors.foreground }]}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        value={query}
        onChangeText={setQuery}
      />
      {query.length > 0 && (
        <Pressable onPress={() => setQuery("")} hitSlop={8}>
          <Text style={{ color: C.muted, fontSize: 14 }}>Clear</Text>
        </Pressable>
      )}
    </View>
  );
}

function StatusBadge({ label, variant }: { label: string; variant: "success" | "warning" | "error" | "neutral" }) {
  const bg = { success: C.greenBg, warning: C.yellowBg, error: C.redBg, neutral: C.surface }[variant];
  const fg = { success: C.green, warning: C.yellow, error: C.red, neutral: C.muted }[variant];
  return (
    <View style={[st.statusBadge, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: "700", textTransform: "capitalize" }}>{label}</Text>
    </View>
  );
}

function DestructiveButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.destructiveBtn, pressed && { opacity: 0.7 }]}>
      <Text style={st.destructiveBtnText}>{label}</Text>
    </Pressable>
  );
}

function PositiveButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.positiveBtn, pressed && { opacity: 0.7 }]}>
      <Text style={st.positiveBtnText}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({ message }: { message: string }) {
  return <View style={st.emptyState}><Text style={st.emptyText}>{message}</Text></View>;
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusVariant(s: string): "success" | "warning" | "error" | "neutral" {
  if (s === "active" || s === "succeeded" || s === "resolved" || s === "approved") return "success";
  if (s === "trial" || s === "open" || s === "pending" || s === "processing") return "warning";
  if (s === "cancelled" || s === "failed" || s === "dismissed" || s === "refunded" || s === "expired") return "error";
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
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const userIsAdmin = (user as any)?.role === "admin";
  if (!user || !userIsAdmin) {
    return (
      <ScreenBackground backgroundKey="dashboard" overlayOpacity={0.92}>
        <ScreenContainer>
          <View style={st.centered}>
            <Text style={{ fontSize: 36, marginBottom: 16 }}>🔒</Text>
            <Text style={[st.lockTitle, { color: colors.foreground }]}>Access Restricted</Text>
            <Text style={[st.lockSub, { color: C.muted }]}>
              This page is only available to platform administrators.
            </Text>
            <Pressable onPress={() => router.back()} style={[st.lockBtn, { backgroundColor: colors.primary }]}>
              <Text style={st.lockBtnText}>Return to Dashboard</Text>
            </Pressable>
          </View>
        </ScreenContainer>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground backgroundKey="dashboard" overlayOpacity={0.95}>
      <ScreenContainer edges={["top", "left", "right"]}>
        <View style={[st.topBar, { borderBottomColor: C.border }]}>
          <View>
            <Text style={[st.topTitle, { color: colors.foreground }]}>ClientCheck Admin</Text>
            <Text style={{ color: C.muted, fontSize: 11 }}>{user.name ?? user.email}</Text>
          </View>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [st.exitBtn, pressed && { opacity: 0.6 }]}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "700" }}>Exit Admin</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.tabRow}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => { setTab(t.key); setSearchQuery(""); }}
                style={({ pressed }) => [
                  st.tab,
                  active && { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" },
                  pressed && !active && { backgroundColor: C.surfaceHover },
                ]}
              >
                <Text style={[st.tabText, { color: active ? colors.primary : C.muted }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {tab === "overview" && <OverviewTab colors={colors} onSelectTab={setTab} />}
        {tab === "betaFunnel" && <AdminBetaFunnelTab />}
        {tab === "users" && <UsersTab colors={colors} query={searchQuery} setQuery={setSearchQuery} />}
        {tab === "reviews" && <ReviewsTab colors={colors} query={searchQuery} setQuery={setSearchQuery} />}
        {tab === "disputes" && <DisputesTab colors={colors} />}
        {tab === "payments" && <PaymentsTab colors={colors} />}
        {tab === "subscriptions" && <SubscriptionsTab colors={colors} />}
        {tab === "moderation" && <ModerationTab colors={colors} />}
        {tab === "activity" && <ActivityTab colors={colors} />}
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

  return (
    <ScrollView contentContainerStyle={st.overviewScroll} showsVerticalScrollIndicator={false}>
      <View style={st.hero}>
        <Text style={[st.heroTitle, { color: colors.foreground }]}>Control center</Text>
        <Text style={[st.heroSub]}>
          Revenue and membership health first — then queues, pipeline, and trust operations.
        </Text>
      </View>

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

      <View style={st.activitySection}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[st.chartTitle, { marginBottom: 2 }]}>Activity feed</Text>
            <Text style={[st.chartSub, { marginBottom: 0 }]}>
              Newest first · grouped by day · open Activity Log for the full audit trail.
            </Text>
          </View>
          <Pressable onPress={() => onSelectTab("activity")} style={st.activityFeedLink}>
            <Text style={{ color: C.blue, fontSize: 12, fontWeight: "700" }}>View all</Text>
          </Pressable>
        </View>
        {auditGrouped.length === 0 ? (
          <Text style={{ color: C.muted, fontSize: 12, fontStyle: "italic", paddingVertical: 8 }}>No recent admin activity.</Text>
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
  const { data, isLoading } = trpc.admin.listUsers.useQuery({ query, limit: 50 });
  return (
    <View style={st.tabContent}>
      <SectionHeader title="Users" subtitle="Search and review registered accounts." colors={colors} />
      <SearchBar colors={colors} query={query} setQuery={setQuery} placeholder="Name or email…" />
      <View style={[st.tableHeader, { borderColor: C.border }]}>
        <Text style={[st.thCell, st.thWide, { color: C.muted }]}>User</Text>
        <Text style={[st.thCell, st.thMedium, { color: C.muted }]}>Role</Text>
        <Text style={[st.thCell, st.thSmall, { color: C.muted }]}>ID</Text>
        <Text style={[st.thCell, st.thMedium, { color: C.muted }]}>Joined</Text>
      </View>
      {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item: any) => item.id.toString()}
          style={st.tableList}
          renderItem={({ item }: { item: any }) => (
            <View style={[st.tableRow, { borderColor: C.border }]}>
              <View style={[st.tdWide]}>
                <Text style={[st.cellPrimary, { color: colors.foreground }]}>{item.name ?? "—"}</Text>
                <Text style={[st.cellSecondary, { color: C.muted }]}>{item.email ?? "—"}</Text>
              </View>
              <View style={st.tdMedium}>
                <StatusBadge label={item.role} variant={item.role === "admin" ? "error" : "neutral"} />
              </View>
              <Text style={[st.cellSecondary, st.tdSmall, { color: C.muted }]}>{item.id}</Text>
              <Text style={[st.cellSecondary, st.tdMedium, { color: C.muted }]}>{formatDate(item.createdAt)}</Text>
            </View>
          )}
          ListEmptyComponent={<EmptyState message="No users match your search." />}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reviews
// ─────────────────────────────────────────────────────────────────────────────

function ReviewsTab({ colors, query, setQuery }: { colors: any; query: string; setQuery: (q: string) => void }) {
  const { data, isLoading, refetch } = trpc.admin.listReviews.useQuery({ query, limit: 50 });
  const hideReview = trpc.admin.hideReview.useMutation({ onSuccess: () => refetch() });
  const restoreReview = trpc.admin.restoreReview.useMutation({ onSuccess: () => refetch() });

  const confirmHide = useCallback((id: number) => {
    Alert.alert("Hide Review", "This review will be removed from public view. It can be restored later. Continue?",
      [{ text: "Keep Visible", style: "cancel" }, { text: "Hide Review", style: "destructive", onPress: () => hideReview.mutate({ reviewId: id, reason: "Admin action" }) }]);
  }, []);

  const confirmRestore = useCallback((id: number) => {
    Alert.alert("Restore Review", "This review will be made publicly visible again. Continue?",
      [{ text: "Cancel", style: "cancel" }, { text: "Restore", onPress: () => restoreReview.mutate({ reviewId: id }) }]);
  }, []);

  return (
    <View style={st.tabContent}>
      <SectionHeader title="Reviews" subtitle="Browse, search, and manage contractor-submitted reviews." colors={colors} />
      <SearchBar colors={colors} query={query} setQuery={setQuery} placeholder="Search review content…" />
      <View style={[st.tableHeader, { borderColor: C.border }]}>
        <Text style={[st.thCell, st.thSmall, { color: C.muted }]}>ID</Text>
        <Text style={[st.thCell, st.thWide, { color: C.muted }]}>Content</Text>
        <Text style={[st.thCell, st.thSmall, { color: C.muted }]}>Rating</Text>
        <Text style={[st.thCell, st.thMedium, { color: C.muted }]}>Status</Text>
        <Text style={[st.thCell, st.thMedium, { color: C.muted }]}>Action</Text>
      </View>
      {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item: any) => item.id.toString()}
          style={st.tableList}
          renderItem={({ item }: { item: any }) => {
            const hidden = !!item.hiddenAt;
            return (
              <View style={[st.tableRow, { borderColor: C.border }, hidden && { opacity: 0.45 }]}>
                <Text style={[st.cellSecondary, st.tdSmall, { color: C.muted }]}>#{item.id}</Text>
                <View style={st.tdWide}>
                  <Text style={[st.cellPrimary, { color: colors.foreground }]} numberOfLines={1}>{item.reviewText?.slice(0, 80) ?? "No written content"}</Text>
                  <Text style={[st.cellSecondary, { color: C.muted }]}>Customer {item.customerId}</Text>
                </View>
                <Text style={[st.cellSecondary, st.tdSmall, { color: colors.foreground }]}>{item.overallRating}/5</Text>
                <View style={st.tdMedium}>
                  <StatusBadge label={hidden ? "Hidden" : "Visible"} variant={hidden ? "error" : "success"} />
                </View>
                <View style={st.tdMedium}>
                  {hidden ? <PositiveButton label="Restore" onPress={() => confirmRestore(item.id)} /> : <DestructiveButton label="Hide" onPress={() => confirmHide(item.id)} />}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<EmptyState message="No reviews match your search." />}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Disputes
// ─────────────────────────────────────────────────────────────────────────────

function DisputesTab({ colors }: { colors: any }) {
  const { data, isLoading, refetch } = trpc.admin.listDisputes.useQuery({ limit: 50 });
  const resolve = trpc.admin.resolveDispute.useMutation({ onSuccess: () => refetch() });
  const [selectedDisputeId, setSelectedDisputeId] = useState<number | null>(null);

  const confirmResolve = useCallback((id: number) => {
    Alert.alert("Resolve Dispute", "Mark this dispute as resolved? The review will remain visible.", [
      { text: "Cancel", style: "cancel" },
      { text: "Resolve", onPress: () => resolve.mutate({ disputeId: id, resolution: "Reviewed and resolved by admin", status: "resolved" }) },
    ]);
  }, []);

  const confirmDismiss = useCallback((id: number) => {
    Alert.alert("Dismiss Dispute", "Dismiss this dispute? No action will be taken on the review.", [
      { text: "Cancel", style: "cancel" },
      { text: "Dismiss", style: "destructive", onPress: () => resolve.mutate({ disputeId: id, resolution: "Dismissed by admin", status: "dismissed" }) },
    ]);
  }, []);

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
      <SectionHeader title="Disputes" subtitle="Review and resolve customer-submitted disputes. Click a dispute to open the thread." colors={colors} />
      <View style={[st.tableHeader, { borderColor: C.border }]}>
        <Text style={[st.thCell, st.thSmall, { color: C.muted }]}>ID</Text>
        <Text style={[st.thCell, st.thSmall, { color: C.muted }]}>Review</Text>
        <Text style={[st.thCell, st.thWide, { color: C.muted }]}>Response</Text>
        <Text style={[st.thCell, st.thMedium, { color: C.muted }]}>Status</Text>
        <Text style={[st.thCell, st.thMedium, { color: C.muted }]}>Actions</Text>
      </View>
      {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item: any) => item.id.toString()}
          style={st.tableList}
          renderItem={({ item }: { item: any }) => {
            const isOpen = item.status === "open" || item.status === "pending" || item.status === "under_review" || item.status === "awaiting_info";
            return (
              <Pressable onPress={() => setSelectedDisputeId(item.id)} style={({ pressed }: any) => [st.tableRow, { borderColor: C.border }, pressed && { backgroundColor: C.surfaceHover }]}>
                <Text style={[st.cellSecondary, st.tdSmall, { color: C.muted }]}>#{item.id}</Text>
                <Text style={[st.cellSecondary, st.tdSmall, { color: colors.foreground }]}>#{item.reviewId}</Text>
                <Text style={[st.cellSecondary, st.tdWide, { color: C.muted }]} numberOfLines={2}>{item.customerResponse ?? "No response provided"}</Text>
                <View style={st.tdMedium}>
                  <StatusBadge label={item.status} variant={statusVariant(item.status)} />
                </View>
                <View style={[st.tdMedium, { gap: 4 }]}>
                  {isOpen ? (
                    <>
                      <PositiveButton label="Resolve" onPress={() => confirmResolve(item.id)} />
                      <DestructiveButton label="Dismiss" onPress={() => confirmDismiss(item.id)} />
                    </>
                  ) : (
                    <Text style={{ color: C.muted, fontSize: 11, fontStyle: "italic" }}>Closed</Text>
                  )}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={<EmptyState message="No disputes on record." />}
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
  }, []);

  return (
    <View style={st.tabContent}>
      <SectionHeader title="Payments" subtitle="Review transaction history and issue refunds when necessary." colors={colors} />
      <View style={[st.tableHeader, { borderColor: C.border }]}>
        <Text style={[st.thCell, st.thWide, { color: C.muted }]}>Payment ID</Text>
        <Text style={[st.thCell, st.thSmall, { color: C.muted }]}>Amount</Text>
        <Text style={[st.thCell, st.thMedium, { color: C.muted }]}>Status</Text>
        <Text style={[st.thCell, st.thSmall, { color: C.muted }]}>User</Text>
        <Text style={[st.thCell, st.thMedium, { color: C.muted }]}>Action</Text>
      </View>
      {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item: any) => item.id.toString()}
          style={st.tableList}
          renderItem={({ item }: { item: any }) => {
            const amt = item.amountCents ?? 0;
            return (
              <View style={[st.tableRow, { borderColor: C.border }]}>
                <Text style={[st.cellSecondary, st.tdWide, { color: colors.foreground }]} numberOfLines={1}>{item.stripePaymentIntentId}</Text>
                <Text style={[st.cellPrimary, st.tdSmall, { color: colors.foreground }]}>{fmtCurrencyFull(amt)}</Text>
                <View style={st.tdMedium}><StatusBadge label={item.status} variant={statusVariant(item.status)} /></View>
                <Text style={[st.cellSecondary, st.tdSmall, { color: C.muted }]}>{item.userId ?? "—"}</Text>
                <View style={st.tdMedium}>
                  {item.status === "succeeded" ? <DestructiveButton label="Refund" onPress={() => confirmRefund(item.stripePaymentIntentId, amt)} /> : <Text style={{ color: C.muted, fontSize: 11, fontStyle: "italic" }}>N/A</Text>}
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
  }, []);

  return (
    <View style={st.tabContent}>
      <SectionHeader title="Subscriptions" subtitle="Manage active subscriptions and membership plans." colors={colors} />
      <View style={[st.tableHeader, { borderColor: C.border }]}>
        <Text style={[st.thCell, st.thSmall, { color: C.muted }]}>User</Text>
        <Text style={[st.thCell, st.thMedium, { color: C.muted }]}>Plan</Text>
        <Text style={[st.thCell, st.thMedium, { color: C.muted }]}>Status</Text>
        <Text style={[st.thCell, st.thMedium, { color: C.muted }]}>Expires</Text>
        <Text style={[st.thCell, st.thMedium, { color: C.muted }]}>Action</Text>
      </View>
      {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item: any) => item.id.toString()}
          style={st.tableList}
          renderItem={({ item }: { item: any }) => {
            const canCancel = item.status === "active" || item.status === "trial";
            return (
              <View style={[st.tableRow, { borderColor: C.border }]}>
                <Text style={[st.cellPrimary, st.tdSmall, { color: colors.foreground }]}>{item.userId}</Text>
                <Text style={[st.cellSecondary, st.tdMedium, { color: colors.foreground }]}>{item.planType ?? "—"}</Text>
                <View style={st.tdMedium}><StatusBadge label={item.status} variant={statusVariant(item.status)} /></View>
                <Text style={[st.cellSecondary, st.tdMedium, { color: C.muted }]}>{formatDate(item.subscriptionEndsAt)}</Text>
                <View style={st.tdMedium}>
                  {canCancel ? <DestructiveButton label="Cancel" onPress={() => confirmCancel(item.userId, item.planType)} /> : <Text style={{ color: C.muted, fontSize: 11, fontStyle: "italic" }}>N/A</Text>}
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

  const moderationQueue = (data ?? []).filter((r: any) => {
    const mStatus = r.moderationStatus ?? "active";
    const hasFlags = (r.redFlags ?? "").toLowerCase();
    return mStatus !== "active" || hasFlags.includes("do_not_work_with") || hasFlags.includes("legal_threats") || hasFlags.includes("non_payment");
  });

  const confirmRemove = useCallback((id: number) => {
    Alert.alert("Remove Review", "Remove this review from public view? It can be reinstated later.",
      [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => hideReview.mutate({ reviewId: id, reason: "Moderation: removed by admin" }) }]);
  }, []);

  const confirmReinstate = useCallback((id: number) => {
    Alert.alert("Reinstate Review", "Make this review publicly visible again?",
      [{ text: "Cancel", style: "cancel" }, { text: "Reinstate", onPress: () => restoreReview.mutate({ reviewId: id }) }]);
  }, []);

  const getModStatus = (item: any) => {
    const ms = item.moderationStatus ?? (item.hiddenAt ? "hidden_flagged" : "active");
    return MODERATION_STATUSES[ms as keyof typeof MODERATION_STATUSES] ?? MODERATION_STATUSES.active;
  };

  return (
    <View style={st.tabContent}>
      <SectionHeader title="Moderation" subtitle="Flagged, hidden, and under-investigation reviews." colors={colors} />
      {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : moderationQueue.length === 0 ? (
        <EmptyState message="No content requires moderation at this time." />
      ) : (
        <FlatList
          data={moderationQueue}
          keyExtractor={(item: any) => item.id.toString()}
          style={st.tableList}
          renderItem={({ item }: { item: any }) => {
            const ms = getModStatus(item);
            const isHidden = !!item.hiddenAt || item.moderationStatus === "hidden_flagged" || item.moderationStatus === "removed";
            return (
              <View style={[st.tableRow, { borderColor: C.border }, isHidden && { opacity: 0.6 }]}>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={[st.cellPrimary, { color: colors.foreground }]}>Review #{item.id}</Text>
                    <View style={[st.statusBadge, { backgroundColor: ms.color + "18" }]}>
                      <Text style={{ color: ms.color, fontSize: 10, fontWeight: "700" }}>{ms.label}</Text>
                    </View>
                  </View>
                  <Text style={[st.cellSecondary, { color: C.muted }]} numberOfLines={1}>{item.reviewText?.slice(0, 80) ?? "No text"}</Text>
                  {item.redFlags && <Text style={[st.cellSecondary, { color: C.red, marginTop: 1 }]}>Flags: {item.redFlags?.slice(0, 60)}</Text>}
                </View>
                <View style={{ gap: 4 }}>
                  {isHidden ? (
                    <PositiveButton label="Reinstate" onPress={() => confirmReinstate(item.id)} />
                  ) : (
                    <DestructiveButton label="Remove" onPress={() => confirmRemove(item.id)} />
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
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
      <SectionHeader title="Activity Log" subtitle="Audit trail of all administrative actions." colors={colors} />
      <View style={[st.tableHeader, { borderColor: C.border }]}>
        <Text style={[st.thCell, st.thMedium, { color: C.muted }]}>Action</Text>
        <Text style={[st.thCell, st.thMedium, { color: C.muted }]}>Target</Text>
        <Text style={[st.thCell, st.thSmall, { color: C.muted }]}>Admin</Text>
        <Text style={[st.thCell, st.thMedium, { color: C.muted }]}>Date</Text>
      </View>
      {isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item: any) => item.id.toString()}
          style={st.tableList}
          renderItem={({ item }: { item: any }) => (
            <View style={[st.tableRow, { borderColor: C.border }]}>
              <View style={st.tdMedium}>
                <Text style={[st.cellPrimary, { color: colors.foreground }]}>{item.action.replace(/_/g, " ")}</Text>
                {item.details && <Text style={[st.cellSecondary, { color: C.muted }]} numberOfLines={1}>{item.details}</Text>}
              </View>
              <Text style={[st.cellSecondary, st.tdMedium, { color: C.muted }]}>{item.targetType} #{item.targetId ?? "—"}</Text>
              <Text style={[st.cellSecondary, st.tdSmall, { color: C.muted }]}>{item.adminUserId}</Text>
              <Text style={[st.cellSecondary, st.tdMedium, { color: C.muted }]}>
                {new Date(item.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </Text>
            </View>
          )}
          ListEmptyComponent={<EmptyState message="No admin actions recorded yet." />}
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

  tabContent: { flex: 1 },
  sectionHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 2 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  sectionSub: { fontSize: 12, lineHeight: 17, color: C.muted },

  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 13 },

  // Overview
  overviewScroll: { paddingBottom: 80 },

  hero: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20, gap: 6 },
  heroTitle: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  heroSub: { fontSize: 13, lineHeight: 19, color: C.muted },

  betaFunnelShortcut: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 2,
  },

  heroMetricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 20, marginBottom: 20 },
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

  kpiSectionHead: { paddingHorizontal: 20, marginBottom: 10, gap: 4 },
  kpiSectionTitle: { fontSize: 13, fontWeight: "800", letterSpacing: -0.2 },
  kpiSectionSub: { fontSize: 11, lineHeight: 15, color: C.muted },

  // Priority Alerts
  alertSection: { marginHorizontal: 20, marginBottom: 20, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, backgroundColor: "rgba(255,255,255,0.015)", gap: 8 },
  alertHeader: { gap: 2, marginBottom: 4 },
  alertSectionTitle: { fontSize: 15, fontWeight: "700" },
  alertSectionSub: { fontSize: 11, lineHeight: 15, color: C.muted },
  alertRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 10 },
  alertPulse: { width: 8, height: 8, borderRadius: 4 },
  alertLabel: { flex: 1, fontSize: 13, fontWeight: "500" },
  alertBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, minWidth: 36, alignItems: "center" },
  alertBadgeText: { fontSize: 14, fontWeight: "800" },

  // KPI Grid
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20, marginBottom: 24 },
  kpiCard: { width: "47%", borderRadius: 12, borderWidth: 1, padding: 14, gap: 2 },
  kpiTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  kpiDot: { width: 6, height: 6, borderRadius: 3 },
  kpiLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  kpiValue: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5, lineHeight: 30 },
  kpiDesc: { fontSize: 10, lineHeight: 14, marginTop: 2 },

  // Charts
  chartsSection: { paddingHorizontal: 20, gap: 16, marginBottom: 24 },
  chartPanel: { borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, backgroundColor: "rgba(255,255,255,0.015)" },
  chartTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
  chartSub: { fontSize: 11, lineHeight: 15, color: C.muted, marginBottom: 12 },
  chartBody: { alignItems: "center" },

  // Activity feed
  activitySection: { marginHorizontal: 20, marginBottom: 24, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, backgroundColor: "rgba(255,255,255,0.015)" },
  activityFeedLink: { paddingVertical: 4, paddingHorizontal: 8 },
  actDayLabel: { fontSize: 10, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  actRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 7 },
  actDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  actAction: { fontSize: 12, fontWeight: "700" },
  actDetails: { fontSize: 11, lineHeight: 15, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  actMeta: { fontSize: 10, color: C.muted, marginTop: 2 },

  // Tables
  tableHeader: { flexDirection: "row", paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1, gap: 6 },
  thCell: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  thWide: { flex: 2 },
  thMedium: { flex: 1 },
  thSmall: { width: 44 },

  tableList: { flex: 1 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 6 },
  tdWide: { flex: 2 },
  tdMedium: { flex: 1 },
  tdSmall: { width: 44 },

  cellPrimary: { fontSize: 13, fontWeight: "600" },
  cellSecondary: { fontSize: 11 },

  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },

  destructiveBtn: { backgroundColor: C.redBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: C.redBorder, alignItems: "center" },
  destructiveBtnText: { color: C.red, fontSize: 11, fontWeight: "700" },

  positiveBtn: { backgroundColor: C.greenBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: C.greenBorder, alignItems: "center" },
  positiveBtnText: { color: C.green, fontSize: 11, fontWeight: "700" },

  emptyState: { paddingVertical: 40, alignItems: "center" },
  emptyText: { color: C.muted, fontSize: 13, fontStyle: "italic" },
});
