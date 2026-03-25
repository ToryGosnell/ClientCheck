import { useCallback } from "react";
import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { openVerificationPaywall } from "@/lib/verification-paywall-navigation";

/** Opens the high-converting verify paywall; checkout starts from that screen. */
export function CustomerVerifyBadgeButton() {
  const colors = useColors();
  const router = useRouter();

  const goToPaywall = useCallback(() => {
    openVerificationPaywall(router, "manual");
  }, [router]);

  return (
    <Pressable
      onPress={goToPaywall}
      style={({ pressed }) => [
        {
          backgroundColor: colors.primary,
          borderRadius: 8,
          paddingVertical: 12,
          alignItems: "center",
          marginTop: 12,
        },
        pressed ? { opacity: 0.88 } : {},
      ]}
    >
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Get Verified Badge</Text>
    </Pressable>
  );
}
