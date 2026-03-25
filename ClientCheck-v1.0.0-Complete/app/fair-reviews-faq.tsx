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
    question: "Do customers have to pay to use ClientCheck?",
    answer:
      "No. Customer accounts are free by default. You can sign in, view your profile, see reviews associated with you, respond to reviews, and submit disputes at no charge. An optional paid identity verification badge is available if you want it — it is not required for core access.",
  },
  {
    question: "How does this ensure fair reviews?",
    answer:
      "Contractors are verified and accountable for what they post. Customers can respond and dispute inaccurate reviews through a structured, moderated process. Optional paid features do not change who can participate in disputes or responses.",
  },
  {
    question: "What prevents contractors from leaving fake negative reviews?",
    answer:
      "Contractors use a paid or verified-free-year contractor membership to access customer intelligence tools. Leaving fake reviews risks account suspension and loss of access. We verify license information where applicable and track reputation signals to catch abuse.",
  },
  {
    question: "What prevents customers from filing fake disputes?",
    answer:
      "Disputes are free for customers, but frivolous or false claims damage credibility and can lead to account action. The dispute process requires a clear explanation and evidence where relevant; moderation decisions are logged and appeals are available.",
  },
  {
    question: "How is revenue used?",
    answer:
      "Contractor subscriptions and optional customer add-ons help fund moderation, platform security, support, and ongoing improvements. Free customer participation is part of the same fair-review system.",
  },
  {
    question: "Can I get a refund if I'm not satisfied?",
    answer:
      "Monthly add-ons can be canceled so you are not charged again for future periods. Yearly contractor billing follows the terms shown at checkout. Contact support if you believe a charge was made in error.",
  },
  {
    question: "What if I disagree with a review or dispute decision?",
    answer:
      "You can appeal dispute decisions within the window stated in our communications. Submit new evidence or context, and our team will review it. We take fairness seriously and want to get it right.",
  },
  {
    question: "How is this different from free review sites?",
    answer:
      "ClientCheck focuses on structured, job-context reviews from contractors and gives customers free tools to respond and dispute. That combination improves signal quality compared to anonymous open comment boards.",
  },
];

export default function FairReviewsFAQScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    void Haptics.selectionAsync();
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <ScreenContainer className="flex-1">
      <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-foreground mb-2">Fair reviews FAQ</Text>
        <Text className="text-sm text-muted mb-6">
          How ClientCheck balances contractor insight with free customer participation.
        </Text>

        <View className="gap-2">
          {faqItems.map((item, index) => {
            const open = openIndex === index;
            return (
              <Pressable
                key={item.question}
                onPress={() => toggle(index)}
                className="rounded-xl border border-border bg-surface overflow-hidden"
              >
                <View className="px-4 py-3 flex-row justify-between items-center gap-2">
                  <Text className="text-base font-semibold text-foreground flex-1">{item.question}</Text>
                  <Text className="text-muted text-lg">{open ? "−" : "+"}</Text>
                </View>
                {open ? (
                  <View className="px-4 pb-4 border-t border-border/60">
                    <Text className="text-sm text-muted leading-6 pt-3">{item.answer}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
