import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { TRUST_LABEL } from "@/shared/trust-labels";

interface Props {
  reviewId: number;
  currentUserId?: number;
}

const C = {
  muted: "rgba(255,255,255,0.45)",
  surface: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
};

export function CustomerResponseSection({ reviewId, currentUserId }: Props) {
  const colors = useColors();
  const { data: response, isLoading, refetch } = trpc.customerResponse.get.useQuery({ reviewId });
  const upsertMutation = trpc.customerResponse.upsert.useMutation({ onSuccess: () => refetch() });

  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />;

  const isOwner = response && currentUserId && response.customerUserId === currentUserId;
  const updated =
    response &&
    response.updatedAt &&
    new Date(response.updatedAt).getTime() > new Date(response.createdAt).getTime() + 2000;

  const handleSubmit = async () => {
    if (text.trim().length < 10) return;
    setSubmitting(true);
    try {
      await upsertMutation.mutateAsync({ reviewId, responseText: text.trim() });
      setEditing(false);
      setText("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = () => {
    setText(response?.responseText ?? "");
    setEditing(true);
  };

  if (editing || (!response && currentUserId)) {
    if (!editing && !response) {
      return (
        <View style={st.wrap}>
          <Text style={[st.sectionTitle, { color: colors.foreground }]}>Customer response</Text>
          <Text style={[st.trustLine, { color: colors.muted }]}>
            Fairness: share your side on this {TRUST_LABEL.VERIFIED_REPORT.toLowerCase()}. Responses are public on this review.
          </Text>
          <Pressable onPress={() => setEditing(true)} style={[st.addBtn, { borderColor: C.border }]}>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "700" }}>+ Add response</Text>
          </Pressable>
        </View>
      );
    }

    if (editing) {
      return (
        <View style={st.wrap}>
          <Text style={[st.sectionTitle, { color: colors.foreground }]}>
            {response ? "Edit response" : "Add response"}
          </Text>
          <View style={[st.card, { borderColor: C.border }]}>
            <TextInput
              style={st.input}
              placeholder="Write your response (minimum 10 characters)…"
              placeholderTextColor={C.muted}
              value={text}
              onChangeText={setText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <View style={st.btnRow}>
              <Pressable
                onPress={() => {
                  setEditing(false);
                  setText("");
                }}
                style={st.cancelBtn}
              >
                <Text style={{ color: C.muted, fontSize: 13, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={text.trim().length < 10 || submitting}
                style={[st.saveBtn, { backgroundColor: text.trim().length >= 10 ? colors.primary : C.surface }]}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
                    {response ? "Save changes" : "Post response"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      );
    }
  }

  if (!response) return null;

  return (
    <View style={st.wrap}>
      <Text style={[st.sectionTitle, { color: colors.foreground }]}>Customer response</Text>
      <View style={[st.card, { borderColor: C.border }]}>
        <View style={st.cardHeader}>
          <View style={st.badge}>
            <Text style={st.badgeText}>Customer response</Text>
          </View>
          {isOwner && (
            <Pressable onPress={handleStartEdit} accessibilityLabel="Edit customer response">
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "700" }}>Edit</Text>
            </Pressable>
          )}
        </View>
        <Text style={st.responseText}>{response.responseText}</Text>
        <Text style={st.timestamp}>
          Posted{" "}
          {new Date(response.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          {updated
            ? ` · Updated ${new Date(response.updatedAt!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
            : ""}
        </Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginBottom: 16, gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  trustLine: { fontSize: 12, lineHeight: 17 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, backgroundColor: C.surface, gap: 10, marginTop: 4 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { backgroundColor: "#8b5cf622", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "#8b5cf644" },
  badgeText: { color: "#c4b5fd", fontSize: 11, fontWeight: "800" },
  responseText: { fontSize: 14, lineHeight: 21, color: "#fff" },
  timestamp: { fontSize: 11, color: C.muted, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    fontSize: 14,
    minHeight: 100,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  btnRow: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  addBtn: { borderWidth: 1, borderRadius: 12, borderStyle: "dashed", paddingVertical: 14, alignItems: "center", marginTop: 4 },
});
