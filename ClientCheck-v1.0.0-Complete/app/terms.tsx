import { View, Pressable, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { LegalDocumentContent } from "@/components/legal-document-content";

export default function TermsScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7 }]}>
          <Text style={[s.backText, { color: colors.primary }]}>← Back</Text>
        </Pressable>
      </View>
      <LegalDocumentContent docType="terms" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5 },
  backBtn: { paddingVertical: 4 },
  backText: { fontSize: 16, fontWeight: "600" },
});
