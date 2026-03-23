import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import {
  ANNUAL_PRICE_DISPLAY,
  PRICING_COPY,
  getDaysRemaining,
  getCurrentReminderMilestone,
} from "@/shared/membership";

interface Props {
  visible: boolean;
  expirationDate: string | Date | null;
  lastReminderDaysMilestone?: number | null;
  onDismiss: () => void;
  onAcknowledge: (milestone: number) => void;
}

export function RenewalReminderModal({
  visible,
  expirationDate,
  lastReminderDaysMilestone,
  onDismiss,
  onAcknowledge,
}: Props) {
  const colors = useColors();
  const router = useRouter();

  const days = getDaysRemaining(expirationDate);
  const milestone = getCurrentReminderMilestone(days, lastReminderDaysMilestone);
  if (!milestone || days === null) return null;

  const headline = PRICING_COPY.renewalHeadline(days);
  const formattedDate = expirationDate
    ? new Date(expirationDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "soon";

  const handlePay = () => {
    onAcknowledge(milestone);
    router.push("/contractor-paywall" as never);
  };

  const handleNotNow = () => {
    onAcknowledge(milestone);
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleNotNow}>
      <View style={s.overlay}>
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: "rgba(255,255,255,0.08)" }]}>
          <Text style={[s.emoji]}>⏳</Text>
          <Text style={[s.headline, { color: colors.foreground }]}>{headline}</Text>
          <Text style={[s.body, { color: colors.muted }]}>
            Your contractor membership expires on {formattedDate}.{"\n\n"}
            Renew now for {ANNUAL_PRICE_DISPLAY}/year to keep full access to customer reports, risk scores, and platform tools.
          </Text>

          <View style={[s.expiryBadge, { backgroundColor: days <= 3 ? "#dc262618" : "#ca8a0418" }]}>
            <Text style={[s.expiryText, { color: days <= 3 ? "#dc2626" : "#ca8a04" }]}>
              {days} day{days === 1 ? "" : "s"} remaining
            </Text>
          </View>

          <Pressable
            onPress={handlePay}
            style={({ pressed }) => [s.payBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }]}
          >
            <Text style={s.payBtnText}>Renew Now — {ANNUAL_PRICE_DISPLAY}/year</Text>
          </Pressable>

          <Pressable onPress={handleNotNow} style={({ pressed }) => [s.notNowBtn, pressed && { opacity: 0.6 }]}>
            <Text style={[s.notNowText, { color: colors.muted }]}>Not Now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
  },
  emoji: { fontSize: 40, marginBottom: 12 },
  headline: { fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 10 },
  body: { fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: 16 },
  expiryBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  expiryText: { fontSize: 14, fontWeight: "700" },
  payBtn: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  payBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  notNowBtn: { paddingVertical: 12 },
  notNowText: { fontSize: 14, fontWeight: "500" },
});
