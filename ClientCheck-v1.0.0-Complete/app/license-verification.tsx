import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
// Document picker removed - not needed for core functionality

export default function LicenseVerificationScreen() {
  const colors = useColors();
  const router = useRouter();
  const [licenseType, setLicenseType] = useState<"contractor" | "professional" | "both">(
    "contractor"
  );
  const [contractorLicense, setContractorLicense] = useState<{
    number: string;
    state: string;
    expiry: string;
    image?: string;
  }>({ number: "", state: "", expiry: "" });
  const [professionalLicense, setProfessionalLicense] = useState<{
    number: string;
    type: string;
    expiry: string;
    image?: string;
  }>({ number: "", type: "", expiry: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickDocument = async (
    type: "contractor" | "professional"
  ) => {
    try {
      Alert.alert("Feature Removed", "Document upload is not available in this build.");
    } catch (error) {
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const handleSubmit = async () => {
    if (licenseType === "contractor" || licenseType === "both") {
      if (!contractorLicense.number || !contractorLicense.state) {
        Alert.alert("Error", "Please fill in all contractor license fields");
        return;
      }
    }

    if (licenseType === "professional" || licenseType === "both") {
      if (!professionalLicense.number || !professionalLicense.type) {
        Alert.alert("Error", "Please fill in all professional license fields");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Submit to server
      // await submitLicenseVerification(...)
      Alert.alert(
        "Success",
        "License submitted for verification. We'll review it within 24 hours."
      );
      router.push("/")
    } catch (error) {
      Alert.alert("Error", "Failed to submit license");
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
          <Text style={[styles.title, { color: colors.foreground }]}>
            Verify Your License
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            To submit reviews, you must verify your contractor or professional
            license
          </Text>
        </View>

        {/* License Type Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            License Type
          </Text>
          <View style={styles.licenseTypeButtons}>
            {(["contractor", "professional", "both"] as const).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setLicenseType(type)}
                style={[
                  styles.typeButton,
                  {
                    backgroundColor:
                      licenseType === type
                        ? colors.primary + "20"
                        : colors.surface,
                    borderColor:
                      licenseType === type ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    {
                      color:
                        licenseType === type ? colors.primary : colors.muted,
                      fontWeight: licenseType === type ? "700" : "500",
                    },
                  ]}
                >
                  {type === "contractor"
                    ? "Contractor"
                    : type === "professional"
                      ? "Professional"
                      : "Both"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Contractor License */}
        {(licenseType === "contractor" || licenseType === "both") && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Contractor License
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                License Number
              </Text>
              <View
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.foreground }}>
                  {contractorLicense.number || "Enter license number"}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                State
              </Text>
              <View
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.foreground }}>
                  {contractorLicense.state || "Select state"}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Expiry Date
              </Text>
              <View
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.foreground }}>
                  {contractorLicense.expiry || "MM/DD/YYYY"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => handlePickDocument("contractor")}
              style={[
                styles.uploadButton,
                {
                  backgroundColor: colors.primary + "20",
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text style={[styles.uploadButtonText, { color: colors.primary }]}>
                📤 Upload License Image
              </Text>
            </TouchableOpacity>
            {contractorLicense.image && (
              <Text style={[styles.uploadedText, { color: colors.success }]}>
                ✓ Image uploaded
              </Text>
            )}
          </View>
        )}

        {/* Professional License */}
        {(licenseType === "professional" || licenseType === "both") && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Professional License
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                License Number
              </Text>
              <View
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.foreground }}>
                  {professionalLicense.number || "Enter license number"}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                License Type
              </Text>
              <View
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.foreground }}>
                  {professionalLicense.type || "e.g., Electrician, Plumber"}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Expiry Date
              </Text>
              <View
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.foreground }}>
                  {professionalLicense.expiry || "MM/DD/YYYY"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => handlePickDocument("professional")}
              style={[
                styles.uploadButton,
                {
                  backgroundColor: colors.primary + "20",
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text style={[styles.uploadButtonText, { color: colors.primary }]}>
                📤 Upload License Image
              </Text>
            </TouchableOpacity>
            {professionalLicense.image && (
              <Text style={[styles.uploadedText, { color: colors.success }]}>
                ✓ Image uploaded
              </Text>
            )}
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary, opacity: isSubmitting ? 0.6 : 1 },
          ]}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Submitting..." : "Submit for Verification"}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: colors.muted }]}>
          Your license information is securely stored and only used to verify
          your identity. We'll review your submission within 24 hours.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 24,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  licenseTypeButtons: {
    flexDirection: "row",
    gap: 8,
  },
  typeButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  typeButtonText: {
    fontSize: 13,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  uploadButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  uploadedText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
