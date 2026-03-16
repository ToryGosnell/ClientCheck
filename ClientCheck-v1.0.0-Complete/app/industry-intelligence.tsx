import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';

export default function IndustryIntelligenceScreen() {
  const colors = useColors();
  const [city, setCity] = useState('Spokane');
  const [trade, setTrade] = useState('Plumbing');
  const [data, setData] = useState<any>(null);

  const load = async () => {
    const q = new URLSearchParams({ city, trade }).toString();
    const res = await fetch(`/api/industry/intelligence?${q}`);
    setData(await res.json());
  };
  useEffect(() => { load().catch(console.error); }, []);

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Industry Intelligence</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Turn ClientCheck data into market insight that compounds value over time.</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} />
          <TextInput value={trade} onChangeText={setTrade} placeholder="Trade" placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} />
          <Pressable onPress={load} style={[styles.button, { backgroundColor: colors.primary }]}>
            <Text style={styles.buttonText}>Refresh intelligence</Text>
          </Pressable>
        </View>
        {(data?.snapshots || []).map((snapshot: any) => (
          <View key={snapshot.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.snapshotMetric, { color: colors.foreground }]}>{snapshot.metric}</Text>
            <Text style={[styles.snapshotValue, { color: colors.primary }]}>{snapshot.value}</Text>
            <Text style={[styles.snapshotMeta, { color: colors.muted }]}>{snapshot.city} • {snapshot.trade} • {snapshot.periodLabel}</Text>
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120, gap: 14 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  button: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  snapshotMetric: { fontSize: 18, fontWeight: '700' },
  snapshotValue: { fontSize: 24, fontWeight: '700' },
  snapshotMeta: { fontSize: 13 },
});
