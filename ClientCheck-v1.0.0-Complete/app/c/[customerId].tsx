import { ScreenBackground } from "@/components/screen-background";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { track } from "@/lib/analytics";
import { buildCustomerShareDeepLink } from "@/lib/customer-share-link";
import { DEMO_MODE } from "@/lib/demo-data";
import { setPostLoginRedirect } from "@/lib/post-login-redirect";
import { setPendingShareReferrer } from "@/lib/share-referral-pending";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function paramStr(v: string | string[] | undefined): string {
  if (v == null) return "";
  return Array.isArray(v) ? (typeof v[0] === "string" ? v[0] : "") : v;
}

const IOS_STORE = process.env.EXPO_PUBLIC_IOS_APP_STORE_URL?.trim() ?? "";
const ANDROID_STORE = process.env.EXPO_PUBLIC_ANDROID_PLAY_URL?.trim() ?? "";

export default function SharedCustomerLandingScreen() {
  const router = useRouter();
  const colors = useColors();
  const { customerId: rawId, ref: rawRef } = useLocalSearchParams<{
    customerId?: string | string[];
    ref?: string | string[];
  }>();

  const customerId = useMemo(() => {
    const n = parseInt(paramStr(rawId), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [rawId]);

  const refUserId = useMemo(() => {
    const n = parseInt(paramStr(rawRef), 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [rawRef]);

  const { loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (customerId == null) return;
    track("share_link_clicked", {
      customer_id: customerId,
      referrer_user_id: refUserId,
    });
  }, [customerId, refUserId]);

  useEffect(() => {
    if (DEMO_MODE || customerId == null) return;
    if (refUserId != null) void setPendingShareReferrer(refUserId);
  }, [customerId, refUserId]);

  useEffect(() => {
    if (DEMO_MODE || customerId == null) return;
    if (loading) return;
    if (isAuthenticated) return;
    void setPostLoginRedirect(`/customer/${customerId}?from=share`);
  }, [customerId, loading, isAuthenticated]);

  useEffect(() => {
    if (customerId == null) return;
    if (!DEMO_MODE) return;
    router.replace(`/customer/${customerId}?from=share` as never);
  }, [customerId, router]);

  useEffect(() => {
    if (customerId == null || DEMO_MODE) return;
    if (loading) return;
    if (!isAuthenticated) return;
    router.replace(`/customer/${customerId}?from=share` as never);
  }, [customerId, loading, isAuthenticated, router]);

  if (customerId == null) {
    return (
      <ScreenBackground backgroundKey="search">
        <View style={styles.center}>
          <Text style={[styles.title, { color: colors.text }]}>Invalid link</Text>
          <Pressable onPress={() => router.replace("/(tabs)" as never)} style={styles.linkBtn}>
            <Text style={{ color: colors.primary, fontWeight: "600" }}>Go home</Text>
          </Pressable>
        </View>
      </ScreenBackground>
    );
  }

  if (DEMO_MODE || loading || isAuthenticated) {
    return (
      <ScreenBackground backgroundKey="search">
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.hint, { color: colors.muted }]}>Opening profile…</Text>
        </View>
      </ScreenBackground>
    );
  }

  const isMobileNative = Platform.OS === "ios" || Platform.OS === "android";
  const storeUrl = Platform.OS === "ios" ? IOS_STORE : ANDROID_STORE;

  const goSignup = () => {
    router.replace({
      pathname: "/select-account",
      params: { redirect: `/customer/${customerId}?from=share` },
    } as never);
  };

  const openApp = () => {
    void Linking.openURL(buildCustomerShareDeepLink(customerId, refUserId));
  };

  const downloadApp = () => {
    if (storeUrl) void Linking.openURL(storeUrl);
    else goSignup();
  };

  return (
    <ScreenBackground backgroundKey="search">
      <SafeAreaView style={styles.safe}>
        <View style={styles.card}>
          {isMobileNative ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Download the app to view this customer</Text>
              <Text style={[styles.sub, { color: colors.muted }]}>
                Sign in to see contractor-shared profiles and reviews. Open the app if you already have it, or continue
                on the web.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.primary,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.9 },
                ]}
                onPress={openApp}
              >
                <Text style={styles.primaryText}>Open app</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.secondary,
                  { borderColor: colors.border },
                  pressed && { opacity: 0.88 },
                ]}
                onPress={downloadApp}
              >
                <Text style={[styles.secondaryText, { color: colors.text }]}>
                  {storeUrl ? "Download app" : "Continue on web"}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Sign up to view this customer</Text>
              <Text style={[styles.sub, { color: colors.muted }]}>
                Shared profiles are only visible to signed-in users. Create an account or log in to continue.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.primary,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.9 },
                ]}
                onPress={goSignup}
              >
                <Text style={styles.primaryText}>Sign up or log in</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, justifyContent: "center", padding: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 24 },
  card: { maxWidth: 420, alignSelf: "center", width: "100%", gap: 14 },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  sub: { fontSize: 15, lineHeight: 22, textAlign: "center" },
  primary: { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondary: { paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  secondaryText: { fontSize: 15, fontWeight: "600" },
  hint: { marginTop: 8, fontSize: 14 },
  linkBtn: { marginTop: 8, padding: 8 },
});
