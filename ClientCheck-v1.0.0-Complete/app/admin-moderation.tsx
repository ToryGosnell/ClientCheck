import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { getModerationUi } from "@/shared/review-moderation-labels";
import { DisputeThreadView } from "@/components/dispute-thread-view";

function fmtTime(d: Date | string | number | null | undefined) {
  if (d == null) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

export default function AdminModerationScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<"disputes" | "reviews" | "verification">("disputes");
  const [threadDisputeId, setThreadDisputeId] = useState<number | null>(null);

  useEffect(() => {
    if (user && !isAdmin) {
      router.back();
    }
  }, [user, isAdmin, router]);

  const disputesQ = trpc.admin.listDisputes.useQuery(
    { status: "", limit: 50, offset: 0 },
    { enabled: !!user && isAdmin && activeTab === "disputes" },
  );
  const pendingQ = trpc.moderation.getPendingReviews.useQuery(undefined, {
    enabled: !!user && isAdmin && activeTab === "reviews",
  });
  const flaggedQ = trpc.moderation.getFlaggedReviewsQueue.useQuery(undefined, {
    enabled: !!user && isAdmin && activeTab === "reviews",
  });
  const flagsQ = trpc.admin.listFlagRequests.useQuery(
    { limit: 40 },
    { enabled: !!user && isAdmin && activeTab === "reviews" },
  );

  const loading =
    (activeTab === "disputes" && disputesQ.isLoading) ||
    (activeTab === "reviews" && (pendingQ.isLoading || flaggedQ.isLoading || flagsQ.isLoading));

  const emptyDisputes = !disputesQ.data?.length;
  const emptyReviews =
    !(pendingQ.data?.length || flaggedQ.data?.length || flagsQ.data?.length);

  const tabStyle = useMemo(
    () => ({
      activeBg: colors.primary,
      inactiveBg: colors.surface,
      activeText: "#fff",
      inactiveText: colors.foreground,
    }),
    [colors],
  );

  if (!user) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      </ScreenContainer>
    );
  }

  if (!isAdmin) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <Text style={{ color: colors.muted }}>Admin access required.</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Admin moderation</Text>
          <Text style={[styles.sub, { color: colors.muted }]}>
            Flagged reviews, evaluation queue, and open disputes — triage without leaving this screen.
          </Text>
        </View>

        <View style={[styles.tabsContainer, { borderBottomColor: colors.border }]}>
          {(
            [
              ["disputes", "Disputes"],
              ["reviews", "Reviews & flags"],
              ["verification", "Verification"],
            ] as const
          ).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveTab(key)}
              style={[
                styles.tab,
                { backgroundColor: activeTab === key ? tabStyle.activeBg : tabStyle.inactiveBg },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === key ? tabStyle.activeText : tabStyle.inactiveText },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator />
          </View>
        ) : (
          <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 32 }}>
            {activeTab === "disputes" && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Open disputes</Text>
                {emptyDisputes ? (
                  <Text style={[styles.emptyText, { color: colors.muted }]}>No disputes in queue.</Text>
                ) : (
                  disputesQ.data!.map((d) => (
                    <View
                      key={d.id}
                      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>Dispute #{d.id}</Text>
                      <Text style={[styles.meta, { color: colors.muted }]}>
                        Review #{d.reviewId} · Customer #{d.customerId}
                      </Text>
                      <View style={styles.badgeRow}>
                        <View style={[styles.badge, { backgroundColor: colors.primary + "22" }]}>
                          <Text style={[styles.badgeText, { color: colors.primary }]}>{d.status}</Text>
                        </View>
                      </View>
                      <Text style={[styles.meta, { color: colors.muted }]}>Filed {fmtTime(d.createdAt)}</Text>
                      <TouchableOpacity
                        onPress={() => setThreadDisputeId(d.id)}
                        style={[styles.linkBtn, { borderColor: colors.primary }]}
                      >
                        <Text style={[styles.linkBtnText, { color: colors.primary }]}>Open thread</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </>
            )}

            {activeTab === "reviews" && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Non-active review statuses
                </Text>
                <Text style={[styles.hint, { color: colors.muted }]}>
                  hidden_flagged, under_investigation, removed — deep link to review for context.
                </Text>
                {!(flaggedQ.data?.length) ? (
                  <Text style={[styles.emptyText, { color: colors.muted }]}>
                    No reviews in flagged / investigation / removed queue.
                  </Text>
                ) : (
                  flaggedQ.data!.map((r) => {
                    const ui = getModerationUi(r.moderationStatus ?? undefined);
                    return (
                      <View
                        key={r.id}
                        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      >
                        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Review #{r.id}</Text>
                        <View style={styles.badgeRow}>
                          <View style={[styles.badge, { backgroundColor: ui.bg }]}>
                            <Text style={[styles.badgeText, { color: ui.accent }]}>{ui.label}</Text>
                          </View>
                        </View>
                        <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={2}>
                          {(r.reviewText || "").slice(0, 160)}
                          {(r.reviewText?.length ?? 0) > 160 ? "…" : ""}
                        </Text>
                        <Text style={[styles.meta, { color: colors.muted }]}>
                          Customer #{r.customerId} · ★{r.overallRating ?? "—"} · Hidden {fmtTime(r.hiddenAt)}
                        </Text>
                        <TouchableOpacity
                          onPress={() => router.push(`/review/${r.id}` as never)}
                          style={[styles.linkBtn, { borderColor: colors.primary }]}
                        >
                          <Text style={[styles.linkBtnText, { color: colors.primary }]}>Open review</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}

                <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>
                  Pending moderation records
                </Text>
                {!(pendingQ.data?.length) ? (
                  <Text style={[styles.emptyText, { color: colors.muted }]}>No pending moderation rows.</Text>
                ) : (
                  pendingQ.data!.map((m) => (
                    <View
                      key={m.id}
                      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                        Moderation #{m.id} · Review #{m.reviewId}
                      </Text>
                      <View style={styles.badgeRow}>
                        <View style={[styles.badge, { backgroundColor: "#f59e0b22" }]}>
                          <Text style={[styles.badgeText, { color: "#f59e0b" }]}>{m.status}</Text>
                        </View>
                      </View>
                      {m.reason ? (
                        <Text style={[styles.meta, { color: colors.foreground }]} numberOfLines={4}>
                          {m.reason}
                        </Text>
                      ) : null}
                      <Text style={[styles.meta, { color: colors.muted }]}>Queued {fmtTime(m.createdAt)}</Text>
                      <TouchableOpacity
                        onPress={() => router.push(`/review/${m.reviewId}` as never)}
                        style={[styles.linkBtn, { borderColor: colors.primary }]}
                      >
                        <Text style={[styles.linkBtnText, { color: colors.primary }]}>Open review</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}

                <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>
                  Recent evaluation requests (flags)
                </Text>
                {!(flagsQ.data?.length) ? (
                  <Text style={[styles.emptyText, { color: colors.muted }]}>No flag requests yet.</Text>
                ) : (
                  flagsQ.data!.map((f) => (
                    <View
                      key={f.id}
                      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                        Flag #{f.id} · Review #{f.reviewId}
                      </Text>
                      <Text style={[styles.meta, { color: colors.muted }]} numberOfLines={3}>
                        {f.reason} — {(f.details ?? "").slice(0, 120)}
                      </Text>
                      <Text style={[styles.meta, { color: colors.muted }]}>Submitted {fmtTime(f.createdAt)}</Text>
                      <TouchableOpacity
                        onPress={() => router.push(`/review/${f.reviewId}` as never)}
                        style={[styles.linkBtn, { borderColor: colors.primary }]}
                      >
                        <Text style={[styles.linkBtnText, { color: colors.primary }]}>Open review</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}

                {emptyReviews && (
                  <Text style={[styles.emptyText, { color: colors.muted, marginTop: 8 }]}>
                    All review moderation queues are clear.
                  </Text>
                )}
              </>
            )}

            {activeTab === "verification" && (
              <View style={{ gap: 12 }}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Verification</Text>
                <Text style={[styles.hint, { color: colors.muted }]}>
                  Contractor verification lives in the dedicated admin verification screen.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/admin-verification" as never)}
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.primaryBtnText}>Open verification queue</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <Modal visible={threadDisputeId != null} animationType="slide" onRequestClose={() => setThreadDisputeId(null)}>
        <View style={[styles.modalShell, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Dispute thread</Text>
            <Pressable onPress={() => setThreadDisputeId(null)} hitSlop={12}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>Close</Text>
            </Pressable>
          </View>
          {threadDisputeId != null ? (
            <DisputeThreadView disputeId={threadDisputeId} isAdmin />
          ) : null}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  header: { paddingHorizontal: 16, paddingVertical: 12, gap: 6 },
  title: { fontSize: 22, fontWeight: "700" },
  sub: { fontSize: 13, lineHeight: 18 },
  tabsContainer: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 8, gap: 6, paddingBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabText: { fontSize: 12, fontWeight: "700" },
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  hint: { fontSize: 12, lineHeight: 17, marginBottom: 12 },
  emptyText: { fontSize: 14, textAlign: "center", marginTop: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  meta: { fontSize: 12, lineHeight: 17 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: "800", textTransform: "capitalize" },
  linkBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  linkBtnText: { fontSize: 13, fontWeight: "700" },
  primaryBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  modalShell: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: "700" },
});
