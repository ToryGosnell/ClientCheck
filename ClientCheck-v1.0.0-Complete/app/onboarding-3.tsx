import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { startOAuthLogin } from "@/constants/oauth";

export default function Onboarding3Screen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-between py-8 px-6">
          {/* Progress */}
          <View className="flex-row gap-2 mb-6">
            <View className="flex-1 h-1 rounded-full" style={{ backgroundColor: colors.primary }} />
            <View className="flex-1 h-1 rounded-full" style={{ backgroundColor: colors.primary }} />
            <View className="flex-1 h-1 rounded-full" style={{ backgroundColor: colors.primary }} />
          </View>

          {/* Content */}
          <View className="flex-1 justify-center gap-8">
            {/* Icon */}
            <View className="items-center">
              <View
                className="w-24 h-24 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: colors.success + "20" }}
              >
                <Text className="text-6xl">🎯</Text>
              </View>
            </View>

            {/* Headline */}
            <View className="gap-4">
              <Text className="text-4xl font-bold text-foreground text-center">
                Start Protecting Your Business Today
              </Text>
              <Text className="text-lg text-muted text-center leading-relaxed">
                Get instant alerts, build your contractor network, and never lose money to bad customers again.
              </Text>
            </View>

            {/* Benefits */}
            <View className="gap-3">
              <View className="flex-row gap-3 items-start">
                <Text className="text-xl">🔍</Text>
                <Text className="text-sm text-foreground flex-1">
                  Search customer reviews and payment history
                </Text>
              </View>
              <View className="flex-row gap-3 items-start">
                <Text className="text-xl">📞</Text>
                <Text className="text-sm text-foreground flex-1">
                  Get real-time alerts when problem customers call
                </Text>
              </View>
              <View className="flex-row gap-3 items-start">
                <Text className="text-xl">👥</Text>
                <Text className="text-sm text-foreground flex-1">
                  Share experiences with other contractors
                </Text>
              </View>
              <View className="flex-row gap-3 items-start">
                <Text className="text-xl">🎁</Text>
                <Text className="text-sm text-foreground flex-1">
                  90 days free - no credit card required
                </Text>
              </View>
            </View>
          </View>

          {/* CTAs */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={() => {
                void startOAuthLogin().catch((error) => {
                  console.warn("[OAuth] Failed to start login:", error);
                });
              }}
              className="w-full py-4 rounded-lg items-center justify-center"
              style={{ backgroundColor: colors.primary }}
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-base">
                Get Started Free
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(tabs)")}
              className="w-full py-4 rounded-lg items-center justify-center border-2"
              style={{ borderColor: colors.border }}
              activeOpacity={0.8}
            >
              <Text className="text-foreground font-semibold text-base">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
