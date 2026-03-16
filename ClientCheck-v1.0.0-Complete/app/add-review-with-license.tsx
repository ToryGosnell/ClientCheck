import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { canSubmitReview, formatLicenseMessage } from "@/lib/license-check-middleware";

export default function AddReviewWithLicenseScreen() {
  const colors = useColors();
  const router = useRouter();

  const [licenseStatus, setLicenseStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = async () => {
    try {
      const result = await canSubmitReview(1); // Mock contractor ID
      setLicenseStatus(result);
    } catch (error) {
      console.error("Error checking license:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLicense = () => {
    router.push("/license-verification");
  };

  const handleSubmitReview = async () => {
    if (!licenseStatus?.hasVerifiedLicense) {
      Alert.alert(
        "License Required",
        "You must verify your license before submitting reviews."
      );
      return;
    }

    if (!customerName.trim()) {
      Alert.alert("Error", "Please enter the customer name.");
      return;
    }

    if (!reviewText.trim()) {
      Alert.alert("Error", "Please write a review.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit review
      await new Promise((resolve) => setTimeout(resolve, 1500));

      Alert.alert("Success", "Your review has been submitted.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            Checking license status...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const licenseMessage = formatLicenseMessage(licenseStatus);

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* License Status Banner */}
        {!licenseStatus?.hasVerifiedLicense ? (
          <View
            style={[
              styles.licenseBanner,
              { backgroundColor: colors.error + "15", borderColor: colors.error },
            ]}
          >
            <Text style={[styles.bannerTitle, { color: colors.error }]}>
              {licenseMessage.title}
            </Text>
            <Text style={[styles.bannerDescription, { color: colors.foreground }]}>
              {licenseMessage.description}
            </Text>
            <TouchableOpacity
              onPress={handleVerifyLicense}
              style={[styles.verifyButton, { backgroundColor: colors.error }]}
            >
              <Text style={styles.verifyButtonText}>
                {licenseMessage.buttonText || "Verify License"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.licenseBanner,
              { backgroundColor: colors.success + "15", borderColor: colors.success },
            ]}
          >
            <Text style={[styles.bannerTitle, { color: colors.success }]}>
              {licenseMessage.title}
            </Text>
            <Text style={[styles.bannerDescription, { color: colors.foreground }]}>
              {licenseMessage.description}
            </Text>
          </View>
        )}

        {/* Form (only visible if license verified) */}
        {licenseStatus?.hasVerifiedLicense && (
          <>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Add Review
              </Text>
              <Text style={[styles.subtitle, { color: colors.muted }]}>
                Help other contractors make informed decisions
              </Text>
            </View>

            {/* Customer Name */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Customer Name *
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
                placeholder="Enter customer name"
                placeholderTextColor={colors.muted}
                value={customerName}
                onChangeText={setCustomerName}
              />
            </View>

            {/* Review Text */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Your Review *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.reviewInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="Describe your experience with this customer..."
                placeholderTextColor={colors.muted}
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <Text style={[styles.hint, { color: colors.muted }]}>
                {reviewText.length}/1000 characters
              </Text>
            </View>

            {/* Red Flags */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Red Flags
              </Text>
              <View style={styles.redFlagsGrid}>
                {[
                  "Late Payment",
                  "Scope Creep",
                  "Ghosting",
                  "Disputes",
                  "Unpaid Invoice",
                  "Poor Communication",
                ].map((flag) => (
                  <TouchableOpacity
                    key={flag}
                    onPress={() => {
                      setRedFlags((prev) =>
                        prev.includes(flag)
                          ? prev.filter((f) => f !== flag)
                          : [...prev, flag]
                      );
                    }}
                    style={[
                      styles.flagButton,
                      {
                        backgroundColor: redFlags.includes(flag)
                          ? colors.error
                          : colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.flagText,
                        {
                          color: redFlags.includes(flag)
                            ? "white"
                            : colors.foreground,
                        },
                      ]}
                    >
                      {flag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmitReview}
              disabled={isSubmitting || !customerName.trim() || !reviewText.trim()}
              style={[
                styles.submitButton,
                {
                  backgroundColor:
                    isSubmitting || !customerName.trim() || !reviewText.trim()
                      ? colors.muted + "50"
                      : colors.primary,
                },
              ]}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </Text>
            </TouchableOpacity>
          </>
        )}
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
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  licenseBanner: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  bannerDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  verifyButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  verifyButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
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
  },
  reviewInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  hint: {
    fontSize: 11,
    marginTop: 4,
  },
  redFlagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  flagButton: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  flagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  submitButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
});
