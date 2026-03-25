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
  CUSTOMER_IDENTITY_VERIFICATION_PLAN,
  CUSTOMER_IDENTITY_VERIFICATION_PRICE_DISPLAY,
  CUSTOMER_FREE_ACCOUNT_NO_SUBSCRIPTION_LINE,
  CUSTOMER_NO_SUBSCRIPTION_REQUIRED_LINE,
  CUSTOMER_OPTIONAL_MONITORING_LABEL,
  CUSTOMER_OPTIONAL_MONITORING_NOTE,
  CUSTOMER_PAY_PER_DISPUTE_LABEL,
  CUSTOMER_PAY_PER_DISPUTE_NOTE,
} from "@/shared/billing-config";
import { LegalFooter } from "@/components/legal-footer";

export default function CustomerPaywallScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  useAdminPaywallBypassRedirect();
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    track("paywall_shown", { type: "customer" });
    track("paywall_viewed", { surface: "customer" });
  }, []);

  const createCustomer = trpc.payments.createStripeCustomerForApp.useMutation();
  const createPaymentIntent = trpc.payments.createCustomerPaymentIntentForApp.useMutation();
  const createSub = trpc.payments.createCustomerSubscriptionForApp.useMutation();

  const handleSubscribe = async () => {
    track("checkout_started", { plan: "customer_identity_verification", price: `${CUSTOMER_IDENTITY_VERIFICATION_PRICE_DISPLAY}/mo` });
    track("subscription_started", { plan: "customer_identity_verification", price: `${CUSTOMER_IDENTITY_VERIFICATION_PRICE_DISPLAY}/mo` });
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
      if ("error" in custResult) { Alert.alert("Error", custResult.error); return; }

      const piResult = await createPaymentIntent.mutateAsync({
        stripeCustomerId: custResult.customerId,
        amountCents: CUSTOMER_IDENTITY_VERIFICATION_PLAN.priceCents,
        plan: "monthly",
      });
      if ("error" in piResult) { Alert.alert("Error", piResult.error); return; }

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: piResult.clientSecret,
        merchantDisplayName: "ClientCheck",
      });
      if (initError) { Alert.alert("Error", initError.message ?? "Could not open payment form."); return; }

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === "Canceled") return;
        Alert.alert("Payment Failed", presentError.message ?? "Payment was not completed.");
        return;
      }

      const subResult = await createSub.mutateAsync({
        stripeCustomerId: custResult.customerId,
        plan: "monthly",
        productLine: "customer_identity",
        paymentIntentId: piResult.paymentIntentId ?? undefined,
      });
      if ("error" in subResult) { Alert.alert("Error", subResult.error); return; }

      router.push({
        pathname: "/customer-payment-success",
        params: { plan: "monthly", paymentIntentId: piResult.paymentIntentId ?? "" },
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
          <Text style={[s.kicker, { color: colors.primary }]}>Customers</Text>
          <Text style={[s.title, { color: colors.foreground }]}>Optional tools</Text>
          <Text style={[s.subtitle, { color: colors.muted }]}>
            {CUSTOMER_FREE_ACCOUNT_NO_SUBSCRIPTION_LINE} {CUSTOMER_NO_SUBSCRIPTION_REQUIRED_LINE}
          </Text>
        </View>

        <View style={[s.infoCard, { borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" }]}>
          <Text style={[s.infoTitle, { color: colors.foreground }]}>Free account</Text>
          <Text style={[s.infoBody, { color: colors.muted }]}>{CUSTOMER_NO_SUBSCRIPTION_REQUIRED_LINE}</Text>
        </View>

        <View style={[s.infoCard, { borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" }]}>
          <Text style={[s.infoTitle, { color: colors.foreground }]}>{CUSTOMER_PAY_PER_DISPUTE_LABEL}</Text>
          <Text style={[s.infoBody, { color: colors.muted }]}>{CUSTOMER_PAY_PER_DISPUTE_NOTE}</Text>
        </View>

        <View style={[s.infoCard, { borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)" }]}>
          <Text style={[s.infoTitle, { color: colors.foreground }]}>{CUSTOMER_OPTIONAL_MONITORING_LABEL}</Text>
          <Text style={[s.infoBody, { color: colors.muted }]}>{CUSTOMER_OPTIONAL_MONITORING_NOTE}</Text>
        </View>

        <Text style={[s.sectionLabel, { color: colors.muted }]}>OPTIONAL ADD-ON</Text>

        {/* Plan card */}
        <View style={[s.planCard, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" }]}>
          <View style={s.planHeader}>
            <Text style={[s.planName, { color: colors.foreground }]}>{CUSTOMER_IDENTITY_VERIFICATION_PLAN.displayName}</Text>
            <View style={s.priceRow}>
              <Text style={[s.priceBig, { color: colors.primary }]}>{CUSTOMER_IDENTITY_VERIFICATION_PLAN.priceDisplay}</Text>
              <Text style={[s.priceCadence, { color: colors.muted }]}>{CUSTOMER_IDENTITY_VERIFICATION_PLAN.cadence}</Text>
            </View>
          </View>

          <Text style={[s.valueText, { color: colors.muted }]}>{CUSTOMER_IDENTITY_VERIFICATION_PLAN.description}</Text>

          <View style={s.divider} />

          {CUSTOMER_IDENTITY_VERIFICATION_PLAN.features.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <Text style={[s.checkIcon, { color: colors.primary }]}>✓</Text>
              <Text style={[s.featureText, { color: colors.foreground }]}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Trust row */}
        <View style={s.trustRow}>
          {CUSTOMER_IDENTITY_VERIFICATION_PLAN.trustItems.map((t, i) => (
            <View key={i} style={s.trustItem}>
              <Text style={[s.trustDot, { color: colors.primary }]}>•</Text>
              <Text style={[s.trustText, { color: colors.muted }]}>{t}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <Pressable
          onPress={handleSubscribe}
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
            <Text style={s.ctaText}>{CUSTOMER_IDENTITY_VERIFICATION_PLAN.ctaLabel}</Text>
          )}
        </Pressable>

        <Text style={[s.secureText, { color: colors.muted }]}>
          Secure payment · Cancel anytime · No hidden fees
        </Text>
        <Text style={[s.stripeText, { color: colors.muted }]}>
          Payments securely processed by Stripe
        </Text>

        <View style={s.noteRow}>
          <Text style={[s.noteText, { color: colors.muted }]}>
            {CUSTOMER_NO_SUBSCRIPTION_REQUIRED_LINE} The checkout below is only for the optional verification badge.
          </Text>
        </View>

        <Pressable onPress={() => router.back()} style={s.notNow}>
          <Text style={[s.notNowText, { color: colors.muted }]}>Not Now</Text>
        </Pressable>

        <LegalFooter style={{ marginTop: 4 }} />
      </ScrollView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40, gap: 20 },
  back: { marginBottom: 4 },
  backText: { color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: "500" },
  header: { gap: 8, marginBottom: 4 },
  kicker: { fontSize: 13, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" as const },
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 16, lineHeight: 22 },
  infoCard: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 6 },
  infoTitle: { fontSize: 16, fontWeight: "700" },
  infoBody: { fontSize: 14, lineHeight: 20 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginTop: 4 },

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

  noteRow: { paddingHorizontal: 8 },
  noteText: { fontSize: 13, lineHeight: 18, textAlign: "center" as const },
  notNow: { alignItems: "center" as const, paddingVertical: 8 },
  notNowText: { fontSize: 15, fontWeight: "500" },
});
