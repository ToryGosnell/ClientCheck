import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenBackground } from "@/components/screen-background";
import { useColors } from "@/hooks/use-colors";
import { track } from "@/lib/analytics";

export default function PaymentCancelledScreen() {
  const router = useRouter();
  const colors = useColors();

  useEffect(() => { track("checkout_cancelled", { plan: "unknown" }); }, []);

  return (
    <ScreenBackground backgroundKey="auth">
      <View style={s.container}>
        <View style={s.iconWrap}>
          <Text style={{ fontSize: 48 }}>⏸️</Text>
        </View>

        <Text style={[s.title, { color: colors.foreground }]}>Checkout Not Completed</Text>
        <Text style={[s.body, { color: colors.muted }]}>
          Your payment was not completed. You can try again whenever you're ready.
        </Text>

        <View style={s.actions}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              s.primaryBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={s.primaryBtnText}>Try Again</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(tabs)")}
            style={({ pressed }) => [
              s.secondaryBtn,
              { borderColor: "rgba(255,255,255,0.15)" },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[s.secondaryBtnText, { color: colors.muted }]}>Back to Home</Text>
          </Pressable>
        </View>
      </View>
    </ScreenBackground>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32, gap: 20 },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "800", textAlign: "center" },
  body: { fontSize: 15, lineHeight: 22, textAlign: "center" },
  actions: { width: "100%", gap: 12, marginTop: 8 },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  secondaryBtn: { borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  secondaryBtnText: { fontSize: 15, fontWeight: "600" },
});
