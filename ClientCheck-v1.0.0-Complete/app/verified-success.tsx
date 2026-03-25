import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { apiUrl } from "@/lib/api";
import { track } from "@/lib/analytics";
import { getAndClearVerificationCheckoutTrigger } from "@/lib/verification-checkout-trigger-storage";

/**
 * Stripe Checkout success URL (`/verified-success` on FRONTEND_URL).
 */
export default function VerifiedSuccess() {
  const colors = useColors();
  const { refresh } = useAuth();

  useEffect(() => {
    const run = async () => {
      const trigger = await getAndClearVerificationCheckoutTrigger();
      if (trigger) {
        track("paywall_converted", { trigger });
      }
      // After success page loads: hit API with session cookie (web) so server session / user row is fresh
      try {
        await fetch(apiUrl("/user/me"), { credentials: "include" });
      } catch {
        // Network — still try to refresh client auth below
      }
      await refresh();
    };
    void run();
  }, [refresh]);

  return (
    <ScreenContainer>
      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingVertical: 32,
          justifyContent: "center",
          gap: 16,
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: "800", color: colors.foreground }}>{`You're Verified ✅`}</Text>
        <Text style={{ fontSize: 16, color: colors.muted, lineHeight: 22 }}>Your identity has been confirmed.</Text>
        <Link href="/dashboard" asChild>
          <Pressable style={{ marginTop: 8, alignSelf: "flex-start" }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.primary,
                textDecorationLine: "underline",
              }}
            >
              Go to Dashboard
            </Text>
          </Pressable>
        </Link>
      </View>
    </ScreenContainer>
  );
}
