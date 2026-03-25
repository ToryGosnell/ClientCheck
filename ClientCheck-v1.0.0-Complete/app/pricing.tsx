import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenBackground } from "@/components/screen-background";
import { useColors } from "@/hooks/use-colors";
import { LegalFooter } from "@/components/legal-footer";
import {
  BILLING_COPY,
  CONTRACTOR_PRO_ANNUAL_PRICE_DISPLAY,
  CONTRACTOR_PRO_FEATURES,
  CONTRACTOR_PRO_MONTHLY_PRICE_DISPLAY,
  CUSTOMER_NO_SUBSCRIPTION_REQUIRED_LINE,
  CUSTOMER_OPTIONAL_MONITORING_LABEL,
  CUSTOMER_PAY_PER_DISPUTE_LABEL,
} from "@/shared/billing-config";

/**
 * Consolidated pricing — contractor Pro is primary; customer options are secondary.
 */
export default function PricingScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <ScreenBackground backgroundKey="auth">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← Back</Text>
        </Pressable>

        <Text style={[s.pageTitle, { color: colors.foreground }]}>Pricing</Text>
        <Text style={[s.pageSub, { color: colors.muted }]}>{BILLING_COPY.contractorPro}</Text>

        {/* ── Primary: contractors ───────────────────────────────────── */}
        <View style={[s.primaryCard, { borderColor: colors.primary + "55", backgroundColor: colors.primary + "10" }]}>
          <Text style={[s.badge, { color: colors.primary }]}>For contractors</Text>
          <Text style={[s.cardTitle, { color: colors.foreground }]}>Contractor Pro</Text>
          <Text style={[s.priceLine, { color: colors.foreground }]}>
            {CONTRACTOR_PRO_MONTHLY_PRICE_DISPLAY}
            <Text style={[s.priceCadence, { color: colors.muted }]}>/month</Text>
            {" · "}
            {CONTRACTOR_PRO_ANNUAL_PRICE_DISPLAY}
            <Text style={[s.priceCadence, { color: colors.muted }]}>/year</Text>
          </Text>
          <Text style={[s.cardDesc, { color: colors.muted }]}>{BILLING_COPY.contractorFreeTier}</Text>
          <View style={s.featureList}>
            {CONTRACTOR_PRO_FEATURES.map((f) => (
              <Text key={f} style={[s.featureLine, { color: colors.foreground }]}>
                ✓ {f}
              </Text>
            ))}
          </View>
          <Pressable
            onPress={() => router.push("/contractor-paywall" as never)}
            style={({ pressed }) => [s.primaryCta, { backgroundColor: colors.primary }, pressed && { opacity: 0.9 }]}
          >
            <Text style={s.primaryCtaText}>Get Contractor Pro</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/select-account" as never)} style={s.secondaryLink}>
            <Text style={[s.secondaryLinkText, { color: colors.muted }]}>Or start free tier (sign in) →</Text>
          </Pressable>
        </View>

        {/* ── Secondary: customers ───────────────────────────────────── */}
        <View style={[s.secondaryCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[s.secondaryBadge, { color: colors.muted }]}>For customers</Text>
          <Text style={[s.secondaryTitle, { color: colors.foreground }]}>Supporting options</Text>
          <Text style={[s.secondaryBody, { color: colors.muted }]}>{CUSTOMER_NO_SUBSCRIPTION_REQUIRED_LINE}</Text>
          <View style={s.secondaryBullets}>
            <Text style={[s.bullet, { color: colors.foreground }]}>• Free account — view and respond</Text>
            <Text style={[s.bullet, { color: colors.foreground }]}>• {CUSTOMER_PAY_PER_DISPUTE_LABEL}</Text>
            <Text style={[s.bullet, { color: colors.foreground }]}>• {CUSTOMER_OPTIONAL_MONITORING_LABEL}</Text>
          </View>
          <Pressable
            onPress={() => router.push({ pathname: "/select-account", params: { preset: "customer" } } as never)}
            style={({ pressed }) => [s.outlineCta, { borderColor: colors.border }, pressed && { opacity: 0.85 }]}
          >
            <Text style={[s.outlineCtaText, { color: colors.foreground }]}>Customer sign in</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/customer-paywall" as never)} style={s.secondaryLink}>
            <Text style={[s.secondaryLinkText, { color: colors.muted }]}>Optional add-ons →</Text>
          </Pressable>
        </View>

        <LegalFooter style={{ marginTop: 8 }} />
      </ScrollView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingTop: 52, paddingBottom: 40, gap: 20 },
  back: { marginBottom: 8 },
  backText: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: "500" },
  pageTitle: { fontSize: 32, fontWeight: "900", letterSpacing: -0.5 },
  pageSub: { fontSize: 15, lineHeight: 22, marginBottom: 8 },

  primaryCard: { borderWidth: 2, borderRadius: 18, padding: 22, gap: 12 },
  badge: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  cardTitle: { fontSize: 24, fontWeight: "800" },
  priceLine: { fontSize: 20, fontWeight: "800" },
  priceCadence: { fontSize: 14, fontWeight: "600" },
  cardDesc: { fontSize: 14, lineHeight: 20 },
  featureList: { gap: 6, marginTop: 4 },
  featureLine: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  primaryCta: { borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  primaryCtaText: { color: "#fff", fontSize: 17, fontWeight: "800" },

  secondaryCard: { borderWidth: 1, borderRadius: 16, padding: 20, gap: 10, marginTop: 4 },
  secondaryBadge: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  secondaryTitle: { fontSize: 18, fontWeight: "800" },
  secondaryBody: { fontSize: 14, lineHeight: 20 },
  secondaryBullets: { gap: 6, marginTop: 4 },
  bullet: { fontSize: 14, lineHeight: 20 },
  outlineCta: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  outlineCtaText: { fontSize: 16, fontWeight: "700" },
  secondaryLink: { alignItems: "center", paddingVertical: 8 },
  secondaryLinkText: { fontSize: 14, fontWeight: "600" },
});
