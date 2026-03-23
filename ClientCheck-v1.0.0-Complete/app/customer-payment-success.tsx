import { useEffect, useRef } from "react";
import { ScrollView, View, Text, Pressable, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import { getPlanDisplayName, getPlanPrice } from "@/shared/billing-config";
import { track } from "@/lib/analytics";

export default function CustomerPaymentSuccessScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ plan?: string; paymentIntentId?: string }>();

  const { data: subStatus, isLoading } = trpc.subscription.getStatus.useQuery();

  const verification = params.paymentIntentId
    ? trpc.payments.verifyPayment.useQuery({ paymentIntentId: params.paymentIntentId })
    : null;

  const paymentVerified = verification?.data?.success ?? subStatus?.isActive ?? false;
  const paymentTracked = useRef(false);

  useEffect(() => {
    if (paymentVerified) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (!paymentTracked.current) {
        paymentTracked.current = true;
        track("payment_successful", { plan: params.plan });
      }
    }
  }, [paymentVerified, params.plan]);

  const planLabel = params.plan === "yearly" ? "Annual ($120.00/year)" : "Monthly ($9.99/month)";
  const renewDate = subStatus?.daysRemaining
    ? new Date(Date.now() + (subStatus.daysRemaining ?? 30) * 86400000).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ flex: 1, gap: 24, paddingHorizontal: 24, paddingVertical: 32, alignItems: "center", justifyContent: "center" }}>

          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : paymentVerified ? (
            <>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(34,197,94,0.15)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 48, color: "#22c55e" }}>✓</Text>
              </View>

              <View style={{ gap: 8, alignItems: "center" }}>
                <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground }}>Welcome!</Text>
                <Text style={{ fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 22 }}>
                  Your subscription is now active. You're part of the fair review community.
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(239,68,68,0.15)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 48 }}>!</Text>
              </View>

              <View style={{ gap: 8, alignItems: "center" }}>
                <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground }}>Payment Pending</Text>
                <Text style={{ fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 22 }}>
                  We haven't confirmed your payment yet. If you just completed payment, it may take a moment to process.
                </Text>
              </View>
            </>
          )}

          {/* What's Included */}
          <View style={{ width: "100%", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ fontWeight: "700", color: colors.foreground }}>You Now Have Access To:</Text>
            {[
              { icon: "👁️", text: "View all contractor reviews and ratings" },
              { icon: "💬", text: "Respond to reviews about your business" },
              { icon: "⚖️", text: "File disputes with evidence and photos" },
              { icon: "📊", text: "Track your reputation score and trends" },
            ].map((item) => (
              <View key={item.icon} style={{ flexDirection: "row", gap: 12 }}>
                <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                <Text style={{ flex: 1, fontSize: 14, color: colors.muted }}>{item.text}</Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View style={{ width: "100%", gap: 12 }}>
            <Pressable
              onPress={() => router.push("/legal-acceptance" as never)}
              style={({ pressed }) => [
                { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: "center" },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 17 }}>Continue</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/subscription")}
              style={({ pressed }) => [
                { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 16, alignItems: "center" },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={{ color: colors.foreground, fontWeight: "600" }}>Manage Subscription</Text>
            </Pressable>
          </View>

          {/* Subscription Details */}
          <View style={{ width: "100%", backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: colors.muted, letterSpacing: 0.5 }}>SUBSCRIPTION DETAILS</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, color: colors.muted }}>Plan:</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>{planLabel}</Text>
            </View>
            {!!renewDate && (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, color: colors.muted }}>Renews:</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>{renewDate}</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, color: colors.muted }}>Status:</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: paymentVerified ? "#22c55e" : "#f59e0b" }}>
                {paymentVerified ? "Active" : "Pending"}
              </Text>
            </View>
          </View>

          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 11, color: colors.muted }}>Questions?</Text>
            <Pressable onPress={() => router.push("/contact-support" as never)}>
              <Text style={{ fontSize: 14, color: colors.primary, fontWeight: "600" }}>Contact Support</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
