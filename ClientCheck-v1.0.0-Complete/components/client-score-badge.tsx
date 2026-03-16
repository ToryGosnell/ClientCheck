import { View, Text, StyleSheet } from "react-native";
import { getScoreColor, getScoreLabel } from "@/lib/client-score";

interface ClientScoreBadgeProps {
  score: number;
  size?: "small" | "large";
}

export function ClientScoreBadge({ score, size = "small" }: ClientScoreBadgeProps) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  const isSmall = size === "small";

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: color },
        isSmall ? styles.small : styles.large,
      ]}
    >
      <Text style={[styles.score, isSmall ? styles.scoreSmall : styles.scoreLarge]}>
        {score}
      </Text>
      <Text style={[styles.label, isSmall ? styles.labelSmall : styles.labelLarge]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  small: {
    width: 70,
    height: 70,
  },
  large: {
    width: 120,
    height: 120,
  },
  score: {
    color: "#fff",
    fontWeight: "700",
  },
  scoreSmall: {
    fontSize: 24,
  },
  scoreLarge: {
    fontSize: 42,
  },
  label: {
    color: "#fff",
    fontWeight: "600",
  },
  labelSmall: {
    fontSize: 10,
  },
  labelLarge: {
    fontSize: 14,
  },
});
