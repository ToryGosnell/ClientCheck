import React from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

export default function CustomerOnboarding2Screen() {
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
            <View className="flex-1 h-1 bg-border rounded-full" />
          </View>

          {/* Icon */}
          <View className="w-24 h-24 bg-green-600/20 rounded-full items-center justify-center">
            <Text className="text-6xl">⚖️</Text>
          </View>

          {/* Title */}
          <View className="gap-2 items-center">
            <Text className="text-4xl font-bold text-foreground">Why Both Sides Pay</Text>
            <Text className="text-base text-muted text-center">
              The secret to honest, trustworthy reviews
            </Text>
          </View>

          {/* Content */}
          <View className="w-full bg-green-900/20 border border-green-600/30 rounded-xl p-6 gap-4">
            <View className="gap-4">
              <View className="gap-2">
                <Text className="text-base font-semibold text-green-300">
                  ✅ Prevents Fake Reviews
                </Text>
                <Text className="text-sm text-muted">
                  When contractors pay to use the platform, they won't waste money filing fake
                  reviews to hurt competitors. The cost creates accountability.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-base font-semibold text-green-300">
                  ✅ Stops Frivolous Disputes
                </Text>
                <Text className="text-sm text-muted">
                  When you pay to participate, you won't file complaints just to be difficult. You
                  have skin in the game too.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-base font-semibold text-green-300">
                  ✅ Ensures Fair Moderation
                </Text>
                <Text className="text-sm text-muted">
                  Both sides fund our moderation team. We have no incentive to favor contractors
                  or customers—we serve both equally.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-base font-semibold text-green-300">
                  ✅ Creates Quality Community
                </Text>
                <Text className="text-sm text-muted">
                  Free sites are flooded with spam. Here, only serious, committed people
                  participate. That's worth paying for.
                </Text>
              </View>
            </View>
          </View>

          {/* Comparison */}
          <View className="w-full gap-3">
            <Text className="text-lg font-bold text-foreground">How We're Different</Text>

            <View className="flex-row gap-3">
              <View className="flex-1 bg-red-900/20 border border-red-600/30 rounded-lg p-3 gap-2">
                <Text className="text-sm font-bold text-red-300">Free Review Sites</Text>
                <Text className="text-xs text-muted">
                  • Flooded with fake reviews • No accountability • Spam everywhere • Unfair
                  moderation
                </Text>
              </View>

              <View className="flex-1 bg-green-900/20 border border-green-600/30 rounded-lg p-3 gap-2">
                <Text className="text-sm font-bold text-green-300">ClientCheck</Text>
                <Text className="text-xs text-muted">
                  • Verified members only • Both sides pay equally • Fair moderation • Honest
                  feedback
                </Text>
              </View>
            </View>
          </View>

          {/* Spacer */}
          <View className="flex-1" />

          {/* Buttons */}
          <View className="w-full gap-3">
            <Pressable
              onPress={() => {
                handlePress();
                router.push("/customer-onboarding-3");
              }}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              className="bg-primary rounded-lg py-4 items-center"
            >
              <Text className="text-white font-bold text-lg">Continue</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                handlePress();
                router.push("/(tabs)");
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="py-4 items-center"
            >
              <Text className="text-primary font-semibold">Skip for Now</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
