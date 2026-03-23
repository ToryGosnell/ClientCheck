import { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { LegalDocumentContent, LEGAL_VERSION } from "@/components/legal-document-content";
import { trpc } from "@/lib/trpc";
import { track } from "@/lib/analytics";

type Tab = "terms" | "privacy";

export default function LegalAcceptanceScreen() {
  const router = useRouter();
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<Tab>("terms");
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const acceptMutation = trpc.legal.acceptTerms.useMutation();
  const canAccept = hasReadTerms && hasReadPrivacy;

  const handleTermsBottom = useCallback(() => setHasReadTerms(true), []);
  const handlePrivacyBottom = useCallback(() => setHasReadPrivacy(true), []);

  const handleAccept = async () => {
    if (!canAccept) return;
    setSubmitting(true);
    try {
      await acceptMutation.mutateAsync({ version: LEGAL_VERSION });
      track("legal_accepted");
      router.replace("/(tabs)");
    } catch {
      Alert.alert("Error", "Could not save your acceptance. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>Review & Accept</Text>
        <Text style={[s.headerSub, { color: colors.muted }]}>
          Please review both documents before continuing.
        </Text>
      </View>

      {/* Tabs */}
      <View style={[s.tabBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => setActiveTab("terms")}
          style={[s.tab, activeTab === "terms" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        >
          <Text style={[s.tabText, { color: activeTab === "terms" ? colors.primary : colors.muted }]}>
            Terms & Conditions
          </Text>
          {hasReadTerms && <Text style={s.checkMark}>✓</Text>}
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("privacy")}
          style={[s.tab, activeTab === "privacy" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        >
          <Text style={[s.tabText, { color: activeTab === "privacy" ? colors.primary : colors.muted }]}>
            Privacy Policy
          </Text>
          {hasReadPrivacy && <Text style={s.checkMark}>✓</Text>}
        </Pressable>
      </View>

      {/* Document content — we render both but only show the active one to preserve scroll state */}
      <View style={s.docContainer}>
        <View style={[s.docPane, activeTab !== "terms" && s.hidden]}>
          <LegalDocumentContent docType="terms" onReachedBottom={handleTermsBottom} />
        </View>
        <View style={[s.docPane, activeTab !== "privacy" && s.hidden]}>
          <LegalDocumentContent docType="privacy" onReachedBottom={handlePrivacyBottom} />
        </View>
      </View>

      {/* Scroll hint */}
      {((activeTab === "terms" && !hasReadTerms) || (activeTab === "privacy" && !hasReadPrivacy)) && (
        <View style={[s.scrollHint, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Text style={[s.scrollHintText, { color: colors.muted }]}>↓ Scroll to the bottom to continue</Text>
        </View>
      )}

      {/* Footer */}
      <View style={[s.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={s.statusRow}>
          <View style={s.statusItem}>
            <Text style={{ color: hasReadTerms ? "#22c55e" : colors.muted, fontSize: 14 }}>
              {hasReadTerms ? "✓" : "○"} Terms & Conditions
            </Text>
          </View>
          <View style={s.statusItem}>
            <Text style={{ color: hasReadPrivacy ? "#22c55e" : colors.muted, fontSize: 14 }}>
              {hasReadPrivacy ? "✓" : "○"} Privacy Policy
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleAccept}
          disabled={!canAccept || submitting}
          style={({ pressed }) => [
            s.acceptBtn,
            { backgroundColor: canAccept ? colors.primary : colors.primary + "33" },
            pressed && canAccept && { opacity: 0.85 },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[s.acceptBtnText, { opacity: canAccept ? 1 : 0.5 }]}>
              I Have Read and Accept
            </Text>
          )}
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 22, fontWeight: "800" },
  headerSub: { fontSize: 14, marginTop: 4 },

  tabBar: { flexDirection: "row", borderBottomWidth: 0.5 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14 },
  tabText: { fontSize: 14, fontWeight: "600" },
  checkMark: { color: "#22c55e", fontSize: 14, fontWeight: "700" },

  docContainer: { flex: 1, position: "relative" },
  docPane: { ...StyleSheet.absoluteFillObject },
  hidden: { opacity: 0, pointerEvents: "none" as const },

  scrollHint: { paddingVertical: 8, alignItems: "center", borderTopWidth: 0.5 },
  scrollHintText: { fontSize: 13 },

  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, borderTopWidth: 0.5, gap: 12 },
  statusRow: { flexDirection: "row", justifyContent: "center", gap: 24 },
  statusItem: {},
  acceptBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  acceptBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
