import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";

export function PrivacyBanner() {
  const colors = useColors();
  const router = useRouter();

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.primary + "10",
          borderColor: colors.primary,
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>🔒</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.primary }]}>
            Phone & Address Are Private
          </Text>
          <Text style={[styles.description, { color: colors.muted }]}>
            Used only for matching & verification. Never shown publicly.
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => router.push("/privacy-faq")}
        style={[styles.learnMore, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.learnMoreText}>Learn More</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  content: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  icon: {
    fontSize: 20,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
  },
  description: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  learnMore: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  learnMoreText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
