import React from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAdminPaywallBypassRedirect } from "@/hooks/use-admin-paywall-bypass-redirect";
import { BILLING_COPY } from "@/shared/billing-config";

/**
 * Web: same as native — optional identity verification only; free customer core access.
 */
export default function CustomerSubscriptionScreenWeb() {
  const router = useRouter();
  useAdminPaywallBypassRedirect();

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 20, justifyContent: "center" }}>
        <Text className="text-2xl font-bold text-foreground">Customer billing</Text>
        <Text className="text-base text-muted leading-6">{BILLING_COPY.customerFree}</Text>
        <Text className="text-sm text-muted leading-5">
          If you want the optional verified identity badge, continue to checkout. You are not required to pay for account
          access, review responses, or disputes.
        </Text>
        <View className="gap-3 mt-4">
          <Pressable
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.replace("/customer-paywall" as never);
            }}
            className="bg-primary rounded-xl py-4 items-center"
          >
            <Text className="text-white font-bold text-lg">Optional: identity verification</Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace("/(tabs)" as never)}
            className="border border-border rounded-xl py-4 items-center"
          >
            <Text className="text-foreground font-semibold">Back to the app</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
