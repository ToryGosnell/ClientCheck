import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { getVerificationBadge, PRICING_COPY } from "@/shared/membership";

export default function AdminVerificationScreen() {
  const colors = useColors();
  const router = useRouter();
  const [processingId, setProcessingId] = useState<number | null>(null);

  const { data: pending, isLoading, refetch } = trpc.verification.getPendingVerifications.useQuery();
  const approveMutation = trpc.verification.approveVerification.useMutation({
    onSuccess: () => {
      setProcessingId(null);
      refetch();
      Alert.alert("Approved", "Contractor verified and 12-month free membership activated.");
    },
    onError: (err) => {
      setProcessingId(null);
      Alert.alert("Error", err.message);
    },
  });
  const rejectMutation = trpc.verification.rejectVerification.useMutation({
    onSuccess: () => {
      setProcessingId(null);
      refetch();
      Alert.alert("Rejected", "Verification rejected.");
    },
    onError: (err) => {
      setProcessingId(null);
      Alert.alert("Error", err.message);
    },
  });

  const handleApprove = (userId: number) => {
    setProcessingId(userId);
    approveMutation.mutate({
      userId,
      idVerified: true,
      licenseVerified: true,
      insuranceVerified: false,
    });
  };

  const handleReject = (userId: number) => {
    Alert.alert("Reject Verification", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: () => {
          setProcessingId(userId);
          rejectMutation.mutate({ userId, reason: "License could not be verified." });
        },
      },
    ]);
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Text style={[styles.backText, { color: colors.primary }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>License Verification</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.primary + "08" }}>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
          Review submitted contractor licenses. Approving activates {PRICING_COPY.freeOffer} automatically.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !pending?.length ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text>
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "600" }}>No pending verifications</Text>
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>All caught up.</Text>
        </View>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(item: any) => String(item.id ?? item.userId)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }: { item: any }) => {
            const badge = getVerificationBadge(item.verificationStatus);
            const isProcessing = processingId === (item.userId ?? item.id);
            return (
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "600" }}>
                    User #{item.userId ?? item.id}
                  </Text>
                  <View style={{ backgroundColor: badge.bgColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: badge.color, fontSize: 11, fontWeight: "600" }}>{badge.label}</Text>
                  </View>
                </View>

                {!!item.licenseNumber && (
                  <View style={{ marginBottom: 6 }}>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>License Number</Text>
                    <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "500" }}>{item.licenseNumber}</Text>
                  </View>
                )}

                {!!item.trade && (
                  <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Trade: {item.trade}</Text>
                )}

                {!!item.verificationSubmittedAt && (
                  <Text style={{ color: colors.muted, fontSize: 11 }}>
                    Submitted: {new Date(item.verificationSubmittedAt).toLocaleDateString()}
                  </Text>
                )}

                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <Pressable
                    onPress={() => handleApprove(item.userId ?? item.id)}
                    disabled={isProcessing}
                    style={({ pressed }) => [
                      { flex: 1, backgroundColor: "#16a34a", borderRadius: 8, paddingVertical: 10, alignItems: "center" },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    {isProcessing && approveMutation.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Approve</Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => handleReject(item.userId ?? item.id)}
                    disabled={isProcessing}
                    style={({ pressed }) => [
                      { flex: 1, backgroundColor: "#dc2626", borderRadius: 8, paddingVertical: 10, alignItems: "center" },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    {isProcessing && rejectMutation.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Reject</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { width: 60 },
  backText: { fontSize: 17, fontWeight: "500" },
  topTitle: { fontSize: 17, fontWeight: "600", flex: 1, textAlign: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
});
