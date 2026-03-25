import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenBackground } from "@/components/screen-background";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuthWithLoginRedirect } from "@/hooks/use-auth-with-login-redirect";
import { useAdminPaywallBypassRedirect } from "@/hooks/use-admin-paywall-bypass-redirect";
import { track } from "@/lib/analytics";
import {
  alertIdentityCheckoutError,
  startCustomerIdentityCheckout,
} from "@/lib/customer-identity-checkout";
import { CUSTOMER_IDENTITY_VERIFICATION_PRICE_DISPLAY } from "@/shared/billing-config";
import {
  getVerificationStats,
  parseVerificationPaywallTriggerParam,
} from "@/shared/verification-conversion";

const BENEFITS = [
  "Get accepted faster by contractors",
  "Stand out from other customers",
  "Verified customers appear higher in search",
  "Avoid being flagged as high-risk",
  "Build trust before the first message",
] as const;

const WITHOUT = ["Lower trust", "Higher chance of rejection", "Lower visibility in search", "Seen as risky"] as const;

const WITH = [
  "Trusted by contractors",
  "Higher acceptance rate",
  "Preferred for jobs",
  "Appear higher in search",
  "Faster responses",
] as const;

export default function VerifyCustomerPaywallScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ trigger?: string | string[] }>();
  const paywallTrigger = useMemo(
    () => parseVerificationPaywallTriggerParam(params.trigger),
    [params.trigger],
  );
  const verificationStats = useMemo(() => getVerificationStats(), []);
  const { width } = useWindowDimensions();
  const { user, contentReady } = useAuthWithLoginRedirect();
  useAdminPaywallBypassRedirect();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);
  const ctaScale = useRef(new Animated.Value(1)).current;

  const comparisonSideBySide = width >= 640;

  useEffect(() => {
    track("paywall_shown", { type: "verify_customer_identity", trigger: paywallTrigger });
  }, [paywallTrigger]);

  useEffect(() => {
    if (!contentReady || !user) return;
    if (user.role !== "customer") {
      router.replace("/(tabs)" as never);
      return;
    }
    if (user.isVerified) {
      router.replace("/(tabs)" as never);
    }
  }, [contentReady, user, router]);

  useEffect(() => {
    const to = ctaHovered ? 1.02 : 1;
    Animated.spring(ctaScale, {
      toValue: to,
      friction: 7,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [ctaHovered, ctaScale]);

  const handleVerify = useCallback(async () => {
    track("checkout_started", {
      plan: "customer_identity_one_time",
      price: CUSTOMER_IDENTITY_VERIFICATION_PRICE_DISPLAY,
    });
    setCheckoutLoading(true);
    try {
      await startCustomerIdentityCheckout(paywallTrigger);
    } catch (e) {
      alertIdentityCheckoutError(e);
    } finally {
      setCheckoutLoading(false);
    }
  }, [paywallTrigger]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleContinueWithout = useCallback(() => {
    track("paywall_dismissed", { surface: "verify_customer_paywall", trigger: paywallTrigger });
    router.replace("/(tabs)" as never);
  }, [router, paywallTrigger]);

  const trustLineStyle = useMemo(
    () =>
      Platform.OS === "web"
        ? ({ boxShadow: "0 0 24px rgba(34, 197, 94, 0.35), 0 0 12px rgba(37, 99, 235, 0.2)" } as object)
        : {
            shadowColor: "#22c55e",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 10,
            elevation: 6,
          },
    [],
  );

  if (!contentReady || !user) {
    return (
      <ScreenBackground backgroundKey="auth">
        <ScreenContainer className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </ScreenContainer>
      </ScreenBackground>
    );
  }

  if (user.role !== "customer" || user.isVerified) {
    return (
      <ScreenBackground backgroundKey="auth">
        <ScreenContainer className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
        </ScreenContainer>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground backgroundKey="auth" overlayOpacity={0.92}>
      <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-transparent">
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={handleBack} hitSlop={12} style={styles.backRow}>
            <Text style={[styles.backText, { color: colors.primary }]}>‹ Back</Text>
          </Pressable>

          {/* 1. Header */}
          <View style={styles.headerBlock}>
            <Text style={[styles.title, { color: colors.foreground }]}>Get Verified. Get Chosen.</Text>
            <Text style={[styles.subtext, { color: colors.muted }]}>
              Contractors are far more likely to accept jobs from verified customers.
            </Text>
            <View
              style={[
                styles.statPill,
                { backgroundColor: colors.primary + "16", borderColor: colors.primary + "40" },
              ]}
            >
              <Text style={[styles.statText, { color: colors.foreground }]}>
                <Text style={[styles.statAccent, { color: colors.primary }]}>
                  {verificationStats.contractorPreferencePercent}%{" "}
                </Text>
                of contractors prefer verified customers
              </Text>
              {verificationStats.verifiedCustomerPercent != null ? (
                <Text style={[styles.statSubline, { color: colors.muted }]}>
                  Only {verificationStats.verifiedCustomerPercent}% of customers are verified
                </Text>
              ) : null}
            </View>
          </View>

          {/* 2. Badge preview */}
          <View style={[styles.previewCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.previewLabel, { color: colors.muted }]}>{"How you'll appear"}</Text>
            <View style={styles.previewRow}>
              <Text style={[styles.previewName, { color: colors.foreground }]}>Sarah M.</Text>
              <View style={trustLineStyle}>
                <LinearGradient
                  colors={["#2563eb", "#0d9488", "#16a34a"]}
                  locations={[0, 0.5, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.badgePill}
                >
                  <Text style={styles.badgePillText}>✔ Verified Customer</Text>
                </LinearGradient>
              </View>
            </View>
          </View>

          {/* 3. Benefits */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Why verify your profile?</Text>
            <View style={[styles.benefitsCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              {BENEFITS.map((line) => (
                <View key={line} style={styles.benefitRow}>
                  <Text style={[styles.benefitBullet, { color: colors.success }]}>✓</Text>
                  <Text style={[styles.benefitText, { color: colors.foreground }]}>{line}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 4. Comparison */}
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 12 }]}>
            Verification makes a difference
          </Text>
          <View style={[styles.compareWrap, comparisonSideBySide ? styles.compareRow : styles.compareCol]}>
            <View style={[styles.compareCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={[styles.compareCardTitle, { color: colors.muted }]}>Without Verification</Text>
              {WITHOUT.map((t) => (
                <View key={t} style={styles.compareLine}>
                  <Text style={[styles.compareIcon, { color: colors.error }]}>−</Text>
                  <Text style={[styles.compareText, { color: colors.foreground }]}>{t}</Text>
                </View>
              ))}
            </View>
            <View
              style={[
                styles.compareCard,
                styles.compareCardHighlight,
                { borderColor: colors.success + "66", backgroundColor: colors.success + "0c" },
              ]}
            >
              <Text style={[styles.compareCardTitle, { color: colors.success }]}>With Verified Customer</Text>
              {WITH.map((t) => (
                <View key={t} style={styles.compareLine}>
                  <Text style={[styles.compareIcon, { color: colors.success }]}>✓</Text>
                  <Text style={[styles.compareText, { color: colors.foreground }]}>{t}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 5. Urgency */}
          <View style={[styles.urgencyBanner, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "44" }]}>
            <Text style={[styles.urgencyText, { color: colors.foreground }]}>
              Unverified profiles are often skipped by contractors.
            </Text>
          </View>

          {/* 6. Price */}
          <View style={styles.priceBlock}>
            <Text style={[styles.priceLine, { color: colors.muted }]}>One-time payment — no subscription</Text>
            <Text style={[styles.priceAmount, { color: colors.foreground }]}>{CUSTOMER_IDENTITY_VERIFICATION_PRICE_DISPLAY}</Text>
          </View>

          {/* 7. CTA */}
          <Animated.View style={{ transform: [{ scale: ctaScale }], alignSelf: "stretch" }}>
            <Pressable
              onPress={() => void handleVerify()}
              disabled={checkoutLoading}
              onHoverIn={() => Platform.OS === "web" && setCtaHovered(true)}
              onHoverOut={() => Platform.OS === "web" && setCtaHovered(false)}
              style={({ pressed }) => [
                styles.ctaOuter,
                pressed && Platform.OS !== "web" ? { opacity: 0.92 } : null,
                checkoutLoading ? { opacity: 0.7 } : null,
                Platform.OS === "web" ? ({ cursor: checkoutLoading ? "wait" : "pointer" } as object) : null,
              ]}
            >
              <LinearGradient
                colors={["#f87171", "#ef4444", "#b91c1c"]}
                locations={[0, 0.45, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                {checkoutLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.ctaLabel}>Verify My Profile</Text>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* 8. Trust line */}
          <Text style={[styles.trustLine, { color: colors.muted }]}>
            Secure payment • Instant activation • No recurring charges
          </Text>

          {/* 9. Exit */}
          <Pressable onPress={handleContinueWithout} style={styles.exitBtn} hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}>
            <Text style={[styles.exitBtnText, { color: colors.muted }]}>Continue without verification</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
    gap: 20,
  },
  backRow: { alignSelf: "flex-start", marginBottom: 4 },
  backText: { fontSize: 16, fontWeight: "600" },
  headerBlock: { gap: 10, marginTop: 4 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtext: { fontSize: 16, lineHeight: 24 },
  statPill: {
    marginTop: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statText: { fontSize: 15, fontWeight: "600", lineHeight: 22 },
  statSubline: { fontSize: 13, fontWeight: "600", lineHeight: 20, marginTop: 8 },
  statAccent: { fontSize: 17, fontWeight: "800" },
  previewCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  previewLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  previewName: { fontSize: 20, fontWeight: "700" },
  badgePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgePillText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  benefitsCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  benefitRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  benefitBullet: { fontSize: 16, fontWeight: "800", marginTop: 1 },
  benefitText: { fontSize: 15, lineHeight: 22, flex: 1 },
  compareWrap: { gap: 12 },
  compareRow: { flexDirection: "row", alignItems: "stretch" },
  compareCol: { flexDirection: "column" },
  compareCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    minWidth: 0,
  },
  compareCardHighlight: {
    borderWidth: 1.5,
  },
  compareCardTitle: { fontSize: 14, fontWeight: "800", marginBottom: 4 },
  compareLine: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  compareIcon: { fontSize: 15, fontWeight: "800", width: 16, textAlign: "center" },
  compareText: { fontSize: 14, lineHeight: 20, flex: 1 },
  urgencyBanner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  urgencyText: { fontSize: 15, fontWeight: "700", textAlign: "center", lineHeight: 22 },
  priceBlock: { alignItems: "center", gap: 6, marginTop: 4 },
  priceLine: { fontSize: 14, fontWeight: "600" },
  priceAmount: { fontSize: 40, fontWeight: "900", letterSpacing: -1 },
  ctaOuter: {
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      web: {
        boxShadow: "0 10px 32px rgba(239, 68, 68, 0.35), 0 4px 12px rgba(0,0,0,0.2)",
      },
      default: {
        shadowColor: "#ef4444",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  ctaGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  ctaLabel: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  trustLine: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 4,
  },
  exitBtn: { alignItems: "center", paddingVertical: 12, marginTop: 4 },
  exitBtnText: { fontSize: 14, fontWeight: "600", textDecorationLine: "underline" },
});
