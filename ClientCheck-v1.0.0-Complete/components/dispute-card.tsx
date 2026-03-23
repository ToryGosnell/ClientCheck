import { StyleSheet, Text, View, Pressable } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";

export interface DisputeCardProps {
  id: number;
  reviewId: number;
  status: "open" | "responded" | "resolved" | "dismissed";
  customerResponse?: string;
  respondedAt?: Date;
  createdAt: Date;
}

export function DisputeCard({ id, reviewId, status, customerResponse, respondedAt, createdAt }: DisputeCardProps) {
  const colors = useColors();
  const router = useRouter();

  const statusColors = {
    open: colors.error,
    responded: colors.warning,
    resolved: colors.success,
    dismissed: colors.muted,
  };

  const statusLabels = {
    open: "Open - Awaiting Response",
    responded: "Responded",
    resolved: "Resolved",
    dismissed: "Dismissed",
  };

  const handleRespond = () => {
    if (status === "open") {
      router.push({
        pathname: "/(tabs)/dispute-response" as any,
        params: { disputeId: id.toString(), reviewId: reviewId.toString() },
      });
    }
  };

  return (
    <Pressable
      onPress={handleRespond}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: statusColors[status],
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.statusBadge, { color: statusColors[status] }]}>
          {statusLabels[status]}
        </Text>
        <Text style={[styles.timestamp, { color: colors.muted }]}>
          {new Date(createdAt).toLocaleDateString()}
        </Text>
      </View>

      {!!customerResponse && (
        <View style={styles.responseSection}>
          <Text style={[styles.responseLabel, { color: colors.foreground }]}>Your Response:</Text>
          <Text style={[styles.responseText, { color: colors.foreground }]} numberOfLines={3}>
            {customerResponse}
          </Text>
          {respondedAt && (
            <Text style={[styles.respondedAt, { color: colors.muted }]}>
              Responded on {new Date(respondedAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      )}

      {status === "open" && (
        <Pressable
          style={({ pressed }) => [
            styles.respondButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.respondButtonText}>Respond Now</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    fontSize: 14,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 12,
  },
  responseSection: {
    gap: 8,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  responseText: {
    fontSize: 13,
    lineHeight: 18,
  },
  respondedAt: {
    fontSize: 12,
    fontStyle: "italic",
  },
  respondButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  respondButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
