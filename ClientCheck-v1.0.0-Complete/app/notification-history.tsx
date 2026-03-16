import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { apiFetch } from "@/lib/api";

type NotificationItem = {
  id: number;
  channel: 'push' | 'email' | 'sms' | 'webhook';
  templateKey: string;
  destination?: string | null;
  status: 'queued' | 'sent' | 'failed' | 'retrying' | 'delivered';
  createdAt: string;
  deliveredAt?: string | null;
  errorMessage?: string | null;
};

export default function NotificationHistoryScreen() {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true); else setLoading(true);
      setError(null);
      const res = await apiFetch('/api/notifications?userId=1');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load notifications');
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Notification History</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Delivery records are now loaded from the API instead of mock data.</Text>

        {loading ? <ActivityIndicator color={colors.tint} /> : null}
        {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
        {!loading && !items.length ? <Text style={{ color: colors.muted }}>No notifications yet.</Text> : null}

        {items.map((item) => (
          <View key={item.id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <View style={styles.row}>
              <Text style={[styles.channel, { color: colors.foreground }]}>{item.channel.toUpperCase()}</Text>
              <Text style={[styles.status, { color: colors.tint }]}>{item.status}</Text>
            </View>
            <Text style={[styles.template, { color: colors.foreground }]}>{item.templateKey}</Text>
            <Text style={{ color: colors.muted }}>{item.destination || 'No destination recorded'}</Text>
            <Text style={{ color: colors.muted, marginTop: 6 }}>Queued: {new Date(item.createdAt).toLocaleString()}</Text>
            {item.deliveredAt ? <Text style={{ color: colors.muted }}>Delivered: {new Date(item.deliveredAt).toLocaleString()}</Text> : null}
            {item.errorMessage ? <Text style={{ color: colors.destructive, marginTop: 6 }}>{item.errorMessage}</Text> : null}
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  channel: { fontSize: 12, fontWeight: '700' },
  status: { fontSize: 12, fontWeight: '600' },
  template: { fontSize: 16, fontWeight: '600' },
  error: { fontSize: 14 },
});