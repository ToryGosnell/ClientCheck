import React, { useState, useEffect } from "react";
import { ScrollView, View, Text, Pressable, FlatList, ActivityIndicator } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { CustomerSearchService } from "@/lib/customer-search-service";

interface Review {
  id: string;
  contractorName: string;
  contractorLicense: string;
  ratings: {
    payment: number;
    communication: number;
    scope: number;
    professionalism: number;
    followup: number;
    disputes: number;
  };
  summary: string;
  timestamp: number;
}

interface CustomerProfile {
  id: string;
  name: string;
  averageRating: number;
  reviewCount: number;
  paymentScore: number;
  communicationScore: number;
  scopeScore: number;
  professionalismScore: number;
  followupScore: number;
  disputeScore: number;
  redFlags: string[];
  riskLevel: "low" | "medium" | "high";
}

export default function CustomerProfileScreen() {
  const router = useRouter();
  const { customerId } = useLocalSearchParams();
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  useEffect(() => {
    loadCustomerProfile();
  }, [customerId]);

  const loadCustomerProfile = async () => {
    try {
      setLoading(true);
      // In production, fetch from API
      // const result = await api.get(`/customers/${customerId}`);
      // setCustomer(result.customer);
      // setReviews(result.reviews);
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (riskLevel: "low" | "medium" | "high") => {
    if (riskLevel === "low") return "bg-green-900/20 border-green-600/30";
    if (riskLevel === "medium") return "bg-yellow-900/20 border-yellow-600/30";
    return "bg-red-900/20 border-red-600/30";
  };

  const getRiskLevelText = (riskLevel: "low" | "medium" | "high") => {
    if (riskLevel === "low") return "✅ Low Risk";
    if (riskLevel === "medium") return "⚠️ Medium Risk";
    return "🚨 High Risk";
  };

  const getRiskLevelTextColor = (riskLevel: "low" | "medium" | "high") => {
    if (riskLevel === "low") return "text-green-400";
    if (riskLevel === "medium") return "text-yellow-400";
    return "text-red-400";
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-400";
    if (rating >= 2.5) return "text-yellow-400";
    return "text-red-400";
  };

  const renderRatingBar = (label: string, rating: number) => (
    <View className="gap-1">
      <View className="flex-row justify-between items-center">
        <Text className="text-sm font-semibold text-foreground">{label}</Text>
        <Text className={`text-lg font-bold ${getRatingColor(rating)}`}>{rating}/5</Text>
      </View>
      <View className="h-2 bg-surface rounded-full overflow-hidden">
        <View
          className={`h-full rounded-full ${
            rating >= 4
              ? "bg-green-500"
              : rating >= 2.5
                ? "bg-yellow-500"
                : "bg-red-500"
          }`}
          style={{ width: `${(rating / 5) * 100}%` }}
        />
      </View>
    </View>
  );

  const renderReview = ({ item }: { item: Review }) => (
    <View className="bg-surface border border-border rounded-lg p-4 gap-3 mb-3">
      {/* Header */}
      <View className="gap-1">
        <Text className="text-sm font-bold text-foreground">{item.contractorName}</Text>
        <Text className="text-xs text-muted">
          License: {item.contractorLicense} • {new Date(item.timestamp).toLocaleDateString()}
        </Text>
      </View>

      {/* Mini Ratings */}
      <View className="flex-row gap-2 flex-wrap">
        {[
          { label: "Payment", rating: item.ratings.payment },
          { label: "Communication", rating: item.ratings.communication },
          { label: "Scope", rating: item.ratings.scope },
          { label: "Quality", rating: item.ratings.professionalism },
          { label: "Follow-up", rating: item.ratings.followup },
          { label: "Disputes", rating: item.ratings.disputes },
        ].map((r) => (
          <View key={r.label} className="bg-primary/10 rounded px-2 py-1">
            <Text className="text-xs font-semibold text-primary">
              {r.label}: {r.rating}/5
            </Text>
          </View>
        ))}
      </View>

      {/* Summary */}
      <Text className="text-sm text-muted leading-relaxed">{item.summary}</Text>
    </View>
  );

  if (loading) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0a7ea4" />
          <Text className="text-muted mt-4">Loading profile...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!customer) {
    return (
      <ScreenContainer>
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text className="text-6xl">❌</Text>
          <Text className="text-lg font-bold text-foreground">Customer Not Found</Text>
          <Pressable
            onPress={() => {
              handlePress();
              router.back();
            }}
            className="bg-primary px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-bold">Go Back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 gap-6 px-6 py-8">
          {/* Back Button */}
          <Pressable
            onPress={() => {
              handlePress();
              router.back();
            }}
            className="flex-row items-center gap-2 w-fit"
          >
            <Text className="text-primary text-lg">←</Text>
            <Text className="text-primary font-semibold">Back</Text>
          </Pressable>

          {/* Header */}
          <View className="gap-4">
            <View className="gap-2">
              <Text className="text-4xl font-bold text-foreground">{customer.name}</Text>
              <Text className={`text-lg font-bold ${getRiskLevelTextColor(customer.riskLevel)}`}>
                {getRiskLevelText(customer.riskLevel)}
              </Text>
            </View>

            {/* Overall Rating Card */}
            <View className={`border rounded-lg p-6 gap-4 ${getRiskLevelColor(customer.riskLevel)}`}>
              <View className="items-center gap-2">
                <Text className="text-5xl font-bold text-foreground">
                  {customer.averageRating}
                </Text>
                <Text className="text-sm text-muted">
                  Based on {customer.reviewCount} review{customer.reviewCount !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          </View>

          {/* Detailed Ratings */}
          <View className="gap-4">
            <Text className="text-lg font-bold text-foreground">Category Ratings</Text>
            {renderRatingBar("Payment Reliability", customer.paymentScore)}
            {renderRatingBar("Communication", customer.communicationScore)}
            {renderRatingBar("Scope Clarity", customer.scopeScore)}
            {renderRatingBar("Professionalism", customer.professionalismScore)}
            {renderRatingBar("Follow-up", customer.followupScore)}
            {renderRatingBar("Disputes", customer.disputeScore)}
          </View>

          {/* Red Flags */}
          {customer.redFlags.length > 0 && (
            <View className="gap-3">
              <Text className="text-lg font-bold text-foreground">⚠️ Red Flags</Text>
              <View className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 gap-2">
                {customer.redFlags.map((flag, index) => (
                  <View key={index} className="flex-row gap-2 items-center">
                    <Text className="text-red-400">•</Text>
                    <Text className="flex-1 text-sm text-red-300">{flag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Reviews Section */}
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">
              Reviews ({reviews.length})
            </Text>

            {reviews.length > 0 ? (
              <FlatList
                data={reviews}
                keyExtractor={(item) => item.id}
                renderItem={renderReview}
                scrollEnabled={false}
              />
            ) : (
              <View className="bg-surface border border-border rounded-lg p-6 items-center gap-2">
                <Text className="text-muted">No reviews yet</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View className="gap-3">
            <Pressable
              onPress={() => {
                handlePress();
                // In production, navigate to job acceptance screen
              }}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              className="bg-primary py-4 px-6 rounded-lg items-center"
            >
              <Text className="text-white font-bold text-lg">Accept Job from This Customer</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                handlePress();
                router.back();
              }}
              className="py-4 px-6 rounded-lg items-center border border-border"
            >
              <Text className="text-foreground font-bold">Decline</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
