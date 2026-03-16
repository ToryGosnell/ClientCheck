import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface QuickStatsProps {
  customersProtected: number;
  badCustomersAvoided: number;
  totalReviews: number;
}

export function QuickStats({
  customersProtected = 0,
  badCustomersAvoided = 0,
  totalReviews = 0,
}: QuickStatsProps) {
  const colors = useColors();

  const stats = [
    {
      label: "Customers Protected",
      value: customersProtected,
      icon: "🛡️",
      color: colors.success,
    },
    {
      label: "Bad Customers Avoided",
      value: badCustomersAvoided,
      icon: "⚠️",
      color: colors.error,
    },
    {
      label: "Reviews Submitted",
      value: totalReviews,
      icon: "📝",
      color: colors.primary,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>
        Your Impact This Month
      </Text>
      <View style={styles.statsGrid}>
        {stats.map((stat, idx) => (
          <View
            key={idx}
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={[styles.statValue, { color: stat.color }]}>
              {stat.value}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 8,
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 14,
  },
});
