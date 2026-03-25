import { useEffect, useState } from "react";
import { ScrollView, View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenBackground } from "@/components/screen-background";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useAdminPaywallBypassRedirect } from "@/hooks/use-admin-paywall-bypass-redirect";
import { trpc } from "@/lib/trpc";
import { StripeCustomerService } from "@/lib/stripe-customer-service";
import { usePaymentSheet } from "@/lib/stripe";
import { track } from "@/lib/analytics";
import {
  BILLING_COPY,
  CONTRACTOR_ANNUAL_PLAN,
  CONTRACTOR_PRO_MONTHLY_PLAN,
  CONTRACTOR_PRO_FEATURES,
  CONTRACTOR_PRO_ANNUAL_PRICE_DISPLAY,
  CONTRACTOR_PRO_MONTHLY_PRICE_DISPLAY,
} from "@/shared/billing-config";
import { LegalFooter } from "@/components/legal-footer";

type ProInterval = "monthly" | "yearly";

export default function ContractorPaywallScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  useAdminPaywallBypassRedirect();
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();
  const [proInterval, setProInterval] = useState<ProInterval>("yearly");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    track("paywall_shown", { type: "contractor" });
    track("paywall_viewed", { surface: "contractor" });
  }, []);

  const createCustomer = trpc.payments.createStripeCustomerForApp.useMutation();
  const createPaymentIntent = trpc.payments.createCustomerPaymentIntentForApp.useMutation();
  const createSub = trpc.payments.createCustomerSubscriptionForApp.useMutation();

  const activePlan = proInterval === "yearly" ? CONTRACTOR_ANNUAL_PLAN : CONTRACTOR_PRO_MONTHLY_PLAN;

  const handleVerifyLicense = () => {
    router.push("/(tabs)/profile" as never);
  };

  const handleFreeTier = () => {
    router.push("/(tabs)" as never);
  };

  const handlePay = async () => {
    const priceLabel =
      proInterval === "yearly" ? `${CONTRACTOR_PRO_ANNUAL_PRICE_DISPLAY}/yr` : `${CONTRACTOR_PRO_MONTHLY_PRICE_DISPLAY}/mo`;
    track("checkout_started", { plan: `contractor_pro_${proInterval}`, price: priceLabel });
    track("subscription_started", { plan: `contractor_pro_${proInterval}`, price: priceLabel });
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
        amountCents: activePlan.priceCents,
        plan: proInterval,
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
        plan: proInterval,
        productLine: "contractor_pro",
        paymentIntentId: piResult.paymentIntentId ?? undefined,
      });
      if ("error" in subResult) {
        Alert.alert("Error", subResult.error);
        return;
      }

      const ms = proInterval === "yearly" ? 365 * 86400000 : 30 * 86400000;
      router.push({
        pathname: "/payment-success",
        params: {
          planType: proInterval,
          amount: String(activePlan.priceCents),
          nextBillingDate: new Date(Date.now() + ms).toISOString(),
          subscriptionId: subResult.subscriptionId,
        },
      } as never);
    } catch {
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground backgroundKey="auth">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← Back</Text>
        </Pressable>

        <View style={s.header}>
          <Text style={[s.badge, { color: colors.primary }]}>Contractor pricing</Text>
          <Text style={[s.title, { color: colors.foreground }]}>Contractor Pro</Text>
          <Text style={[s.subtitle, { color: colors.muted }]}>{BILLING_COPY.contractorPro}</Text>
        </View>

        {/* Pro interval toggle */}
        <View style={[s.toggleRow, { borderColor: "rgba(255,255,255,0.12)" }]}>
          {(["monthly", "yearly"] as const).map((key) => (
            <Pressable
              key={key}
              onPress={() => setProInterval(key)}
              style={[
                s.toggleBtn,
                proInterval === key && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  s.toggleBtnText,
                  { color: proInterval === key ? "#fff" : colors.muted },
                ]}
              >
                {key === "monthly" ? "Monthly" : "Annual"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[s.planCard, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" }]}>
          <View style={s.planHeader}>
            <Text style={[s.planName, { color: colors.foreground }]}>{activePlan.displayName}</Text>
            <View style={s.priceRow}>
              <Text style={[s.priceBig, { color: colors.primary }]}>{activePlan.priceDisplay}</Text>
              <Text style={[s.priceCadence, { color: colors.muted }]}>{activePlan.cadence}</Text>
            </View>
          </View>
          <Text style={[s.valueText, { color: colors.muted }]}>{activePlan.description}</Text>
          <View style={s.divider} />
          {CONTRACTOR_PRO_FEATURES.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <Text style={[s.checkIcon, { color: colors.primary }]}>✓</Text>
              <Text style={[s.featureText, { color: colors.foreground }]}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={s.trustRow}>
          {activePlan.trustItems.map((t, i) => (
            <View key={i} style={s.trustItem}>
              <Text style={[s.trustDot, { color: colors.primary }]}>•</Text>
              <Text style={[s.trustText, { color: colors.muted }]}>{t}</Text>
            </View>
          ))}
        </View>

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
            <Text style={s.ctaText}>{activePlan.ctaLabel}</Text>
          )}
        </Pressable>

        <Text style={[s.secureText, { color: colors.muted }]}>Secure checkout · Payments processed by Stripe</Text>

        {/* Free tier — secondary */}
        <View style={[s.secondaryCard, { borderColor: "rgba(255,255,255,0.1)" }]}>
          <Text style={[s.secondaryTitle, { color: colors.foreground }]}>Free tier</Text>
          <Text style={[s.secondaryDesc, { color: colors.muted }]}>
            {BILLING_COPY.contractorFreeTier} Use ClientCheck with limited searches; upgrade to Pro when you need
            unlimited access, full risk scores, red flags, and alerts.
          </Text>
          <Pressable
            onPress={handleFreeTier}
            style={({ pressed }) => [s.secondaryCta, pressed && { opacity: 0.85 }]}
          >
            <Text style={[s.secondaryCtaText, { color: colors.primary }]}>Continue with free tier →</Text>
          </Pressable>
        </View>

        <View style={[s.noteCard, { backgroundColor: "rgba(59,130,246,0.08)", borderColor: "rgba(59,130,246,0.2)" }]}>
          <Text style={[s.noteText, { color: "rgba(147,197,253,1)" }]}>{BILLING_COPY.contractorFreeYear}</Text>
          <Pressable onPress={handleVerifyLicense}>
            <Text style={[s.noteLink, { color: colors.primary }]}>Submit license in Profile →</Text>
          </Pressable>
        </View>

        <LegalFooter style={{ marginTop: 16 }} />
      </ScrollView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40, gap: 16 },
  back: { marginBottom: 4 },
  backText: { color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: "500" },
  header: { gap: 8, marginBottom: 4 },
  badge: { fontSize: 14, fontWeight: "700", letterSpacing: 0.2 },
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 15, lineHeight: 22 },

  toggleRow: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  toggleBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" as const },
  toggleBtnText: { fontSize: 15, fontWeight: "700" },

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

  secureText: { fontSize: 11, textAlign: "center" as const, lineHeight: 16 },

  secondaryCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginTop: 8,
  },
  secondaryTitle: { fontSize: 17, fontWeight: "700" },
  secondaryDesc: { fontSize: 14, lineHeight: 20 },
  secondaryCta: { alignSelf: "flex-start" as const, paddingVertical: 4 },
  secondaryCtaText: { fontSize: 15, fontWeight: "700" },

  noteCard: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  noteText: { fontSize: 13, lineHeight: 18 },
  noteLink: { fontSize: 14, fontWeight: "600" },
});
