import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { CustomerCard } from "@/components/customer-card";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import type { Customer } from "@/drizzle/schema";

export default function AlertsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const { data: flaggedCustomers, isLoading, refetch } = trpc.customers.getFlagged.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={[styles.titleBar, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Community Alerts</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Customers flagged as high risk by the contractor community
        </Text>
      </View>

      {/* Alert Banner */}
      <View style={[styles.alertBanner, { backgroundColor: colors.error + "12", borderColor: colors.error + "44" }]}>
        <Text style={[styles.alertBannerText, { color: colors.error }]}>
          🚨 These customers have an average rating below 2.5 stars. Proceed with caution or decline the job.
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : flaggedCustomers && flaggedCustomers.length > 0 ? (
        <FlatList
          data={flaggedCustomers as Customer[]}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <CustomerCard
              customer={item}
              onPress={() => router.push(`/customer/${item.id}` as never)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.count, { color: colors.muted }]}>
              {flaggedCustomers.length} high-risk {flaggedCustomers.length === 1 ? "customer" : "customers"} flagged
            </Text>
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>✅</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No High-Risk Customers
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.muted }]}>
            The community hasn't flagged any high-risk customers yet. As contractors add reviews, problem clients will appear here.
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  titleBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  alertBanner: {
    margin: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertBannerText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  count: {
    fontSize: 13,
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
