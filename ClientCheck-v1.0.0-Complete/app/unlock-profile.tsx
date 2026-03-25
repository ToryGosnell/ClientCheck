import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenBackground } from "@/components/screen-background";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { track } from "@/lib/analytics";

export default function UnlockProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, loading } = useAuth();
  const { name, rating, risk } = useLocalSearchParams<{ name?: string; rating?: string; risk?: string }>();

  useEffect(() => {
    if (loading) return;
    if (user?.role === "admin") {
      router.replace("/(tabs)" as never);
    }
  }, [loading, user?.role, router]);

  useEffect(() => {
    track("paywall_viewed", { surface: "unlock" });
  }, []);

  return (
    <ScreenBackground backgroundKey="auth">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← Back</Text>
        </Pressable>

        <View style={s.lockIcon}><Text style={{ fontSize: 56 }}>🔒</Text></View>

        <Text style={s.title}>See the full risk picture</Text>
        {name && <Text style={s.customerName}>{name}</Text>}

        <View style={s.previewRow}>
          {rating && (
            <View style={s.previewChip}>
              <Text style={s.previewChipText}>⭐ {rating}</Text>
            </View>
          )}
          {risk && (
            <View style={[s.previewChip, {
              backgroundColor: risk === "high" ? "#DC262618" : risk === "medium" ? "#F59E0B18" : "#16A34A18"
            }]}>
              <Text style={[s.previewChipText, {
                color: risk === "high" ? "#DC2626" : risk === "medium" ? "#F59E0B" : "#16A34A"
              }]}>
                {risk === "high" ? "🔴 High Risk" : risk === "medium" ? "🟡 Caution" : "🟢 Low Risk"}
              </Text>
            </View>
          )}
        </View>

        <Text style={s.subtitle}>
          You already saw a preview. Unlock the same intelligence contractors use for informed job decisions:
        </Text>

        <View style={s.benefitsList}>
          {[
            { icon: "📋", text: "Full reviews and written context from verified contractors" },
            { icon: "💰", text: "Payment and reliability signals" },
            { icon: "🚩", text: "Flags and dispute visibility (with customer access to respond)" },
            { icon: "✅", text: "Positive signals, not just warnings" },
            { icon: "📊", text: "Detailed risk score breakdown" },
            { icon: "🛡️", text: "Transparent, moderated reporting — not a blacklist" },
          ].map((b, i) => (
            <View key={i} style={s.benefitRow}>
              <Text style={s.benefitIcon}>{b.icon}</Text>
              <Text style={s.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        <View style={s.divider} />

        <Text style={s.optionHeader}>For Contractors</Text>

        <Pressable
          onPress={() => router.push("/select-account" as never)}
          style={({ pressed }) => [s.optionCard, s.optionPrimary, pressed && { opacity: 0.85 }]}
        >
          <View style={s.optionBadge}><Text style={s.optionBadgeText}>Recommended</Text></View>
          <Text style={s.optionIcon}>🛡️</Text>
          <Text style={s.optionTitle}>Contractor · verify license</Text>
          <Text style={s.optionDesc}>Free tier with limited searches; Pro $19/mo or $149/yr — no card to start free tier</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/contractor-paywall" as never)}
          style={({ pressed }) => [s.optionCard, s.optionSecondary, pressed && { opacity: 0.85 }]}
        >
          <Text style={s.optionIcon}>💳</Text>
          <Text style={s.optionTitle}>Contractor · continue without license</Text>
          <Text style={s.optionDesc}>Paid Pro path when you want unlimited search and full risk tools without license verification</Text>
        </Pressable>

        <View style={[s.divider, { marginTop: 24 }]} />

        <Text style={s.optionHeader}>For Customers</Text>

        <Pressable
          onPress={() => router.push({ pathname: "/select-account", params: { preset: "customer" } } as never)}
          style={({ pressed }) => [s.optionCard, s.optionSecondary, pressed && { opacity: 0.85 }]}
        >
          <Text style={s.optionIcon}>👤</Text>
          <Text style={s.optionTitle}>Customer · free account</Text>
          <Text style={s.optionDesc}>
            Sign in for a free account: your profile, your reviews, responses, and disputes. Optional identity badge is
            available later from billing — never required for core access.
          </Text>
        </Pressable>

        <Text style={s.footerNote}>
          Preview stays free · Contractors unlock full insights; customers use a free account (optional badge add-on only)
        </Text>
      </ScrollView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 20, paddingBottom: 60 },
  back: { marginBottom: 16 },
  backText: { color: "rgba(255,255,255,0.6)", fontSize: 16 },
  lockIcon: { alignSelf: "center", marginBottom: 16 },
  title: { color: "#fff", fontSize: 26, fontWeight: "900", textAlign: "center", marginBottom: 8 },
  customerName: { color: "rgba(255,255,255,0.7)", fontSize: 16, textAlign: "center", marginBottom: 12 },
  previewRow: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 20 },
  previewChip: { backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  previewChipText: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" },
  subtitle: { color: "rgba(255,255,255,0.6)", fontSize: 15, textAlign: "center", marginBottom: 20, lineHeight: 22 },
  benefitsList: { gap: 12, marginBottom: 24 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  benefitIcon: { fontSize: 20, width: 28, textAlign: "center" },
  benefitText: { color: "#fff", fontSize: 15, flex: 1 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 16 },
  optionHeader: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  optionCard: { borderRadius: 14, padding: 18, marginBottom: 12, borderWidth: 1 },
  optionPrimary: { backgroundColor: "rgba(59,130,246,0.12)", borderColor: "rgba(59,130,246,0.3)" },
  optionSecondary: { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" },
  optionBadge: { backgroundColor: "#3B82F6", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start", marginBottom: 10 },
  optionBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  optionIcon: { fontSize: 28, marginBottom: 8 },
  optionTitle: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 4 },
  optionDesc: { color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 18 },
  footerNote: { color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center", marginTop: 20 },
});
