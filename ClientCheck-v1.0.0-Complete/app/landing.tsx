import React, { useState, useEffect } from "react";
import { ScrollView, View, Text, Pressable, Image, Linking } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

export default function LandingScreen() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    // Generate QR code URL (using a QR code API)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent("https://contractorvet.app/download")}`;
    setQrCode(qrUrl);
  }, []);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openLink = (url: string) => {
    handlePress();
    Linking.openURL(url);
  };

  return (
    <ScreenContainer containerClassName="bg-gradient-to-b from-blue-900 to-slate-900">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 gap-8 px-6 py-8">
          {/* Hero Section */}
          <View className="items-center gap-4 mt-4">
            <Text className="text-5xl font-bold text-white text-center">
              Know Your Customers
            </Text>
            <Text className="text-xl text-blue-200 text-center">
              Before you accept the job
            </Text>
          </View>

          {/* Problem Section */}
          <View className="bg-red-900/30 border border-red-500/50 rounded-2xl p-6 gap-4">
            <Text className="text-2xl font-bold text-white">The Problem</Text>
            <View className="gap-3">
              <View className="flex-row gap-3">
                <Text className="text-2xl">⏰</Text>
                <Text className="flex-1 text-base text-gray-100">
                  Scope creep wastes your time and money
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-2xl">👻</Text>
                <Text className="flex-1 text-base text-gray-100">
                  Customers ghost you mid-project
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-2xl">💸</Text>
                <Text className="flex-1 text-base text-gray-100">
                  Payment disputes cost you thousands
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-2xl">⚖️</Text>
                <Text className="flex-1 text-base text-gray-100">
                  Unreasonable customers leave bad reviews
                </Text>
              </View>
            </View>
          </View>

          {/* Solution Section */}
          <View className="bg-green-900/30 border border-green-500/50 rounded-2xl p-6 gap-4">
            <Text className="text-2xl font-bold text-white">The Solution</Text>
            <View className="gap-3">
              <View className="flex-row gap-3">
                <Text className="text-2xl">🔍</Text>
                <Text className="flex-1 text-base text-gray-100">
                  See customer payment history before accepting
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-2xl">🚨</Text>
                <Text className="flex-1 text-base text-gray-100">
                  Get instant alerts during incoming calls
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-2xl">⭐</Text>
                <Text className="flex-1 text-base text-gray-100">
                  Read real reviews from other contractors
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-2xl">🛡️</Text>
                <Text className="flex-1 text-base text-gray-100">
                  Protect your reputation with dispute management
                </Text>
              </View>
            </View>
          </View>

          {/* Two-Sided Payment Model Section */}
          <View className="bg-purple-900/30 border border-purple-500/50 rounded-2xl p-6 gap-4">
            <Text className="text-2xl font-bold text-white">Fair Reviews, Guaranteed</Text>
            <Text className="text-base text-gray-100 leading-relaxed">
              Both contractors AND customers pay equally. When both sides have skin in the game,
              everyone behaves honestly.
            </Text>
            <View className="gap-3 mt-2">
              <View className="flex-row gap-3">
                <Text className="text-lg">✅</Text>
                <View className="flex-1">
                  <Text className="font-semibold text-gray-100">Prevents Fake Reviews</Text>
                  <Text className="text-sm text-gray-300">
                    Cost deters spam and frivolous disputes
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-lg">⚖️</Text>
                <View className="flex-1">
                  <Text className="font-semibold text-gray-100">Fair Moderation</Text>
                  <Text className="text-sm text-gray-300">
                    Both sides fund independent review process
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-lg">🔒</Text>
                <View className="flex-1">
                  <Text className="font-semibold text-gray-100">Trusted Community</Text>
                  <Text className="text-sm text-gray-300">
                    Committed members only, no throwaway accounts
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Features Section */}
          <View className="gap-4">
            <Text className="text-2xl font-bold text-white">Key Features</Text>
            <View className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 gap-2">
              <Text className="text-lg font-semibold text-white">📞 Call Detection Overlay</Text>
              <Text className="text-sm text-gray-300">
                See customer risk score and payment history during incoming calls
              </Text>
            </View>
            <View className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 gap-2">
              <Text className="text-lg font-semibold text-white">⚠️ Red Flags & Ratings</Text>
              <Text className="text-sm text-gray-300">
                6-category rating system: payment, communication, scope clarity, professionalism,
                follow-up, disputes
              </Text>
            </View>
            <View className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 gap-2">
              <Text className="text-lg font-semibold text-white">💰 Subscription Plans</Text>
              <Text className="text-sm text-gray-300">
                Contractors: 90-day free trial, then $9.99/month or $100/year
              </Text>
              <Text className="text-sm text-gray-300">
                Customers: $9.99/month or $100/year (same fair price)
              </Text>
            </View>
            <View className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 gap-2">
              <Text className="text-lg font-semibold text-white">🤝 Referral Rewards</Text>
              <Text className="text-sm text-gray-300">
                Invite contractors → earn free months: 1 referral = 1 month free
              </Text>
            </View>
          </View>

          {/* Pricing Section */}
          <View className="gap-4">
            <Text className="text-2xl font-bold text-white">Pricing (Same for Everyone)</Text>
            <Text className="text-sm text-gray-300 text-center">
              Contractors and customers pay equally. No special treatment, no unfair advantage.
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1 bg-blue-600/50 border border-blue-400 rounded-xl p-4 gap-2">
                <Text className="text-lg font-bold text-white">Monthly</Text>
                <Text className="text-3xl font-bold text-white">$9.99</Text>
                <Text className="text-xs text-blue-200">/month</Text>
              </View>
              <View className="flex-1 bg-green-600/50 border border-green-400 rounded-xl p-4 gap-2">
                <Text className="text-lg font-bold text-white">Yearly</Text>
                <Text className="text-3xl font-bold text-white">$100</Text>
                <Text className="text-xs text-green-200">/year (save 17%)</Text>
              </View>
            </View>
          </View>

          {/* QR Code Section */}
          {qrCode && (
            <View className="items-center gap-4 bg-white/10 rounded-2xl p-6">
              <Text className="text-xl font-bold text-white">Download Now</Text>
              <Image
                source={{ uri: qrCode }}
                style={{ width: 200, height: 200 }}
                className="rounded-lg"
              />
              <Text className="text-sm text-gray-300 text-center">
                Scan with your phone camera to download
              </Text>
            </View>
          )}

          {/* CTA Buttons */}
          <View className="gap-3">
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
              className="bg-blue-600 rounded-xl py-4 items-center"
            >
              <Text className="text-white font-bold text-lg">Start Free Trial</Text>
            </Pressable>

            <Pressable
              onPress={() => openLink("https://contractorvet.app")}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              className="bg-slate-700 rounded-xl py-4 items-center"
            >
              <Text className="text-white font-bold text-lg">Learn More</Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View className="items-center gap-2 pb-4">
            <Text className="text-xs text-gray-400">
              Contractors: No credit card for trial • Cancel anytime
            </Text>
            <Text className="text-xs text-gray-400">
              Customers: Fair pricing • Transparent moderation • Honest reviews
            </Text>
            <View className="flex-row gap-4 mt-2">
              <Pressable onPress={() => openLink("https://contractorvet.app/privacy")}>
                <Text className="text-xs text-blue-400">Privacy</Text>
              </Pressable>
              <Pressable onPress={() => openLink("https://contractorvet.app/terms")}>
                <Text className="text-xs text-blue-400">Terms</Text>
              </Pressable>
              <Pressable onPress={() => openLink("https://contractorvet.app/contact")}>
                <Text className="text-xs text-blue-400">Contact</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
