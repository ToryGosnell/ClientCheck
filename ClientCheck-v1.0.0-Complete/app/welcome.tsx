/**
 * Welcome Screen
 * Introduces new users to the app and guides them to signup
 */

import { ScrollView, Text, View, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { ScreenBackground } from "@/components/screen-background";
import {
  CONTRACTOR_PRO_ANNUAL_PRICE_DISPLAY,
  CONTRACTOR_PRO_MONTHLY_PRICE_DISPLAY,
  CUSTOMER_NO_SUBSCRIPTION_REQUIRED_LINE,
} from "@/shared/billing-config";

export default function WelcomeScreen() {
  const router = useRouter();

  const features = [
    {
      icon: "🔍",
      title: "Search & vet",
      description: "Contractor risk intelligence — look up documented experiences before you commit to a job",
    },
    {
      icon: "⭐",
      title: "Leave Reviews",
      description: "Share your experience with other contractors and tradespeople",
    },
    {
      icon: "🛡️",
      title: "Fair & verified",
      description: "Customers can view and respond for free; contractor Pro powers risk intelligence",
    },
    {
      icon: "💬",
      title: "Respond to Reviews",
      description: "Address concerns and provide your side of the story",
    },
  ];

  return (
    <ScreenBackground backgroundKey="auth">
    <ScreenContainer className="bg-transparent">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-between py-8 px-6">
          {/* Hero Section */}
          <View className="gap-6">
            {/* Logo/Icon */}
            <View className="items-center py-4">
              <Text className="text-6xl">🏗️</Text>
            </View>

            {/* Title */}
            <View className="gap-2">
              <Text style={{ fontSize: 36, fontWeight: "800", textAlign: "center", color: "#fff" }}>ClientCheck</Text>
              <Text style={{ fontSize: 18, textAlign: "center", color: "rgba(255,255,255,0.75)" }}>
                Contractor risk intelligence from documented experiences — informed decision support before your next job
              </Text>
            </View>

            {/* Tagline */}
            <View className="bg-surface rounded-2xl p-4 border border-border">
              <Text className="text-base text-foreground text-center leading-relaxed">
                Search documented contractor experiences, spot payment and behavior patterns, and make smarter calls on which jobs to take.
              </Text>
            </View>
          </View>

          {/* Features Grid */}
          <View className="gap-4 my-8">
            <Text className="text-xl font-semibold text-foreground mb-2">How It Works</Text>

            {features.map((feature, index) => (
              <View key={index} className="flex-row gap-4 bg-surface rounded-xl p-4 border border-border">
                <Text className="text-3xl">{feature.icon}</Text>
                <View className="flex-1 gap-1">
                  <Text className="font-semibold text-foreground">{feature.title}</Text>
                  <Text className="text-sm text-muted">{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Pricing Preview */}
          <View className="gap-3 mb-8">
            <Text className="text-xl font-semibold text-foreground">Simple Pricing</Text>

            <View className="bg-surface rounded-xl p-5 border border-border gap-3">
              <View className="flex-row items-baseline gap-2">
                <Text className="text-3xl font-bold text-primary">Contractor free tier</Text>
              </View>
              <Text className="text-sm text-foreground leading-relaxed">
                Start with limited searches. Upgrade to Pro for unlimited search, risk scores, red flags, and alerts (
                {CONTRACTOR_PRO_MONTHLY_PRICE_DISPLAY}/mo or {CONTRACTOR_PRO_ANNUAL_PRICE_DISPLAY}/yr).
              </Text>
              <Text className="text-sm text-muted leading-relaxed">{CUSTOMER_NO_SUBSCRIPTION_REQUIRED_LINE}</Text>
              <View className="gap-2 mt-1">
                <Text className="text-xs text-muted">✓ Valid contractor license number may be required to verify</Text>
                <Text className="text-xs text-muted">✓ No credit card required to start the free tier</Text>
              </View>
            </View>
          </View>

          {/* CTA Buttons */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={() => router.push("/customer-signup")}
              className="bg-primary rounded-full py-4 active:opacity-80"
            >
              <Text className="text-white font-semibold text-center text-lg">Get Started</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(tabs)")}
              className="py-3 active:opacity-80"
            >
              <Text className="text-primary font-semibold text-center">Already have an account? Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Trust Indicators */}
          <View className="gap-2 mt-6 pt-6 border-t border-border">
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-sm text-muted">✓ Contractor free tier, then optional Pro</Text>
            </View>
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-sm text-muted">✓ Verified reviews from real contractors</Text>
            </View>
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-sm text-muted">✓ Dispute resolution available</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
    </ScreenBackground>
  );
}
