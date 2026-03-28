import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { SESSION_TOKEN_KEY } from "@/constants/oauth";
import { setSelectedAccountType } from "@/lib/account-type";
import { setPostLoginRedirect, consumePostLoginRedirect } from "@/lib/post-login-redirect";
import { resolvePostLoginDestination } from "@/lib/resolve-post-login-destination";
import { tryApplyPendingContractorInviteReferral } from "@/lib/contractor-invite-after-login";
import { tryApplyPendingShareReferral } from "@/lib/share-referral-after-login";

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ accountType?: string; admin?: string; redirect?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const accountType = params.accountType === "customer" ? "customer" : "contractor";

  const navigateAfterLogin = async () => {
    await tryApplyPendingContractorInviteReferral();
    await tryApplyPendingShareReferral();
    const consumed = await consumePostLoginRedirect();
    const destination = await resolvePostLoginDestination(consumed);
    router.replace(destination as never);
  };

  const handleLogin = async () => {
    if (loading) return;
    if (!email.trim() || !password) {
      Alert.alert("Sign in failed", "Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      if (params.redirect?.trim()) {
        await setPostLoginRedirect(params.redirect.trim());
      }
      if (params.admin === "1") {
        await setPostLoginRedirect("/admin");
      }
      await setSelectedAccountType(accountType);

      const result = await Api.login({ email: email.trim(), password });
      const data = result as { sessionToken?: string };
      if (typeof window !== "undefined" && data?.sessionToken) {
        localStorage.setItem("app_session_token", data.sessionToken);
      }
      const explicitToken =
        typeof result.sessionToken === "string" && result.sessionToken.trim().length > 0
          ? result.sessionToken
          : typeof result.app_session_id === "string" && result.app_session_id.trim().length > 0
            ? result.app_session_id
            : null;
      const storageWriteAttempted = Boolean(explicitToken);
      if (explicitToken) {
        await Auth.setSessionToken(explicitToken);
      }
      const localStorageHasTokenAfterWrite =
        typeof window !== "undefined"
          ? Boolean(window.localStorage.getItem(SESSION_TOKEN_KEY))
          : null;
      console.log("[Auth Login Screen] token persistence check", {
        tokenDetected: Boolean(explicitToken),
        storageWriteAttempted,
        localStorageHasTokenAfterWrite,
      });
      const userInfo = Auth.userFromApiJson(result.user as unknown as Record<string, unknown>);
      await Auth.setUserInfo(userInfo);
      await navigateAfterLogin();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in";
      Alert.alert("Sign in failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 gap-6 px-6 py-8">
          <View className="gap-2">
            <Text className="text-4xl font-bold text-foreground">Sign In</Text>
            <Text className="text-base text-muted">
              Access your ClientCheck account.
            </Text>
          </View>

          <View className="gap-4">
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Email</Text>
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor="#687076"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Password</Text>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#687076"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              />
            </View>

            <Pressable onPress={() => router.push("/forgot-password" as never)}>
              <Text className="text-sm text-primary font-semibold">Forgot password?</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            className={`py-4 px-6 rounded-lg items-center ${loading ? "bg-primary/50" : "bg-primary"}`}
          >
            <Text className="text-white font-bold text-lg">
              {loading ? "Signing In..." : "Sign In"}
            </Text>
          </Pressable>

          <View className="flex-row items-center justify-center gap-2">
            <Text className="text-sm text-muted">Need an account?</Text>
            <Pressable onPress={() => router.push(`/signup?accountType=${accountType}` as never)}>
              <Text className="text-sm text-primary font-semibold">Create one</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
