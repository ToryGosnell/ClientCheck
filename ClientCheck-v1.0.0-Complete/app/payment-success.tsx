import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState, useEffect } from "react";
import * as Haptics from "expo-haptics";
import { CancelSubscriptionModal } from "@/components/cancel-subscription-modal";
import { cancelSubscription } from "@/lib/cancel-subscription-service";
import { useAuth } from "@/hooks/use-auth";

interface PaymentDetails {
  planType: "monthly" | "yearly";
  amount: number;
  nextBillingDate: string;
  subscriptionId: string;
  features: string[];
}

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    // Trigger haptic feedback on success
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAnimation(true);

    // Parse payment details from route params
    if (params.planType && params.amount && params.nextBillingDate) {
      setPaymentDetails({
        planType: (params.planType as "monthly" | "yearly") || "monthly",
        amount: parseInt(params.amount as string) || 0,
        nextBillingDate: params.nextBillingDate as string,
        subscriptionId: params.subscriptionId as string || "",
        features: [
          "Unlimited customer searches",
          "Real-time call detection",
          "Payment history tracking",
          "Red flag alerts",
          "Voice review recording",
          "Contractor directory access",
        ],
      });
    }
  }, [params]);

  const handleContinue = () => {
    router.replace("/");
  };

  const handleViewSubscription = () => {
    router.push("/subscription");
  };

  const handleCancelSubscription = async () => {
    if (!user?.id) return;
    try {
      await cancelSubscription({
        userId: String(user.id),
        reason: "User cancelled after payment",
      });
      setShowCancelModal(false);
      router.replace("/");
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
    }
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="flex-1 justify-center items-center px-6 py-8">
          {/* Success Icon */}
          <View
            className={`w-20 h-20 rounded-full items-center justify-center mb-6 ${
              showAnimation ? "scale-100" : "scale-0"
            }`}
            style={{
              backgroundColor: colors.success,
              opacity: showAnimation ? 1 : 0,
            }}
          >
            <Text className="text-4xl">✓</Text>
          </View>

          {/* Success Message */}
          <Text className="text-3xl font-bold text-foreground text-center mb-2">
            Payment Successful!
          </Text>
          <Text className="text-base text-muted text-center mb-8">
            Your subscription is now active. Welcome to premium!
          </Text>

          {/* Payment Details Card */}
          {paymentDetails && (
            <View
              className="w-full bg-surface rounded-2xl p-6 mb-8 border"
              style={{ borderColor: colors.border }}
            >
              {/* Plan Type */}
              <View className="mb-6">
                <Text className="text-sm text-muted mb-1">Plan</Text>
                <Text className="text-2xl font-bold text-foreground">
                  {paymentDetails.planType === "yearly" ? "Annual" : "Monthly"} Plan
                </Text>
              </View>

              {/* Amount */}
              <View className="mb-6 pb-6 border-b" style={{ borderColor: colors.border }}>
                <Text className="text-sm text-muted mb-1">Amount Charged</Text>
                <Text className="text-3xl font-bold text-primary">
                  ${(paymentDetails.amount / 100).toFixed(2)}
                </Text>
                <Text className="text-xs text-muted mt-1">
                  {paymentDetails.planType === "yearly" ? "per year" : "per month"}
                </Text>
              </View>

              {/* Next Billing Date */}
              <View>
                <Text className="text-sm text-muted mb-1">Next Billing Date</Text>
                <Text className="text-base font-semibold text-foreground">
                  {new Date(paymentDetails.nextBillingDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </View>
            </View>
          )}

          {/* Features List */}
          <View className="w-full mb-8">
            <Text className="text-lg font-semibold text-foreground mb-4">
              You now have access to:
            </Text>
            {paymentDetails?.features.map((feature, index) => (
              <View key={index} className="flex-row items-center mb-3">
                <View
                  className="w-6 h-6 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: colors.success }}
                >
                  <Text className="text-white text-xs font-bold">✓</Text>
                </View>
                <Text className="text-base text-foreground flex-1">{feature}</Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View className="w-full gap-3">
            <TouchableOpacity
              onPress={handleContinue}
              className="w-full py-4 rounded-lg items-center justify-center"
              style={{ backgroundColor: colors.primary }}
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-base">Continue to App</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleViewSubscription}
              className="w-full py-4 rounded-lg items-center justify-center border"
              style={{ borderColor: colors.border }}
              activeOpacity={0.8}
            >
              <Text className="text-foreground font-semibold text-base">
                Manage Subscription
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowCancelModal(true)}
              className="w-full py-4 rounded-lg items-center justify-center border-2"
              style={{ borderColor: colors.error }}
              activeOpacity={0.8}
            >
              <Text className="font-semibold text-base" style={{ color: colors.error }}>
                Cancel Subscription
              </Text>
            </TouchableOpacity>
          </View>

          {/* Support Message */}
          <Text className="text-xs text-muted text-center mt-8">
            Questions? Contact{" "}
            <Text className="text-primary font-semibold">support@clientcheck.app</Text>
          </Text>
        </View>
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
