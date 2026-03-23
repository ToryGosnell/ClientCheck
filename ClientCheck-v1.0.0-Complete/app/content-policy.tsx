import { View, Pressable, Text } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import { LegalDocumentContent } from "@/components/legal-document-content";

export default function ContentPolicyScreen() {
  const router = useRouter();

  return (
    <ScreenContainer className="p-0">
      <View className="px-6 pt-6 pb-2">
        <Pressable onPress={() => router.back()} className="mb-2">
          <Text className="text-lg font-semibold text-primary">← Back</Text>
        </Pressable>
      </View>
      <LegalDocumentContent docType="content-policy" />
    </ScreenContainer>
  );
}
