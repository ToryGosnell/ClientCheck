import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
 Modal } from "react-native";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
// Document picker removed - not needed for core functionality

export default function DisputeReviewScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const reviewId = params.reviewId as string;

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [disputeReason, setDisputeReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState<{ type: string; url?: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const [showPaywall, setShowPaywall] = useState(false);
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);

  // Check if user has active subscription
  useEffect(() => {
    if (!user) {
      setShowPaywall(true);
    }
    setIsLoadingSubscription(false);
  }, [user]);

  const disputeReasons = [
    { id: "false_information", label: "Contains False Information" },
    { id: "defamatory", label: "Defamatory or Harmful" },
    { id: "privacy_violation", label: "Privacy Violation" },
    { id: "not_my_business", label: "This Isn't My Business" },
    { id: "other", label: "Other" },
  ];

  const handleAddEvidence = async () => {
    try {
      Alert.alert("Feature Removed", "Document upload is not available in this build.");
    } catch (error) {
      Alert.alert("Error", "Failed to add evidence");
    }
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidence((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSignUpClick = () => {
    router.push('/(tabs)/profile');
  };
  
  const handleSubscribeClick = () => {
    router.push('/subscription');
  };

  const handleSubmit = async () => {
    // Check authentication and subscription before allowing dispute
    if (!user) {
      setShowPaywall(true);
      return;
    }
    
    if (!user) {
      setShowPaywall(true);
      return;
    }
    if (!customerName.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    if (!customerEmail.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }

    if (!disputeReason) {
      Alert.alert("Error", "Please select a dispute reason");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Error", "Please describe your dispute");
      return;
    }

    if (evidence.length === 0) {
      Alert.alert("Error", "Please provide at least one piece of evidence");
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit dispute
      // await submitDispute(reviewId, {...})
      Alert.alert(
        "Dispute Submitted",
        "Thank you for submitting your dispute. We'll review it within 5-7 business days and send you an email with our decision."
      );
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to submit dispute");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingSubscription) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.foreground }}>Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <>
      {/* Paywall Modal */}
      <Modal
        visible={showPaywall}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaywall(false)}
      >
        <View style={[styles.paywallContainer, { backgroundColor: colors.background }]}>
          <View style={styles.paywallContent}>
            <Text style={[styles.paywallTitle, { color: colors.foreground }]}>
              {!user ? 'Sign In Required' : 'Subscription Required'}
            </Text>
            <Text style={[styles.paywallDescription, { color: colors.muted }]}>
              {!user
                ? 'To dispute a review, you need to create an account and subscribe to our service.'
                : 'To dispute a review, you need an active subscription. Subscribe now to get started.'}
            </Text>
            
            <TouchableOpacity
              style={[styles.paywallButton, { backgroundColor: colors.primary }]}
              onPress={!user ? handleSignUpClick : handleSubscribeClick}
            >
              <Text style={[styles.paywallButtonText, { color: colors.background }]}>
                {!user ? 'Sign Up Now' : 'Subscribe Now'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowPaywall(false);
                router.back();
              }}
            >
              <Text style={[styles.closeButtonText, { color: colors.muted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Dispute This Review
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Follow our dispute process to request review removal
          </Text>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Your Information
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Full Name
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              placeholder="Your name"
              placeholderTextColor={colors.muted}
              value={customerName}
              onChangeText={setCustomerName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Email Address
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              placeholder="your@email.com"
              placeholderTextColor={colors.muted}
              value={customerEmail}
              onChangeText={setCustomerEmail}
              keyboardType="email-address"
            />
          </View>
        </View>

        {/* Dispute Reason */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Why are you disputing this review?
          </Text>

          {disputeReasons.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              onPress={() => setDisputeReason(reason.id)}
              style={[
                styles.reasonButton,
                {
                  backgroundColor:
                    disputeReason === reason.id
                      ? colors.primary + "20"
                      : colors.surface,
                  borderColor:
                    disputeReason === reason.id ? colors.primary : colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor:
                      disputeReason === reason.id ? colors.primary : colors.border,
                    backgroundColor:
                      disputeReason === reason.id ? colors.primary : "transparent",
                  },
                ]}
              >
                {disputeReason === reason.id && (
                  <Text style={{ color: "white", fontWeight: "700" }}>✓</Text>
                )}
              </View>
              <Text
                style={[
                  styles.reasonText,
                  {
                    color:
                      disputeReason === reason.id ? colors.primary : colors.foreground,
                    fontWeight: disputeReason === reason.id ? "700" : "500",
                  },
                ]}
              >
                {reason.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Describe Your Dispute
          </Text>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            placeholder="Explain why this review is inaccurate or violates our policies..."
            placeholderTextColor={colors.muted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
          />
        </View>

        {/* Evidence */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Provide Evidence
          </Text>
          <Text style={[styles.helperText, { color: colors.muted }]}>
            Upload photos, documents, or other evidence supporting your dispute
          </Text>

          {evidence.length > 0 && (
            <View style={styles.evidenceList}>
              {evidence.map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.evidenceItem,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Text style={{ color: colors.foreground }}>
                    {item.type === "photo" ? "📷" : "📄"} Evidence {idx + 1}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveEvidence(idx)}>
                    <Text style={{ color: colors.error, fontWeight: "700" }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            onPress={handleAddEvidence}
            style={[
              styles.addEvidenceButton,
              {
                backgroundColor: colors.primary + "20",
                borderColor: colors.primary,
              },
            ]}
          >
            <Text style={[styles.addEvidenceText, { color: colors.primary }]}>
              + Add Evidence ({evidence.length}/10)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: colors.primary + "10",
              borderColor: colors.primary,
            },
          ]}
        >
          <Text style={[styles.infoTitle, { color: colors.primary }]}>
            📋 Our Dispute Process
          </Text>
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            1. Submit your dispute with evidence{"\n"}
            2. We review within 5-7 business days{"\n"}
            3. You'll receive an email decision{"\n"}
            4. If approved, the review is removed{"\n"}
            5. You can appeal if rejected
          </Text>
        </View>

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
            {isSubmitting ? "Submitting..." : "Submit Dispute"}
          </Text>
        </TouchableOpacity>
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
    paywallContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  paywallContent: {
    padding: 20,
    paddingBottom: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  paywallTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  paywallDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  paywallButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  paywallButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
  },
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
  reasonButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  reasonText: {
    fontSize: 14,
    flex: 1,
  },
  textArea: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 12,
  },
  evidenceList: {
    gap: 8,
    marginBottom: 12,
  },
  evidenceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addEvidenceButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  addEvidenceText: {
    fontSize: 14,
    fontWeight: "600",
  },
  infoBox: {
    borderRadius: 8,
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
  submitButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
