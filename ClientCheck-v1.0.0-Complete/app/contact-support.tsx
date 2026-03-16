import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { apiFetch } from "@/lib/api";

const CATEGORIES = [
  { id: "support", label: "General Support" },
  { id: "dispute", label: "Dispute Issue" },
  { id: "refund", label: "Refund Request" },
  { id: "abuse", label: "Report Abuse" },
  { id: "general", label: "Other" },
];

export default function ContactSupportScreen() {
  const colors = useColors();
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState("support");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert("Error", "Please enter a subject");
      return;
    }

    if (!message.trim()) {
      Alert.alert("Error", "Please enter your message");
      return;
    }

    setIsSubmitting(true);

    try {
      // Mock API call
      const response = await apiFetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedCategory,
          subject,
          message,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert("✅ Message Sent", `Ticket #${data.ticketId}\n\nWe'll respond within 24-48 hours.`, [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert("Error", "Failed to send message. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScreenContainer>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Contact Support
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              We'll respond within 24-48 hours
            </Text>
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Category
            </Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[
                    styles.categoryButton,
                    {
                      backgroundColor:
                        selectedCategory === cat.id
                          ? colors.primary
                          : colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      {
                        color:
                          selectedCategory === cat.id
                            ? "white"
                            : colors.foreground,
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Subject */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Subject
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
              placeholder="What is this about?"
              placeholderTextColor={colors.muted}
              value={subject}
              onChangeText={setSubject}
              editable={!isSubmitting}
            />
          </View>

          {/* Message */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Message
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.messageInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="Please describe your issue in detail..."
              placeholderTextColor={colors.muted}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
          </View>

          {/* Info Box */}
          <View
            style={[
              styles.infoBox,
              { backgroundColor: colors.primary + "15", borderColor: colors.primary },
            ]}
          >
            <Text style={[styles.infoText, { color: colors.primary }]}>
              💡 Your email address will be kept private. We'll only use it to respond to your message.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[
              styles.submitButton,
              {
                backgroundColor: isSubmitting ? colors.muted : colors.primary,
              },
            ]}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? "Sending..." : "Send Message"}
            </Text>
          </TouchableOpacity>

          {/* FAQ Link */}
          <TouchableOpacity style={styles.faqLink}>
            <Text style={[styles.faqLinkText, { color: colors.primary }]}>
              📖 Check our FAQ for quick answers
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 16,
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
    fontSize: 13,
    fontWeight: "600",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  categoryButtonText: {
    fontSize: 11,
    fontWeight: "600",
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  messageInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  infoBox: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  submitButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  faqLink: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 20,
  },
  faqLinkText: {
    fontSize: 13,
    fontWeight: "600",
  },
});