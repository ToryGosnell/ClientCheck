import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "Why do you ask for the customer's phone number?",
    answer:
      "Phone numbers help us identify customers uniquely and match them with existing profiles. This prevents duplicate entries and helps you see if other contractors have already reviewed this customer.",
  },
  {
    question: "Is the phone number visible to other contractors?",
    answer:
      "No. Phone numbers are completely private and only visible to you (the contractor who entered it) and our admins. Other contractors will never see the phone number.",
  },
  {
    question: "How is my phone number used?",
    answer:
      "Your phone number is used only for internal matching and verification. We never use it for marketing, never share it with third parties, and never sell it. It's purely for our internal database.",
  },
  {
    question: "Can customers see my phone number?",
    answer:
      "No. Customers cannot see any contractor phone numbers. The phone number field is only for identifying the customer, not for sharing contact information.",
  },
  {
    question: "What about the customer's address?",
    answer:
      "Like phone numbers, customer addresses are private and only visible to you and admins. Addresses are used for matching and verification only, never displayed publicly.",
  },
  {
    question: "How is my data protected?",
    answer:
      "All sensitive data is encrypted and stored securely. Access is restricted to authorized personnel only. We comply with data protection regulations and regularly audit access logs.",
  },
];

export default function PrivacyFAQScreen() {
  const colors = useColors();
  const router = useRouter();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpanded = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backBtn, { color: colors.primary }]}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Privacy FAQ
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Intro */}
        <View style={styles.intro}>
          <Text style={styles.introEmoji}>🔒</Text>
          <Text style={[styles.introTitle, { color: colors.foreground }]}>
            Your Data is Private
          </Text>
          <Text style={[styles.introText, { color: colors.muted }]}>
            Phone numbers and addresses are never shared publicly.
          </Text>
        </View>

        {/* FAQ Items */}
        <View style={styles.faqList}>
          {faqItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => toggleExpanded(index)}
              style={[
                styles.faqItem,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.faqHeader}>
                <Text
                  style={[styles.faqQuestion, { color: colors.foreground }]}
                  numberOfLines={2}
                >
                  {item.question}
                </Text>
                <Text
                  style={[styles.faqIcon, { color: colors.primary }]}
                >
                  {expandedIndex === index ? "−" : "+"}
                </Text>
              </View>

              {expandedIndex === index && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}

              {expandedIndex === index && (
                <Text style={[styles.faqAnswer, { color: colors.muted }]}>
                  {item.answer}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Privacy Notice */}
        <View
          style={[
            styles.noticeBox,
            {
              backgroundColor: colors.success + "10",
              borderColor: colors.success,
            },
          ]}
        >
          <Text style={styles.noticeIcon}>✓</Text>
          <Text style={[styles.noticeText, { color: colors.success }]}>
            We never sell or share customer information. Your data is secure and private.
          </Text>
        </View>
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
  intro: {
    alignItems: "center",
    gap: 12,
  },
  introEmoji: {
    fontSize: 48,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  introText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  faqList: {
    gap: 12,
  },
  faqItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    lineHeight: 18,
  },
  faqIcon: {
    fontSize: 20,
    fontWeight: "700",
  },
  divider: {
    height: 1,
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 18,
  },
  noticeBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  noticeIcon: {
    fontSize: 20,
    fontWeight: "700",
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});
