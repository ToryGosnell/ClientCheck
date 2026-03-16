import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { apiFetch } from "@/lib/api";

export default function ClientcheckEnterpriseScreen() {
  const colors = useColors();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/enterprise/overview")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          ClientCheck Enterprise
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Support branch-level analytics, CRM integrations, and team workflows.</Text>
        {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Enterprise accounts</Text>
              {(data?.accounts || []).map((item: any) => (
                <Text key={item.id} style={[styles.line, { color: colors.muted }]}>• {item.companyName} — {item.branchCount} branches — {item.crmIntegration}</Text>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120, gap: 14 },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 14 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  line: { fontSize: 14 },
});