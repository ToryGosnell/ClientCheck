import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { CancelSubscriptionModal } from "@/components/cancel-subscription-modal";
import { cancelSubscription } from "@/lib/cancel-subscription-service";
import { useState } from "react";

export default function SubscriptionScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [upgrading, setUpgrading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { data: subStatus, isLoading } = trpc.subscription.getStatus.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const upgradeMutation = trpc.subscription.upgrade.useMutation({
    onSuccess: () => {
      setUpgrading(false);
      // Refetch status
    },
  });

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await upgradeMutation.mutateAsync();
    } catch (error) {
      console.error("Upgrade failed:", error);
    }
    setUpgrading(false);
  };

  const handleCancelSubscription = async () => {
    if (!user?.id) return;
    try {
      await cancelSubscription({
        userId: String(user.id),
        reason: "User requested cancellation",
      });
      setShowCancelModal(false);
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
    }
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="p-6">
        <View style={styles.authPrompt}>
          <Text style={styles.authEmoji}>🔐</Text>
          <Text style={[styles.authTitle, { color: colors.foreground }]}>Sign In Required</Text>
          <Text style={[styles.authDesc, { color: colors.muted }]}>
            Please sign in to manage your subscription.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>Subscription</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <>
            {/* Status Card */}
            {subStatus && (
              <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {subStatus.isOwner ? (
                  <>
                    <Text style={[styles.statusEmoji, { fontSize: 48 }]}>👑</Text>
                    <Text style={[styles.statusTitle, { color: colors.foreground }]}>
                      Owner Account
                    </Text>
                    <Text style={[styles.statusDesc, { color: colors.muted }]}>
                      You have full access to ClientCheck as the app owner.
                    </Text>
                  </>
                ) : subStatus.status === "trial" ? (
                  <>
                    <Text style={[styles.statusEmoji, { fontSize: 48 }]}>⏰</Text>
                    <Text style={[styles.statusTitle, { color: colors.foreground }]}>
                      Free Trial Active
                    </Text>
                    <Text style={[styles.statusDesc, { color: colors.muted }]}>
                      {subStatus.daysRemaining} days remaining
                    </Text>
                    <Text style={[styles.trialInfo, { color: colors.muted }]}>
                      Your 7-day free trial gives you full access to all features.
                    </Text>
                  </>
                ) : subStatus.status === "active" ? (
                  <>
                    <Text style={[styles.statusEmoji, { fontSize: 48 }]}>✅</Text>
                    <Text style={[styles.statusTitle, { color: colors.foreground }]}>
                      Subscription Active
                    </Text>
                    <Text style={[styles.statusDesc, { color: colors.muted }]}>
                      {subStatus.daysRemaining} days remaining
                    </Text>
                    <Text style={[styles.trialInfo, { color: colors.muted }]}>
                      Your annual subscription is active. Renews automatically.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.statusEmoji, { fontSize: 48 }]}>⏱️</Text>
                    <Text style={[styles.statusTitle, { color: colors.foreground }]}>
                      Trial Expired
                    </Text>
                    <Text style={[styles.statusDesc, { color: colors.muted }]}>
                      Upgrade to continue using ClientCheck
                    </Text>
                  </>
                )}
              </View>
            )}

            {/* Pricing Card */}
            {subStatus && !subStatus.isOwner && subStatus.status !== "active" && (
              <View style={[styles.pricingCard, { backgroundColor: colors.primary + "08", borderColor: colors.primary }]}>
                <Text style={[styles.pricingTitle, { color: colors.foreground }]}>
                  Upgrade to Premium
                </Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.price, { color: colors.primary }]}>$9.99</Text>
                  <Text style={[styles.pricePeriod, { color: colors.muted }]}>/month</Text>
                </View>
                <Text style={[styles.pricingDesc, { color: colors.muted }]}>
                  Monthly: $9.99/month • Annual: $100/year (save $19.88)
                </Text>
                <Text style={[styles.pricingDesc, { color: colors.muted }]}>
                  After your 90-day free trial, continue with unlimited access to all features.
                </Text>

                <View style={styles.featuresList}>
                  <Text style={[styles.featureItem, { color: colors.foreground }]}>✓ Unlimited customer searches</Text>
                  <Text style={[styles.featureItem, { color: colors.foreground }]}>✓ Submit unlimited reviews</Text>
                  <Text style={[styles.featureItem, { color: colors.foreground }]}>✓ View detailed ratings & breakdowns</Text>
                  <Text style={[styles.featureItem, { color: colors.foreground }]}>✓ Community alerts & high-risk flags</Text>
                  <Text style={[styles.featureItem, { color: colors.foreground }]}>✓ No ads, no credit card during trial</Text>
                </View>

                <Pressable
                  onPress={handleUpgrade}
                  disabled={upgrading}
                  style={[styles.upgradeBtn, { backgroundColor: colors.primary }]}
                >
                  {upgrading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.upgradeBtnText}>Continue with Premium</Text>
                  )}
                </Pressable>
                <Text style={[styles.upgradeNote, { color: colors.muted }]}>
                  ✓ No credit card required for 90-day trial
                </Text>
                <Text style={[styles.upgradeNote, { color: colors.muted }]}>
                  ✓ 3-day reminder before trial ends
                </Text>
                <Text style={[styles.upgradeNote, { color: colors.muted }]}>
                  ✓ Annual plan is non-refundable
                </Text>
              </View>
            )}

            {/* Cancel Subscription Button - Always Visible */}
            {subStatus && (subStatus.status === "active" || subStatus.status === "trial") && (
              <Pressable
                onPress={() => setShowCancelModal(true)}
                style={[styles.cancelBtn, { borderColor: colors.error }]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.error }]}>
                  Cancel Subscription
                </Text>
              </Pressable>
            )}

            {/* Info */}
            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.infoTitle, { color: colors.foreground }]}>
                About Your Subscription
              </Text>
              <Text style={[styles.infoText, { color: colors.muted }]}>
                ClientCheck is a tool for contractors to vet customers before accepting jobs. Your subscription helps us maintain the platform and keep the community safe.
              </Text>
              <Text style={[styles.infoText, { color: colors.muted }]}>
                All payments are secure and can be managed from this screen. You can cancel anytime.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Cancel Subscription Modal */}
      <CancelSubscriptionModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirmCancel={handleCancelSubscription}
        subscriptionPlan="monthly"
        nextBillingDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 60,
  },
  backText: {
    fontSize: 17,
    fontWeight: "500",
  },
  topTitle: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  scroll: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 300,
  },
  authPrompt: {
    alignItems: "center",
    gap: 12,
  },
  authEmoji: {
    fontSize: 48,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  authDesc: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 20,
  },
  statusCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  statusEmoji: {
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  statusDesc: {
    fontSize: 16,
    fontWeight: "600",
  },
  trialInfo: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  pricingCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
    gap: 16,
  },
  pricingTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  price: {
    fontSize: 36,
    fontWeight: "700",
  },
  pricePeriod: {
    fontSize: 14,
  },
  pricingDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  upgradeBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  upgradeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  upgradeNote: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  cancelBtn: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
