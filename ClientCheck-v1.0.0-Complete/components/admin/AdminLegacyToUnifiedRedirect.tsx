import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { ScreenBackground } from "@/components/screen-background";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";

/**
 * Former standalone admin screens (mock or split UIs) now live under `/admin`.
 * Non-admins hitting bookmarked URLs are sent home — not to the admin unauthorized screen.
 */
export default function AdminLegacyToUnifiedRedirect() {
  const colors = useColors();
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <ScreenBackground backgroundKey="dashboard" overlayOpacity={0.92}>
        <ScreenContainer>
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.muted, { color: colors.muted, marginTop: 16 }]}>Loading…</Text>
          </View>
        </ScreenContainer>
      </ScreenBackground>
    );
  }

  if (!user || !isAdmin) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/admin" />;
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  muted: { fontSize: 14 },
});
