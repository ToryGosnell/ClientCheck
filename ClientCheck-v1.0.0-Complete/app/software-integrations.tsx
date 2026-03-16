import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { apiFetch } from "@/lib/api";

export default function SoftwareIntegrationsScreen() {
  const colors = useColors();
  const [catalog, setCatalog] = useState<any>(null);

  const load = async () => {
    const res = await apiFetch('/api/integrations/software/catalog');
    setCatalog(await res.json());
  };
  useEffect(() => { load().catch(console.error); }, []);

  const connect = async (provider: string) => {
    const res = await apiFetch('/api/integrations/software/connect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractorId: 1, provider, externalAccountName: 'Demo Account' }),
    });
    const json = await res.json();
    if (json.success) {
      Alert.alert('Connected', `${provider} connected to ClientCheck`);
      load().catch(console.error);
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Contractor Software Integrations</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Embed ClientCheck into ServiceTitan, Housecall Pro, Jobber, or your own workflow.</Text>
        {(catalog?.providers || []).map((provider: any) => (
          <View key={provider.key} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.provider, { color: colors.foreground }]}>{provider.name}</Text>
            <Text style={[styles.supports, { color: colors.muted }]}>{provider.supports.join(' • ')}</Text>
            <View style={styles.row}>
              <Text style={[styles.badge, { color: colors.primary }]}>{provider.status}</Text>
              <Pressable onPress={() => connect(provider.key)} style={[styles.connectBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.connectText}>Connect</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.provider, { color: colors.foreground }]}>Active connections</Text>
          {(catalog?.connections || []).length === 0 ? <Text style={{ color: colors.muted }}>No software connected yet.</Text> : catalog.connections.map((conn: any) => (
            <Text key={conn.id} style={{ color: colors.muted }}>{conn.provider} • {conn.status}</Text>
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
  provider: { fontSize: 18, fontWeight: '700' },
  supports: { fontSize: 13 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  connectBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  connectText: { color: '#fff', fontWeight: '700' },
});