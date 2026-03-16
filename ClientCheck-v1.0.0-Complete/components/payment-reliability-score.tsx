import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface PaymentReliabilityScoreProps {
  paidOnTime: number;
  paidLate: number;
  neverPaid: number;
}

export function PaymentReliabilityScore({
  paidOnTime = 0,
  paidLate = 0,
  neverPaid = 0,
}: PaymentReliabilityScoreProps) {
  const colors = useColors();

  const total = paidOnTime + paidLate + neverPaid;
  const onTimePercent = total > 0 ? Math.round((paidOnTime / total) * 100) : 0;

  // Determine reliability level
  let reliabilityLevel: "excellent" | "good" | "fair" | "poor" | "unknown";
  let reliabilityColor: string;

  if (total === 0) {
    reliabilityLevel = "unknown";
    reliabilityColor = colors.muted;
  } else if (onTimePercent >= 90) {
    reliabilityLevel = "excellent";
    reliabilityColor = colors.success;
  } else if (onTimePercent >= 70) {
    reliabilityLevel = "good";
    reliabilityColor = "#10b981";
  } else if (onTimePercent >= 50) {
    reliabilityLevel = "fair";
    reliabilityColor = colors.warning;
  } else {
    reliabilityLevel = "poor";
    reliabilityColor = colors.error;
  }

  const levelLabel = {
    excellent: "Excellent Payer",
    good: "Good Payer",
    fair: "Fair Payer",
    poor: "Unreliable Payer",
    unknown: "No Payment History",
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Payment Reliability
        </Text>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: reliabilityColor + "20",
              borderColor: reliabilityColor,
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: reliabilityColor }]}>
            {levelLabel[reliabilityLevel]}
          </Text>
        </View>
      </View>

      {total > 0 && (
        <>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${onTimePercent}%`,
                  backgroundColor: reliabilityColor,
                },
              ]}
            />
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {paidOnTime}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>
                On Time
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.warning }]}>
                {paidLate}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>
                Late
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.error }]}>
                {neverPaid}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>
                Never Paid
              </Text>
            </View>
          </View>
        </>
      )}

      {total === 0 && (
        <Text style={[styles.noData, { color: colors.muted }]}>
          No payment history yet
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  progressContainer: {
    height: 8,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  stat: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
  },
  noData: {
    fontSize: 13,
    textAlign: "center",
    fontStyle: "italic",
  },
});
