import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import * as Api from "@/lib/_core/api";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (loading) return;
    if (!email.includes("@")) {
      Alert.alert("Reset failed", "Enter a valid email.");
      return;
    }
    setLoading(true);
    try {
      await Api.forgotPassword(email.trim());
      setSent(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to request reset";
      Alert.alert("Reset failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 gap-6 px-6 py-8">
          <View className="gap-2">
            <Text className="text-4xl font-bold text-foreground">Forgot Password</Text>
            <Text className="text-base text-muted">
              Enter your account email and we will send reset instructions.
            </Text>
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

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            className={`py-4 px-6 rounded-lg items-center ${loading ? "bg-primary/50" : "bg-primary"}`}
          >
            <Text className="text-white font-bold text-lg">
              {loading ? "Sending..." : "Send Reset Link"}
            </Text>
          </Pressable>

          {sent ? (
            <Text className="text-sm text-muted">
              If that email exists, a reset link has been sent.
            </Text>
          ) : null}

          <Pressable onPress={() => router.replace("/login" as never)}>
            <Text className="text-sm text-primary font-semibold">Back to sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
