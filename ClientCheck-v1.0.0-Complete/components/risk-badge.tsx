import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import type { RiskLevel } from "@/shared/types";

interface RiskBadgeProps {
  riskLevel: RiskLevel;
  size?: "sm" | "md";
}

const RISK_CONFIG: Record<RiskLevel, { label: string; emoji: string }> = {
  high: { label: "High Risk", emoji: "🔴" },
  medium: { label: "Caution", emoji: "🟡" },
  low: { label: "Good Client", emoji: "🟢" },
  unknown: { label: "No Reviews", emoji: "⚪" },
};

export function RiskBadge({ riskLevel, size = "md" }: RiskBadgeProps) {
  const colors = useColors();
  const config = RISK_CONFIG[riskLevel];

  const bgColor =
    riskLevel === "high"
      ? colors.error + "22"
      : riskLevel === "medium"
      ? colors.warning + "22"
      : riskLevel === "low"
      ? colors.success + "22"
      : colors.border;

  const textColor =
    riskLevel === "high"
      ? colors.error
      : riskLevel === "medium"
      ? colors.warning
      : riskLevel === "low"
      ? colors.success
      : colors.muted;

  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bgColor, borderColor: textColor + "44" },
        isSmall && styles.badgeSm,
      ]}
    >
      <Text style={[styles.text, { color: textColor }, isSmall && styles.textSm]}>
        {config.emoji} {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
  },
  textSm: {
    fontSize: 11,
  },
});
