import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, Platform, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenBackground } from "@/components/screen-background";
import { useColors } from "@/hooks/use-colors";
import { startOAuthLogin } from "@/constants/oauth";
import { setSelectedAccountType } from "@/lib/account-type";
import { LegalFooter } from "@/components/legal-footer";
import { track } from "@/lib/analytics";

const FAQ = [
  { q: "When do I get charged?", a: "Never during your first 12 months. After that, $120 renews your access for another year." },
  { q: "Will I be reminded?", a: "Yes — 30, 14, 3, and 1 day before expiration." },
  { q: "Do customers pay?", a: "No. Customer accounts are always free." },
  { q: "Can I cancel?", a: "Yes, from account settings at any time." },
];

export default function SelectAccountScreen() {
  const colors = useColors();
  const router = useRouter();
  const { preset } = useLocalSearchParams<{ preset?: string }>();
  const customerFirst = preset === "customer";
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [oauthStarting, setOauthStarting] = useState(false);

  const handleContractor = async () => {
    if (oauthStarting) return;
    setOauthStarting(true);
    try {
      track("signup_started", { account_type: "contractor" });
      await setSelectedAccountType("contractor");
      await startOAuthLogin();
    } finally {
      if (Platform.OS !== "web") setOauthStarting(false);
    }
  };

  const handleCustomer = async () => {
    if (oauthStarting) return;
    setOauthStarting(true);
    try {
      track("signup_started", { account_type: "customer" });
      await setSelectedAccountType("customer");
      await startOAuthLogin();
    } finally {
      if (Platform.OS !== "web") setOauthStarting(false);
    }
  };

  const customerBlock = (
    <View
      key="customer"
      style={[s.customerSection, { borderColor: "rgba(255,255,255,0.08)" }]}
    >
      <View style={s.customerTop}>
        <Text style={s.customerLabel}>Customer account</Text>
        <Text style={s.customerDesc}>
          Free to sign up or log in — dispute reviews, manage your profile, and track resolutions with a fair process.
        </Text>
      </View>
      <Pressable
        onPress={handleCustomer}
        disabled={oauthStarting}
        style={({ pressed }) => [s.customerCta, pressed && !oauthStarting && { opacity: 0.7 }, oauthStarting && { opacity: 0.5 }]}
      >
        {oauthStarting ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={[s.customerCtaText, { color: colors.primary }]}>Continue as customer →</Text>
        )}
      </Pressable>
    </View>
  );

  const contractorBlock = (
    <View key="contractor-flow">
      {!customerFirst ? null : (
        <Text style={s.sectionHeading}>For contractors</Text>
      )}
      <View style={s.hero}>
        <View style={[s.freeBadge, { backgroundColor: colors.primary + "1A" }]}>
          <Text style={[s.freeBadgeText, { color: colors.primary }]}>NO CREDIT CARD REQUIRED</Text>
        </View>
        <Text style={s.heroPrice}>12 months free</Text>
        <Text style={s.heroHeadline}>Full access to contractor risk intelligence.{"\n"}No charge for a year.</Text>
        <Text style={s.heroRenewal}>$120/year after your first 12 months</Text>
      </View>

      <Pressable
        onPress={handleContractor}
        disabled={oauthStarting}
        style={({ pressed }) => [
          s.mainCta,
          { backgroundColor: colors.primary },
          pressed && !oauthStarting && { opacity: 0.88 },
          oauthStarting && { opacity: 0.85 },
        ]}
      >
        {oauthStarting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={s.mainCtaText}>Continue as contractor</Text>
            <Text style={s.mainCtaSub}>New or returning — same secure sign-in · No payment today</Text>
          </>
        )}
      </Pressable>

      <View style={[s.featuresCard, { borderColor: "rgba(255,255,255,0.08)" }]}>
        <Text style={s.featuresTitle}>What contractors get</Text>
        {[
          "Search customer history before accepting jobs",
          "Verified reports from real contractors",
          "Risk scores, alerts, and tracking",
          "Post reviews and flag issues",
          "Dispute visibility and resolution tools",
          "Renewal reminders — no surprise charges",
        ].map((f, i) => (
          <View key={i} style={s.featureRow}>
            <Text style={[s.featureCheck, { color: colors.primary }]}>✓</Text>
            <Text style={s.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      <View style={s.trustLine}>
        <Text style={s.trustText}>🔒 Secure · No card upfront · Cancel anytime · Stripe payments</Text>
      </View>

      {customerFirst ? null : customerBlock}
    </View>
  );

  return (
    <ScreenBackground backgroundKey="auth">
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>← Back</Text>
        </Pressable>

        {customerFirst ? (
          <>
            {customerBlock}
            {contractorBlock}
          </>
        ) : (
          contractorBlock
        )}

        {/* ── FAQ — tight ────────────────────────────────────────────── */}
        <View style={s.faqSection}>
          <Text style={s.faqTitle}>Questions</Text>
          {FAQ.map((item, i) => (
            <Pressable
              key={i}
              onPress={() => setOpenFaq(openFaq === i ? null : i)}
              style={[s.faqItem, { borderColor: "rgba(255,255,255,0.06)" }]}
            >
              <View style={s.faqRow}>
                <Text style={s.faqQ}>{item.q}</Text>
                <Text style={s.faqToggle}>{openFaq === i ? "−" : "+"}</Text>
              </View>
              {openFaq === i && <Text style={s.faqA}>{item.a}</Text>}
            </Pressable>
          ))}
        </View>

        <LegalFooter style={{ marginTop: 4 }} />
      </ScrollView>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingTop: 52, paddingBottom: 40 },
  back: { marginBottom: 24 },
  backText: { color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: "500" },

  hero: { alignItems: "center", marginBottom: 24, gap: 6 },
  freeBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  freeBadgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  heroPrice: { color: "#fff", fontSize: 42, fontWeight: "900", letterSpacing: -1, lineHeight: 46 },
  heroHeadline: { color: "rgba(255,255,255,0.7)", fontSize: 17, fontWeight: "500", textAlign: "center", lineHeight: 24, marginTop: 4 },
  heroRenewal: { color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 6 },

  mainCta: { borderRadius: 16, paddingVertical: 18, alignItems: "center", marginBottom: 24 },
  mainCtaText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  mainCtaSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "500", marginTop: 4 },

  featuresCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginBottom: 16,
  },
  featuresTitle: { color: "#fff", fontSize: 15, fontWeight: "700", marginBottom: 2 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  featureCheck: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  featureText: { color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 19, flex: 1 },

  trustLine: { alignItems: "center", marginBottom: 24 },
  trustText: { color: "rgba(255,255,255,0.3)", fontSize: 12, textAlign: "center", lineHeight: 18 },

  customerSection: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    marginBottom: 24,
  },
  customerTop: { gap: 4 },
  customerLabel: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  customerDesc: { color: "rgba(255,255,255,0.4)", fontSize: 13, lineHeight: 19 },
  customerCta: { paddingVertical: 6 },
  customerCtaText: { fontSize: 14, fontWeight: "700" },

  sectionHeading: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 16,
    marginTop: 8,
  },

  faqSection: { marginBottom: 20 },
  faqTitle: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  faqItem: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 8, backgroundColor: "rgba(255,255,255,0.02)" },
  faqRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  faqQ: { color: "#fff", fontSize: 13, fontWeight: "600", flex: 1, paddingRight: 10 },
  faqToggle: { color: "rgba(255,255,255,0.3)", fontSize: 18, fontWeight: "300" },
  faqA: { color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 18, marginTop: 8 },
});
