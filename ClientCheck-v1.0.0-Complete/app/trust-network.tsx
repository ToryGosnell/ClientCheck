import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { apiFetch } from "@/lib/api";

const BADGES = ['verified_identity', 'verified_license', 'insured', 'background_checked', 'top_responder'];

export default function TrustNetworkScreen() {
  const colors = useColors();
  const [data, setData] = useState<any>(null);
  const load = async () => {
    const res = await apiFetch('/api/trust-network?userId=1');
    setData(await res.json());
  };
  useEffect(() => { load().catch(console.error); }, []);

  const award = async (badge: string) => {
    const res = await apiFetch('/api/trust-network/award', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 1, badge }),
    });
    const json = await res.json();
    if (json.success) {
      Alert.alert('Badge awarded', badge);
      load().catch(console.error);
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Contractor Trust Network</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Layer on verified identity, license, insurance, and responsiveness to build marketplace trust.</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Active badges</Text>
          {(data?.badges || []).length === 0 ? <Text style={{ color: colors.muted }}>No badges yet.</Text> : data.badges.map((badge: any) => (
            <Text key={badge.id} style={[styles.badgeRow, { color: colors.foreground }]}>✅ {badge.badge}</Text>
          ))}
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Award trust badge</Text>
          {BADGES.map((badge) => (
            <Pressable key={badge} onPress={() => award(badge)} style={[styles.outlineBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.foreground }}>{badge}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120, gap: 14 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  badgeRow: { fontSize: 14 },
  outlineBtn: { borderWidth: 1, borderRadius: 12, padding: 12 },
});