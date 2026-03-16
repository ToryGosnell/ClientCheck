import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface ContractorBadgeProps {
  isVerified: boolean;
  verificationLevel?: "bronze" | "silver" | "gold";
  reviewCount?: number;
  size?: "small" | "medium" | "large";
}

export function ContractorBadge({
  isVerified,
  verificationLevel = "bronze",
  reviewCount = 0,
  size = "medium",
}: ContractorBadgeProps) {
  const colors = useColors();

  const sizeConfig = {
    small: {
      container: { paddingHorizontal: 8, paddingVertical: 4 },
      icon: 12,
      text: 11,
    },
    medium: {
      container: { paddingHorizontal: 12, paddingVertical: 6 },
      icon: 16,
      text: 13,
    },
    large: {
      container: { paddingHorizontal: 16, paddingVertical: 8 },
      icon: 20,
      text: 14,
    },
  };

  const config = sizeConfig[size];

  const levelConfig = {
    bronze: {
      icon: "🥉",
      label: "Bronze",
      color: "#CD7F32",
      minReviews: 5,
    },
    silver: {
      icon: "🥈",
      label: "Silver",
      color: "#C0C0C0",
      minReviews: 25,
    },
    gold: {
      icon: "🥇",
      label: "Gold",
      color: "#FFD700",
      minReviews: 100,
    },
  };

  const level = levelConfig[verificationLevel];

  if (!isVerified) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        config.container,
        {
          backgroundColor: level.color + "20",
          borderColor: level.color,
        },
      ]}
    >
      <Text style={[styles.icon, { fontSize: config.icon }]}>
        {level.icon}
      </Text>
      <View>
        <Text style={[styles.label, { fontSize: config.text, color: level.color }]}>
          Verified {level.label}
        </Text>
        {reviewCount > 0 && (
          <Text style={[styles.reviews, { fontSize: config.text - 1, color: level.color }]}>
            {reviewCount} reviews
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  icon: {
    fontWeight: "700",
  },
  label: {
    fontWeight: "700",
  },
  reviews: {
    fontWeight: "500",
    marginTop: 2,
  },
});
