import { View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";
import * as Haptics from "expo-haptics";

interface CancelSubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmCancel: () => Promise<void>;
  subscriptionPlan?: "monthly" | "yearly";
  nextBillingDate?: string;
}

export function CancelSubscriptionModal({
  visible,
  onClose,
  onConfirmCancel,
  subscriptionPlan = "monthly",
  nextBillingDate,
}: CancelSubscriptionModalProps) {
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleConfirmCancel = async () => {
    try {
      setIsLoading(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await onConfirmCancel();
      setShowConfirmation(false);
      onClose();
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      >
        <View
          className="rounded-t-3xl p-6 pb-8"
          style={{ backgroundColor: colors.background }}
        >
          <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={false}>
            {!showConfirmation ? (
              <>
                {/* Header */}
                <View className="mb-6">
                  <Text className="text-2xl font-bold text-foreground mb-2">
                    Cancel Subscription?
                  </Text>
                  <Text className="text-sm text-muted">
                    We'd hate to see you go. Here's what you need to know:
                  </Text>
                </View>

                {/* Important Info */}
                <View
                  className="rounded-xl p-4 mb-6 border"
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  }}
                >
                  <View className="mb-4">
                    <Text className="text-xs text-muted mb-1">
                      PLAN DETAILS
                    </Text>
                    <Text className="text-base font-semibold text-foreground">
                      {subscriptionPlan === "yearly" ? "Annual" : "Monthly"} Plan
                    </Text>
                  </View>

                  {nextBillingDate && (
                    <View>
                      <Text className="text-xs text-muted mb-1">
                        NEXT BILLING DATE
                      </Text>
                      <Text className="text-base font-semibold text-foreground">
                        {new Date(nextBillingDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </Text>
                      <Text className="text-xs text-muted mt-2">
                        Your access will end on this date. No refunds will be issued.
                      </Text>
                    </View>
                  )}
                </View>

                {/* What You'll Lose */}
                <View className="mb-6">
                  <Text className="text-sm font-semibold text-foreground mb-3">
                    You'll lose access to:
                  </Text>
                  {[
                    "Unlimited customer searches",
                    "Real-time call detection",
                    "Payment history tracking",
                    "Red flag alerts",
                    "Voice review recording",
                  ].map((feature, index) => (
                    <View key={index} className="flex-row items-center mb-2">
                      <Text className="text-lg text-error mr-2">✕</Text>
                      <Text className="text-sm text-muted flex-1">{feature}</Text>
                    </View>
                  ))}
                </View>

                {/* Action Buttons */}
                <View className="gap-3">
                  <TouchableOpacity
                    onPress={() => setShowConfirmation(true)}
                    className="w-full py-4 rounded-lg items-center justify-center border-2"
                    style={{ borderColor: colors.error }}
                    activeOpacity={0.8}
                  >
                    <Text className="text-error font-bold text-base">
                      Yes, Cancel My Subscription
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={onClose}
                    className="w-full py-4 rounded-lg items-center justify-center"
                    style={{ backgroundColor: colors.primary }}
                    activeOpacity={0.8}
                  >
                    <Text className="text-white font-semibold text-base">
                      Keep My Subscription
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Confirmation Screen */}
                <View className="mb-6 items-center">
                  <View
                    className="w-16 h-16 rounded-full items-center justify-center mb-4"
                    style={{ backgroundColor: colors.error }}
                  >
                    <Text className="text-3xl">⚠️</Text>
                  </View>
                  <Text className="text-2xl font-bold text-foreground text-center mb-2">
                    Are you sure?
                  </Text>
                  <Text className="text-sm text-muted text-center">
                    This will permanently cancel your subscription. You can always
                    resubscribe later.
                  </Text>
                </View>

                {/* Final Confirmation Buttons */}
                <View className="gap-3">
                  <TouchableOpacity
                    onPress={handleConfirmCancel}
                    disabled={isLoading}
                    className="w-full py-4 rounded-lg items-center justify-center"
                    style={{
                      backgroundColor: colors.error,
                      opacity: isLoading ? 0.6 : 1,
                    }}
                    activeOpacity={0.8}
                  >
                    <Text className="text-white font-bold text-base">
                      {isLoading ? "Cancelling..." : "Permanently Cancel"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setShowConfirmation(false)}
                    disabled={isLoading}
                    className="w-full py-4 rounded-lg items-center justify-center border-2"
                    style={{
                      borderColor: colors.border,
                      opacity: isLoading ? 0.6 : 1,
                    }}
                    activeOpacity={0.8}
                  >
                    <Text className="text-foreground font-semibold text-base">
                      Wait, Don't Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
