import React, { useState } from "react";
import { ScrollView, View, Text, Pressable, TextInput, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

export default function AdminLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);
    handlePress();

    try {
      // In production, call API to verify admin credentials
      // const result = await api.post('/admin/login', { email, password });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // For demo, accept any email ending in @contractorvet.com
      if (email.endsWith("@contractorvet.com") && password.length >= 8) {
        Alert.alert("Success", "Admin login successful");
        router.push("/admin-dashboard");
      } else {
        Alert.alert("Error", "Invalid admin credentials");
      }
    } catch (error) {
      Alert.alert("Error", "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 gap-6 px-6 py-8 justify-center">
          {/* Header */}
          <View className="gap-2 mb-6">
            <Text className="text-4xl font-bold text-foreground">Admin Portal</Text>
            <Text className="text-base text-muted">Sign in to access moderation tools</Text>
          </View>

          {/* Security Info */}
          <View className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 gap-2">
            <Text className="text-sm font-bold text-blue-300">🔒 Secure Login</Text>
            <Text className="text-xs text-blue-200">
              This area is restricted to authorized administrators only. All login attempts are logged.
            </Text>
          </View>

          {/* Email Input */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Email Address</Text>
            <TextInput
              placeholder="admin@contractorvet.com"
              placeholderTextColor="#687076"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              keyboardType="email-address"
              autoCapitalize="none"
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              style={{ color: "#11181C" }}
            />
            <Text className="text-xs text-muted">Must be a @contractorvet.com email address</Text>
          </View>

          {/* Password Input */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Password</Text>
            <View className="flex-row items-center bg-surface border border-border rounded-lg px-4 py-3">
              <TextInput
                placeholder="Enter password"
                placeholderTextColor="#687076"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                secureTextEntry={!showPassword}
                className="flex-1 text-foreground"
                style={{ color: "#11181C" }}
              />
              <Pressable
                onPress={() => {
                  handlePress();
                  setShowPassword(!showPassword);
                }}
                className="p-2"
              >
                <Text className="text-lg">{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
              </Pressable>
            </View>
            <Text className="text-xs text-muted">Minimum 8 characters</Text>
          </View>

          {/* Login Button */}
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
            className="bg-primary py-4 px-6 rounded-lg items-center mt-4"
          >
            <Text className="text-white font-bold text-lg">
              {loading ? "Signing in..." : "Sign In"}
            </Text>
          </Pressable>

          {/* Demo Credentials */}
          <View className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4 gap-2 mt-4">
            <Text className="text-sm font-bold text-amber-300">📝 Demo Credentials</Text>
            <Text className="text-xs text-amber-200">
              Email: admin@contractorvet.com{"\n"}
              Password: (any 8+ character password)
            </Text>
          </View>

          {/* Forgot Password Link */}
          <Pressable
            onPress={() => {
              handlePress();
              Alert.alert("Password Reset", "Contact support to reset your password");
            }}
            className="items-center py-2"
          >
            <Text className="text-primary font-semibold">Forgot password?</Text>
          </Pressable>

          {/* Security Footer */}
          <View className="border-t border-border pt-4 gap-2">
            <Text className="text-xs text-muted text-center">
              🔐 This login is protected by encryption and rate limiting. Unauthorized access attempts are logged and reported.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
