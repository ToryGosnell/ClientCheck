import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function Onboarding2Screen() {
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
            <View className="flex-1 h-1 rounded-full" style={{ backgroundColor: colors.border }} />
          </View>

          {/* Content */}
          <View className="flex-1 justify-center gap-8">
            {/* Icon */}
            <View className="items-center">
              <View
                className="w-24 h-24 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: colors.primary + "20" }}
              >
                <Text className="text-6xl">📞</Text>
              </View>
            </View>

            {/* Headline */}
            <View className="gap-4">
              <Text className="text-4xl font-bold text-foreground text-center">
                Instant Call Alerts
              </Text>
              <Text className="text-lg text-muted text-center leading-relaxed">
                Know who's calling before you answer. See red flags in real-time.
              </Text>
            </View>

            {/* Demo */}
            <View
              className="rounded-2xl p-6 gap-4"
              style={{ backgroundColor: colors.surface }}
            >
              <View className="flex-row items-center gap-3">
                <Text className="text-3xl">📱</Text>
                <View className="flex-1">
                  <Text className="text-sm text-muted">Incoming Call</Text>
                  <Text className="text-lg font-bold text-foreground">John Smith</Text>
                </View>
              </View>

              <View className="h-0.5" style={{ backgroundColor: colors.border }} />

              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <Text className="text-lg">⚠️</Text>
                  <Text className="text-sm text-foreground font-semibold">2 Red Flags</Text>
                </View>
                <Text className="text-xs text-muted ml-6">
                  • Paid 1 of 3 invoices on time
                </Text>
                <Text className="text-xs text-muted ml-6">
                  • Multiple scope creep complaints
                </Text>
              </View>

              <View className="h-0.5" style={{ backgroundColor: colors.border }} />

              <View className="flex-row gap-2 justify-center">
                <TouchableOpacity
                  className="flex-1 py-2 rounded-lg items-center"
                  style={{ backgroundColor: colors.error }}
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-semibold text-sm">Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-2 rounded-lg items-center"
                  style={{ backgroundColor: colors.primary }}
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-semibold text-sm">Accept</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Features */}
            <View className="gap-3">
              <View className="flex-row gap-3 items-start">
                <Text className="text-xl">✓</Text>
                <Text className="text-sm text-foreground flex-1">
                  Payment history at a glance
                </Text>
              </View>
              <View className="flex-row gap-3 items-start">
                <Text className="text-xl">✓</Text>
                <Text className="text-sm text-foreground flex-1">
                  Real red flags from other contractors
                </Text>
              </View>
              <View className="flex-row gap-3 items-start">
                <Text className="text-xl">✓</Text>
                <Text className="text-sm text-foreground flex-1">
                  Make informed decisions instantly
                </Text>
              </View>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            onPress={() => router.push("/onboarding-3")}
            className="w-full py-4 rounded-lg items-center justify-center"
            style={{ backgroundColor: colors.primary }}
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-base">
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
