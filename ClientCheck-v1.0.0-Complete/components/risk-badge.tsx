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
      ? colors.error + "18"
      : riskLevel === "medium"
        ? colors.warning + "18"
        : riskLevel === "low"
          ? colors.success + "18"
          : "rgba(255,255,255,0.06)";

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
        s.badge,
        { backgroundColor: bgColor, borderColor: textColor + "33" },
        isSmall && s.badgeSm,
      ]}
    >
      <Text style={[s.text, { color: textColor }, isSmall && s.textSm]}>
        {config.emoji} {config.label}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  textSm: {
    fontSize: 11,
  },
});
