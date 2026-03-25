import { ScreenBackground } from "@/components/screen-background";
import { useColors } from "@/hooks/use-colors";
import { track } from "@/lib/analytics";
import { setPendingContractorInviteReferrer } from "@/lib/contractor-invite-pending";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function firstParam(v: string | string[] | undefined): string {
  if (v == null) return "";
  return Array.isArray(v) ? (typeof v[0] === "string" ? v[0] : "") : v;
}

export default function ContractorInviteLandingScreen() {
  const colors = useColors();
  const router = useRouter();
  const { ref: refParam } = useLocalSearchParams<{ ref?: string | string[] }>();

  const referrerId = useMemo(() => {
    const n = parseInt(firstParam(refParam), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [refParam]);

  useEffect(() => {
    track("referral_link_clicked", { surface: "invite_landing" });
  }, []);

  useEffect(() => {
    if (referrerId == null) return;
    void setPendingContractorInviteReferrer(referrerId);
  }, [referrerId]);

  const goSignup = () => {
    router.push({
      pathname: "/select-account",
      params: { preset: "contractor" },
    } as never);
  };

  return (
    <ScreenBackground backgroundKey="auth">
      <SafeAreaView style={styles.safe} edges={["top", "bottom", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.kicker, { color: colors.primary }]}>ClientCheck for contractors</Text>
          <Text style={[styles.headline, { color: colors.foreground }]}>
            Check customers before you take the job
          </Text>
          <Text style={[styles.sub, { color: colors.muted }]}>
            Join contractors who are avoiding bad customers. Used by contractors to avoid bad customers.
          </Text>
          <Text style={[styles.velocityLine, { color: colors.foreground }]}>
            Most contractors earn their first free month in under 7 days
          </Text>
          <View style={[styles.scarcityPill, { borderColor: `${colors.primary}55`, backgroundColor: `${colors.primary}12` }]}>
            <Text style={[styles.scarcityPillText, { color: colors.primary }]}>Limited early access period</Text>
          </View>
          <View style={[styles.statPill, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.statText, { color: colors.muted }]}>
              Join 100+ contractors already using this
            </Text>
          </View>
          <View style={[styles.leaderboardTeaser, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.leaderboardTeaserTitle, { color: colors.foreground }]}>Top Referrers</Text>
            <Text style={[styles.leaderboardTeaserSub, { color: colors.muted }]}>
              See which contractors are leading the community.
            </Text>
            <Text style={[styles.leaderboardTeaserHint, { color: colors.muted }]}>
              Open the app after you join to view rankings.
            </Text>
          </View>
          <Pressable
            onPress={goSignup}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.ctaText}>Start free</Text>
          </Pressable>
          <Pressable onPress={goSignup} style={({ pressed }) => [styles.secondaryCta, pressed && { opacity: 0.8 }]}>
            <Text style={[styles.secondaryCtaText, { color: colors.primary }]}>Create free account</Text>
          </Pressable>
          {referrerId == null ? (
            <Text style={[styles.hint, { color: colors.muted }]}>
              Have an invite link? Open it again with the full URL to connect with your referrer.
            </Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48, maxWidth: 520, alignSelf: "center", width: "100%" },
  kicker: { fontSize: 12, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 },
  headline: { fontSize: 30, fontWeight: "900", lineHeight: 36, marginBottom: 14 },
  sub: { fontSize: 16, lineHeight: 24, marginBottom: 16 },
  velocityLine: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    marginBottom: 14,
  },
  scarcityPill: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  scarcityPillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  statPill: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  statText: { fontSize: 14, textAlign: "center", fontWeight: "600" },
  leaderboardTeaser: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  leaderboardTeaserTitle: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  leaderboardTeaserSub: { fontSize: 14, lineHeight: 20, fontWeight: "500", marginBottom: 6 },
  leaderboardTeaserHint: { fontSize: 13, lineHeight: 18, fontWeight: "500", opacity: 0.9 },
  cta: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 12 },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  secondaryCta: { alignItems: "center", paddingVertical: 10 },
  secondaryCtaText: { fontSize: 15, fontWeight: "700" },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 20, textAlign: "center" },
});
