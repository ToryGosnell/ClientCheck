import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { DISPUTE_STATUSES } from "@/shared/roles";

interface Props {
  disputeId: number;
  isAdmin?: boolean;
}

const C = {
  muted: "rgba(255,255,255,0.45)",
  surface: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  green: "#10b981",
  red: "#ef4444",
  blue: "#3b82f6",
  yellow: "#f59e0b",
  purple: "#8b5cf6",
};

function StatusPill({ status }: { status: string }) {
  const s = DISPUTE_STATUSES[status as keyof typeof DISPUTE_STATUSES] ?? { label: status, color: C.muted };
  return (
    <View style={[st.statusPill, { backgroundColor: s.color + "18" }]}>
      <View style={[st.statusDot, { backgroundColor: s.color }]} />
      <Text style={[st.statusText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

function TimelineEntry({ entry }: { entry: any }) {
  const isSystem = entry.authorRole === "system";
  const isAdmin = entry.authorRole === "admin";
  const isCustomer = entry.authorRole === "customer";

  const bubbleColor = isSystem ? C.surface : isAdmin ? C.blue + "14" : C.green + "14";
  const borderColor = isSystem ? C.border : isAdmin ? C.blue + "30" : C.green + "30";
  const roleLabel = isSystem ? "System" : isAdmin ? "Admin" : "Customer";
  const roleColor = isSystem ? C.muted : isAdmin ? C.blue : C.green;

  return (
    <View style={st.timelineItem}>
      <View style={st.timelineLine}>
        <View style={[st.timelineDot, { backgroundColor: roleColor }]} />
      </View>
      <View style={[st.timelineBubble, { backgroundColor: bubbleColor, borderColor }]}>
        <View style={st.bubbleHeader}>
          <Text style={[st.roleTag, { color: roleColor }]}>{roleLabel}</Text>
          <Text style={st.timeText}>
            {new Date(entry.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </Text>
        </View>
        {entry.content && <Text style={st.bubbleContent}>{entry.content}</Text>}
        {entry.attachmentUrl && (
          <View style={st.attachmentTag}>
            <Text style={{ color: C.blue, fontSize: 11, fontWeight: "600" }}>📎 Attachment on file</Text>
            <Text style={st.attachmentUrl} numberOfLines={1}>
              {entry.attachmentUrl}
            </Text>
          </View>
        )}
        {entry.newStatus && <StatusPill status={entry.newStatus} />}
      </View>
    </View>
  );
}

function truncate(s: string, n: number) {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n)}…`;
}

export function DisputeThreadView({ disputeId, isAdmin: isAdminUser }: Props) {
  const colors = useColors();
  const { data: dispute, refetch: refetchDispute } = trpc.disputeThread.getDispute.useQuery({ disputeId });
  const reviewId = dispute?.reviewId;
  const { data: origReview, isLoading: loadingReview } = trpc.reviews.getById.useQuery(
    { id: reviewId ?? 0 },
    { enabled: !!reviewId },
  );
  const { data: timeline, isLoading, refetch: refetchTimeline } = trpc.disputeThread.getTimeline.useQuery({ disputeId });
  const addMessage = trpc.disputeThread.addMessage.useMutation({ onSuccess: () => refetchTimeline() });
  const updateStatus = trpc.disputeThread.updateStatus.useMutation({ onSuccess: () => { refetchDispute(); refetchTimeline(); } });

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (message.trim().length === 0 || sending) return;
    setSending(true);
    try {
      await addMessage.mutateAsync({ disputeId, content: message.trim() });
      setMessage("");
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: "under_review" | "awaiting_info" | "resolved" | "rejected") => {
    await updateStatus.mutateAsync({ disputeId, status });
  };

  if (isLoading || !dispute) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;
  }

  const isClosed = dispute.status === "resolved" || dispute.status === "rejected" || dispute.status === "dismissed";
  const reviewBody =
    origReview?.reviewText || (origReview as any)?.comment || null;
  const filedAt = new Date(dispute.createdAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const disputeSubmittedAt = dispute.respondedAt
    ? new Date(dispute.respondedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : filedAt;

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <View style={st.headerTop}>
          <Text style={st.headerTitle}>Dispute #{dispute.id}</Text>
          <StatusPill status={dispute.status} />
        </View>
        <Text style={st.headerSub}>Filed {filedAt} · Review #{dispute.reviewId}</Text>

        {loadingReview && !origReview ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
        ) : origReview ? (
          <View style={st.originalReviewCard}>
            <Text style={st.originalReviewKicker}>Original review</Text>
            <Text style={st.originalReviewMeta}>
              {(origReview as any).contractorName ?? "Contractor"} ·{" "}
              {new Date(origReview.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
            <Text style={st.originalReviewStars}>Overall {origReview.overallRating}/5</Text>
            {reviewBody ? (
              <Text style={st.originalReviewBody}>"{truncate(reviewBody, 420)}"</Text>
            ) : (
              <Text style={[st.originalReviewBody, { color: C.muted, fontStyle: "italic" }]}>No written text on file.</Text>
            )}
          </View>
        ) : null}

        {dispute.customerResponse && (
          <View style={st.originalDispute}>
            <Text style={st.odLabel}>Customer dispute</Text>
            <Text style={st.odText}>{dispute.customerResponse}</Text>
            <Text style={st.odTime}>Submitted {disputeSubmittedAt}</Text>
          </View>
        )}
      </View>

      {/* Timeline */}
      <ScrollView style={st.threadScroll} contentContainerStyle={st.threadContent} showsVerticalScrollIndicator={false}>
        {(timeline ?? []).length === 0 ? (
          <Text style={{ color: C.muted, fontSize: 12, fontStyle: "italic", textAlign: "center", paddingVertical: 20 }}>
            No activity yet. Start the conversation below.
          </Text>
        ) : (
          (timeline ?? []).map((entry: any) => <TimelineEntry key={entry.id} entry={entry} />)
        )}
      </ScrollView>

      {/* Admin actions */}
      {isAdminUser && !isClosed && (
        <View style={st.adminActions}>
          <Text style={st.adminLabel}>Admin Actions</Text>
          <View style={st.adminRow}>
            {dispute.status !== "under_review" && (
              <Pressable onPress={() => handleStatusChange("under_review")} style={[st.actionBtn, { backgroundColor: C.blue + "14", borderColor: C.blue + "30" }]}>
                <Text style={{ color: C.blue, fontSize: 11, fontWeight: "700" }}>Review</Text>
              </Pressable>
            )}
            <Pressable onPress={() => handleStatusChange("awaiting_info")} style={[st.actionBtn, { backgroundColor: C.purple + "14", borderColor: C.purple + "30" }]}>
              <Text style={{ color: C.purple, fontSize: 11, fontWeight: "700" }}>Request Info</Text>
            </Pressable>
            <Pressable onPress={() => handleStatusChange("resolved")} style={[st.actionBtn, { backgroundColor: C.green + "14", borderColor: C.green + "30" }]}>
              <Text style={{ color: C.green, fontSize: 11, fontWeight: "700" }}>Resolve</Text>
            </Pressable>
            <Pressable onPress={() => handleStatusChange("rejected")} style={[st.actionBtn, { backgroundColor: C.red + "14", borderColor: C.red + "30" }]}>
              <Text style={{ color: C.red, fontSize: 11, fontWeight: "700" }}>Reject</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Compose */}
      {!isClosed && (
        <View style={st.compose}>
          <TextInput
            style={st.composeInput}
            placeholder="Type a message..."
            placeholderTextColor={C.muted}
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <Pressable
            onPress={handleSend}
            disabled={message.trim().length === 0 || sending}
            style={[st.sendBtn, { backgroundColor: message.trim().length > 0 ? colors.primary : C.surface }]}
          >
            {sending ? <ActivityIndicator color="#fff" size="small" /> : (
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Send</Text>
            )}
          </Pressable>
        </View>
      )}

      {isClosed && (
        <View style={st.closedBanner}>
          <Text style={{ color: C.muted, fontSize: 12, fontWeight: "600" }}>
            This dispute has been {dispute.status === "resolved" ? "resolved" : "rejected"}.
          </Text>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },

  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border, gap: 6 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 11, color: C.muted },

  originalReviewCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(59,130,246,0.08)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
    gap: 6,
  },
  originalReviewKicker: { fontSize: 10, fontWeight: "800", color: C.blue, textTransform: "uppercase", letterSpacing: 0.6 },
  originalReviewMeta: { fontSize: 11, color: C.muted, fontWeight: "600" },
  originalReviewStars: { fontSize: 12, fontWeight: "800", color: "#fff" },
  originalReviewBody: { fontSize: 13, lineHeight: 19, color: "rgba(255,255,255,0.88)" },

  originalDispute: { marginTop: 8, padding: 12, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  odLabel: { fontSize: 10, fontWeight: "800", color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  odText: { fontSize: 13, lineHeight: 18, color: "#fff" },
  odTime: { fontSize: 10, color: C.muted, marginTop: 6 },

  statusPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },

  threadScroll: { flex: 1 },
  threadContent: { padding: 16, gap: 0 },

  timelineItem: { flexDirection: "row", gap: 10, marginBottom: 12 },
  timelineLine: { alignItems: "center", width: 20, paddingTop: 4 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineBubble: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  bubbleHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  roleTag: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  timeText: { fontSize: 9, color: C.muted },
  bubbleContent: { fontSize: 13, lineHeight: 18, color: "#fff" },
  attachmentTag: { backgroundColor: C.blue + "10", paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, alignSelf: "stretch", gap: 2 },
  attachmentUrl: { fontSize: 10, color: C.muted },

  adminActions: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border, gap: 6 },
  adminLabel: { fontSize: 10, fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  adminRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },

  compose: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
  composeInput: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: "#fff", fontSize: 13, maxHeight: 80, backgroundColor: C.surface },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },

  closedBanner: { paddingVertical: 12, alignItems: "center", borderTopWidth: 1, borderTopColor: C.border },
});
