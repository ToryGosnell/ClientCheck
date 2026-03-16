import { Modal, ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface LegalDisclaimerModalProps {
  visible: boolean;
  onAgree: () => void;
  onDisagree: () => void;
  isLoading?: boolean;
}

export function LegalDisclaimerModal({
  visible,
  onAgree,
  onDisagree,
  isLoading = false,
}: LegalDisclaimerModalProps) {
  const colors = useColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDisagree}
    >
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.7)" }]}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              User Agreement & Legal Disclaimer
            </Text>
          </View>

          {/* Content */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Important: Please Read Carefully
            </Text>

            <Text style={[styles.sectionText, { color: colors.muted }]}>
              By submitting a review on ClientCheck, you agree to the following terms and conditions:
            </Text>

            {/* Section 1 */}
            <Text style={[styles.subsectionTitle, { color: colors.foreground }]}>
              1. Accuracy and Truthfulness
            </Text>
            <Text style={[styles.sectionText, { color: colors.muted }]}>
              You agree to submit only accurate, factual, and truthful information. All reviews must be based on your genuine personal experience with the customer or their payment reliability, communication, and professionalism. You must not fabricate, exaggerate, or misrepresent facts.
            </Text>

            {/* Section 2 */}
            <Text style={[styles.subsectionTitle, { color: colors.foreground }]}>
              2. No Slander or Defamation
            </Text>
            <Text style={[styles.sectionText, { color: colors.muted }]}>
              You agree not to post any content that is slanderous, defamatory, libelous, or otherwise false and damaging to a customer's reputation. Making false accusations or unsubstantiated claims about a customer is illegal and violates this agreement. You are solely responsible for any legal consequences resulting from false or defamatory statements.
            </Text>

            {/* Section 3 */}
            <Text style={[styles.subsectionTitle, { color: colors.foreground }]}>
              3. Factual Evidence
            </Text>
            <Text style={[styles.sectionText, { color: colors.muted }]}>
              Reviews should be based on documented facts and verifiable information. When possible, support your claims with evidence such as photos, invoices, communications, or other documentation. Opinions are acceptable, but must be clearly distinguished from facts.
            </Text>

            {/* Section 4 */}
            <Text style={[styles.subsectionTitle, { color: colors.foreground }]}>
              4. Liability
            </Text>
            <Text style={[styles.sectionText, { color: colors.muted }]}>
              ClientCheck is not responsible for the accuracy of user-submitted reviews. You agree to indemnify and hold harmless ClientCheck, its owners, operators, and employees from any claims, damages, or legal action arising from your review submissions.
            </Text>

            {/* Section 5 */}
            <Text style={[styles.subsectionTitle, { color: colors.foreground }]}>
              5. Removal of Content
            </Text>
            <Text style={[styles.sectionText, { color: colors.muted }]}>
              ClientCheck reserves the right to remove any review that violates these terms, including reviews that are false, defamatory, or lack factual basis. Repeated violations may result in account suspension or termination.
            </Text>

            {/* Section 6 */}
            <Text style={[styles.subsectionTitle, { color: colors.foreground }]}>
              6. Legal Compliance
            </Text>
            <Text style={[styles.sectionText, { color: colors.muted }]}>
              You agree to comply with all applicable federal, state, and local laws regarding defamation, libel, slander, and false statements. You understand that posting false or defamatory content may result in civil or criminal liability.
            </Text>

            {/* Confirmation */}
            <View style={[styles.confirmBox, { backgroundColor: colors.background, borderColor: colors.primary }]}>
              <Text style={[styles.confirmText, { color: colors.foreground }]}>
                ✓ I understand and agree to these terms
              </Text>
              <Text style={[styles.confirmSubtext, { color: colors.muted }]}>
                I will only post accurate, truthful, and factual information
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Pressable
              onPress={onDisagree}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.declineBtn,
                { borderColor: colors.border },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={[styles.declineBtnText, { color: colors.muted }]}>
                Decline
              </Text>
            </Pressable>

            <Pressable
              onPress={onAgree}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.agreeBtn,
                { backgroundColor: colors.primary },
                pressed && { opacity: 0.8 },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.agreeBtnText}>I Agree & Continue</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  container: {
    width: "100%",
    maxHeight: "85%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "column",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 13,
    lineHeight: 18,
  },
  confirmBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
    gap: 4,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: "600",
  },
  confirmSubtext: {
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  declineBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  agreeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  agreeBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
