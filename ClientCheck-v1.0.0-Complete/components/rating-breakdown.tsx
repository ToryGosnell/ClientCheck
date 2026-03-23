import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface RatingBreakdownProps {
  reviewCount: number;
  distribution?: number[];
}

export function RatingBreakdown({ reviewCount, distribution }: RatingBreakdownProps) {
  const colors = useColors();
  const dist = distribution ?? [0, 0, 0, 0, 0];

  return (
    <View style={s.container}>
      {[5, 4, 3, 2, 1].map((star, i) => {
        const count = dist[i] ?? 0;
        const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
        const barColor =
          star >= 4 ? colors.success : star === 3 ? colors.warning : colors.error;

        return (
          <View key={star} style={s.row}>
            <Text style={[s.starLabel, { color: colors.foreground }]}>{star}</Text>
            <Text style={[s.starIcon, { color: barColor }]}>★</Text>
            <View style={[s.barBg, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
              <View
                style={[
                  s.barFill,
                  { width: `${pct}%` as `${number}%`, backgroundColor: barColor },
                ]}
              />
            </View>
            <Text style={[s.count, { color: colors.muted }]}>{count}</Text>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  starLabel: { width: 12, fontSize: 13, fontWeight: "700", textAlign: "right" },
  starIcon: { fontSize: 13, width: 16, textAlign: "center" },
  barBg: { flex: 1, height: 10, borderRadius: 5, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 5 },
  count: { width: 26, fontSize: 12, fontWeight: "600", textAlign: "right" },
});
