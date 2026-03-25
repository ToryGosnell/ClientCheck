import { ThemedView } from "@/components/themed-view";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const id = setTimeout(() => {
      router.replace("/login" as never);
    }, 250);
    return () => clearTimeout(id);
  }, [router]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom", "left", "right"]}>
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.statusText}>Redirecting to sign in...</Text>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  statusText: {
    marginTop: 16,
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    color: "#999",
  },
});
