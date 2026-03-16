import React, { useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import * as Haptics from "expo-haptics";

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "Why do both contractors and customers have to pay?",
    answer:
      "When both sides pay equally, everyone has skin in the game. This creates a powerful incentive for honest behavior from both contractors and customers. It prevents fake reviews, frivolous disputes, and ensures that only committed, serious participants use the platform.",
  },
  {
    question: "How does this ensure fair reviews?",
    answer:
      "Because both sides pay, our moderation team can make truly fair decisions without bias. Contractors can't just spam fake reviews to hurt competitors, and customers can't file frivolous disputes. The cost creates accountability on both sides.",
  },
  {
    question: "What prevents contractors from leaving fake negative reviews?",
    answer:
      "Contractors pay $9.99/month to use the platform. Leaving fake reviews risks their account being suspended and losing their investment. Plus, our verification system checks license information and tracks contractor reputation. Fake reviews are quickly identified and removed.",
  },
  {
    question: "What prevents customers from filing fake disputes?",
    answer:
      "Customers also pay $9.99/month. Filing frivolous disputes damages their credibility and can result in account suspension. Our dispute process requires evidence, and customers know their false claims will be rejected and tracked.",
  },
  {
    question: "How is my payment used?",
    answer:
      "Your subscription payment funds: (1) Independent moderation team to review disputes fairly, (2) Platform maintenance and security, (3) Customer support, (4) Continuous improvements to prevent fraud and abuse.",
  },
  {
    question: "Can I get a refund if I'm not satisfied?",
    answer:
      "Monthly subscriptions can be canceled anytime, and you won't be charged again. Yearly subscriptions are non-refundable but offer 17% savings. We're confident you'll find value in the platform.",
  },
  {
    question: "What if I disagree with a review or dispute decision?",
    answer:
      "You can appeal any dispute decision within 30 days. Submit new evidence or context, and our team will review it. We take fairness seriously and want to get it right.",
  },
  {
    question: "How is this different from free review sites?",
    answer:
      "Free sites are flooded with fake reviews and spam because there's no cost to participate. ClientCheck's two-sided payment model creates a verified, trusted community where reviews actually matter. You're paying for quality, not quantity.",
  },
];

export default function FairReviewsFAQScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 gap-6 px-6 py-8">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-4xl font-bold text-foreground">Fair Reviews</Text>
            <Text className="text-base text-muted">
              Understanding our two-sided payment model
            </Text>
          </View>

          {/* Intro */}
          <View className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
            <Text className="text-sm text-muted leading-relaxed">
              ClientCheck charges both contractors and customers equally. This ensures honest
              reviews, prevents fraud, and creates a trusted community. Here's how it works.
            </Text>
          </View>

          {/* FAQ Items */}
          <View className="gap-3">
            {faqItems.map((item, index) => (
              <Pressable
                key={index}
                onPress={() => {
                  handlePress();
                  setExpandedIndex(expandedIndex === index ? null : index);
                }}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                className="bg-surface border border-border rounded-lg overflow-hidden"
              >
                <View className="p-4 gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 font-semibold text-foreground text-sm">
                      {item.question}
                    </Text>
                    <Text className="text-lg text-primary ml-2">
                      {expandedIndex === index ? "−" : "+"}
                    </Text>
                  </View>

                  {expandedIndex === index && (
                    <Text className="text-sm text-muted leading-relaxed mt-2">{item.answer}</Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>

          {/* Benefits Summary */}
          <View className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 gap-3">
            <Text className="font-bold text-green-300">Benefits of Two-Sided Payments</Text>
            <View className="gap-2">
              <Text className="text-sm text-muted">
                ✓ <Text className="font-semibold">Honest Reviews</Text> — Both sides have
                accountability
              </Text>
              <Text className="text-sm text-muted">
                ✓ <Text className="font-semibold">No Fake Accounts</Text> — Cost prevents spam
              </Text>
              <Text className="text-sm text-muted">
                ✓ <Text className="font-semibold">Fair Moderation</Text> — Both sides fund
                independent review
              </Text>
              <Text className="text-sm text-muted">
                ✓ <Text className="font-semibold">Quality Community</Text> — Serious participants
                only
              </Text>
              <Text className="text-sm text-muted">
                ✓ <Text className="font-semibold">Trusted Feedback</Text> — Reviews you can
                actually rely on
              </Text>
            </View>
          </View>

          {/* Still Have Questions */}
          <View className="bg-surface border border-border rounded-lg p-4 items-center gap-2">
            <Text className="font-semibold text-foreground">Still have questions?</Text>
            <Pressable
              onPress={() => handlePress()}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text className="text-primary font-semibold">Contact our support team</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
