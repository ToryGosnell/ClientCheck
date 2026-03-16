import React from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

export default function CustomerOnboarding1Screen() {
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
            <View className="flex-1 h-1 bg-border rounded-full" />
            <View className="flex-1 h-1 bg-border rounded-full" />
          </View>

          {/* Icon */}
          <View className="w-24 h-24 bg-blue-600/20 rounded-full items-center justify-center">
            <Text className="text-6xl">👋</Text>
          </View>

          {/* Title */}
          <View className="gap-2 items-center">
            <Text className="text-4xl font-bold text-foreground">Welcome!</Text>
            <Text className="text-base text-muted text-center">
              You're about to join a community of honest contractors and customers
            </Text>
          </View>

          {/* Content */}
          <View className="w-full bg-surface border border-border rounded-xl p-6 gap-4">
            <Text className="text-lg font-bold text-foreground">Here's What You Need to Know</Text>

            <View className="gap-4">
              <View className="gap-2">
                <Text className="text-base font-semibold text-foreground">💰 Fair Pricing</Text>
                <Text className="text-sm text-muted">
                  You pay the same as contractors: $9.99/month or $100/year. No surprises, no
                  special treatment.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-base font-semibold text-foreground">✅ Honest Reviews</Text>
                <Text className="text-sm text-muted">
                  Because everyone pays, fake reviews and frivolous disputes are rare. You're
                  paying for quality feedback.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-base font-semibold text-foreground">⚖️ Fair Moderation</Text>
                <Text className="text-sm text-muted">
                  Our team treats both sides equally. Disputes are resolved fairly with evidence
                  and context.
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-base font-semibold text-foreground">🔒 Your Privacy</Text>
                <Text className="text-sm text-muted">
                  Contractors can see your payment history and project patterns, but never your
                  personal details.
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
                router.push("/customer-onboarding-2");
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
