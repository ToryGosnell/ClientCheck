import React from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

export default function CustomerOnboarding3Screen() {
  const router = useRouter();

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 gap-6 px-6 py-8 items-center justify-center">
          {/* Progress Indicator */}
          <View className="w-full flex-row gap-2">
            <View className="flex-1 h-1 bg-primary rounded-full" />
            <View className="flex-1 h-1 bg-primary rounded-full" />
            <View className="flex-1 h-1 bg-primary rounded-full" />
          </View>

          {/* Icon */}
          <View className="w-24 h-24 bg-blue-600/20 rounded-full items-center justify-center">
            <Text className="text-6xl">🚀</Text>
          </View>

          {/* Title */}
          <View className="gap-2 items-center">
            <Text className="text-4xl font-bold text-foreground">Ready to Get Started?</Text>
            <Text className="text-base text-muted text-center">
              Join thousands of contractors and customers building a fair marketplace
            </Text>
          </View>

          {/* What You Get */}
          <View className="w-full bg-surface border border-border rounded-xl p-6 gap-4">
            <Text className="text-lg font-bold text-foreground">What You'll Get</Text>

            <View className="gap-3">
              <View className="flex-row gap-3">
                <Text className="text-lg">👁️</Text>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">
                    View Contractor Reviews
                  </Text>
                  <Text className="text-xs text-muted">
                    See what other customers say before hiring
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <Text className="text-lg">💬</Text>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">Respond to Reviews</Text>
                  <Text className="text-xs text-muted">
                    Tell your side of the story if needed
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <Text className="text-lg">⚖️</Text>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">File Disputes</Text>
                  <Text className="text-xs text-muted">
                    Challenge unfair reviews with evidence
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3">
                <Text className="text-lg">📊</Text>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">Track Your Score</Text>
                  <Text className="text-xs text-muted">
                    Monitor your reputation and trends
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Pricing Reminder */}
          <View className="w-full bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 gap-2">
            <Text className="text-sm font-bold text-blue-300">Simple, Fair Pricing</Text>
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-muted">Monthly</Text>
              <Text className="text-lg font-bold text-foreground">$9.99/month</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-muted">Yearly</Text>
              <Text className="text-lg font-bold text-foreground">$100/year (17% off)</Text>
            </View>
            <Text className="text-xs text-muted mt-2">
              Same price as contractors. Cancel monthly plan anytime.
            </Text>
          </View>

          {/* Spacer */}
          <View className="flex-1" />

          {/* Buttons */}
          <View className="w-full gap-3">
            <Pressable
              onPress={() => {
                handlePress();
                router.push("/customer-subscription");
              }}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              className="bg-primary rounded-lg py-4 items-center"
            >
              <Text className="text-white font-bold text-lg">Subscribe Now</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                handlePress();
                router.push("/fair-reviews-faq");
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="py-4 items-center"
            >
              <Text className="text-primary font-semibold">Learn More</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                handlePress();
                router.push("/(tabs)");
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="py-4 items-center"
            >
              <Text className="text-muted font-semibold">Skip for Now</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
