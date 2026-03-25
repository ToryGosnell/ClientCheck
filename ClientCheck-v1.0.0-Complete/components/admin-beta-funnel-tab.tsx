import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

const MUTED = "rgba(255,255,255,0.45)";
const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "rgba(255,255,255,0.04)";

const EVENT_LABELS: Record<string, string> = {
  search_performed: "Search performed",
  search_result_clicked: "Search result clicked",
  search_no_results: "Search — no results",
  customer_profile_viewed: "Customer profile viewed",
  customer_tracked: "Customer tracked (watch on)",
  alerts_viewed: "Alerts tab viewed",
  dispute_started: "Dispute started",
  dispute_submitted: "Dispute submitted",
  paywall_viewed: "Paywall viewed",
  subscription_started: "Subscription checkout started",
  payment_successful: "Payment successful",
};

const DAY_PRESETS = [7, 14, 30] as const;

function labelForEvent(key: string): string {
  return EVENT_LABELS[key] ?? key.replace(/_/g, " ");
}

export function AdminBetaFunnelTab() {
  const colors = useColors();
  const [days, setDays] = useState<number>(7);
  const { data, isLoading, refetch, isFetching, isError, error } = trpc.admin.betaFunnelAnalytics.useQuery({ days });

  const summaryText = useMemo(() => {
    if (!data) return "";
    if (!data.configured) return data.error ?? "Not configured.";
    if (data.error) return data.error;
    return "";
  }, [data]);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: colors.foreground }]}>Beta funnel (PostHog)</Text>
      <Text style={[styles.sub, { color: MUTED }]}>
        Event counts and simple ratios for the last N days. Requires server PostHog query credentials; does not change app
        behavior.
      </Text>

      <View style={styles.dayRow}>
        {DAY_PRESETS.map((d) => {
          const active = days === d;
          return (
            <Pressable
              key={d}
              onPress={() => setDays(d)}
              style={[
                styles.dayChip,
                { borderColor: active ? colors.primary + "66" : BORDER, backgroundColor: active ? colors.primary + "18" : SURFACE },
              ]}
            >
              <Text style={{ color: active ? colors.primary : MUTED, fontWeight: "700", fontSize: 13 }}>{d}d</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => refetch()}
          style={[styles.refresh, { borderColor: BORDER }]}
          disabled={isFetching}
        >
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>{isFetching ? "…" : "Refresh"}</Text>
        </Pressable>
      </View>

      {isError ? (
        <View style={[styles.warnBox, { borderColor: "rgba(239,68,68,0.35)", backgroundColor: "rgba(239,68,68,0.08)" }]}>
          <Text style={{ color: "#fca5a5", fontWeight: "700", marginBottom: 6 }}>Could not load beta funnel</Text>
          <Text style={{ color: MUTED, fontSize: 13, lineHeight: 20 }}>
            {error?.message ?? "Request failed. Check API connectivity and admin session."}
          </Text>
          <Pressable
            onPress={() => void refetch()}
            style={[styles.refresh, { borderColor: BORDER, alignSelf: "flex-start", marginTop: 12 }]}
          >
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {isLoading && !data ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : data ? (
        <>
          {!data.configured || data.error ? (
            <View style={[styles.warnBox, { borderColor: "rgba(245,158,11,0.35)", backgroundColor: "rgba(245,158,11,0.08)" }]}>
              <Text style={{ color: "#fcd34d", fontWeight: "700", marginBottom: 6 }}>Setup or query issue</Text>
              <Text style={{ color: MUTED, fontSize: 13, lineHeight: 20 }}>{summaryText}</Text>
            </View>
          ) : null}

          {data.configured && !data.error ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Rates</Text>
              <View style={styles.metricsRow}>
                <MetricCard
                  label="No-results rate"
                  value={data.noResultsRate != null ? `${data.noResultsRate}%` : "—"}
                  hint="search_no_results ÷ search_performed"
                  colors={colors}
                />
                <MetricCard
                  label="Track after profile"
                  value={data.trackAfterProfilePct != null ? `${data.trackAfterProfilePct}%` : "—"}
                  hint="customer_tracked ÷ customer_profile_viewed"
                  colors={colors}
                />
                <MetricCard
                  label="Pay after sub start"
                  value={data.paymentAfterSubPct != null ? `${data.paymentAfterSubPct}%` : "—"}
                  hint="payment_successful ÷ subscription_started"
                  colors={colors}
                />
              </View>

              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Profile views by source (?from)</Text>
              <View style={[styles.card, { borderColor: BORDER }]}>
                {data.profileSources.length === 0 ? (
                  <Text style={{ color: MUTED, fontSize: 13 }}>No profile views in this window.</Text>
                ) : (
                  data.profileSources.map((row) => (
                    <View key={row.source} style={styles.sourceRow}>
                      <Text style={{ color: colors.foreground, fontSize: 14, flex: 1 }}>{row.source}</Text>
                      <Text style={{ color: MUTED, fontSize: 14 }}>{row.count.toLocaleString()}</Text>
                    </View>
                  ))
                )}
              </View>

              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Funnel (volume + drop vs prior row)</Text>
              <Text style={[styles.hint, { color: MUTED }]}>
                Rows are ordered for readability; later steps can exceed earlier ones (e.g. alerts without search).
              </Text>
              <View style={[styles.card, { borderColor: BORDER }]}>
                {data.funnel.map((step, idx) => (
                  <View key={step.event} style={[styles.funnelRow, idx > 0 && styles.funnelRowBorder]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
                        {labelForEvent(step.event)}
                      </Text>
                      <Text style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{step.event}</Text>
                    </View>
                    <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "800" }}>{step.count.toLocaleString()}</Text>
                    <View style={{ width: 88, alignItems: "flex-end" }}>
                      <Text style={{ color: MUTED, fontSize: 12 }}>
                        {step.dropOffFromPriorPct == null
                          ? "—"
                          : step.dropOffFromPriorPct < 0
                            ? `↑ ${Math.abs(step.dropOffFromPriorPct)}%`
                            : `${step.dropOffFromPriorPct}% drop`}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Raw counts (all tracked events)</Text>
              <View style={[styles.card, { borderColor: BORDER }]}>
                {Object.entries(data.counts)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([k, v]) => (
                    <View key={k} style={styles.sourceRow}>
                      <Text style={{ color: MUTED, fontSize: 12, flex: 1 }}>{k}</Text>
                      <Text style={{ color: colors.foreground, fontSize: 14 }}>{Number(v).toLocaleString()}</Text>
                    </View>
                  ))}
              </View>

              {data.queryHost ? (
                <Text style={[styles.footer, { color: MUTED }]}>Query host: {data.queryHost}</Text>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

function MetricCard({
  label,
  value,
  hint,
  colors,
}: {
  label: string;
  value: string;
  hint: string;
  colors: any;
}) {
  return (
    <View style={[styles.metricCard, { borderColor: BORDER, backgroundColor: SURFACE }]}>
      <Text style={{ color: MUTED, fontSize: 11, marginBottom: 4 }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: MUTED, fontSize: 10, marginTop: 6, lineHeight: 14 }}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 48, paddingHorizontal: 4, gap: 16 },
  title: { fontSize: 22, fontWeight: "800" },
  sub: { fontSize: 13, lineHeight: 20 },
  dayRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  dayChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  refresh: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginLeft: "auto" },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginTop: 8 },
  hint: { fontSize: 12, lineHeight: 18, marginTop: -8 },
  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: { flexGrow: 1, minWidth: 140, borderWidth: 1, borderRadius: 12, padding: 12 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 0 },
  sourceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  funnelRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  funnelRowBorder: { borderTopWidth: 1, borderTopColor: BORDER },
  warnBox: { borderWidth: 1, borderRadius: 12, padding: 14 },
  footer: { fontSize: 11, marginTop: 8 },
});
