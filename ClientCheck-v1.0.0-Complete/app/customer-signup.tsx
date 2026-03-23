import React, { useState } from "react";
import { ScrollView, View, Text, Pressable, TextInput, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

export default function CustomerSignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return false;
    }

    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email");
      return false;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }

    if (!agreeToTerms) {
      Alert.alert("Error", "Please agree to the terms and conditions");
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    handlePress();

    try {
      // In production, call signup API
      // const result = await api.post('/auth/signup', { email, name, password });
      // if (!result.success) throw new Error(result.error);

      // Simulate signup
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // After successful signup, trigger customer onboarding
      // The onboarding screens will educate the customer about the platform
      // before they proceed to payment
      router.push("/customer-onboarding-1");
    } catch (error) {
      Alert.alert("Signup Failed", String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 gap-6 px-6 py-8">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-4xl font-bold text-foreground">Join ClientCheck</Text>
            <Text className="text-base text-muted">
              Participate in fair, verified reviews of contractors
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            {/* Name Input */}
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

            {/* Email Input */}
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

            {/* Password Input */}
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
              <Text className="text-xs text-muted">At least 8 characters</Text>
            </View>

            {/* Confirm Password Input */}
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

            {/* Terms Checkbox */}
            <Pressable
              onPress={() => {
                handlePress();
                setAgreeToTerms(!agreeToTerms);
              }}
              className="flex-row gap-3 items-center py-2"
            >
              <View
                className={`w-6 h-6 rounded border-2 items-center justify-center ${
                  agreeToTerms ? "bg-primary border-primary" : "border-border"
                }`}
              >
                {agreeToTerms && <Text className="text-white font-bold">✓</Text>}
              </View>
              <Text className="flex-1 text-sm text-muted">
                I agree to the{" "}
                <Text className="text-primary font-semibold" onPress={() => router.push("/terms" as never)}>Terms & Conditions</Text> and{" "}
                <Text className="text-primary font-semibold" onPress={() => router.push("/privacy" as never)}>Privacy Policy</Text>
              </Text>
            </Pressable>
          </View>

          {/* Info Box */}
          <View className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 gap-2">
            <Text className="text-sm font-semibold text-foreground">What Happens Next</Text>
            <Text className="text-xs text-muted leading-relaxed">
              After you sign up, we'll show you a quick introduction to our fair review system.
              You'll learn why both contractors and customers pay equally, and how that ensures
              honest, trustworthy feedback.
            </Text>
          </View>

          {/* Signup Button */}
          <Pressable
            onPress={handleSignup}
            disabled={loading}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
            className={`py-4 px-6 rounded-lg items-center ${
              loading ? "bg-primary/50" : "bg-primary"
            }`}
          >
            <Text className="text-white font-bold text-lg">
              {loading ? "Creating Account..." : "Create Account"}
            </Text>
          </Pressable>

          {/* Login Link */}
          <View className="flex-row items-center justify-center gap-2">
            <Text className="text-sm text-muted">Already have an account?</Text>
            <Pressable onPress={() => router.push("/(tabs)")}>
              <Text className="text-sm text-primary font-semibold">Sign In</Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View className="items-center gap-2 pb-4">
            <Text className="text-xs text-muted text-center">
              By signing up, you agree to participate in our fair, two-sided review platform where
              both contractors and customers pay equally.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
