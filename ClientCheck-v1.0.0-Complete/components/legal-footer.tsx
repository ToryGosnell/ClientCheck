import { Text, Pressable, StyleSheet, View, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";

interface Props {
  style?: object;
}

export function LegalFooter({ style }: Props) {
  const router = useRouter();
  const colors = useColors();

  return (
    <View style={[s.container, style]}>
      <Text style={[s.text, { color: colors.muted }]}>
        {"By continuing, you agree to our "}
      </Text>
      <View style={s.linkRow}>
        <Pressable
          onPress={() => router.push("/terms" as never)}
          accessibilityRole="link"
          accessibilityLabel="Terms and Conditions"
          style={({ pressed }) => pressed && { opacity: 0.7 }}
        >
          <Text style={[s.link, { color: colors.primary }]}>Terms & Conditions</Text>
        </Pressable>
        <Text style={[s.text, { color: colors.muted }]}>{" and "}</Text>
        <Pressable
          onPress={() => router.push("/privacy" as never)}
          accessibilityRole="link"
          accessibilityLabel="Privacy Policy"
          style={({ pressed }) => pressed && { opacity: 0.7 }}
        >
          <Text style={[s.link, { color: colors.primary }]}>Privacy Policy</Text>
        </Pressable>
        <Text style={[s.text, { color: colors.muted }]}>.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { alignItems: "center", paddingHorizontal: 16 },
  linkRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  text: { fontSize: 13, lineHeight: 18 },
  link: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    textDecorationLine: "underline",
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {}),
  } as any,
});
