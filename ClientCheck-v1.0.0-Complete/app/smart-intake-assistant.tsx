import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { apiFetch } from "@/lib/api";

export default function SmartJobIntakeAssistantScreen() {
  const colors = useColors();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/smart-intake/history?contractorId=1")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Smart Job Intake Assistant
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Qualify leads before you book bad jobs.</Text>
        {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent intake decisions</Text>
              {(data || []).map((item: any) => (
                <View key={item.id}>
                  <Text style={[styles.line, { color: colors.foreground }]}>{item.customerName} — {item.jobType}</Text>
                  {(item.redFlags || []).map((flag: string) => <Text key={flag} style={[styles.line, { color: colors.muted }]}>• {flag}</Text>)}
                </View>
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