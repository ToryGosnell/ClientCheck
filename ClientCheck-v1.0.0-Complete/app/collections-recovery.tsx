import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { apiFetch } from "@/lib/api";

export default function CollectionsRecoveryScreen() {
  const colors = useColors();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/collections/overview")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Collections & Recovery
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Turn unpaid jobs into recovery workflows and collections-ready cases.</Text>
        {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recovery pipeline</Text>
              <Text style={[styles.line, { color: colors.muted }]}>Active cases: {data?.activeCases ?? 0}</Text>
              <Text style={[styles.line, { color: colors.muted }]}>Recovered dollars: ${((data?.recoveredDollarsCents ?? 0)/100).toFixed(2)}</Text>
              {(data?.cases || []).map((item: any) => (
                <Text key={item.id} style={[styles.line, { color: colors.muted }]}>• {item.customerName} — ${(item.amountCents/100).toFixed(2)} — {item.stage}</Text>
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