import type { ReactElement } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenBackground } from "@/components/screen-background";
import { ScreenContainer } from "@/components/screen-container";
import type { User } from "@/lib/_core/auth";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useAdminAuthRedirect } from "@/hooks/use-require-admin";

export type AdminRouteGateResult =
  | { blocked: ReactElement; user?: undefined }
  | { blocked: null; user: User };

/**
 * Single useAuth + redirect for all `/admin` and `/admin-*` screens.
 * Use `enabled: blocked === null` on sensitive queries to avoid firing before role is known.
 */
export function useAdminRouteGate(): AdminRouteGateResult {
  const colors = useColors();
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();
  useAdminAuthRedirect();

  if (loading) {
    return {
      blocked: (
        <ScreenBackground backgroundKey="dashboard" overlayOpacity={0.92}>
          <ScreenContainer>
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[styles.muted, { color: colors.muted, marginTop: 16 }]}>Loading session…</Text>
            </View>
          </ScreenContainer>
        </ScreenBackground>
      ),
    };
  }

  if (!user) {
    return {
      blocked: (
        <ScreenBackground backgroundKey="dashboard" overlayOpacity={0.92}>
          <ScreenContainer>
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.muted, { color: colors.muted, marginTop: 12 }]}>Redirecting to sign in…</Text>
            </View>
          </ScreenContainer>
        </ScreenBackground>
      ),
    };
  }

  if (!isAdmin) {
    return {
      blocked: (
        <ScreenBackground backgroundKey="dashboard" overlayOpacity={0.92}>
          <ScreenContainer>
            <View style={styles.centered}>
              <Text style={{ fontSize: 36, marginBottom: 16 }}>🔒</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>Unauthorized</Text>
              <Text style={[styles.muted, { color: colors.muted, textAlign: "center", paddingHorizontal: 24 }]}>
                Administrator access only (user.role = admin). This attempt was not granted.
              </Text>
              <Pressable onPress={() => router.replace("/(tabs)" as never)} style={[styles.btn, { backgroundColor: colors.primary }]}>
                <Text style={styles.btnText}>Go to app home</Text>
              </Pressable>
            </View>
          </ScreenContainer>
        </ScreenBackground>
      ),
    };
  }

  return { blocked: null, user };
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 8 },
  muted: { fontSize: 14, lineHeight: 21 },
  btn: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
