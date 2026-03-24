import { View, Text, TouchableOpacity, ScrollView, StyleSheet, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

interface AdminCustomer {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  overallRating: number;
  reviewCount: number;
  riskLevel: string;
  createdByUserId: number;
}

export default function AdminCustomersScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Check if user is admin
    if ((user as any)?.role !== "admin") {
      router.back();
      return;
    }

    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await apiFetch("/admin/customers");

      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error("Fetch customers error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((customer) =>
    `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high":
        return colors.error;
      case "medium":
        return colors.warning;
      case "low":
        return colors.success;
      default:
        return colors.muted;
    }
  };

  const renderCustomerItem = ({ item }: { item: AdminCustomer }) => (
    <TouchableOpacity
      onPress={() => router.push(`/customer-detail-private?customerId=${item.id}`)}
      style={[
        styles.customerCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.customerHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.customerName, { color: colors.foreground }]}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={[styles.customerLocation, { color: colors.muted }]}>
            {item.city}, {item.state}
          </Text>
        </View>
        <View
          style={[
            styles.riskBadge,
            { backgroundColor: getRiskColor(item.riskLevel) + "20" },
          ]}
        >
          <Text
            style={[
              styles.riskBadgeText,
              { color: getRiskColor(item.riskLevel) },
            ]}
          >
            {item.riskLevel.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.customerStats}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Rating</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {item.overallRating}/5.0
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Reviews</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {item.reviewCount}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Phone</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]} numberOfLines={1}>
            {item.phone}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.viewButton, { color: colors.primary }]}>
          View Details ›
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backBtn, { color: colors.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Customer Management
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          renderItem={renderCustomerItem}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No Customers Found
              </Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                {searchQuery ? "Try a different search" : "No customers in the system yet"}
              </Text>
            </View>
          }
        />
      )}

      {/* Info Box */}
      <View
        style={[
          styles.infoBox,
          { backgroundColor: colors.primary + "10", borderColor: colors.primary },
        ]}
      >
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={[styles.infoText, { color: colors.foreground }]}>
          Admin access: You can view all customer data including phone and address for
          verification and matching purposes.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  backBtn: {
    fontSize: 18,
    fontWeight: "600",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 12,
  },
  customerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  customerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "700",
  },
  customerLocation: {
    fontSize: 12,
    marginTop: 4,
  },
  riskBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  divider: {
    height: 1,
  },
  customerStats: {
    flexDirection: "row",
    gap: 12,
  },
  statItem: {
    flex: 1,
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  statValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  footer: {
    alignItems: "flex-end",
  },
  viewButton: {
    fontSize: 13,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 14,
  },
  infoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});