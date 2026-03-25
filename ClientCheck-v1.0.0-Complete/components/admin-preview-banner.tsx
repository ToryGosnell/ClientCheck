import { useAuth } from "@/hooks/use-auth";
import { DEMO_MODE } from "@/lib/demo-data";
import { StyleSheet, Text, View } from "react-native";

/**
 * Thin global indicator for admin preview sessions (authenticated `role === "admin"` only).
 */
export function AdminPreviewBanner() {
  const { user, loading } = useAuth();

  if (DEMO_MODE || loading || user?.role !== "admin") {
    return null;
  }

  return (
    <View style={styles.bar} accessibilityRole="text">
      <Text style={styles.text}>Admin Preview Mode</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(59, 130, 246, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#1d4ed8",
  },
});
