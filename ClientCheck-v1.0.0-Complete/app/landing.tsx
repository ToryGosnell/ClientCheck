import React, { useState, useEffect } from "react";
import { ScrollView, View, Text, Pressable, Image, Linking } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  CONTRACTOR_PRO_ANNUAL_PRICE_DISPLAY,
  CONTRACTOR_PRO_MONTHLY_PRICE_DISPLAY,
  CUSTOMER_NO_SUBSCRIPTION_REQUIRED_LINE,
} from "@/shared/billing-config";

function openAccount(router: ReturnType<typeof useRouter>, preset: "contractor" | "customer") {
  router.push({ pathname: "/select-account", params: { preset } } as never);
}

export default function LandingScreen() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    // Generate QR code URL (using a QR code API)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent("https://clientcheck.app/download")}`;
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
              Contractor risk intelligence
            </Text>
            <Text className="text-xl text-blue-200 text-center px-2">
              Documented contractor experiences for informed job decisions — plus a fair path for customers to respond and dispute.
            </Text>
          </View>

          {/* Account entry — compact, premium */}
          <View className="bg-slate-800/60 border border-slate-600/50 rounded-2xl p-5 gap-4">
            <Text className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Sign in or create an account
            </Text>
            <Text className="text-center text-xs text-slate-500 -mt-2">
              Same secure sign-in for new and returning users
            </Text>
            <View className="gap-2">
              <Text className="text-sm font-bold text-slate-300">Contractors</Text>
              <Pressable
                onPress={() => { handlePress(); openAccount(router, "contractor"); }}
                className="bg-blue-600/90 rounded-xl py-5 items-center border border-blue-400/30"
                style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
              >
                <Text className="text-white font-bold text-lg">Contractor sign in</Text>
              </Pressable>
              <Text className="text-center text-xs text-slate-500 -mt-1">
                New or returning — same secure sign-in
              </Text>
            </View>
            <View className="gap-2">
              <Text className="text-sm font-bold text-slate-300">Customers</Text>
              <Pressable
                onPress={() => { handlePress(); openAccount(router, "customer"); }}
                className="bg-emerald-700/80 rounded-xl py-5 items-center border border-emerald-500/30"
                style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
              >
                <Text className="text-white font-bold text-lg">Customer sign in</Text>
              </Pressable>
              <Text className="text-center text-xs text-slate-500 -mt-1">
                New or returning — same secure sign-in
              </Text>
            </View>
          </View>

          {/* Why it matters */}
          <View className="bg-slate-800/40 border border-slate-600/40 rounded-2xl p-6 gap-4">
            <Text className="text-2xl font-bold text-white">Why teams use ClientCheck</Text>
            <View className="gap-3">
              <View className="flex-row gap-3">
                <Text className="text-2xl">📋</Text>
                <Text className="flex-1 text-base text-gray-100">
                  Go beyond gut feel — see patterns from real jobs before you commit.
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-2xl">✅</Text>
                <Text className="flex-1 text-base text-gray-100">
                  Verified contractor experiences, not anonymous pile-ons.
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-2xl">⚖️</Text>
                <Text className="flex-1 text-base text-gray-100">
                  Customers can access disputes and responses — transparency built in.
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-2xl">🛡️</Text>
                <Text className="flex-1 text-base text-gray-100">
                  Fair moderation and shared accountability — not a blacklist.
                </Text>
              </View>
            </View>
          </View>

          {/* Platform snapshot */}
          <View className="bg-emerald-900/25 border border-emerald-500/40 rounded-2xl p-6 gap-4">
            <Text className="text-2xl font-bold text-white">What you get</Text>
            <View className="gap-3">
              <View className="flex-row gap-3">
                <Text className="text-2xl">🔍</Text>
                <Text className="flex-1 text-base text-gray-100">
                  Search and preview risk signals before you accept the job.
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-2xl">🚨</Text>
                <Text className="flex-1 text-base text-gray-100">
                  Alerts and call-time context when you need it most.
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-2xl">⭐</Text>
                <Text className="flex-1 text-base text-gray-100">
                  Category-level ratings from contractors who did the work.
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-2xl">🤝</Text>
                <Text className="flex-1 text-base text-gray-100">
                  Dispute tools so both sides can be heard.
                </Text>
              </View>
            </View>
          </View>

          {/* Two-Sided Payment Model Section */}
          <View className="bg-purple-900/30 border border-purple-500/50 rounded-2xl p-6 gap-4">
            <Text className="text-2xl font-bold text-white">Built for fairness</Text>
            <Text className="text-base text-gray-100 leading-relaxed">
              Contractors and customers both have a stake in accurate, civil reporting. That keeps signal high,
              reduces bad-faith noise, and makes dispute resolution possible.
            </Text>
            <View className="gap-3 mt-2">
              <View className="flex-row gap-3">
                <Text className="text-lg">✅</Text>
                <View className="flex-1">
                  <Text className="font-semibold text-gray-100">Prevents Fake Reviews</Text>
                  <Text className="text-sm text-gray-300">
                    Reduces spam and low-effort noise
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-lg">⚖️</Text>
                <View className="flex-1">
                  <Text className="font-semibold text-gray-100">Fair Moderation</Text>
                  <Text className="text-sm text-gray-300">
                    Clear rules and moderation both sides can trust
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
                Contractors: free tier with limited searches; Pro {CONTRACTOR_PRO_MONTHLY_PRICE_DISPLAY}/mo or{" "}
                {CONTRACTOR_PRO_ANNUAL_PRICE_DISPLAY}/yr for unlimited search, risk scores, red flags, and alerts.
              </Text>
              <Text className="text-sm text-gray-300">{CUSTOMER_NO_SUBSCRIPTION_REQUIRED_LINE}</Text>
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
            <Text className="text-2xl font-bold text-white">Simple contractor pricing</Text>
            <Text className="text-sm text-gray-300 text-center">
              Contractor Pro: unlimited search, risk scores, red flags, and alerts. Upgrade when you outgrow the free
              tier.
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1 bg-blue-600/50 border border-blue-400 rounded-xl p-4 gap-2">
                <Text className="text-lg font-bold text-white">Pro · Monthly</Text>
                <Text className="text-3xl font-bold text-white">{CONTRACTOR_PRO_MONTHLY_PRICE_DISPLAY}</Text>
                <Text className="text-xs text-blue-200">/month</Text>
              </View>
              <View className="flex-1 bg-green-600/50 border border-green-400 rounded-xl p-4 gap-2">
                <Text className="text-lg font-bold text-white">Pro · Yearly</Text>
                <Text className="text-3xl font-bold text-white">{CONTRACTOR_PRO_ANNUAL_PRICE_DISPLAY}</Text>
                <Text className="text-xs text-green-200">/year</Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.push("/pricing" as never)}
              className="py-2 items-center"
            >
              <Text className="text-sm text-blue-300 font-semibold">Full pricing →</Text>
            </Pressable>
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
                openAccount(router, "contractor");
              }}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              className="bg-blue-600 rounded-xl py-4 items-center"
            >
              <Text className="text-white font-bold text-lg">Start contractor free tier</Text>
              <Text className="text-blue-100 text-xs mt-1">Limited searches · Pro in app · No card to start</Text>
            </Pressable>

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
              className="bg-slate-700 rounded-xl py-4 items-center"
            >
              <Text className="text-white font-bold text-lg">Browse the app</Text>
            </Pressable>

            <Pressable
              onPress={() => openLink("https://clientcheck.app")}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              className="bg-transparent border border-slate-500 rounded-xl py-3.5 items-center"
            >
              <Text className="text-slate-200 font-semibold">Learn more on the web</Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View className="items-center gap-2 pb-4">
            <Text className="text-xs text-gray-400">
              Contractors: Free tier • Pro {CONTRACTOR_PRO_MONTHLY_PRICE_DISPLAY}/mo or {CONTRACTOR_PRO_ANNUAL_PRICE_DISPLAY}/yr
            </Text>
            <Text className="text-xs text-gray-400">{CUSTOMER_NO_SUBSCRIPTION_REQUIRED_LINE}</Text>
            <View className="flex-row gap-4 mt-2">
              <Pressable onPress={() => openLink("https://clientcheck.app/privacy")}>
                <Text className="text-xs text-blue-400">Privacy</Text>
              </Pressable>
              <Pressable onPress={() => openLink("https://clientcheck.app/terms")}>
                <Text className="text-xs text-blue-400">Terms</Text>
              </Pressable>
              <Pressable onPress={() => openLink("https://clientcheck.app/contact")}>
                <Text className="text-xs text-blue-400">Contact</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
