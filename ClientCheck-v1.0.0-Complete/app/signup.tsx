import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { setSelectedAccountType } from "@/lib/account-type";
import { setPostLoginRedirect, consumePostLoginRedirect } from "@/lib/post-login-redirect";
import { resolvePostLoginDestination } from "@/lib/resolve-post-login-destination";
import { tryApplyPendingContractorInviteReferral } from "@/lib/contractor-invite-after-login";
import { tryApplyPendingShareReferral } from "@/lib/share-referral-after-login";

const LEGAL_ACCEPTANCE_VERSION = "2026-03-24";

export default function SignupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ accountType?: string; redirect?: string }>();
  const accountType = params.accountType === "customer" ? "customer" : "contractor";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigateAfterSignup = async () => {
    await tryApplyPendingContractorInviteReferral();
    await tryApplyPendingShareReferral();
    const consumed = await consumePostLoginRedirect();
    const destination = await resolvePostLoginDestination(consumed);
    router.replace(destination as never);
  };

  const validate = (): boolean => {
    if (!name.trim()) {
      Alert.alert("Sign up failed", "Name is required.");
      return false;
    }
    if (!email.includes("@")) {
      Alert.alert("Sign up failed", "Enter a valid email.");
      return false;
    }
    if (password.length < 8) {
      Alert.alert("Sign up failed", "Password must be at least 8 characters.");
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert("Sign up failed", "Passwords do not match.");
      return false;
    }
    if (!agreeToTerms) {
      Alert.alert("Sign up failed", "You must accept Terms and Privacy.");
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    if (loading) return;
    if (!validate()) return;
    setLoading(true);
    try {
      if (params.redirect?.trim()) {
        await setPostLoginRedirect(params.redirect.trim());
      }
      await setSelectedAccountType(accountType);
      const result = await Api.signup({
        email: email.trim(),
        password,
        name: name.trim(),
        accountType,
        legalAcceptanceVersion: LEGAL_ACCEPTANCE_VERSION,
      });

      const userInfo = Auth.userFromApiJson(result.user as unknown as Record<string, unknown>);
      await Auth.setUserInfo(userInfo);
      await navigateAfterSignup();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create account";
      Alert.alert("Sign up failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 gap-6 px-6 py-8">
          <View className="gap-2">
            <Text className="text-4xl font-bold text-foreground">Create Account</Text>
            <Text className="text-base text-muted">
              {accountType === "customer" ? "Customer account setup." : "Contractor account setup."}
            </Text>
          </View>

          <View className="gap-4">
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Full Name</Text>
              <TextInput
                placeholder="John Doe"
                placeholderTextColor="#687076"
                value={name}
                onChangeText={setName}
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              />
            </View>
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
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Confirm Password</Text>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#687076"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              />
            </View>

            <Pressable onPress={() => setAgreeToTerms((v) => !v)} className="flex-row gap-3 items-center py-2">
              <View
                className={`w-6 h-6 rounded border-2 items-center justify-center ${
                  agreeToTerms ? "bg-primary border-primary" : "border-border"
                }`}
              >
                {agreeToTerms ? <Text className="text-white font-bold">✓</Text> : null}
              </View>
              <Text className="flex-1 text-sm text-muted">
                I agree to the Terms & Conditions and Privacy Policy.
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleSignup}
            disabled={loading}
            className={`py-4 px-6 rounded-lg items-center ${loading ? "bg-primary/50" : "bg-primary"}`}
          >
            <Text className="text-white font-bold text-lg">
              {loading ? "Creating Account..." : "Create Account"}
            </Text>
          </Pressable>

          <View className="flex-row items-center justify-center gap-2">
            <Text className="text-sm text-muted">Already have an account?</Text>
            <Pressable onPress={() => router.push(`/login?accountType=${accountType}` as never)}>
              <Text className="text-sm text-primary font-semibold">Sign In</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
