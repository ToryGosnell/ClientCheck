import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";
import * as Haptics from "expo-haptics";

interface CancellationFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string, feedback: string) => Promise<void>;
}

const CANCELLATION_REASONS = [
  "Too expensive",
  "Don't need it anymore",
  "Found a better alternative",
  "Technical issues",
  "Poor customer support",
  "Other",
];

export function CancellationFeedbackModal({
  visible,
  onClose,
  onSubmit,
}: CancellationFeedbackModalProps) {
  const colors = useColors();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await onSubmit(selectedReason, feedback);
      // Reset form
      setSelectedReason(null);
      setFeedback("");
      onClose();
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      >
        <View
          className="rounded-t-3xl p-6 pb-8"
          style={{ backgroundColor: colors.background }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View className="mb-6">
              <Text className="text-2xl font-bold text-foreground mb-2">
                Help Us Improve
              </Text>
              <Text className="text-sm text-muted">
                Your feedback helps us build a better product. Why are you cancelling?
              </Text>
            </View>

            {/* Reason Selection */}
            <View className="mb-6">
              <Text className="text-sm font-semibold text-foreground mb-3">
                Select a reason
              </Text>
              <View className="gap-2">
                {CANCELLATION_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    onPress={() => {
                      setSelectedReason(reason);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={{
                      borderWidth: 2,
                      borderRadius: 10,
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      borderColor:
                        selectedReason === reason ? colors.primary : colors.border,
                      backgroundColor:
                        selectedReason === reason
                          ? colors.primary + "10"
                          : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          selectedReason === reason
                            ? colors.primary
                            : colors.foreground,
                        fontSize: 15,
                        fontWeight: selectedReason === reason ? "600" : "500",
                      }}
                    >
                      {reason}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Additional Feedback */}
            <View className="mb-6">
              <Text className="text-sm font-semibold text-foreground mb-3">
                Additional feedback (optional)
              </Text>
              <TextInput
                placeholder="Tell us more..."
                placeholderTextColor={colors.muted}
                value={feedback}
                onChangeText={setFeedback}
                multiline
                numberOfLines={4}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.foreground,
                  fontSize: 14,
                  textAlignVertical: "top",
                  fontFamily: "System",
                }}
              />
            </View>

            {/* Action Buttons */}
            <View className="gap-3">
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting || !selectedReason}
                style={{
                  backgroundColor: colors.primary,
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: "center",
                  opacity: isSubmitting || !selectedReason ? 0.6 : 1,
                }}
              >
                <Text className="text-white font-semibold text-base">
                  {isSubmitting ? "Submitting..." : "Submit Feedback"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                disabled={isSubmitting}
                style={{
                  borderWidth: 2,
                  borderColor: colors.border,
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: "center",
                  opacity: isSubmitting ? 0.6 : 1,
                }}
              >
                <Text className="text-foreground font-semibold text-base">
                  Skip
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
