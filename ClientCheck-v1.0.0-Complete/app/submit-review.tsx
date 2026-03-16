import React, { useState } from "react";
import { ScrollView, View, Text, Pressable, TextInput, Alert, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const RATING_CATEGORIES = [
  { id: "payment", label: "Payment Reliability", description: "Did they pay on time?" },
  {
    id: "communication",
    label: "Communication",
    description: "Were they responsive and clear?",
  },
  {
    id: "scope",
    label: "Scope Clarity",
    description: "Did they stick to the agreed scope?",
  },
  {
    id: "professionalism",
    label: "Professionalism",
    description: "Was the work quality professional?",
  },
  { id: "followup", label: "Follow-up", description: "Did they handle issues after?" },
  {
    id: "disputes",
    label: "Disputes",
    description: "Were there payment or quality disputes?",
  },
];

export default function SubmitReviewScreen() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseState, setLicenseState] = useState("CA");
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({
    payment: 5,
    communication: 5,
    scope: 5,
    professionalism: 5,
    followup: 5,
    disputes: 5,
  });
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const validateForm = (): boolean => {
    if (!customerName.trim()) {
      Alert.alert("Error", "Please enter the customer/business name");
      return false;
    }

    if (!licenseNumber.trim()) {
      Alert.alert("Error", "Please enter your license number");
      return false;
    }

    if (!licenseState) {
      Alert.alert("Error", "Please select your license state");
      return false;
    }

    if (!summary.trim()) {
      Alert.alert("Error", "Please write a summary of your experience");
      return false;
    }

    if (summary.trim().length < 20) {
      Alert.alert("Error", "Summary must be at least 20 characters");
      return false;
    }

    return true;
  };

  const handleSubmitReview = async () => {
    if (!validateForm()) return;

    setLoading(true);
    handlePress();

    try {
      // In production, call review submission API
      // const result = await api.post('/reviews/submit', {
      //   customerName,
      //   licenseNumber,
      //   licenseState,
      //   ratings,
      //   summary
      // });

      // Simulate submission
      await new Promise((resolve) => setTimeout(resolve, 1500));

      Alert.alert("Success", "Your review has been submitted and is pending moderation.", [
        {
          text: "OK",
          onPress: () => router.push("/(tabs)"),
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to submit review. Please try again.");
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
            <Text className="text-4xl font-bold text-foreground">Leave a Review</Text>
            <Text className="text-base text-muted">
              Help other contractors make informed decisions
            </Text>
          </View>

          {/* Customer/Business Info */}
          <View className="gap-4">
            <Text className="text-lg font-bold text-foreground">Who Are You Reviewing?</Text>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                Customer or Business Name
              </Text>
              <TextInput
                placeholder="John's Construction, ABC Plumbing, etc."
                placeholderTextColor="#687076"
                value={customerName}
                onChangeText={setCustomerName}
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              />
            </View>
          </View>

          {/* Your License Info */}
          <View className="gap-4">
            <Text className="text-lg font-bold text-foreground">Your License Information</Text>
            <Text className="text-sm text-muted">
              We verify your license to ensure only real contractors can leave reviews
            </Text>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">License Number</Text>
              <TextInput
                placeholder="e.g., 123456"
                placeholderTextColor="#687076"
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">License State</Text>

              {!showStatePicker ? (
                <Pressable
                  onPress={() => {
                    handlePress();
                    setShowStatePicker(true);
                  }}
                  className="bg-surface border border-border rounded-lg px-4 py-3 flex-row justify-between items-center"
                >
                  <Text className="text-foreground font-semibold">{licenseState}</Text>
                  <Text className="text-muted">▼</Text>
                </Pressable>
              ) : (
                <View className="bg-surface border border-border rounded-lg overflow-hidden max-h-60">
                  <FlatList
                    data={US_STATES}
                    keyExtractor={(item) => item}
                    scrollEnabled={true}
                    renderItem={({ item: state }) => (
                      <Pressable
                        onPress={() => {
                          handlePress();
                          setLicenseState(state);
                          setShowStatePicker(false);
                        }}
                        className={`px-4 py-3 border-b border-border ${
                          licenseState === state ? "bg-primary/10" : ""
                        }`}
                      >
                        <Text
                          className={`${
                            licenseState === state
                              ? "text-primary font-bold"
                              : "text-foreground"
                          }`}
                        >
                          {state}
                        </Text>
                      </Pressable>
                    )}
                  />
                </View>
              )}

              <Text className="text-xs text-muted">
                Your license is valid in {licenseState}. We only show reviews from verified
                contractors.
              </Text>
            </View>
          </View>

          {/* Ratings */}
          <View className="gap-4">
            <Text className="text-lg font-bold text-foreground">Rate Your Experience</Text>

            {RATING_CATEGORIES.map((category) => (
              <View key={category.id} className="gap-2">
                <View className="gap-1">
                  <Text className="text-sm font-semibold text-foreground">{category.label}</Text>
                  <Text className="text-xs text-muted">{category.description}</Text>
                </View>

                <View className="flex-row gap-2 justify-between">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <Pressable
                      key={rating}
                      onPress={() => {
                        handlePress();
                        setRatings({ ...ratings, [category.id]: rating });
                      }}
                      className={`flex-1 py-3 rounded-lg items-center ${
                        ratings[category.id] === rating
                          ? "bg-primary"
                          : "bg-surface border border-border"
                      }`}
                    >
                      <Text
                        className={`font-bold text-lg ${
                          ratings[category.id] === rating ? "text-white" : "text-foreground"
                        }`}
                      >
                        {rating}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {/* Summary */}
          <View className="gap-4">
            <View className="gap-2">
              <Text className="text-lg font-bold text-foreground">Summary</Text>
              <Text className="text-sm text-muted">
                Describe your experience. Be specific and honest.
              </Text>
            </View>

            <TextInput
              placeholder="What was your experience working with this contractor/customer? Include specific details about payment, communication, quality, etc."
              placeholderTextColor="#687076"
              value={summary}
              onChangeText={setSummary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
            />
            <Text className="text-xs text-muted">
              {summary.length} characters (minimum 20)
            </Text>
          </View>

          {/* Fair Review Notice */}
          <View className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
            <Text className="text-xs text-muted leading-relaxed">
              <Text className="font-semibold">Our Commitment to Fair Reviews:</Text> All reviews
              are moderated by our team. We verify your license, check for patterns, and remove
              fake or malicious reviews. Both sides pay equally, so we have no bias.
            </Text>
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmitReview}
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
              {loading ? "Submitting..." : "Submit Review"}
            </Text>
          </Pressable>

          {/* Cancel Button */}
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            className="py-4 items-center"
          >
            <Text className="text-muted font-semibold">Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
