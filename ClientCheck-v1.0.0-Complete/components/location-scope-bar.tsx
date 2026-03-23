import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { SCOPE_OPTIONS, type LocationScope } from "@/lib/location-scope";

interface Props {
  scope: LocationScope;
  onScopeChange: (scope: LocationScope) => void;
  userCity?: string | null;
  userState?: string | null;
  compact?: boolean;
}

export function LocationScopeBar({ scope, onScopeChange, userCity, userState, compact }: Props) {
  const colors = useColors();

  return (
    <View style={[s.row, compact && s.rowCompact]}>
      {SCOPE_OPTIONS.map((opt) => {
        const active = scope === opt.key;
        let label = opt.label;
        if (opt.key === "city" && userCity) label = userCity;
        if (opt.key === "state" && userState) label = userState;

        return (
          <Pressable
            key={opt.key}
            onPress={() => onScopeChange(opt.key)}
            style={({ pressed }) => [
              s.chip,
              {
                backgroundColor: active ? colors.primary : colors.surface,
                borderColor: active ? colors.primary : colors.border,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                s.chipText,
                { color: active ? "#fff" : colors.muted },
              ]}
            >
              {opt.key === "city" ? "📍 " : opt.key === "state" ? "🗺️ " : "🌎 "}
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  rowCompact: { paddingHorizontal: 0, paddingVertical: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: "600" },
});
