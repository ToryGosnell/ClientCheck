import React, { useState } from "react";
import { ScrollView, Text, View, TextInput, Pressable, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";

export default function DMCATakedownScreen() {
  const router = useRouter();
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [reviewId, setReviewId] = useState("");
  const [reason, setReason] = useState<"defamation" | "copyright" | "privacy" | "other">("defamation");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!requesterName || !requesterEmail || !reviewId || !description) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requesterEmail)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    // Submit DMCA request
    try {
      // In production, call API endpoint
      // await api.dmca.submitRequest({...})

      Alert.alert(
        "Request Submitted",
        "Your DMCA takedown request has been received. We will review it within 10 business days and contact you at the email provided."
      );

      setSubmitted(true);
      setTimeout(() => router.back(), 2000);
    } catch (error) {
      Alert.alert("Error", "Failed to submit request. Please try again.");
    }
  };

  if (submitted) {
    return (
      <ScreenContainer className="items-center justify-center">
        <View className="items-center gap-4">
          <Text className="text-4xl">✓</Text>
          <Text className="text-2xl font-bold text-foreground">Request Submitted</Text>
          <Text className="text-center text-muted">
            We will review your DMCA request within 10 business days.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-0">
      <ScrollView className="flex-1">
        <View className="p-6">
          <Pressable onPress={() => router.back()} className="mb-4">
            <Text className="text-lg font-semibold text-primary">← Back</Text>
          </Pressable>

          <Text className="text-3xl font-bold text-foreground mb-2">
            DMCA Takedown Request
          </Text>
          <Text className="text-sm text-muted mb-6">
            Report copyright infringement, defamation, or privacy violations
          </Text>

          {/* Warning */}
          <View className="bg-warning bg-opacity-20 border border-warning rounded-lg p-4 mb-6">
            <Text className="text-sm font-semibold text-warning mb-2">
              ⚠️ Legal Notice
            </Text>
            <Text className="text-xs text-warning leading-relaxed">
              False DMCA claims may result in legal liability. Only submit if you have a legitimate legal claim.
            </Text>
          </View>

          {/* Your Information */}
          <Text className="text-lg font-bold text-foreground mb-3">
            Your Information
          </Text>

          <Text className="text-sm font-semibold text-foreground mb-2">
            Full Name *
          </Text>
          <TextInput
            placeholder="Enter your full name"
            value={requesterName}
            onChangeText={setRequesterName}
            className="bg-surface border border-border rounded-lg p-3 mb-4 text-foreground"
            placeholderTextColor="#999"
          />

          <Text className="text-sm font-semibold text-foreground mb-2">
            Email Address *
          </Text>
          <TextInput
            placeholder="your@email.com"
            value={requesterEmail}
            onChangeText={setRequesterEmail}
            keyboardType="email-address"
            className="bg-surface border border-border rounded-lg p-3 mb-4 text-foreground"
            placeholderTextColor="#999"
          />

          {/* Review Information */}
          <Text className="text-lg font-bold text-foreground mb-3 mt-6">
            Review Information
          </Text>

          <Text className="text-sm font-semibold text-foreground mb-2">
            Review ID *
          </Text>
          <TextInput
            placeholder="Enter the review ID to report"
            value={reviewId}
            onChangeText={setReviewId}
            className="bg-surface border border-border rounded-lg p-3 mb-4 text-foreground"
            placeholderTextColor="#999"
          />

          <Text className="text-sm font-semibold text-foreground mb-2">
            Reason for Takedown *
          </Text>
          <View className="gap-2 mb-4">
            {(["defamation", "copyright", "privacy", "other"] as const).map((r) => (
              <Pressable
                key={r}
                onPress={() => setReason(r)}
                className={`p-3 rounded-lg border ${
                  reason === r
                    ? "bg-primary border-primary"
                    : "bg-surface border-border"
                }`}
              >
                <Text
                  className={`font-semibold capitalize ${
                    reason === r ? "text-background" : "text-foreground"
                  }`}
                >
                  {r === "defamation" && "Defamation/False Information"}
                  {r === "copyright" && "Copyright Infringement"}
                  {r === "privacy" && "Privacy Violation"}
                  {r === "other" && "Other"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Description */}
          <Text className="text-sm font-semibold text-foreground mb-2">
            Detailed Description *
          </Text>
          <TextInput
            placeholder="Explain why this review should be removed..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            className="bg-surface border border-border rounded-lg p-3 mb-4 text-foreground"
            placeholderTextColor="#999"
          />

          {/* Evidence */}
          <Text className="text-sm font-semibold text-foreground mb-2">
            Evidence or Documentation
          </Text>
          <TextInput
            placeholder="Link to evidence, court documents, or other proof..."
            value={evidence}
            onChangeText={setEvidence}
            multiline
            numberOfLines={3}
            className="bg-surface border border-border rounded-lg p-3 mb-6 text-foreground"
            placeholderTextColor="#999"
          />

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            className="bg-primary p-4 rounded-lg items-center mb-6"
          >
            <Text className="text-background font-bold text-lg">Submit Request</Text>
          </Pressable>

          {/* Legal Info */}
          <View className="bg-surface rounded-lg p-4 mb-6">
            <Text className="text-xs font-semibold text-foreground mb-2">
              Our DMCA Process:
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              1. We review your request within 10 business days{"\n"}
              2. We contact the review author with your claim{"\n"}
              3. They have 10 days to submit a counter-notice{"\n"}
              4. We make a final decision and notify both parties
            </Text>
          </View>

          <View className="h-8" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
