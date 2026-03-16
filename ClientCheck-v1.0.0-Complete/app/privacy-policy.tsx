import React from "react";
import { ScrollView, Text, View , Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <ScreenContainer className="p-0">
      <ScrollView className="flex-1">
        <View className="p-6">
          <Pressable onPress={() => router.back()} className="mb-4">
            <Text className="text-lg font-semibold text-primary">← Back</Text>
          </Pressable>

          <Text className="text-3xl font-bold text-foreground mb-6">
            Privacy Policy
          </Text>

          <Text className="text-sm text-muted mb-4">
            Last updated: March 2026
          </Text>

          {/* Introduction */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-3">
              1. Introduction
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              ClientCheck ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services.
            </Text>
          </View>

          {/* Information We Collect */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-3">
              2. Information We Collect
            </Text>
            <Text className="text-base font-semibold text-foreground mb-2">
              Personal Information:
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              • Name, email address, and phone number{"\n"}
              • Business information (company name, license number, trade type){"\n"}
              • Payment information (processed securely via Stripe){"\n"}
              • Profile photo and verification documents
            </Text>
            <Text className="text-base font-semibold text-foreground mb-2">
              Usage Information:
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              • Reviews and ratings you submit{"\n"}
              • Customer information you provide{"\n"}
              • Dispute responses and communications{"\n"}
              • App usage patterns and analytics
            </Text>
            <Text className="text-base font-semibold text-foreground mb-2">
              Device Information:
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              • Device type, operating system, and unique identifiers{"\n"}
              • IP address and location data (with permission){"\n"}
              • App crash logs and performance data
            </Text>
          </View>

          {/* How We Use Information */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-3">
              3. How We Use Your Information
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              We use collected information to:{"\n"}
              • Provide, maintain, and improve our services{"\n"}
              • Process payments and subscriptions{"\n"}
              • Send notifications about reviews, disputes, and account updates{"\n"}
              • Verify contractor credentials and prevent fraud{"\n"}
              • Respond to your inquiries and support requests{"\n"}
              • Comply with legal obligations
            </Text>
          </View>

          {/* Data Sharing */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-3">
              4. Data Sharing & Disclosure
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              We do NOT sell your personal information. We may share information with:{"\n"}
              • Service providers (Stripe, AWS, email services){"\n"}
              • Law enforcement when legally required{"\n"}
              • Other contractors (only customer reviews you submit){"\n"}
              • Business partners with your consent
            </Text>
          </View>

          {/* Data Security */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-3">
              5. Data Security
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              We implement industry-standard security measures including encryption, secure authentication, and regular security audits. However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
            </Text>
          </View>

          {/* Retention */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-3">
              6. Data Retention
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              We retain your data as long as your account is active or as needed to provide services. You can request deletion of your account and associated data at any time, subject to legal retention requirements.
            </Text>
          </View>

          {/* Your Rights */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-3">
              7. Your Rights
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              You have the right to:{"\n"}
              • Access your personal data{"\n"}
              • Correct inaccurate information{"\n"}
              • Request deletion of your data{"\n"}
              • Opt-out of marketing communications{"\n"}
              • Request a copy of your data
            </Text>
          </View>

          {/* Contact */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-3">
              8. Contact Us
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              For privacy inquiries, contact us at:{"\n"}
              privacy@clientcheck.app{"\n"}
              {"\n"}
              We will respond to privacy requests within 30 days.
            </Text>
          </View>

          <View className="h-8" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
