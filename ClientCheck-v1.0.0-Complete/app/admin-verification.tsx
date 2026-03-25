import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenBackground } from "@/components/screen-background";
import { ScreenContainer } from "@/components/screen-container";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminShellNavItems } from "@/components/admin/admin-sidebar-nav";
import { navigateAdminSidebarSelection } from "@/components/admin/navigate-admin-sidebar";
import { ADMIN_VISUAL } from "@/components/admin/admin-visual-tokens";
import { useColors } from "@/hooks/use-colors";
import { useAdminRouteGate } from "@/hooks/use-admin-route-gate";
import { trpc } from "@/lib/trpc";
import { getVerificationBadge } from "@/shared/membership";

export default function AdminVerificationScreen() {
  const colors = useColors();
  const router = useRouter();
  const [processingId, setProcessingId] = useState<number | null>(null);

  const routeGate = useAdminRouteGate();
  const adminReady = routeGate.blocked === null;

  const { data: pending, isLoading, refetch } = trpc.verification.getPendingVerifications.useQuery(undefined, {
    enabled: adminReady,
  });
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

  if (routeGate.blocked) return routeGate.blocked;
  const user = routeGate.user;

  const handleSidebarNav = (key: string) =>
    navigateAdminSidebarSelection(router, key, { context: "standalone", current: "verification" });

  return (
    <ScreenBackground backgroundKey="dashboard" overlayOpacity={0.96}>
      <ScreenContainer edges={["top", "left", "right"]}>
        <AdminShell
          colors={colors}
          userLabel={user.name ?? user.email ?? `User #${user.id}`}
          breadcrumbCurrent="Verification console"
          pageTitle="Verification console"
          pageSubtitle="Approve or reject contractor credentials. Approving activates configured free-year trial where applicable."
          navItems={adminShellNavItems()}
          activeNavKey="verification"
          onNav={handleSidebarNav}
          onExit={() => router.replace("/(tabs)" as never)}
        >
          <View style={styles.intro}>
            <Text style={[styles.eyebrow, { color: ADMIN_VISUAL.textMuted }]}>OPERATIONS</Text>
            <Text style={[styles.introHint, { color: ADMIN_VISUAL.textMuted }]}>
              Same queue as the Verification tab in the main console — this screen is optimized for document review workflows.
            </Text>
          </View>

          <View style={[styles.callout, { borderColor: ADMIN_VISUAL.border, backgroundColor: ADMIN_VISUAL.surface }]}>
            <Text style={[styles.calloutText, { color: ADMIN_VISUAL.textSubtle }]}>
              Approving grants verified contractor status and limited-search free tier automatically per product rules.
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.muted, { marginTop: 14 }]}>Loading verification queue…</Text>
            </View>
          ) : !pending?.length ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Text style={{ fontSize: 28 }}>✓</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: ADMIN_VISUAL.textSubtle }]}>Queue clear</Text>
              <Text style={[styles.emptyBody, { color: ADMIN_VISUAL.textMuted }]}>
                No pending contractor verifications. New submissions will appear here automatically.
              </Text>
              <Pressable onPress={() => router.push("/admin" as any)} style={styles.emptyLink}>
                <Text style={{ color: ADMIN_VISUAL.blue, fontSize: 13, fontWeight: "800" }}>← Admin home</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={pending}
              keyExtractor={(item: any) => String(item.id ?? item.userId)}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }: { item: any }) => {
                const uid = item.userId ?? item.id;
                const badge = getVerificationBadge(item.verificationStatus);
                const isProcessing = processingId === uid;
                return (
                  <View style={[styles.card, { borderColor: ADMIN_VISUAL.border, backgroundColor: ADMIN_VISUAL.surfaceRaised }]}>
                    <View style={styles.cardTop}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>User #{uid}</Text>
                      <View style={[styles.badgeWrap, { backgroundColor: badge.bgColor + "33", borderColor: badge.bgColor + "55" }]}>
                        <Text style={{ color: badge.color, fontSize: 10, fontWeight: "800" }}>{badge.label}</Text>
                      </View>
                    </View>

                    {!!item.licenseNumber && (
                      <View style={styles.field}>
                        <Text style={[styles.fieldLabel, { color: ADMIN_VISUAL.textMuted }]}>License</Text>
                        <Text style={[styles.fieldValue, { color: colors.foreground }]}>{item.licenseNumber}</Text>
                      </View>
                    )}

                    {!!item.trade && (
                      <Text style={[styles.meta, { color: ADMIN_VISUAL.textSubtle }]}>Trade: {item.trade}</Text>
                    )}

                    {!!item.company && (
                      <Text style={[styles.meta, { color: ADMIN_VISUAL.textSubtle }]}>Company: {item.company}</Text>
                    )}

                    {!!item.verificationSubmittedAt && (
                      <Text style={[styles.metaSmall, { color: ADMIN_VISUAL.textMuted }]}>
                        Submitted {new Date(item.verificationSubmittedAt).toLocaleString()}
                      </Text>
                    )}

                    <View style={styles.actions}>
                      <Pressable
                        onPress={() => handleApprove(uid)}
                        disabled={isProcessing}
                        style={({ pressed }) => [
                          styles.approveBtn,
                          { borderColor: ADMIN_VISUAL.green + "55", backgroundColor: ADMIN_VISUAL.greenMuted },
                          pressed && { opacity: 0.88 },
                        ]}
                      >
                        {isProcessing && approveMutation.isPending ? (
                          <ActivityIndicator color={ADMIN_VISUAL.green} size="small" />
                        ) : (
                          <Text style={[styles.approveText, { color: ADMIN_VISUAL.green }]}>Approve</Text>
                        )}
                      </Pressable>
                      <Pressable
                        onPress={() => handleReject(uid)}
                        disabled={isProcessing}
                        style={({ pressed }) => [
                          styles.rejectBtn,
                          { borderColor: ADMIN_VISUAL.red + "55", backgroundColor: ADMIN_VISUAL.redMuted },
                          pressed && { opacity: 0.88 },
                        ]}
                      >
                        {isProcessing && rejectMutation.isPending ? (
                          <ActivityIndicator color={ADMIN_VISUAL.red} size="small" />
                        ) : (
                          <Text style={[styles.rejectText, { color: ADMIN_VISUAL.red }]}>Reject</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </AdminShell>
      </ScreenContainer>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: 14, gap: 4 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  introHint: { fontSize: 12, lineHeight: 17, maxWidth: 560 },
  callout: { borderWidth: 1, borderRadius: ADMIN_VISUAL.radiusMd, padding: 14, marginBottom: 18 },
  calloutText: { fontSize: 13, lineHeight: 19 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 48 },
  muted: { fontSize: 13, color: ADMIN_VISUAL.textMuted },
  emptyWrap: { paddingVertical: 48, alignItems: "center", paddingHorizontal: 24 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ADMIN_VISUAL.surface,
    borderWidth: 1,
    borderColor: ADMIN_VISUAL.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 15, fontWeight: "800", marginBottom: 6 },
  emptyBody: { fontSize: 13, textAlign: "center", lineHeight: 19, maxWidth: 300 },
  emptyLink: { marginTop: 18, paddingVertical: 8 },
  listContent: { paddingBottom: 32 },
  card: { borderWidth: 1, borderRadius: ADMIN_VISUAL.radiusLg, padding: 16, marginBottom: 14 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "800", flex: 1 },
  badgeWrap: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  field: { marginBottom: 8 },
  fieldLabel: { fontSize: 11, fontWeight: "700", marginBottom: 2 },
  fieldValue: { fontSize: 14, fontWeight: "600" },
  meta: { fontSize: 12, marginBottom: 4 },
  metaSmall: { fontSize: 11, marginTop: 4 },
  actions: { flexDirection: "row", gap: 12, marginTop: 14 },
  approveBtn: {
    flex: 1,
    borderRadius: ADMIN_VISUAL.radiusSm,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  approveText: { fontSize: 14, fontWeight: "800" },
  rejectBtn: {
    flex: 1,
    borderRadius: ADMIN_VISUAL.radiusSm,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  rejectText: { fontSize: 14, fontWeight: "800" },
});
