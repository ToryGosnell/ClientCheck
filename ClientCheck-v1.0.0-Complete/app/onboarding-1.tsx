import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

export default function Onboarding1Screen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-between py-8 px-6">
          {/* Skip Button */}
          <View className="flex-row justify-end mb-4">
            <TouchableOpacity onPress={() => router.replace("/(tabs)")}>
              <Text className="text-primary font-semibold text-base">Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="flex-1 justify-center gap-8">
            {/* Icon */}
            <View className="items-center">
              <View
                className="w-24 h-24 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: colors.error + "20" }}
              >
                <Text className="text-6xl">💰</Text>
              </View>
            </View>

            {/* Headline */}
            <View className="gap-4">
              <Text className="text-4xl font-bold text-foreground text-center">
                Protect Your Business
              </Text>
              <Text className="text-lg text-muted text-center leading-relaxed">
                Every day, contractors lose thousands to unpaid work and problem customers.
              </Text>
            </View>

            {/* Pain Points */}
            <View className="gap-3">
              <View className="flex-row gap-3 items-start">
                <Text className="text-2xl">📋</Text>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    Unpaid Invoices
                  </Text>
                  <Text className="text-sm text-muted mt-1">
                    Contractors lose $5K+ per year to non-paying customers
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3 items-start">
                <Text className="text-2xl">📈</Text>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    Scope Creep
                  </Text>
                  <Text className="text-sm text-muted mt-1">
                    Customers who constantly add "just one more thing"
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-3 items-start">
                <Text className="text-2xl">👻</Text>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    Ghosting
                  </Text>
                  <Text className="text-sm text-muted mt-1">
                    Customers who disappear mid-project or refuse to pay
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            onPress={() => router.push("/onboarding-2")}
            className="w-full py-4 rounded-lg items-center justify-center"
            style={{ backgroundColor: colors.primary }}
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-base">
              See the Solution
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
