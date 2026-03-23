import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
// Document picker removed - not needed for core functionality
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function VerificationScreen() {
  const colors = useColors();
  const [idDoc, setIdDoc] = useState<{ name: string; uri: string } | null>(null);
  const [licenseDoc, setLicenseDoc] = useState<{ name: string; uri: string } | null>(null);
  const [insuranceDoc, setInsuranceDoc] = useState<{ name: string; uri: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusQuery = trpc.verification.getVerificationStatus.useQuery();
  const submitMutation = trpc.verification.submitVerification.useMutation();

  const handlePickDocument = async (
    type: "id" | "license" | "insurance"
  ) => {
    Alert.alert("Feature Removed", "Document upload is not available in this build.");
  };

  const handleSubmit = async () => {
    if (!idDoc) {
      alert("Please upload your ID document");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitMutation.mutateAsync({
        idDocumentUrl: idDoc.uri,
        licenseDocumentUrl: licenseDoc?.uri,
        insuranceDocumentUrl: insuranceDoc?.uri,
      });
      alert("Verification submitted! We'll review it shortly.");
      await statusQuery.refetch();
      setIdDoc(null);
      setLicenseDoc(null);
      setInsuranceDoc(null);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to submit verification. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const status = statusQuery.data;

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Contractor Verification</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Get verified to build trust with customers
          </Text>
        </View>

        {/* Status Badge */}
        {status && (
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  status.status === "verified"
                    ? colors.success
                    : status.status === "rejected"
                      ? colors.error
                      : status.status === "pending"
                        ? colors.warning
                        : colors.muted,
              },
            ]}
          >
            <Text style={styles.statusText}>
              Status: {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
            </Text>
            {!!status.notes && (
              <Text style={[styles.statusNotes, { color: colors.foreground }]}>
                {status.notes}
              </Text>
            )}
          </View>
        )}

        {/* Document Upload Section */}
        {(!status || status.status === "unverified" || status.status === "rejected") && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Upload Documents
            </Text>

            {/* ID Document */}
            <View style={[styles.documentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.documentHeader}>
                <IconSymbol name="doc.text.fill" size={24} color={colors.primary} />
                <Text style={[styles.documentLabel, { color: colors.foreground }]}>
                  Government ID (Required)
                </Text>
              </View>
              {idDoc ? (
                <View style={styles.selectedDoc}>
                  <Text style={[styles.selectedDocName, { color: colors.success }]}>✓ {idDoc.name}</Text>
                  <Pressable onPress={() => setIdDoc(null)}>
                    <Text style={[styles.removeBtn, { color: colors.error }]}>Remove</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => handlePickDocument("id")}
                  style={({ pressed }) => [
                    styles.uploadBtn,
                    { borderColor: colors.primary },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.uploadBtnText, { color: colors.primary }]}>
                    Choose File
                  </Text>
                </Pressable>
              )}
            </View>

            {/* License Document */}
            <View style={[styles.documentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.documentHeader}>
                <IconSymbol name="doc.text.fill" size={24} color={colors.primary} />
                <Text style={[styles.documentLabel, { color: colors.foreground }]}>
                  License (Optional)
                </Text>
              </View>
              {licenseDoc ? (
                <View style={styles.selectedDoc}>
                  <Text style={[styles.selectedDocName, { color: colors.success }]}>✓ {licenseDoc.name}</Text>
                  <Pressable onPress={() => setLicenseDoc(null)}>
                    <Text style={[styles.removeBtn, { color: colors.error }]}>Remove</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => handlePickDocument("license")}
                  style={({ pressed }) => [
                    styles.uploadBtn,
                    { borderColor: colors.primary },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.uploadBtnText, { color: colors.primary }]}>
                    Choose File
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Insurance Document */}
            <View style={[styles.documentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.documentHeader}>
                <IconSymbol name="doc.text.fill" size={24} color={colors.primary} />
                <Text style={[styles.documentLabel, { color: colors.foreground }]}>
                  Insurance (Optional)
                </Text>
              </View>
              {insuranceDoc ? (
                <View style={styles.selectedDoc}>
                  <Text style={[styles.selectedDocName, { color: colors.success }]}>✓ {insuranceDoc.name}</Text>
                  <Pressable onPress={() => setInsuranceDoc(null)}>
                    <Text style={[styles.removeBtn, { color: colors.error }]}>Remove</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => handlePickDocument("insurance")}
                  style={({ pressed }) => [
                    styles.uploadBtn,
                    { borderColor: colors.primary },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.uploadBtnText, { color: colors.primary }]}>
                    Choose File
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting || !idDoc}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: colors.primary },
                (pressed || isSubmitting || !idDoc) && { opacity: 0.7 },
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Submit for Review</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Verified Status */}
        {status?.status === "verified" && (
          <View style={[styles.verifiedBox, { backgroundColor: colors.success }]}>
            <Text style={styles.verifiedText}>✓ You are verified!</Text>
            <Text style={styles.verifiedSubtext}>
              Your verified badge is now displayed on your profile
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 100,
    gap: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  statusNotes: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  documentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  documentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  documentLabel: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  uploadBtn: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectedDoc: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedDocName: {
    fontSize: 14,
    fontWeight: "500",
  },
  removeBtn: {
    fontSize: 12,
    fontWeight: "600",
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  verifiedBox: {
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  verifiedText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  verifiedSubtext: {
    color: "#fff",
    fontSize: 14,
    marginTop: 8,
  },
});
