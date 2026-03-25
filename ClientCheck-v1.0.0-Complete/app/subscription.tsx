import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { CancelSubscriptionModal } from "@/components/cancel-subscription-modal";
import { cancelSubscription } from "@/lib/cancel-subscription-service";
import { useState } from "react";
import {
  getMembershipDisplayState,
  getVerificationBadge,
  getCustomerMembershipDisplayState,
} from "@/shared/membership";
import {
  getPlanDisplayName,
  CONTRACTOR_ANNUAL_PRICE_DISPLAY,
  CONTRACTOR_PRO_MONTHLY_PRICE_DISPLAY,
  CUSTOMER_IDENTITY_VERIFICATION_PRICE_DISPLAY,
  BILLING_COPY,
} from "@/shared/billing-config";
import { CustomerVerifyBadgeButton } from "@/components/customer-verify-badge-button";

export default function SubscriptionScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { data: subStatus, isLoading } = trpc.subscription.getStatus.useQuery(
    undefined,
    { enabled: isAuthenticated },
  );

  const { data: membership } = trpc.subscription.getMembership.useQuery(
    undefined,
    { enabled: isAuthenticated },
  );

  const isCustomer = user?.role === "customer";
  const membershipDisplay = membership
    ? isCustomer
      ? getCustomerMembershipDisplayState({
          planType: membership.planType,
          subscriptionEndsAt: membership.subscriptionEndsAt,
        })
      : getMembershipDisplayState(membership as never)
    : null;
  const badge =
    !isCustomer && membership ? getVerificationBadge(membership.verificationStatus) : null;
  const planType = membership?.planType ?? "none";
  const isActive = subStatus?.isActive ?? false;
  const showCancelButton =
    !!membership?.stripeSubscriptionId &&
    planType !== "free_customer" &&
    isActive;

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
      <ScreenContainer>
        <View style={s.authPrompt}>
          <Text style={{ fontSize: 48 }}>🔐</Text>
          <Text style={[s.authTitle, { color: colors.foreground }]}>Sign In Required</Text>
          <Text style={[s.authDesc, { color: colors.muted }]}>
            Please sign in to manage your billing.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const billingAmount =
    planType === "customer_monthly" || planType === "customer_identity_verification"
      ? CUSTOMER_IDENTITY_VERIFICATION_PRICE_DISPLAY
      : planType === "free_customer"
        ? "Free"
        : planType === "contractor_pro_monthly"
          ? CONTRACTOR_PRO_MONTHLY_PRICE_DISPLAY
          : planType === "contractor_annual" || planType === "annual_paid"
            ? CONTRACTOR_ANNUAL_PRICE_DISPLAY
            : planType === "verified_contractor_free_year"
              ? "Free"
              : "—";

  const billingFrequency =
    planType === "customer_monthly" || planType === "customer_identity_verification"
      ? "Monthly"
      : planType === "free_customer"
        ? "—"
        : planType === "contractor_pro_monthly"
          ? "Monthly"
          : planType === "contractor_annual" || planType === "annual_paid" || planType === "verified_contractor_free_year"
            ? "Annual"
            : "—";

  const nextBillingDate = membership?.nextBillingDate
    ? new Date(membership.nextBillingDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View style={[s.topBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}>
          <Text style={[s.backText, { color: colors.primary }]}>‹ Back</Text>
        </Pressable>
        <Text style={[s.topTitle, { color: colors.foreground }]}>Billing</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <>
            {/* ── Current Plan Card ──────────────────────────────── */}
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {!!badge && (
                <View style={{ backgroundColor: badge.bgColor, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start", marginBottom: 8 }}>
                  <Text style={{ color: badge.color, fontSize: 13, fontWeight: "600" }}>{badge.label}</Text>
                </View>
              )}

              {membershipDisplay ? (
                <>
                  <Text style={{ fontSize: 44, marginBottom: 4 }}>{membershipDisplay.statusEmoji}</Text>
                  <Text style={[s.cardTitle, { color: colors.foreground }]}>{membershipDisplay.headline}</Text>
                  <Text style={[s.cardDesc, { color: colors.muted }]}>{membershipDisplay.description}</Text>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 44, marginBottom: 4 }}>📋</Text>
                  <Text style={[s.cardTitle, { color: colors.foreground }]}>No Active Plan</Text>
                  <Text style={[s.cardDesc, { color: colors.muted }]}>
                    {isCustomer ? BILLING_COPY.customerFree : "Subscribe to access contractor tools on the platform."}
                  </Text>
                </>
              )}

              {membershipDisplay?.showRenewalReminder && !!membershipDisplay.renewalReminderText && (
                <View style={{ backgroundColor: "#f59e0b18", borderRadius: 8, padding: 12, marginTop: 8 }}>
                  <Text style={{ color: "#f59e0b", fontSize: 13, lineHeight: 18, textAlign: "center" }}>
                    {membershipDisplay.renewalReminderText}
                  </Text>
                </View>
              )}
            </View>

            {/* ── Billing Details ──────────────────────────────── */}
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[s.sectionLabel, { color: colors.muted }]}>BILLING DETAILS</Text>

              <View style={s.detailRow}>
                <Text style={[s.detailLabel, { color: colors.muted }]}>Plan</Text>
                <Text style={[s.detailValue, { color: colors.foreground }]}>{getPlanDisplayName(planType as any)}</Text>
              </View>

              <View style={s.detailRow}>
                <Text style={[s.detailLabel, { color: colors.muted }]}>Amount</Text>
                <Text style={[s.detailValue, { color: colors.foreground }]}>{billingAmount}</Text>
              </View>

              <View style={s.detailRow}>
                <Text style={[s.detailLabel, { color: colors.muted }]}>Frequency</Text>
                <Text style={[s.detailValue, { color: colors.foreground }]}>{billingFrequency}</Text>
              </View>

              {nextBillingDate && (
                <View style={s.detailRow}>
                  <Text style={[s.detailLabel, { color: colors.muted }]}>Next Billing</Text>
                  <Text style={[s.detailValue, { color: colors.foreground }]}>{nextBillingDate}</Text>
                </View>
              )}

              <View style={s.detailRow}>
                <Text style={[s.detailLabel, { color: colors.muted }]}>Status</Text>
                <Text style={[s.detailValue, { color: isActive ? "#22c55e" : "#f59e0b", fontWeight: "700" }]}>
                  {isActive
                    ? subStatus?.status === "customer_free"
                      ? "Free account"
                      : "Active"
                    : subStatus?.status === "expired"
                      ? "Expired"
                      : "Inactive"}
                </Text>
              </View>

              {membership?.paymentMethodOnFile && (
                <View style={s.detailRow}>
                  <Text style={[s.detailLabel, { color: colors.muted }]}>Payment Method</Text>
                  <Text style={[s.detailValue, { color: colors.foreground }]}>Card on file</Text>
                </View>
              )}
            </View>

            {/* ── Actions ─────────────────────────────────────── */}
            {!isCustomer && !isActive && planType === "none" && (
              <View style={{ gap: 12 }}>
                <Pressable
                  onPress={() => router.push("/contractor-paywall" as never)}
                  style={({ pressed }) => [s.actionBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }]}
                >
                  <Text style={s.actionBtnText}>Get Contractor Access</Text>
                </Pressable>
              </View>
            )}

            {isCustomer && planType === "free_customer" && user && !user.isVerified && (
              <View style={{ gap: 10 }}>
                <CustomerVerifyBadgeButton />
                <Pressable
                  onPress={() => router.push("/customer-paywall" as never)}
                  style={({ pressed }) => [
                    s.actionBtn,
                    { borderWidth: 1, borderColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[s.actionBtnText, { color: colors.foreground }]}>
                    Or subscribe in the app (payment sheet)
                  </Text>
                </Pressable>
              </View>
            )}

            {planType === "verified_contractor_free_year" && !membership?.paymentMethodOnFile && (
              <View style={[s.card, { backgroundColor: colors.primary + "08", borderColor: colors.primary }]}>
                <Text style={[s.cardTitle, { color: colors.foreground }]}>Free Year Active</Text>
                <Text style={[s.cardDesc, { color: colors.muted }]}>
                  Your verified contractor license qualifies you for 12 months of free access.
                  After the free period, membership renews at {CONTRACTOR_ANNUAL_PRICE_DISPLAY}/year.
                </Text>
              </View>
            )}

            {showCancelButton && (
              <Pressable
                onPress={() => setShowCancelModal(true)}
                style={({ pressed }) => [s.cancelBtn, { borderColor: colors.error }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[s.cancelBtnText, { color: colors.error }]}>Cancel Subscription</Text>
              </Pressable>
            )}

            {/* ── Info ────────────────────────────────────────── */}
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[s.sectionLabel, { color: colors.muted }]}>ABOUT YOUR BILLING</Text>
              <Text style={[s.infoText, { color: colors.muted }]}>
                {BILLING_COPY.paymentSecure}
              </Text>
              <Text style={[s.infoText, { color: colors.muted }]}>
                {isCustomer ? BILLING_COPY.customerFree : BILLING_COPY.renewalReminder}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <CancelSubscriptionModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirmCancel={handleCancelSubscription}
        subscriptionPlan={
          planType === "customer_monthly" ||
          planType === "customer_identity_verification" ||
          planType === "contractor_pro_monthly"
            ? "monthly"
            : "yearly"
        }
        nextBillingDate={membership?.nextBillingDate ?? new Date(Date.now() + 30 * 86400000).toISOString()}
      />
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  backBtn: { width: 60 },
  backText: { fontSize: 17, fontWeight: "500" },
  topTitle: { fontSize: 17, fontWeight: "600", flex: 1, textAlign: "center" },
  scroll: { padding: 16, paddingBottom: 100, gap: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", minHeight: 300 },
  authPrompt: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  authTitle: { fontSize: 20, fontWeight: "700" },
  authDesc: { fontSize: 15, textAlign: "center", lineHeight: 20 },
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 12, alignItems: "center" },
  cardTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  cardDesc: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, alignSelf: "flex-start" },
  detailRow: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: "600" },
  actionBtn: { borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelBtn: { borderWidth: 2, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  cancelBtnText: { fontSize: 16, fontWeight: "600" },
  infoText: { fontSize: 13, lineHeight: 18, textAlign: "center" },
});
