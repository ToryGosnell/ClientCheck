import React from "react";
import { View, Text } from "react-native";
import { ClientScoreBadge } from "./client-score-badge";
import { useColors } from "@/hooks/use-colors";

interface CustomerReportCardProps {
  customerId: number;
  firstName: string;
  lastName: string;
  overallRating: number;
  reviewCount: number;
  ratingPaymentReliability: number;
  ratingCommunication: number;
  ratingScopeChanges: number;
  ratingPropertyRespect: number;
  ratingPermitPulling: number;
  ratingOverallJobExperience: number;
  clientScore: number;
  topRedFlags: string[];
}

export function CustomerReportCard({
  firstName,
  lastName,
  overallRating,
  reviewCount,
  ratingPaymentReliability,
  ratingCommunication,
  ratingScopeChanges,
  ratingPropertyRespect,
  ratingPermitPulling,
  ratingOverallJobExperience,
  clientScore,
  topRedFlags,
}: CustomerReportCardProps) {
  const colors = useColors();

  const categories = [
    { label: "Payment Reliability", rating: ratingPaymentReliability },
    { label: "Communication", rating: ratingCommunication },
    { label: "Scope Changes", rating: ratingScopeChanges },
    { label: "Property Respect", rating: ratingPropertyRespect },
    { label: "Permit Pulling", rating: ratingPermitPulling },
    { label: "Overall Job Experience", rating: ratingOverallJobExperience },
  ];

  const RatingBar = ({ label, rating }: { label: string; rating: number }) => {
    const percentage = (rating / 5) * 100;
    return (
      <View className="mb-4">
        <View className="flex-row justify-between mb-1">
          <Text className="text-sm font-medium text-foreground">{label}</Text>
          <Text className="text-sm font-bold text-primary">
            {rating.toFixed(1)}/5
          </Text>
        </View>
        <View className="h-2 bg-surface rounded-full overflow-hidden">
          <View
            className="h-full bg-primary rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </View>
      </View>
    );
  };

  return (
    <View className="bg-surface rounded-2xl p-6 mb-6">
      {/* Header with score badge */}
      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-1">
          <Text className="text-2xl font-bold text-foreground">
            {firstName} {lastName}
          </Text>
          <Text className="text-sm text-muted mt-1">
            {reviewCount} contractor{reviewCount !== 1 ? "s" : ""} reviewed
          </Text>
        </View>
        <ClientScoreBadge score={clientScore} size="large" />
      </View>

      {/* Overall rating */}
      <View className="mb-6 pb-6 border-b border-border">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-semibold text-foreground">
            Overall Rating
          </Text>
          <View className="flex-row">
            {[1, 2, 3, 4, 5].map((star) => (
              <Text
                key={star}
                className={`text-lg ${
                  star <= Math.round(overallRating)
                    ? "text-yellow-400"
                    : "text-muted"
                }`}
              >
                ★
              </Text>
            ))}
          </View>
          <Text className="text-lg font-bold text-foreground ml-2">
            {overallRating.toFixed(1)}
          </Text>
        </View>
      </View>

      {/* Category ratings */}
      <View className="mb-6">
        <Text className="text-base font-semibold text-foreground mb-4">
          Category Breakdown
        </Text>
        {categories.map((cat) => (
          <RatingBar key={cat.label} label={cat.label} rating={cat.rating} />
        ))}
      </View>

      {/* Top red flags */}
      {topRedFlags.length > 0 && (
        <View className="pt-6 border-t border-border">
          <Text className="text-base font-semibold text-foreground mb-3">
            Most Common Red Flags
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {topRedFlags.slice(0, 3).map((flag) => (
              <View
                key={flag}
                className="bg-error bg-opacity-20 px-3 py-1 rounded-full"
              >
                <Text className="text-xs font-medium text-error">
                  {flag.replace(/_/g, " ")}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Safety indicator */}
      <View className="mt-6 pt-6 border-t border-border">
        <Text className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
          Safety Status
        </Text>
        <View
          className={`py-2 px-3 rounded-lg ${
            clientScore >= 70
              ? "bg-success bg-opacity-20"
              : clientScore >= 40
                ? "bg-warning bg-opacity-20"
                : "bg-error bg-opacity-20"
          }`}
        >
          <Text
            className={`font-semibold ${
              clientScore >= 70
                ? "text-success"
                : clientScore >= 40
                  ? "text-warning"
                  : "text-error"
            }`}
          >
            {clientScore >= 70
              ? "✓ Safe to work with"
              : clientScore >= 40
                ? "⚠ Proceed with caution"
                : "✗ Not recommended"}
          </Text>
        </View>
      </View>
    </View>
  );
}
