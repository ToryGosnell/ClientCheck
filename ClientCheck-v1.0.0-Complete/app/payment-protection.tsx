import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { apiFetch } from "@/lib/api";

export default function PaymentProtectionScreen() {
  const colors = useColors();
  const [jobAmount, setJobAmount] = useState('250000');
  const [quote, setQuote] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);

  const loadClaims = async () => {
    const res = await apiFetch('/api/payment-protection/history?contractorId=1');
    setClaims(await res.json());
  };

  useEffect(() => { loadClaims().catch(console.error); }, []);

  const getQuote = async () => {
    const res = await apiFetch('/api/payment-protection/quote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractorId: 1, jobAmountCents: Number(jobAmount) }),
    });
    setQuote(await res.json());
  };

  const fileClaim = async () => {
    const res = await apiFetch('/api/payment-protection/claims', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractorId: 1, customerName: 'Example Customer', amountCents: Number(jobAmount), reason: 'non_payment' }),
    });
    const json = await res.json();
    if (json.success) {
      Alert.alert('Claim submitted', 'ClientCheck Payment Protection claim created.');
      loadClaims().catch(console.error);
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Payment Protection</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Give contractors a protection layer against non-payment, chargebacks, and scam jobs.</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.muted }]}>Job amount (cents)</Text>
          <TextInput value={jobAmount} onChangeText={setJobAmount} keyboardType="numeric" style={[styles.input, { borderColor: colors.border, color: colors.foreground }]} />
          <Pressable onPress={getQuote} style={[styles.button, { backgroundColor: colors.primary }]}>
            <Text style={styles.buttonText}>Generate Protection Quote</Text>
          </Pressable>
          {quote && (
            <View style={[styles.quoteBox, { backgroundColor: colors.primary + '12' }]}>
              <Text style={[styles.quoteText, { color: colors.foreground }]}>Premium: ${(quote.premiumCents / 100).toFixed(2)}</Text>
              <Text style={[styles.quoteText, { color: colors.foreground }]}>Coverage: ${(quote.coverageCents / 100).toFixed(2)}</Text>
              <Text style={[styles.quoteText, { color: colors.muted }]}>Deductible: ${(quote.deductibleCents / 100).toFixed(2)}</Text>
            </View>
          )}
          <Pressable onPress={fileClaim} style={[styles.secondaryButton, { borderColor: colors.border }]}>
            <Text style={[styles.secondaryText, { color: colors.foreground }]}>Submit Non-Payment Claim</Text>
          </Pressable>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent claims</Text>
          {claims.length === 0 ? <Text style={{ color: colors.muted }}>No claims submitted yet.</Text> : claims.map((claim) => (
            <View key={claim.id} style={styles.claimRow}>
              <Text style={[styles.claimText, { color: colors.foreground }]}>{claim.reason}</Text>
              <Text style={[styles.claimText, { color: colors.muted }]}>{claim.status}</Text>
            </View>
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
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  label: { fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  button: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  secondaryText: { fontWeight: '700' },
  quoteBox: { borderRadius: 12, padding: 12, gap: 4 },
  quoteText: { fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  claimRow: { flexDirection: 'row', justifyContent: 'space-between' },
  claimText: { fontSize: 14 },
});