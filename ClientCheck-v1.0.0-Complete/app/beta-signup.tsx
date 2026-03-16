import React, { useState } from "react";
import { ScrollView, View, Text, Pressable, TextInput, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { apiFetch } from "@/lib/api";

type Experience = "beginner" | "intermediate" | "expert";

export default function BetaSignupScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [experience, setExperience] = useState<Experience>("intermediate");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone: string) => {
    const re = /^[\d\s\-\+\(\)]{10,}$/;
    return re.test(phone.replace(/\s/g, ""));
  };

  const handleSignup = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    if (!email.trim() || !validateEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    if (!phone.trim() || !validatePhone(phone)) {
      Alert.alert("Error", "Please enter a valid phone number");
      return;
    }

    if (!agreed) {
      Alert.alert("Error", "Please agree to the beta terms");
      return;
    }

    setLoading(true);
    handlePress();

    try {
      // In production, call API to signup
      const response = await apiFetch("/api/beta/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          company,
          experience,
        }),
      });

      if (response.ok) {
        Alert.alert(
          "Success!",
          "Welcome to the beta program! Check your email for next steps.",
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert("Error", "Failed to signup. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "Network error. Please check your connection.");
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
            <Text className="text-4xl font-bold text-foreground">Join Beta</Text>
            <Text className="text-base text-muted">
              Help us build the future of customer vetting
            </Text>
          </View>

          {/* Benefits */}
          <View className="bg-surface border border-border rounded-xl p-4 gap-3">
            <Text className="font-semibold text-foreground">What You Get</Text>
            <View className="gap-2">
              <Text className="text-sm text-muted">✅ Early access to new features</Text>
              <Text className="text-sm text-muted">✅ Free premium subscription</Text>
              <Text className="text-sm text-muted">✅ Direct feedback channel</Text>
              <Text className="text-sm text-muted">✅ Recognition in the app</Text>
            </View>
          </View>

          {/* Form */}
          <View className="gap-4">
            {/* Name */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Full Name *</Text>
              <TextInput
                placeholder="John Smith"
                value={name}
                onChangeText={setName}
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                placeholderTextColor="#9BA1A6"
              />
            </View>

            {/* Email */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Email *</Text>
              <TextInput
                placeholder="john@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                placeholderTextColor="#9BA1A6"
              />
            </View>

            {/* Phone */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Phone *</Text>
              <TextInput
                placeholder="(555) 123-4567"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                placeholderTextColor="#9BA1A6"
              />
            </View>

            {/* Company */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Company</Text>
              <TextInput
                placeholder="Your company name (optional)"
                value={company}
                onChangeText={setCompany}
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                placeholderTextColor="#9BA1A6"
              />
            </View>

            {/* Experience Level */}
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Experience Level</Text>
              <View className="flex-row gap-2">
                {["beginner", "intermediate", "expert"].map((level) => (
                  <Pressable
                    key={level}
                    onPress={() => {
                      handlePress();
                      setExperience(level as Experience);
                    }}
                    style={({ pressed }) => [
                      {
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    className={`flex-1 py-2 px-3 rounded-lg border ${
                      experience === level
                        ? "bg-primary border-primary"
                        : "bg-surface border-border"
                    }`}
                  >
                    <Text
                      className={`text-center text-sm font-medium ${
                        experience === level ? "text-white" : "text-foreground"
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Terms Agreement */}
            <Pressable
              onPress={() => {
                handlePress();
                setAgreed(!agreed);
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="flex-row gap-3 items-start"
            >
              <View
                className={`w-5 h-5 rounded border-2 items-center justify-center mt-1 ${
                  agreed ? "bg-primary border-primary" : "border-border"
                }`}
              >
                {agreed && <Text className="text-white font-bold">✓</Text>}
              </View>
              <Text className="flex-1 text-sm text-muted leading-relaxed">
                I agree to participate in the beta program and provide feedback to help improve
                ClientCheck
              </Text>
            </Pressable>
          </View>

          {/* Info Box */}
          <View className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
            <Text className="text-xs text-muted leading-relaxed">
              <Text className="font-semibold">Note:</Text> Beta testers receive early access but
              may encounter bugs. Your feedback helps us improve the app.
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
              {loading ? "Signing Up..." : "Join Beta Program"}
            </Text>
          </Pressable>

          {/* Already Member */}
          <Pressable
            onPress={() => {
              handlePress();
              router.push("/beta-feedback");
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className="py-3 items-center"
          >
            <Text className="text-primary font-semibold">Already a beta tester? Submit feedback</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}