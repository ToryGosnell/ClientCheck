import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import {
  RED_FLAGS,
  GREEN_FLAGS,
  sortFlagsForDisplay,
  type WeightedFlag,
} from "@/shared/review-flags";

interface FlagChipsSectionProps {
  selectedRedFlags: string[];
  selectedGreenFlags: string[];
  onToggleRedFlag: (value: string) => void;
  onToggleGreenFlag: (value: string) => void;
}

const sortedRedFlags = sortFlagsForDisplay(RED_FLAGS);
const sortedGreenFlags = sortFlagsForDisplay(GREEN_FLAGS);

export function FlagChipsSection({
  selectedRedFlags,
  selectedGreenFlags,
  onToggleRedFlag,
  onToggleGreenFlag,
}: FlagChipsSectionProps) {
  const colors = useColors();

  return (
    <View style={styles.wrapper}>
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: "#DC2626" }]}>Red Flags</Text>
        <Text style={[styles.sectionHint, { color: colors.muted }]}>
          Select any issues you experienced.
        </Text>
        <View style={styles.chipContainer}>
          {sortedRedFlags.map((flag) => (
            <FlagChip
              key={flag.value}
              flag={flag}
              selected={selectedRedFlags.includes(flag.value)}
              onPress={() => onToggleRedFlag(flag.value)}
            />
          ))}
        </View>
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: "#22C55E" }]}>Green Flags</Text>
        <Text style={[styles.sectionHint, { color: colors.muted }]}>
          What did this client do well?
        </Text>
        <View style={styles.chipContainer}>
          {sortedGreenFlags.map((flag) => (
            <FlagChip
              key={flag.value}
              flag={flag}
              selected={selectedGreenFlags.includes(flag.value)}
              onPress={() => onToggleGreenFlag(flag.value)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function FlagChip({
  flag,
  selected,
  onPress,
}: {
  flag: WeightedFlag;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const isCrit = flag.severity === "critical" || flag.severity === "major_negative";
  const isGreen = flag.category === "green";

  const accent = isGreen ? "#22C55E" : isCrit ? "#DC2626" : colors.error;
  const bgSelected = isGreen ? "#22C55E18" : isCrit ? "#DC262630" : accent + "18";
  const borderSelected = isGreen ? "#22C55E" : isCrit ? "#DC2626" : accent;
  const borderWidth = selected && isCrit ? 2 : 1;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? bgSelected : colors.surface,
          borderColor: selected ? borderSelected : colors.border,
          borderWidth,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: selected ? accent : colors.muted,
            fontWeight: selected ? "700" : "500",
          },
        ]}
      >
        {selected && isGreen ? "✅ " : ""}
        {selected && !isGreen && isCrit ? "⚠️ " : ""}
        {selected && !isGreen && !isCrit ? "🚩 " : ""}
        {flag.label}
      </Text>
    </Pressable>
  );
}

/** @deprecated Backward compat wrapper — use FlagChipsSection instead */
export function RedFlagChips({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (flag: string) => void;
}) {
  return (
    <FlagChipsSection
      selectedRedFlags={selected}
      selectedGreenFlags={[]}
      onToggleRedFlag={onToggle}
      onToggleGreenFlag={() => {}}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 16 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 15, fontWeight: "700" },
  sectionHint: { fontSize: 12, marginTop: -4 },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13 },
});
