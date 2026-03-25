import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import * as Api from "@/lib/_core/api";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(params.token ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (loading) return;
    if (!token.trim()) {
      Alert.alert("Reset failed", "Reset token is required.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Reset failed", "Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Reset failed", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await Api.resetPassword({ token: token.trim(), password });
      Alert.alert("Password updated", "Your password has been reset. Please sign in.", [
        { text: "OK", onPress: () => router.replace("/login" as never) },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reset password";
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
            <Text className="text-4xl font-bold text-foreground">Reset Password</Text>
            <Text className="text-base text-muted">
              Enter your reset token and choose a new password.
            </Text>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Reset Token</Text>
            <TextInput
              placeholder="Paste token"
              placeholderTextColor="#687076"
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
            />
          </View>

          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">New Password</Text>
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

          <Pressable
            onPress={handleReset}
            disabled={loading}
            className={`py-4 px-6 rounded-lg items-center ${loading ? "bg-primary/50" : "bg-primary"}`}
          >
            <Text className="text-white font-bold text-lg">
              {loading ? "Updating..." : "Reset Password"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
