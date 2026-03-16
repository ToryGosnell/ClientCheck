import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image , Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
// Document picker removed - not needed for core functionality
import * as Haptics from "expo-haptics";
import { apiFetch } from "@/lib/api";

export default function ContractorVerificationScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<{ type: string; uri: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickDocument = async (type: "id" | "license" | "insurance") => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert("Feature Removed", "Document upload is not available in this build.");
    } catch (error) {
      console.error("Document pick error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };


  const handleRemoveDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = async () => {
    if (documents.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const response = await apiFetch("/api/verification/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          documents: documents.map((d) => ({
            type: d.type,
            url: d.uri,
          })),
        }),
      });

      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.push("/(tabs)");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error("Submit verification error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backBtn, { color: colors.primary }]}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Get Verified</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🔐</Text>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            Earn Your Verification Badge
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
            Build trust with customers and stand out in the community
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Benefits:</Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>⭐</Text>
              <Text style={[styles.benefitText, { color: colors.foreground }]}>
                Get a verified badge on your profile
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>📈</Text>
              <Text style={[styles.benefitText, { color: colors.foreground }]}>
                Appear higher in search results
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🤝</Text>
              <Text style={[styles.benefitText, { color: colors.foreground }]}>
                Customers trust verified contractors more
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>💼</Text>
              <Text style={[styles.benefitText, { color: colors.foreground }]}>
                Access to premium features
              </Text>
            </View>
          </View>
        </View>

        {/* Documents Section */}
        <View style={styles.documentsSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Upload Documents
          </Text>

          {/* ID Document */}
          <TouchableOpacity
            onPress={() => handlePickDocument("id")}
            style={[
              styles.uploadButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Text style={styles.uploadIcon}>📄</Text>
            <Text style={[styles.uploadText, { color: colors.foreground }]}>
              Government ID or Passport
            </Text>
            <Text style={[styles.uploadSubtext, { color: colors.muted }]}>
              JPG, PNG, or PDF (Max 10MB)
            </Text>
          </TouchableOpacity>

          {/* License Document */}
          <TouchableOpacity
            onPress={() => handlePickDocument("license")}
            style={[
              styles.uploadButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Text style={styles.uploadIcon}>🎖️</Text>
            <Text style={[styles.uploadText, { color: colors.foreground }]}>
              Trade License or Certification
            </Text>
            <Text style={[styles.uploadSubtext, { color: colors.muted }]}>
              JPG, PNG, or PDF (Max 10MB)
            </Text>
          </TouchableOpacity>

          {/* Insurance Document */}
          <TouchableOpacity
            onPress={() => handlePickDocument("insurance")}
            style={[
              styles.uploadButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Text style={styles.uploadIcon}>🛡️</Text>
            <Text style={[styles.uploadText, { color: colors.foreground }]}>
              Insurance Certificate (Optional)
            </Text>
            <Text style={[styles.uploadSubtext, { color: colors.muted }]}>
              JPG, PNG, or PDF (Max 10MB)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Uploaded Documents */}
        {documents.length > 0 && (
          <View style={styles.uploadedSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Uploaded Documents ({documents.length})
            </Text>
            {documents.map((doc, index) => (
              <View
                key={index}
                style={[
                  styles.uploadedItem,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.uploadedInfo}>
                  <Text style={styles.uploadedIcon}>
                    {doc.type === "id" ? "📄" : doc.type === "license" ? "🎖️" : "🛡️"}
                  </Text>
                  <View>
                    <Text style={[styles.uploadedName, { color: colors.foreground }]}>
                      {doc.type.charAt(0).toUpperCase() + doc.type.slice(1)}
                    </Text>
                    <Text style={[styles.uploadedPath, { color: colors.muted }]}>
                      {doc.uri.split("/").pop()}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveDocument(index)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeIcon}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Info Box */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: colors.primary + "10", borderColor: colors.primary },
          ]}
        >
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            Your documents are securely stored and reviewed by our team. Verification typically takes 24-48 hours.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting || documents.length === 0}
          style={[
            styles.submitButton,
            {
              backgroundColor: colors.primary,
              opacity: isSubmitting || documents.length === 0 ? 0.6 : 1,
            },
          ]}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Submitting..." : "Submit for Verification"}
          </Text>
        </TouchableOpacity>

        {/* Skip Link */}
        <TouchableOpacity onPress={() => router.back()} style={styles.skipButton}>
          <Text style={[styles.skipButtonText, { color: colors.muted }]}>
            Maybe later
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 100,
    gap: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backBtn: {
    fontSize: 18,
    fontWeight: "600",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  hero: {
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  heroEmoji: {
    fontSize: 48,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  benefitsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  benefitIcon: {
    fontSize: 24,
  },
  benefitText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  documentsSection: {
    gap: 12,
  },
  uploadButton: {
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  uploadIcon: {
    fontSize: 32,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: "600",
  },
  uploadSubtext: {
    fontSize: 12,
  },
  uploadedSection: {
    gap: 12,
  },
  uploadedItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  uploadedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  uploadedIcon: {
    fontSize: 24,
  },
  uploadedName: {
    fontSize: 14,
    fontWeight: "600",
  },
  uploadedPath: {
    fontSize: 12,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  removeIcon: {
    fontSize: 18,
    fontWeight: "700",
  },
  infoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  infoIcon: {
    fontSize: 20,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
});