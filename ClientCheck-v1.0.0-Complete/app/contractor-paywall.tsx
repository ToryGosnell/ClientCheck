import { useEffect, useState } from "react";
import { ScrollView, View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenBackground } from "@/components/screen-background";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { StripeCustomerService } from "@/lib/stripe-customer-service";
import { usePaymentSheet } from "@/lib/stripe";
import { track } from "@/lib/analytics";
import {
  CONTRACTOR_ANNUAL_PLAN,
  CONTRACTOR_ANNUAL_PRICE_DISPLAY,
} from "@/shared/billing-config";
import { LegalFooter } from "@/components/legal-footer";

type Step = "choose" | "paywall";

export default function ContractorPaywallScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();
  const [step, setStep] = useState<Step>("choose");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    track("paywall_shown", { type: "contractor" });
    track("paywall_viewed", { surface: "contractor" });
  }, []);

  const createCustomer = trpc.payments.createStripeCustomerForApp.useMutation();
  const createPaymentIntent = trpc.payments.createCustomerPaymentIntentForApp.useMutation();
  const createSub = trpc.payments.createCustomerSubscriptionForApp.useMutation();

  const handleVerifyLicense = () => {
    router.push("/(tabs)/profile" as never);
  };

  const handlePay = async () => {
    track("checkout_started", { plan: "contractor_annual", price: CONTRACTOR_ANNUAL_PRICE_DISPLAY });
    track("subscription_started", { plan: "contractor_annual", price: CONTRACTOR_ANNUAL_PRICE_DISPLAY });
    if (!user?.email || !user?.name) {
      Alert.alert("Error", "Please sign in to continue.");
      return;
    }
    const publishableKey = StripeCustomerService.getPublishableKey();
    if (!publishableKey) {
      Alert.alert("Error", "Payment processing is not available. Please contact support.");
      return;
    }

    setLoading(true);
    try {
      const custResult = await createCustomer.mutateAsync({ email: user.email, name: user.name });
      if ("error" in custResult) {
        Alert.alert("Error", custResult.error);
        return;
      }

      const piResult = await createPaymentIntent.mutateAsync({
        stripeCustomerId: custResult.customerId,
        amountCents: CONTRACTOR_ANNUAL_PLAN.priceCents,
        plan: "yearly",
      });
      if ("error" in piResult) {
        Alert.alert("Error", piResult.error);
        return;
      }

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: piResult.clientSecret,
        merchantDisplayName: "ClientCheck",
      });
      if (initError) {
        Alert.alert("Error", initError.message ?? "Could not open payment form.");
        return;
      }

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === "Canceled") {
          return;
        }
        Alert.alert("Payment Failed", presentError.message ?? "Payment was not completed.");
        return;
      }

      const subResult = await createSub.mutateAsync({
        stripeCustomerId: custResult.customerId,
        plan: "yearly",
        paymentIntentId: piResult.paymentIntentId ?? undefined,
      });
      if ("error" in subResult) {
        Alert.alert("Error", subResult.error);
        return;
      }

      router.push({
        pathname: "/payment-success",
        params: {
          planType: "yearly",
          amount: String(CONTRACTOR_ANNUAL_PLAN.priceCents),
          nextBillingDate: new Date(Date.now() + 365 * 86400000).toISOString(),
          subscriptionId: subResult.subscriptionId,
        },
      } as never);
    } catch (e) {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "paywall") {
    return (
      <ScreenBackground backgroundKey="auth">
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => setStep("choose")} style={s.back}>
            <Text style={s.backText}>← Back</Text>
          </Pressable>

          <View style={s.header}>
            <Text style={[s.title, { color: colors.foreground }]}>Unlock full report</Text>
            <Text style={[s.subtitle, { color: colors.muted }]}>
              12 months free for contractors who verify a license (go back to choose that path). This checkout is paid
              access: $120/year after you subscribe — same search, customer profiles, and risk context.
            </Text>
          </View>

          {/* Plan card */}
          <View style={[s.planCard, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" }]}>
            <View style={s.planHeader}>
              <Text style={[s.planName, { color: colors.foreground }]}>{CONTRACTOR_ANNUAL_PLAN.displayName}</Text>
              <View style={s.priceRow}>
                <Text style={[s.priceBig, { color: colors.primary }]}>{CONTRACTOR_ANNUAL_PLAN.priceDisplay}</Text>
                <Text style={[s.priceCadence, { color: colors.muted }]}>{CONTRACTOR_ANNUAL_PLAN.cadence}</Text>
              </View>
            </View>

            <Text style={[s.valueText, { color: colors.muted }]}>{CONTRACTOR_ANNUAL_PLAN.description}</Text>

            <View style={s.divider} />

            {CONTRACTOR_ANNUAL_PLAN.features.map((f, i) => (
              <View key={i} style={s.featureRow}>
                <Text style={[s.checkIcon, { color: colors.primary }]}>✓</Text>
                <Text style={[s.featureText, { color: colors.foreground }]}>{f}</Text>
              </View>
            ))}
          </View>

          {/* Trust row */}
          <View style={s.trustRow}>
            {CONTRACTOR_ANNUAL_PLAN.trustItems.map((t, i) => (
              <View key={i} style={s.trustItem}>
                <Text style={[s.trustDot, { color: colors.primary }]}>•</Text>
                <Text style={[s.trustText, { color: colors.muted }]}>{t}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <Pressable
            onPress={handlePay}
            disabled={loading}
            style={({ pressed }) => [
              s.cta,
              { backgroundColor: loading ? colors.primary + "66" : colors.primary },
              pressed && { opacity: 0.85 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.ctaText}>{CONTRACTOR_ANNUAL_PLAN.ctaLabel}</Text>
            )}
          </Pressable>

          <Text style={[s.secureText, { color: colors.muted }]}>
            12 months free with license verification · $120/year on this paid path · Secure checkout · Cancel anytime
          </Text>
          <Text style={[s.stripeText, { color: colors.muted }]}>
            Payments securely processed by Stripe
          </Text>

          {/* License note */}
          <View style={[s.noteCard, { backgroundColor: "rgba(59,130,246,0.08)", borderColor: "rgba(59,130,246,0.2)" }]}>
            <Text style={[s.noteText, { color: "rgba(147,197,253,1)" }]}>
              If you have a valid contractor license, you may qualify for 12 months free after verification.
            </Text>
            <Pressable onPress={handleVerifyLicense}>
              <Text style={[s.noteLink, { color: colors.primary }]}>Verify License Instead →</Text>
            </Pressable>
          </View>

          <LegalFooter style={{ marginTop: 4 }} />
        </ScrollView>
      </ScreenBackground>
    );
  }

  // ── Step: Choose ────────────────────────────────────────────────────────────
  return (
    <ScreenBackground backgroundKey="auth">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← Back</Text>
        </Pressable>

        <View style={s.header}>
          <Text style={[s.badge, { color: colors.primary }]}>Your first 12 months are free</Text>
          <Text style={[s.title, { color: colors.foreground }]}>Contractor Access</Text>
          <Text style={[s.subtitle, { color: colors.muted }]}>
            Start with full access — no charge for 12 months.
          </Text>
        </View>

        {/* Primary: Verify License */}
        <Pressable
          onPress={handleVerifyLicense}
          style={({ pressed }) => [
            s.optionCard,
            { backgroundColor: "rgba(255,255,255,0.06)", borderColor: colors.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={[s.optionBadge, { backgroundColor: colors.primary }]}>
            <Text style={s.optionBadgeText}>Recommended</Text>
          </View>
          <View style={s.optionIcon}>
            <Text style={{ fontSize: 32 }}>🛡️</Text>
          </View>
          <Text style={[s.optionTitle, { color: colors.foreground }]}>Start Free with License</Text>
          <Text style={[s.optionDesc, { color: colors.muted }]}>
            12 months free — verify your contractor license to begin
          </Text>
          <View style={[s.optionCta, { backgroundColor: colors.primary }]}>
            <Text style={s.optionCtaText}>Start free access</Text>
          </View>
        </Pressable>

        {/* Secondary: Continue Without License */}
        <Pressable
          onPress={() => setStep("paywall")}
          style={({ pressed }) => [
            s.optionCard,
            { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.12)" },
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={s.optionIcon}>
            <Text style={{ fontSize: 32 }}>💳</Text>
          </View>
          <Text style={[s.optionTitle, { color: colors.foreground }]}>Pay without license</Text>
          <Text style={[s.optionDesc, { color: colors.muted }]}>
            Unlock full report now — $120/year (no free period on this path)
          </Text>
          <View style={s.pricePreview}>
            <Text style={[s.pricePreviewText, { color: colors.muted }]}>{CONTRACTOR_ANNUAL_PRICE_DISPLAY}/year</Text>
          </View>
          <View
            style={[
              s.optionCta,
              {
                backgroundColor: "transparent",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.22)",
                marginTop: 8,
              },
            ]}
          >
            <Text style={[s.optionCtaText, { color: colors.foreground }]}>Unlock full report</Text>
          </View>
        </Pressable>

        <LegalFooter style={{ marginTop: 16 }} />
      </ScrollView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40, gap: 20 },
  back: { marginBottom: 4 },
  backText: { color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: "500" },
  header: { gap: 8, marginBottom: 4 },
  badge: { fontSize: 14, fontWeight: "700", letterSpacing: 0.2 },
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 16, lineHeight: 22 },

  optionCard: { borderWidth: 2, borderRadius: 16, padding: 24, gap: 12, position: "relative" as const },
  optionBadge: { position: "absolute" as const, top: -11, right: 16, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  optionBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  optionIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center" as const, justifyContent: "center" as const },
  optionTitle: { fontSize: 19, fontWeight: "700" },
  optionDesc: { fontSize: 14, lineHeight: 20 },
  optionCta: { borderRadius: 12, paddingVertical: 14, alignItems: "center" as const, marginTop: 4 },
  optionCtaText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  pricePreview: { marginTop: 4 },
  pricePreviewText: { fontSize: 14, fontWeight: "600" },

  planCard: { borderWidth: 1, borderRadius: 16, padding: 24, gap: 12 },
  planHeader: { gap: 4 },
  planName: { fontSize: 18, fontWeight: "700" },
  priceRow: { flexDirection: "row" as const, alignItems: "baseline" as const, gap: 2 },
  priceBig: { fontSize: 40, fontWeight: "800" },
  priceCadence: { fontSize: 16, fontWeight: "500" },
  valueText: { fontSize: 14, lineHeight: 20 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 4 },
  featureRow: { flexDirection: "row" as const, gap: 10, alignItems: "flex-start" as const },
  checkIcon: { fontSize: 16, fontWeight: "700", marginTop: 1 },
  featureText: { fontSize: 14, lineHeight: 20, flex: 1 },

  trustRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 12, justifyContent: "center" as const },
  trustItem: { flexDirection: "row" as const, gap: 4, alignItems: "center" as const },
  trustDot: { fontSize: 10 },
  trustText: { fontSize: 12 },

  cta: { borderRadius: 14, paddingVertical: 16, alignItems: "center" as const },
  ctaText: { color: "#fff", fontSize: 17, fontWeight: "700" },

  secureText: { fontSize: 12, textAlign: "center" as const, lineHeight: 18 },
  stripeText: { fontSize: 11, textAlign: "center" as const, fontWeight: "500" },

  noteCard: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  noteText: { fontSize: 13, lineHeight: 18 },
  noteLink: { fontSize: 14, fontWeight: "600" },
});
