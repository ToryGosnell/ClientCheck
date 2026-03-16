import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { apiFetch } from "@/lib/api";

export default function NetworkValueScreen() {
  const colors = useColors();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/network-value/overview')
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>ClientCheck Network Value</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Track the data network effects that make the platform valuable.</Text>
        {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} /> : (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>North star metric</Text>
              <Text style={[styles.metricValue, { color: colors.foreground }]}>{data?.northStarMetric ?? 'Daily Risk Checks'}</Text>
              <Text style={[styles.metricSub, { color: colors.primary }]}>Last 7 days: {(data?.dailyRiskChecks || []).join(' • ')}</Text>
            </View>
            <View style={styles.grid}>
              {Object.entries(data?.metrics || {}).map(([key, value]) => (
                <View key={key} style={[styles.smallCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.smallLabel, { color: colors.muted }]}>{key}</Text>
                  <Text style={[styles.smallValue, { color: colors.foreground }]}>{String(value)}</Text>
                </View>
              ))}
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Value drivers</Text>
              {Object.entries(data?.valueDrivers || {}).map(([key, value]) => (
                <Text key={key} style={[styles.rowText, { color: colors.muted }]}>{value ? '✅' : '⬜️'} {key}</Text>
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
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  metricLabel: { fontSize: 13 },
  metricValue: { fontSize: 22, fontWeight: '700' },
  metricSub: { fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  smallCard: { width: '47%', borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  smallLabel: { fontSize: 12 },
  smallValue: { fontSize: 20, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  rowText: { fontSize: 14 },
});