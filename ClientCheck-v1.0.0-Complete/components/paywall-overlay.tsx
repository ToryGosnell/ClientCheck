import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

interface Props {
  customerName: string;
  score?: number;
  reviewCount: number;
}

export function PaywallOverlay({ customerName, score, reviewCount }: Props) {
  const router = useRouter();
  const goUnlock = () => router.push("/select-account" as never);

  return (
    <View style={st.container}>
      {/* Blurred preview hint */}
      <View style={st.blurredPreview}>
        <View style={st.blurredRow}>
          <View style={st.blurredBar} />
          <View style={[st.blurredBar, { width: "40%" }]} />
        </View>
        <View style={st.blurredRow}>
          <View style={[st.blurredBar, { width: "60%" }]} />
          <View style={[st.blurredBar, { width: "25%" }]} />
        </View>
        <View style={st.blurredRow}>
          <View style={[st.blurredBar, { width: "80%" }]} />
        </View>
      </View>

      {/* Overlay */}
      <View style={st.overlay}>
        <Text style={st.lockIcon}>🔒</Text>
        <Text style={st.previewHint}>Preview above · full intelligence is locked</Text>
        <Text style={st.title}>Unlock full contractor insights</Text>
        <Text style={st.sub}>
          You are seeing a preview for {customerName}. This profile has {reviewCount} verified contractor{" "}
          {reviewCount === 1 ? "review" : "reviews"}
          {score != null && score > 0 ? ` · risk index ${score}/100` : ""}.
        </Text>
        <Text style={st.detail}>
          Sign in for category scores, dispute history, payment patterns, and the full breakdown — the context you need
          before you commit to the job.
        </Text>
        <Text style={st.pricingLine}>
          Contractors: free tier with limited searches, or Pro ($19/mo or $149/yr) for unlimited search, risk scores,
          red flags, and alerts. Sign in to continue.
        </Text>
        <Pressable
          onPress={goUnlock}
          style={({ pressed }) => [st.cta, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        >
          <Text style={st.ctaText}>Unlock full report</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, overflow: "hidden", position: "relative" },

  blurredPreview: {
    padding: 20,
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  blurredRow: { flexDirection: "row", gap: 10 },
  blurredBar: {
    height: 14,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    width: "50%",
  },

  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  lockIcon: { fontSize: 32, marginBottom: 4 },
  previewHint: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "800", textAlign: "center", letterSpacing: -0.3 },
  sub: { color: "rgba(255,255,255,0.62)", fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 18 },
  detail: { color: "rgba(255,255,255,0.42)", fontSize: 11, textAlign: "center", marginTop: 8, lineHeight: 16 },
  pricingLine: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 15,
  },
  cta: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 14,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
