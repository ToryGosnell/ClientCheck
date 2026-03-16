import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface RedFlagCounterProps {
  count: number;
  size?: "small" | "medium" | "large";
}

export function RedFlagCounter({ count, size = "medium" }: RedFlagCounterProps) {
  const colors = useColors();

  const sizeConfig = {
    small: {
      container: { paddingHorizontal: 8, paddingVertical: 4 },
      icon: 14,
      text: 12,
    },
    medium: {
      container: { paddingHorizontal: 12, paddingVertical: 6 },
      icon: 18,
      text: 14,
    },
    large: {
      container: { paddingHorizontal: 16, paddingVertical: 8 },
      icon: 24,
      text: 16,
    },
  };

  const config = sizeConfig[size];

  if (count === 0) {
    return (
      <View
        style={[
          styles.container,
          config.container,
          {
            backgroundColor: colors.success + "20",
            borderColor: colors.success,
          },
        ]}
      >
        <Text style={[styles.icon, { fontSize: config.icon }]}>✓</Text>
        <Text style={[styles.text, { fontSize: config.text, color: colors.success }]}>
          No Red Flags
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        config.container,
        {
          backgroundColor: colors.error + "20",
          borderColor: colors.error,
        },
      ]}
    >
      <Text style={[styles.icon, { fontSize: config.icon }]}>⚠️</Text>
      <Text style={[styles.text, { fontSize: config.text, color: colors.error }]}>
        {count} Red Flag{count !== 1 ? "s" : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  icon: {
    fontWeight: "700",
  },
  text: {
    fontWeight: "700",
  },
});
