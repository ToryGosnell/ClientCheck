import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface RatingBreakdownProps {
  reviewCount: number;
  // Star counts from 5 down to 1
  distribution?: number[];
}

export function RatingBreakdown({ reviewCount, distribution }: RatingBreakdownProps) {
  const colors = useColors();

  // Default to empty distribution
  const dist = distribution ?? [0, 0, 0, 0, 0];

  return (
    <View style={styles.container}>
      {[5, 4, 3, 2, 1].map((star, i) => {
        const count = dist[i] ?? 0;
        const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
        const barColor =
          star >= 4 ? colors.success : star === 3 ? colors.warning : colors.error;

        return (
          <View key={star} style={styles.row}>
            <Text style={[styles.starLabel, { color: colors.muted }]}>{star}★</Text>
            <View style={[styles.barBg, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.barFill,
                  { width: `${pct}%` as `${number}%`, backgroundColor: barColor },
                ]}
              />
            </View>
            <Text style={[styles.count, { color: colors.muted }]}>{count}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  starLabel: {
    width: 24,
    fontSize: 12,
    textAlign: "right",
  },
  barBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  count: {
    width: 24,
    fontSize: 12,
    textAlign: "left",
  },
});
