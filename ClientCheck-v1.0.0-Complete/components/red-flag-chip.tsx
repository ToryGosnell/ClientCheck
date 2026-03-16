import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { RED_FLAG_LABELS, type RedFlag } from "@/shared/types";

interface RedFlagChipsProps {
  selected: RedFlag[];
  onToggle: (flag: RedFlag) => void;
}

const ALL_FLAGS: RedFlag[] = [
  "scope_creep",
  "no_deposits",
  "micromanages",
  "refuses_change_orders",
  "disputes_invoices",
];

export function RedFlagChips({ selected, onToggle }: RedFlagChipsProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {ALL_FLAGS.map((flag) => {
        const isSelected = selected.includes(flag);
        return (
          <Pressable
            key={flag}
            onPress={() => onToggle(flag)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isSelected ? colors.error + "18" : colors.surface,
                borderColor: isSelected ? colors.error : colors.border,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: isSelected ? colors.error : colors.muted },
              ]}
            >
              {isSelected ? "🚩 " : ""}
              {RED_FLAG_LABELS[flag]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
