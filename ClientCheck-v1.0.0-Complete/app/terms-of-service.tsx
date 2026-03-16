import React from "react";
import { ScrollView, Text, View , Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";

export default function TermsOfServiceScreen() {
  const router = useRouter();

  return (
    <ScreenContainer className="p-0">
      <ScrollView className="flex-1">
        <View className="p-6">
          <Pressable onPress={() => router.back()} className="mb-4">
            <Text className="text-lg font-semibold text-primary">← Back</Text>
          </Pressable>

          <Text className="text-3xl font-bold text-foreground mb-6">
            Terms of Service
          </Text>

          <Text className="text-sm text-muted mb-4">
            Last updated: March 2026
          </Text>

          {/* Agreement */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-3">
              1. Agreement to Terms
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              By accessing and using ClientCheck, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </Text>
          </View>

          {/* Use License */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-3">
              2. Use License
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              Permission is granted to temporarily download one copy of the materials (information or software) on ClientCheck for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:{"\n"}
              • Modify or copy the materials{"\n"}
              • Use the materials for any commercial purpose or for any public display{"\n"}
              • Attempt to decompile or reverse engineer any software{"\n"}
              • Remove any copyright or other proprietary notations{"\n"}
              • Transfer the materials to another person or "mirror" the materials on any other server
            </Text>
          </View>

          {/* Disclaimer */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-3">
              3. Disclaimer
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              The materials on ClientCheck are provided on an 'as is' basis. ClientCheck makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </Text>
          </View>

          {/* Limitations */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-3">
              4. Limitations
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              In no event shall ClientCheck or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on ClientCheck, even if ClientCheck or a ClientCheck authorized representative has been notified orally or in writing of the possibility of such damage.
            </Text>
          </View>

          {/* Accuracy of Materials */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-3">
              5. Accuracy of Materials
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              The materials appearing on ClientCheck could include technical, typographical, or photographic errors. ClientCheck does not warrant that any of the materials on its website are accurate, complete, or current. ClientCheck may make changes to the materials contained on its website at any time without notice.
            </Text>
          </View>

          {/* User-Generated Content */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-3">
              6. User-Generated Content & Reviews
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              You are responsible for all content you submit. By submitting reviews, you warrant that:{"\n"}
              • The content is accurate and truthful{"\n"}
              • You have the right to submit the content{"\n"}
              • The content does not violate any laws or third-party rights{"\n"}
              • You will not submit defamatory, libelous, or false content{"\n"}
              {"\n"}
              ClientCheck reserves the right to remove content that violates these terms or applicable laws.
            </Text>
          </View>

          {/* Prohibited Activities */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-3">
              7. Prohibited Activities
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              You agree not to:{"\n"}
              • Harass, threaten, or intimidate other users{"\n"}
              • Submit false or misleading information{"\n"}
              • Violate any applicable laws or regulations{"\n"}
              • Infringe on intellectual property rights{"\n"}
              • Spam or send unsolicited messages{"\n"}
              • Attempt to gain unauthorized access to the system
            </Text>
          </View>

          {/* Subscription Terms */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-3">
              8. Subscription & Billing
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              • 90-day free trial requires no credit card{"\n"}
              • Subscription renews monthly at $9.99 unless cancelled{"\n"}
              • Cancellation takes effect at the end of the current billing period{"\n"}
              • Refunds are not provided for partial months{"\n"}
              • We reserve the right to change pricing with 30 days notice
            </Text>
          </View>

          {/* Indemnification */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-3">
              9. Indemnification
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              You agree to indemnify and hold harmless ClientCheck and its officers, directors, employees, and agents from any and all claims, damages, losses, costs, and expenses (including attorney's fees) arising from your use of the service or violation of these terms.
            </Text>
          </View>

          {/* Termination */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-3">
              10. Termination
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              ClientCheck may terminate your account at any time for violation of these terms or for any reason. Upon termination, your right to use the service will immediately cease.
            </Text>
          </View>

          {/* Governing Law */}
          <View className="mb-8">
            <Text className="text-lg font-bold text-foreground mb-3">
              11. Governing Law
            </Text>
            <Text className="text-base text-foreground leading-relaxed mb-4">
              These terms and conditions are governed by and construed in accordance with the laws of the United States, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </Text>
          </View>

          <View className="h-8" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
