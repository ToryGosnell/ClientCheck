/**
 * Welcome Screen
 * Introduces new users to the app and guides them to signup
 */

import { ScrollView, Text, View, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";

export default function WelcomeScreen() {
  const router = useRouter();

  const features = [
    {
      icon: "🔍",
      title: "Search Reviews",
      description: "Look up customer reviews and ratings before accepting jobs",
    },
    {
      icon: "⭐",
      title: "Leave Reviews",
      description: "Share your experience with other contractors and tradespeople",
    },
    {
      icon: "🛡️",
      title: "Fair & Verified",
      description: "Both contractors and customers pay to ensure honest reviews",
    },
    {
      icon: "💬",
      title: "Respond to Reviews",
      description: "Address concerns and provide your side of the story",
    },
  ];

  return (
    <ScreenContainer className="bg-background">
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
              <Text className="text-4xl font-bold text-foreground text-center">ClientCheck</Text>
              <Text className="text-lg text-muted text-center">
                The contractor's tool to vet customers before accepting jobs
              </Text>
            </View>

            {/* Tagline */}
            <View className="bg-surface rounded-2xl p-4 border border-border">
              <Text className="text-base text-foreground text-center leading-relaxed">
                Search customer reviews, check payment history, and protect yourself from problem clients.
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

            <View className="flex-row gap-3">
              <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
                <Text className="text-sm text-muted mb-1">Monthly</Text>
                <Text className="text-2xl font-bold text-primary">$9.99</Text>
                <Text className="text-xs text-muted mt-1">/month</Text>
              </View>

              <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
                <Text className="text-sm text-muted mb-1">Yearly</Text>
                <Text className="text-2xl font-bold text-primary">$100</Text>
                <Text className="text-xs text-muted mt-1">/year</Text>
              </View>
            </View>

            <Text className="text-xs text-muted text-center mt-2">
              90-day free trial for contractors • No credit card required
            </Text>
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
              <Text className="text-sm text-muted">✓ 100% Verified Reviews</Text>
            </View>
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-sm text-muted">✓ Both Sides Pay for Fairness</Text>
            </View>
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-sm text-muted">✓ Dispute Resolution Available</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
