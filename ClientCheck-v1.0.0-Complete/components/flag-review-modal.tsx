import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { DISPUTE_REASONS } from "@/shared/roles";

interface Props {
  visible: boolean;
  reviewId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

const C = {
  green: "#10b981",
  red: "#ef4444",
  muted: "rgba(255,255,255,0.45)",
  surface: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
};

export function FlagReviewModal({ visible, reviewId, onClose, onSuccess }: Props) {
  const colors = useColors();
  const router = useRouter();
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [legalScrolledTerms, setLegalScrolledTerms] = useState(false);
  const [legalScrolledPrivacy, setLegalScrolledPrivacy] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const flagMutation = trpc.reviewFlags.submit.useMutation();

  const photoOk = photoUrl.trim().length === 0 || /^https?:\/\//i.test(photoUrl.trim());
  const canSubmit =
    reason.length > 0 &&
    legalAccepted &&
    legalScrolledTerms &&
    legalScrolledPrivacy &&
    photoOk &&
    !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await flagMutation.mutateAsync({
        reviewId,
        reason: reason as any,
        details: details.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
        legalAccepted: true,
      });
      setShowSuccess(true);
      onSuccess?.();
    } catch (err) {
      console.error("[FlagReview] Submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, reviewId, reason, details, photoUrl, flagMutation, onSuccess]);

  const handleClose = useCallback(() => {
    setReason("");
    setDetails("");
    setPhotoUrl("");
    setLegalAccepted(false);
    setLegalScrolledTerms(false);
    setLegalScrolledPrivacy(false);
    setShowSuccess(false);
    setSubmitting(false);
    onClose();
  }, [onClose]);

  const openTerms = () => router.push("/terms-of-service" as never);
  const openPrivacy = () => router.push("/privacy-policy" as never);

  if (showSuccess) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={st.overlay}>
          <View style={[st.modal, { backgroundColor: "#111" }]}>
            <View style={st.successContent}>
              <View style={st.successIcon}><Text style={{ fontSize: 40 }}>✓</Text></View>
              <Text style={st.successTitle}>Request received</Text>
              <Text style={st.successDesc}>
                Thanks — your request for review evaluation is in the queue. The review is temporarily hidden while our team
                applies a fair, consistent process. You will be notified of the outcome.
              </Text>
              <Pressable onPress={handleClose} style={[st.submitBtn, { backgroundColor: colors.primary }]}>
                <Text style={st.submitBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={st.overlay}>
        <View style={[st.modal, { backgroundColor: "#111" }]}>
          <View style={st.modalHeader}>
            <View style={{ flex: 1 }} />
            <Pressable onPress={handleClose} hitSlop={12} accessibilityLabel="Close">
              <Text style={st.closeX}>✕</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={st.title}>Request Review Evaluation</Text>
            <Text style={st.subtext}>
              Ask our team to evaluate this review for accuracy and policy compliance. False or abusive requests may affect your
              account. Your submission is logged for audit.
            </Text>

            <View style={st.linkRow}>
              <Pressable onPress={openTerms} style={st.linkChip}>
                <Text style={[st.linkChipText, { color: colors.primary }]}>Terms of Service</Text>
              </Pressable>
              <Pressable onPress={openPrivacy} style={st.linkChip}>
                <Text style={[st.linkChipText, { color: colors.primary }]}>Privacy Policy</Text>
              </Pressable>
            </View>

            <Text style={st.label}>Reason (required)</Text>
            <View style={st.reasonList}>
              {DISPUTE_REASONS.map((r) => (
                <Pressable
                  key={r.value}
                  onPress={() => setReason(r.value)}
                  style={[
                    st.reasonItem,
                    reason === r.value && { borderColor: colors.primary, backgroundColor: colors.primary + "14" },
                  ]}
                >
                  <View style={[st.radioOuter, reason === r.value && { borderColor: colors.primary }]}>
                    {reason === r.value && <View style={[st.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text style={[st.reasonText, { color: "#fff" }]}>{r.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={st.label}>Details</Text>
            <Text style={st.fieldHint}>What should moderators verify? Be specific and factual.</Text>
            <TextInput
              style={st.textarea}
              placeholder="Add context, dates, or references (optional but helpful)…"
              placeholderTextColor={C.muted}
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={st.label}>Supporting photo (optional)</Text>
            <Text style={st.fieldHint}>Paste a secure link to an image (e.g. cloud storage). No new uploads in this step.</Text>
            <TextInput
              style={st.photoInput}
              placeholder="https://…"
              placeholderTextColor={C.muted}
              value={photoUrl}
              onChangeText={setPhotoUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!photoOk && <Text style={st.photoErr}>URL must start with http:// or https://</Text>}

            <View style={st.legalSection}>
              <Text style={st.legalTitle}>Required legal acceptance</Text>
              <Text style={[st.legalNote, { color: C.muted }]}>
                Scroll each summary below, then confirm. For the full documents, use the links above.
              </Text>

              <View style={st.legalDocBox}>
                <Text style={st.legalDocTitle}>Terms of Service — summary</Text>
                <ScrollView
                  style={st.legalScroll}
                  onScroll={({ nativeEvent }) => {
                    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 20) {
                      setLegalScrolledTerms(true);
                    }
                  }}
                  scrollEventThrottle={16}
                >
                  <Text style={st.legalBody}>
                    By submitting, you confirm your information is accurate to the best of your knowledge. Bad-faith requests may
                    lead to account action. ClientCheck may investigate, hide content during review, and issue a final moderation
                    decision. Outcomes are typically within several business days. Abuse of this flow may result in suspension.
                  </Text>
                </ScrollView>
                {legalScrolledTerms && <Text style={st.legalCheck}>✓ Read</Text>}
              </View>

              <View style={st.legalDocBox}>
                <Text style={st.legalDocTitle}>Privacy Policy — summary</Text>
                <ScrollView
                  style={st.legalScroll}
                  onScroll={({ nativeEvent }) => {
                    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 20) {
                      setLegalScrolledPrivacy(true);
                    }
                  }}
                  scrollEventThrottle={16}
                >
                  <Text style={st.legalBody}>
                    Your request and details are stored securely for moderation and legal compliance. We do not sell flag data.
                    Access is limited to authorized staff. Retention follows our Privacy Policy. Contact support for data questions.
                  </Text>
                </ScrollView>
                {legalScrolledPrivacy && <Text style={st.legalCheck}>✓ Read</Text>}
              </View>

              <Pressable
                onPress={() => {
                  if (legalScrolledTerms && legalScrolledPrivacy) setLegalAccepted(!legalAccepted);
                }}
                style={st.checkboxRow}
              >
                <View style={[
                  st.checkbox,
                  legalAccepted && { backgroundColor: colors.primary, borderColor: colors.primary },
                  !(legalScrolledTerms && legalScrolledPrivacy) && { opacity: 0.3 },
                ]}>
                  {legalAccepted && <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>✓</Text>}
                </View>
                <Text style={[st.checkboxLabel, !(legalScrolledTerms && legalScrolledPrivacy) && { opacity: 0.3 }]}>
                  I have read the summaries and agree to the Terms of Service and Privacy Policy.
                </Text>
              </Pressable>
            </View>

            <View style={st.btnRow}>
              <Pressable onPress={handleClose} style={({ pressed }) => [st.cancelBtn, pressed && { opacity: 0.6 }]}>
                <Text style={st.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={({ pressed }) => [
                  st.submitBtn,
                  { backgroundColor: canSubmit ? colors.primary : "rgba(255,255,255,0.08)" },
                  pressed && canSubmit && { opacity: 0.8 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[st.submitBtnText, !canSubmit && { opacity: 0.3 }]}>Submit evaluation request</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 20 },
  modal: { width: "100%", maxWidth: 520, maxHeight: "92%", borderRadius: 16, borderWidth: 1, borderColor: C.border },
  modalHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 12 },
  closeX: { color: C.muted, fontSize: 22, fontWeight: "300" },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 28, gap: 14 },

  title: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  subtext: { fontSize: 13, lineHeight: 19, color: C.muted },

  linkRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  linkChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  linkChipText: { fontSize: 12, fontWeight: "700" },

  label: { fontSize: 12, fontWeight: "700", color: "#fff", textTransform: "uppercase", letterSpacing: 0.5 },
  fieldHint: { fontSize: 11, color: C.muted, lineHeight: 15, marginTop: -6 },

  reasonList: { gap: 6 },
  reasonItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: C.border, gap: 10 },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.muted, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 8, height: 8, borderRadius: 4 },
  reasonText: { fontSize: 13, fontWeight: "500" },

  textarea: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, color: "#fff", fontSize: 13, minHeight: 88, backgroundColor: C.surface },
  photoInput: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, color: "#fff", fontSize: 13, backgroundColor: C.surface },
  photoErr: { color: C.red, fontSize: 11, fontWeight: "600" },

  legalSection: { gap: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 16 },
  legalTitle: { fontSize: 14, fontWeight: "700", color: "#fff" },
  legalNote: { fontSize: 11 },
  legalDocBox: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, gap: 4 },
  legalDocTitle: { fontSize: 12, fontWeight: "700", color: "#fff" },
  legalScroll: { maxHeight: 88 },
  legalBody: { fontSize: 11, lineHeight: 16, color: C.muted },
  legalCheck: { fontSize: 11, fontWeight: "700", color: "#10b981", marginTop: 4 },

  checkboxRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 4 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: C.muted, alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkboxLabel: { flex: 1, fontSize: 12, lineHeight: 17, color: "#fff" },

  btnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: "center" },
  cancelBtnText: { color: C.muted, fontSize: 14, fontWeight: "600" },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  successContent: { padding: 32, alignItems: "center", gap: 12 },
  successIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#10b98120", alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  successDesc: { fontSize: 13, lineHeight: 19, color: C.muted, textAlign: "center" },
});
