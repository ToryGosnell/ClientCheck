import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";

export default function DisputeAppealScreen() {
  const colors = useColors();
  const router = useRouter();
  const { disputeId } = useLocalSearchParams();

  const [appealReason, setAppealReason] = useState("");
  const [additionalEvidence, setAdditionalEvidence] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitAppeal = async () => {
    if (!appealReason.trim()) {
      Alert.alert("Error", "Please provide a reason for your appeal.");
      return;
    }

    if (!additionalEvidence.trim()) {
      Alert.alert("Error", "Please provide additional evidence or clarification.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit appeal
      await new Promise((resolve) => setTimeout(resolve, 1500));

      Alert.alert(
        "Appeal Submitted",
        "Your appeal has been submitted. We will review it within 2-4 weeks.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to submit appeal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backButton, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.foreground }]}>Appeal Decision</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Dispute ID: {disputeId}
          </Text>
        </View>

        {/* Info Box */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: colors.warning + "15", borderColor: colors.warning },
          ]}
        >
          <Text style={[styles.infoTitle, { color: colors.warning }]}>
            ⚠️ Appeal Guidelines
          </Text>
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            • You have 30 days from the rejection date to appeal
            • Provide new evidence or clarification not included in original dispute
            • Appeals are reviewed within 2-4 weeks
            • This is your final opportunity to contest the decision
          </Text>
        </View>

        {/* Appeal Reason */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Why are you appealing this decision?
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="Explain why you believe the decision was incorrect..."
            placeholderTextColor={colors.muted}
            value={appealReason}
            onChangeText={setAppealReason}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={[styles.hint, { color: colors.muted }]}>
            {appealReason.length}/500 characters
          </Text>
        </View>

        {/* Additional Evidence */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Additional Evidence or Clarification
          </Text>
          <Text style={[styles.hint, { color: colors.muted, marginBottom: 8 }]}>
            Provide new information not included in your original dispute
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="Describe the new evidence or provide clarification..."
            placeholderTextColor={colors.muted}
            value={additionalEvidence}
            onChangeText={setAdditionalEvidence}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          <Text style={[styles.hint, { color: colors.muted }]}>
            {additionalEvidence.length}/1000 characters
          </Text>
        </View>

        {/* Evidence Upload */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>
            Upload Additional Files (Optional)
          </Text>
          <TouchableOpacity
            style={[
              styles.uploadButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.uploadText, { color: colors.primary }]}>
              📎 Add Photos or Documents
            </Text>
          </TouchableOpacity>
        </View>

        {/* Important Notes */}
        <View
          style={[
            styles.notesBox,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.notesTitle, { color: colors.foreground }]}>
            Important Notes
          </Text>
          <Text style={[styles.notesText, { color: colors.muted }]}>
            • Appeals must be substantive and include new information
            • Resubmitting the same evidence will likely result in the same decision
            • Our decision on appeal is final
            • You will be notified via email within 2-4 weeks
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmitAppeal}
          disabled={isSubmitting || !appealReason.trim() || !additionalEvidence.trim()}
          style={[
            styles.submitButton,
            {
              backgroundColor:
                isSubmitting || !appealReason.trim() || !additionalEvidence.trim()
                  ? colors.muted + "50"
                  : colors.primary,
            },
          ]}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Submitting..." : "Submit Appeal"}
          </Text>
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.cancelButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 20,
  },
  header: {
    gap: 8,
  },
  backButton: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
  },
  infoBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 100,
  },
  hint: {
    fontSize: 11,
    marginTop: 4,
  },
  uploadButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingVertical: 16,
    alignItems: "center",
  },
  uploadText: {
    fontSize: 13,
    fontWeight: "600",
  },
  notesBox: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  notesText: {
    fontSize: 12,
    lineHeight: 18,
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  cancelButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
