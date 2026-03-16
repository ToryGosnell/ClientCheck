import React from "react";
import { View, Text, Pressable } from "react-native";
import * as Haptics from "expo-haptics";

interface FairReviewsBannerProps {
  variant?: "info" | "success" | "warning";
  showLearnMore?: boolean;
  onLearnMore?: () => void;
}

/**
 * Fair Reviews Banner Component
 * Explains how both-sided payments ensure honest, accurate reviews
 */
export function FairReviewsBanner({
  variant = "info",
  showLearnMore = false,
  onLearnMore,
}: FairReviewsBannerProps) {
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getColors = () => {
    switch (variant) {
      case "success":
        return { bg: "bg-green-900/20", border: "border-green-600/30", text: "text-green-300" };
      case "warning":
        return { bg: "bg-yellow-900/20", border: "border-yellow-600/30", text: "text-yellow-300" };
      default:
        return { bg: "bg-blue-900/20", border: "border-blue-600/30", text: "text-blue-300" };
    }
  };

  const colors = getColors();

  return (
    <View className={`${colors.bg} border ${colors.border} rounded-lg p-4 gap-2`}>
      <Text className={`font-bold ${colors.text}`}>Why Both Sides Pay</Text>
      <Text className="text-xs text-muted leading-relaxed">
        When contractors and customers both pay equally, everyone has skin in the game. This
        prevents fake reviews, frivolous disputes, and ensures fair moderation. Your payment
        directly funds honest, verified feedback.
      </Text>
      {showLearnMore && onLearnMore && (
        <Pressable
          onPress={() => {
            handlePress();
            onLearnMore();
          }}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          className="mt-2"
        >
          <Text className={`text-sm font-semibold ${colors.text}`}>Learn More →</Text>
        </Pressable>
      )}
    </View>
  );
}
