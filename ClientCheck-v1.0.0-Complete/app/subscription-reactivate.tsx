import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import * as Haptics from "expo-haptics";
import { apiFetch } from "@/lib/api";

export default function SubscriptionReactivateScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleReactivate = async () => {
    try {
      setIsProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Call reactivation API
      const response = await apiFetch("/api/subscription/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          plan: selectedPlan,
        }),
      });

      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push("/subscription");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error("Reactivation failed:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backBtn, { color: colors.primary }]}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Reactivate Subscription</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroEmoji}>🎉</Text>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>Welcome Back!</Text>
          <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
            We'd love to have you back. Your account is ready to reactivate.
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>What You'll Get</Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>📞</Text>
              <Text style={[styles.benefitText, { color: colors.foreground }]}>
                Real-time call alerts
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🔍</Text>
              <Text style={[styles.benefitText, { color: colors.foreground }]}>
                Customer search & reviews
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>⭐</Text>
              <Text style={[styles.benefitText, { color: colors.foreground }]}>
                Achievements & badges
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>💬</Text>
              <Text style={[styles.benefitText, { color: colors.foreground }]}>
                Contractor messaging
              </Text>
            </View>
          </View>
        </View>

        {/* Plan Selection */}
        <View style={styles.plansSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Select a Plan</Text>

          {/* Monthly Plan */}
          <TouchableOpacity
            onPress={() => {
              setSelectedPlan("monthly");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.planCard,
              {
                backgroundColor: colors.surface,
                borderColor: selectedPlan === "monthly" ? colors.primary : colors.border,
                borderWidth: selectedPlan === "monthly" ? 2 : 1,
              },
            ]}
          >
            <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: colors.foreground }]}>Monthly</Text>
              {selectedPlan === "monthly" && (
                <View
                  style={[styles.checkmark, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </View>
            <Text style={[styles.planPrice, { color: colors.primary }]}>$9.99</Text>
            <Text style={[styles.planFrequency, { color: colors.muted }]}>/month</Text>
            <Text style={[styles.planDescription, { color: colors.muted }]}>
              Cancel anytime, no long-term commitment
            </Text>
          </TouchableOpacity>

          {/* Yearly Plan */}
          <TouchableOpacity
            onPress={() => {
              setSelectedPlan("yearly");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.planCard,
              {
                backgroundColor: colors.surface,
                borderColor: selectedPlan === "yearly" ? colors.primary : colors.border,
                borderWidth: selectedPlan === "yearly" ? 2 : 1,
              },
            ]}
          >
            <View style={styles.planHeader}>
              <View>
                <Text style={[styles.planName, { color: colors.foreground }]}>Yearly</Text>
                <View
                  style={[styles.saveBadge, { backgroundColor: colors.success + "20" }]}
                >
                  <Text style={[styles.saveBadgeText, { color: colors.success }]}>
                    Save 17%
                  </Text>
                </View>
              </View>
              {selectedPlan === "yearly" && (
                <View
                  style={[styles.checkmark, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </View>
            <Text style={[styles.planPrice, { color: colors.primary }]}>$120</Text>
            <Text style={[styles.planFrequency, { color: colors.muted }]}>/year</Text>
            <Text style={[styles.planDescription, { color: colors.muted }]}>
              Non-refundable. Best value for committed users.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View
          style={[styles.infoBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary }]}
        >
          <Text style={[styles.infoIcon]}>ℹ️</Text>
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            Your previous payment method will be used. You can change it in settings after reactivation.
          </Text>
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          onPress={handleReactivate}
          disabled={isProcessing}
          style={[
            styles.ctaButton,
            { backgroundColor: colors.primary, opacity: isProcessing ? 0.6 : 1 },
          ]}
        >
          <Text style={styles.ctaButtonText}>
            {isProcessing ? "Processing..." : `Reactivate ${selectedPlan === "monthly" ? "Monthly" : "Yearly"}`}
          </Text>
        </TouchableOpacity>

        {/* Cancel Link */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.cancelLink}
        >
          <Text style={[styles.cancelLinkText, { color: colors.muted }]}>
            Maybe later
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backBtn: {
    fontSize: 18,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 32,
    gap: 12,
  },
  heroEmoji: {
    fontSize: 48,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  heroSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  benefitsSection: {
    marginBottom: 32,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  benefitIcon: {
    fontSize: 24,
  },
  benefitText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  plansSection: {
    marginBottom: 24,
    gap: 12,
  },
  planCard: {
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planName: {
    fontSize: 16,
    fontWeight: "700",
  },
  saveBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  saveBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  planPrice: {
    fontSize: 24,
    fontWeight: "700",
  },
  planFrequency: {
    fontSize: 13,
  },
  planDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  infoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 24,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  ctaButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  ctaButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelLink: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelLinkText: {
    fontSize: 14,
    fontWeight: "500",
  },
});