import React, { useEffect } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

export default function CustomerPaymentSuccessScreen() {
  const router = useRouter();

  useEffect(() => {
    // Haptic feedback on success
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 gap-6 px-6 py-8 items-center justify-center">
          {/* Success Icon */}
          <View className="w-20 h-20 bg-green-600/20 rounded-full items-center justify-center">
            <Text className="text-5xl">✓</Text>
          </View>

          {/* Success Message */}
          <View className="gap-2 items-center">
            <Text className="text-3xl font-bold text-foreground">Welcome!</Text>
            <Text className="text-base text-muted text-center">
              Your subscription is now active. You're part of the fair review community.
            </Text>
          </View>

          {/* What's Included */}
          <View className="w-full bg-surface border border-border rounded-xl p-4 gap-3">
            <Text className="font-bold text-foreground">You Now Have Access To:</Text>
            <View className="gap-2">
              <View className="flex-row gap-3">
                <Text className="text-lg">👁️</Text>
                <Text className="flex-1 text-sm text-muted">
                  View all contractor reviews and ratings
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-lg">💬</Text>
                <Text className="flex-1 text-sm text-muted">
                  Respond to reviews about your business
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-lg">⚖️</Text>
                <Text className="flex-1 text-sm text-muted">
                  File disputes with evidence and photos
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-lg">📊</Text>
                <Text className="flex-1 text-sm text-muted">
                  Track your reputation score and trends
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-lg">🎯</Text>
                <Text className="flex-1 text-sm text-muted">
                  Priority support from our team
                </Text>
              </View>
            </View>
          </View>

          {/* Fair Reviews Commitment */}
          <View className="w-full bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 gap-2">
            <Text className="font-bold text-blue-300">Our Commitment to Fair Reviews</Text>
            <Text className="text-xs text-muted leading-relaxed">
              By paying equally with contractors, you're ensuring that both sides have skin in the
              game. This prevents fake reviews, frivolous disputes, and creates a trusted community
              where honest feedback matters. Your payment directly funds independent moderation and
              fair dispute resolution.
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="w-full gap-3">
            <Pressable
              onPress={() => {
                handlePress();
                router.push("/(tabs)");
              }}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              className="bg-primary rounded-lg py-4 items-center"
            >
              <Text className="text-white font-bold text-lg">Continue to App</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                handlePress();
                router.push("/subscription");
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="border border-border rounded-lg py-4 items-center"
            >
              <Text className="text-foreground font-semibold">Manage Subscription</Text>
            </Pressable>
          </View>

          {/* Subscription Details */}
          <View className="w-full bg-surface rounded-lg p-4 gap-2">
            <Text className="text-xs font-semibold text-muted">SUBSCRIPTION DETAILS</Text>
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">Plan:</Text>
              <Text className="text-sm font-semibold text-foreground">Monthly ($9.99)</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">Renews:</Text>
              <Text className="text-sm font-semibold text-foreground">April 13, 2026</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-muted">Status:</Text>
              <Text className="text-sm font-semibold text-green-500">Active</Text>
            </View>
          </View>

          {/* Support */}
          <View className="items-center gap-1">
            <Text className="text-xs text-muted">Questions?</Text>
            <Pressable onPress={() => router.push("/contact-support")}>
              <Text className="text-sm text-primary font-semibold">Contact Support</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
