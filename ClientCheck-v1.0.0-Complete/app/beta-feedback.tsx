import React, { useState } from "react";
import { ScrollView, View, Text, Pressable, TextInput, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { apiFetch } from "@/lib/api";

type FeedbackCategory = "bug" | "feature_request" | "ux" | "performance" | "general";
type Severity = "low" | "medium" | "high" | "critical";

export default function BetaFeedbackScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a title");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Error", "Please describe your feedback");
      return;
    }

    setLoading(true);
    handlePress();

    try {
      const response = await apiFetch("/api/beta/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          severity: category === "bug" ? severity : "low",
          title,
          description,
        }),
      });

      if (response.ok) {
        Alert.alert(
          "Thank You!",
          "Your feedback has been submitted. We'll review it shortly.",
          [
            {
              text: "OK",
              onPress: () => {
                setTitle("");
                setDescription("");
                router.back();
              },
            },
          ]
        );
      } else {
        Alert.alert("Error", "Failed to submit feedback. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const categories: { id: FeedbackCategory; label: string; emoji: string }[] = [
    { id: "bug", label: "Bug Report", emoji: "🐛" },
    { id: "feature_request", label: "Feature Request", emoji: "💡" },
    { id: "ux", label: "UX Feedback", emoji: "🎨" },
    { id: "performance", label: "Performance", emoji: "⚡" },
    { id: "general", label: "General", emoji: "💬" },
  ];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 gap-6 px-6 py-8">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-4xl font-bold text-foreground">Send Feedback</Text>
            <Text className="text-base text-muted">
              Help us improve ClientCheck with your insights
            </Text>
          </View>

          {/* Category Selection */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">Category</Text>
            <View className="gap-2">
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    handlePress();
                    setCategory(cat.id);
                  }}
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  className={`flex-row gap-3 items-center p-3 rounded-lg border ${
                    category === cat.id
                      ? "bg-primary/20 border-primary"
                      : "bg-surface border-border"
                  }`}
                >
                  <Text className="text-2xl">{cat.emoji}</Text>
                  <Text
                    className={`flex-1 font-medium ${
                      category === cat.id ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {cat.label}
                  </Text>
                  {category === cat.id && (
                    <Text className="text-primary font-bold">✓</Text>
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Severity (only for bugs) */}
          {category === "bug" && (
            <View className="gap-3">
              <Text className="text-sm font-semibold text-foreground">Severity</Text>
              <View className="flex-row gap-2">
                {["low", "medium", "high", "critical"].map((sev) => (
                  <Pressable
                    key={sev}
                    onPress={() => {
                      handlePress();
                      setSeverity(sev as Severity);
                    }}
                    style={({ pressed }) => [
                      {
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    className={`flex-1 py-2 px-2 rounded-lg border text-center ${
                      severity === sev
                        ? "bg-red-600 border-red-600"
                        : "bg-surface border-border"
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        severity === sev ? "text-white" : "text-foreground"
                      }`}
                    >
                      {sev.charAt(0).toUpperCase() + sev.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Title */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Title *</Text>
            <TextInput
              placeholder="Brief summary of your feedback"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              placeholderTextColor="#9BA1A6"
            />
            <Text className="text-xs text-muted text-right">{title.length}/100</Text>
          </View>

          {/* Description */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Description *</Text>
            <TextInput
              placeholder="Provide detailed feedback..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              maxLength={1000}
              textAlignVertical="top"
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              placeholderTextColor="#9BA1A6"
            />
            <Text className="text-xs text-muted text-right">{description.length}/1000</Text>
          </View>

          {/* Tips */}
          <View className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 gap-2">
            <Text className="text-xs font-semibold text-blue-300">💡 Tips for good feedback:</Text>
            <Text className="text-xs text-muted leading-relaxed">
              • Be specific and detailed{"\n"}• Include steps to reproduce bugs{"\n"}• Explain why
              features matter{"\n"}• Share your use case
            </Text>
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
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
              {loading ? "Submitting..." : "Submit Feedback"}
            </Text>
          </Pressable>

          {/* Back Button */}
          <Pressable
            onPress={() => {
              handlePress();
              router.back();
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className="py-3 items-center"
          >
            <Text className="text-muted font-semibold">Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}