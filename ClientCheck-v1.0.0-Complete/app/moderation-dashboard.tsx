import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ModerationService } from "@/lib/moderation-service";

interface Review {
  id: string;
  contractorName: string;
  contractorLicense: string;
  customerName: string;
  averageRating: number;
  summary: string;
  submittedAt: number;
  flaggedReasons: string[];
  priority: "high" | "medium" | "low";
  ratings?: {
    payment: number;
    communication: number;
    scope: number;
    professionalism: number;
    followup: number;
    disputes: number;
  };
}

export default function ModerationDashboardScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  useEffect(() => {
    loadPendingReviews();
  }, []);

  const loadPendingReviews = async () => {
    try {
      setLoading(true);
      // In production, fetch from API
      const result = await ModerationService.getPendingReviews();
      const reviewsWithPriority = (result.reviews as any[]).map((r) => ({
        ...r,
        priority: ModerationService.calculatePriority(r),
      }));
      setReviews(reviewsWithPriority);
    } catch (error) {
      console.error("Failed to load reviews:", error);
      Alert.alert("Error", "Failed to load pending reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (review: Review) => {
    handlePress();
    Alert.alert(
      "Approve Review",
      `Are you sure you want to approve this review from ${review.contractorName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          style: "default",
          onPress: async () => {
            try {
              const result = await ModerationService.approveReview(review.id, "admin_user");
              if (result.success) {
                setReviews(reviews.filter((r) => r.id !== review.id));
                setSelectedReview(null);
                Alert.alert("Success", "Review approved");
              } else {
                Alert.alert("Error", result.error || "Failed to approve review");
              }
            } catch (error) {
              Alert.alert("Error", String(error));
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!selectedReview || !rejectReason.trim()) {
      Alert.alert("Error", "Please provide a reason for rejection");
      return;
    }

    try {
      const result = await ModerationService.rejectReview(
        selectedReview.id,
        "admin_user",
        rejectReason
      );
      if (result.success) {
        setReviews(reviews.filter((r) => r.id !== selectedReview.id));
        setSelectedReview(null);
        setShowRejectModal(false);
        setRejectReason("");
        Alert.alert("Success", "Review rejected");
      } else {
        Alert.alert("Error", result.error || "Failed to reject review");
      }
    } catch (error) {
      Alert.alert("Error", String(error));
    }
  };

  const getPriorityColor = (priority: "high" | "medium" | "low") => {
    if (priority === "high") return "bg-red-900/20 border-red-600/30";
    if (priority === "medium") return "bg-yellow-900/20 border-yellow-600/30";
    return "bg-green-900/20 border-green-600/30";
  };

  const getPriorityText = (priority: "high" | "medium" | "low") => {
    if (priority === "high") return "🚨 High Priority";
    if (priority === "medium") return "⚠️ Medium Priority";
    return "✅ Low Priority";
  };

  const getPriorityTextColor = (priority: "high" | "medium" | "low") => {
    if (priority === "high") return "text-red-400";
    if (priority === "medium") return "text-yellow-400";
    return "text-green-400";
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-400";
    if (rating >= 2.5) return "text-yellow-400";
    return "text-red-400";
  };

  const filteredReviews =
    filter === "all" ? reviews : reviews.filter((r) => r.priority === filter);

  const renderReviewCard = ({ item }: { item: Review }) => (
    <Pressable
      onPress={() => {
        handlePress();
        setSelectedReview(item);
      }}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
      className={`border rounded-lg p-4 gap-3 mb-3 ${getPriorityColor(item.priority)}`}
    >
      {/* Header */}
      <View className="flex-row justify-between items-start gap-2">
        <View className="flex-1">
          <Text className="text-sm font-bold text-muted">
            {item.contractorName} → {item.customerName}
          </Text>
          <Text className={`text-sm font-bold ${getPriorityTextColor(item.priority)}`}>
            {getPriorityText(item.priority)}
          </Text>
        </View>
        <Text className={`text-2xl font-bold ${getRatingColor(item.averageRating)}`}>
          {item.averageRating}
        </Text>
      </View>

      {/* License Info */}
      <Text className="text-xs text-muted">{item.contractorLicense}</Text>

      {/* Flags */}
      {item.flaggedReasons.length > 0 && (
        <View className="gap-1">
          <Text className="text-xs font-semibold text-red-300">Flags:</Text>
          {item.flaggedReasons.slice(0, 2).map((flag, index) => (
            <Text key={index} className="text-xs text-red-300">
              • {flag}
            </Text>
          ))}
          {item.flaggedReasons.length > 2 && (
            <Text className="text-xs text-red-300">• +{item.flaggedReasons.length - 2} more</Text>
          )}
        </View>
      )}

      {/* Summary Preview */}
      <Text className="text-sm text-muted line-clamp-2">{item.summary}</Text>

      {/* Tap to Review */}
      <Text className="text-xs text-primary font-semibold">Tap to review →</Text>
    </Pressable>
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 gap-4 px-6 py-8">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-4xl font-bold text-foreground">Review Moderation</Text>
            <Text className="text-base text-muted">Approve or reject pending reviews</Text>
          </View>

          {/* Stats */}
          <View className="bg-surface border border-border rounded-lg p-4 gap-2">
            <Text className="text-sm font-bold text-foreground">
              {filteredReviews.length} Pending Review{filteredReviews.length !== 1 ? "s" : ""}
            </Text>
            <View className="flex-row gap-2">
              <View className="flex-1 items-center py-2">
                <Text className="text-xs text-muted">High Priority</Text>
                <Text className="text-lg font-bold text-red-400">
                  {reviews.filter((r) => r.priority === "high").length}
                </Text>
              </View>
              <View className="flex-1 items-center py-2 border-l border-border">
                <Text className="text-xs text-muted">Medium Priority</Text>
                <Text className="text-lg font-bold text-yellow-400">
                  {reviews.filter((r) => r.priority === "medium").length}
                </Text>
              </View>
              <View className="flex-1 items-center py-2 border-l border-border">
                <Text className="text-xs text-muted">Low Priority</Text>
                <Text className="text-lg font-bold text-green-400">
                  {reviews.filter((r) => r.priority === "low").length}
                </Text>
              </View>
            </View>
          </View>

          {/* Filter Buttons */}
          <View className="flex-row gap-2">
            {(["all", "high", "medium", "low"] as const).map((f) => (
              <Pressable
                key={f}
                onPress={() => {
                  handlePress();
                  setFilter(f);
                }}
                className={`px-4 py-2 rounded-lg ${
                  filter === f ? "bg-primary" : "bg-surface border border-border"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    filter === f ? "text-white" : "text-foreground"
                  }`}
                >
                  {f === "all"
                    ? "All"
                    : f === "high"
                      ? "High"
                      : f === "medium"
                        ? "Medium"
                        : "Low"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Loading State */}
          {loading && (
            <View className="py-8 items-center">
              <ActivityIndicator size="large" color="#0a7ea4" />
              <Text className="text-muted mt-2">Loading reviews...</Text>
            </View>
          )}

          {/* Reviews List */}
          {!loading && filteredReviews.length > 0 && (
            <FlatList
              data={filteredReviews}
              keyExtractor={(item) => item.id}
              renderItem={renderReviewCard}
              scrollEnabled={false}
            />
          )}

          {/* Empty State */}
          {!loading && filteredReviews.length === 0 && (
            <View className="flex-1 items-center justify-center gap-4">
              <Text className="text-6xl">✅</Text>
              <Text className="text-lg font-bold text-foreground">All Caught Up!</Text>
              <Text className="text-sm text-muted text-center">
                No pending reviews to moderate in this category
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Review Detail Modal */}
      <Modal
        visible={selectedReview !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReview(null)}
      >
        <ScreenContainer>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
            <View className="flex-1 gap-6 px-6 py-8">
              {/* Close Button */}
              <Pressable
                onPress={() => {
                  handlePress();
                  setSelectedReview(null);
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className="flex-row items-center gap-2 w-fit"
              >
                <Text className="text-primary text-lg">✕</Text>
              </Pressable>

              {selectedReview && (
                <>
                  {/* Review Details */}
                  <View className="gap-4">
                    <View className="gap-2">
                      <Text className="text-3xl font-bold text-foreground">Review Details</Text>
                      <Text className={`text-lg font-bold ${getPriorityTextColor(selectedReview.priority)}`}>
                        {getPriorityText(selectedReview.priority)}
                      </Text>
                    </View>

                    {/* Contractor Info */}
                    <View className="bg-surface border border-border rounded-lg p-4 gap-2">
                      <Text className="text-sm font-bold text-foreground">Contractor</Text>
                      <Text className="text-base text-foreground">{selectedReview.contractorName}</Text>
                      <Text className="text-sm text-muted">
                        License: {selectedReview.contractorLicense}
                      </Text>
                    </View>

                    {/* Customer Info */}
                    <View className="bg-surface border border-border rounded-lg p-4 gap-2">
                      <Text className="text-sm font-bold text-foreground">Customer</Text>
                      <Text className="text-base text-foreground">{selectedReview.customerName}</Text>
                    </View>

                    {/* Rating */}
                    <View className="bg-surface border border-border rounded-lg p-4 items-center gap-2">
                      <Text className={`text-5xl font-bold ${getRatingColor(selectedReview.averageRating)}`}>
                        {selectedReview.averageRating}
                      </Text>
                      <Text className="text-sm text-muted">Average Rating</Text>
                    </View>

                    {/* Flags */}
                    {selectedReview.flaggedReasons.length > 0 && (
                      <View className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 gap-2">
                        <Text className="text-sm font-bold text-red-300">⚠️ Flags Detected</Text>
                        {selectedReview.flaggedReasons.map((flag, index) => (
                          <Text key={index} className="text-sm text-red-300">
                            • {flag}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Summary */}
                    <View className="bg-surface border border-border rounded-lg p-4 gap-2">
                      <Text className="text-sm font-bold text-foreground">Review Summary</Text>
                      <Text className="text-sm text-muted leading-relaxed">
                        {selectedReview.summary}
                      </Text>
                    </View>

                    {/* Submitted Date */}
                    <View className="bg-surface border border-border rounded-lg p-4">
                      <Text className="text-sm text-muted">
                        Submitted: {new Date(selectedReview.submittedAt).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  {!showRejectModal ? (
                    <View className="gap-3">
                      <Pressable
                        onPress={() => handleApprove(selectedReview)}
                        style={({ pressed }) => [
                          {
                            opacity: pressed ? 0.8 : 1,
                            transform: [{ scale: pressed ? 0.97 : 1 }],
                          },
                        ]}
                        className="bg-green-600 py-4 px-6 rounded-lg items-center"
                      >
                        <Text className="text-white font-bold text-lg">✓ Approve Review</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          handlePress();
                          setShowRejectModal(true);
                        }}
                        className="bg-red-600 py-4 px-6 rounded-lg items-center"
                      >
                        <Text className="text-white font-bold text-lg">✕ Reject Review</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          handlePress();
                          setSelectedReview(null);
                        }}
                        className="py-4 px-6 rounded-lg items-center border border-border"
                      >
                        <Text className="text-foreground font-bold">Close</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View className="gap-3">
                      <Text className="text-lg font-bold text-foreground">Reason for Rejection</Text>

                      <TextInput
                        placeholder="Select or enter rejection reason..."
                        placeholderTextColor="#687076"
                        value={rejectReason}
                        onChangeText={setRejectReason}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
                      />

                      <Pressable
                        onPress={handleReject}
                        style={({ pressed }) => [
                          {
                            opacity: pressed ? 0.8 : 1,
                            transform: [{ scale: pressed ? 0.97 : 1 }],
                          },
                        ]}
                        className="bg-red-600 py-4 px-6 rounded-lg items-center"
                      >
                        <Text className="text-white font-bold text-lg">Confirm Rejection</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          handlePress();
                          setShowRejectModal(false);
                          setRejectReason("");
                        }}
                        className="py-4 px-6 rounded-lg items-center border border-border"
                      >
                        <Text className="text-foreground font-bold">Cancel</Text>
                      </Pressable>
                    </View>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}
