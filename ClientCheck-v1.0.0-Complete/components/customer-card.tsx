import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { StarRating } from "@/components/star-rating";
import { RiskBadge } from "@/components/risk-badge";
import type { Customer } from "@/drizzle/schema";
import type { RiskLevel } from "@/shared/types";

interface CustomerCardProps {
  customer: Customer;
  onPress?: () => void;
  compact?: boolean;
}

export function CustomerCard({ customer, onPress, compact = false }: CustomerCardProps) {
  const colors = useColors();
  const rating = parseFloat(customer.overallRating ?? "0");
  const initials = `${customer.firstName[0] ?? ""}${customer.lastName[0] ?? ""}`.toUpperCase();

  const avatarBg =
    customer.riskLevel === "high"
      ? colors.error
      : customer.riskLevel === "medium"
      ? colors.warning
      : customer.riskLevel === "low"
      ? colors.success
      : colors.muted;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        pressed && { opacity: 0.75 },
      ]}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {customer.firstName} {customer.lastName}
        </Text>

        {(customer.city || customer.state) && (
          <Text style={[styles.location, { color: colors.muted }]} numberOfLines={1}>
            📍 {[customer.city, customer.state].filter(Boolean).join(", ")}
          </Text>
        )}

        <View style={styles.ratingRow}>
          <StarRating rating={rating} size={14} />
          <Text style={[styles.ratingText, { color: colors.muted }]}>
            {" "}
            {rating > 0 ? rating.toFixed(1) : "—"} · {customer.reviewCount}{" "}
            {customer.reviewCount === 1 ? "review" : "reviews"}
          </Text>
        </View>

        {!compact && (
          <RiskBadge riskLevel={customer.riskLevel as RiskLevel} size="sm" />
        )}
      </View>

      {/* Chevron */}
      <Text style={[styles.chevron, { color: colors.muted }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  location: {
    fontSize: 13,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
  },
  chevron: {
    fontSize: 22,
    fontWeight: "300",
  },
});
