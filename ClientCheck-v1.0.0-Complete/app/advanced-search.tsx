import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, FlatList, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

interface SearchResult {
  id: number;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  state?: string;
  zip?: string;
  overallRating: any;
  reviewCount: number;
}

export default function AdvancedSearchScreen() {
  const colors = useColors();
  const router = useRouter();
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Search API call
  const searchQuery = trpc.customers.search.useQuery(
    { query: name || " " },
    { enabled: name.length > 0, staleTime: 5000 }
  );

  // Filter results based on all criteria
  const filteredResults = useMemo(() => {
    if (!searchQuery.data) return [];

    return searchQuery.data.filter((customer: SearchResult) => {
      const nameMatch =
        name.length === 0 ||
        `${customer.firstName} ${customer.lastName}`
          .toLowerCase()
          .includes(name.toLowerCase());

      const stateMatch = state.length === 0 || customer.state?.toLowerCase() === state.toLowerCase();
      const zipMatch = zip.length === 0 || customer.zip === zip;
      const phoneMatch = phone.length === 0 || customer.phone?.includes(phone);

      return nameMatch && stateMatch && zipMatch && phoneMatch;
    });
  }, [searchQuery.data, name, state, zip, phone]);

  const handleSelectCustomer = (customerId: number) => {
    router.push(`/customer/${customerId}`);
  };

  const renderCustomerCard = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      onPress={() => handleSelectCustomer(item.id)}
      style={[styles.customerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.nameSection}>
          <Text style={[styles.customerName, { color: colors.foreground }]}>
            {item.firstName} {item.lastName}
          </Text>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>★ {parseFloat(item.overallRating ?? "0").toFixed(1)}</Text>
            <Text style={[styles.reviewCount, { color: colors.muted }]}>
              ({item.reviewCount} {item.reviewCount === 1 ? "review" : "reviews"})
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardDetails}>
        {item.phone && (
          <Text style={[styles.detailText, { color: colors.muted }]}>
            📱 {item.phone}
          </Text>
        )}
        {(item.city || item.state || item.zip) && (
          <Text style={[styles.detailText, { color: colors.muted }]}>
            📍 {[item.city, item.state, item.zip].filter(Boolean).join(", ")}
          </Text>
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text style={[styles.viewReviews, { color: colors.primary }]}>View All Reviews →</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Search Customers</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Find customer reviews by name, location, or phone
          </Text>
        </View>

        <View style={styles.searchForm}>
          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
              placeholder="First or last name"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* State Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>State</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g., WA, CA, TX"
              placeholderTextColor={colors.muted}
              value={state}
              onChangeText={setState}
              maxLength={2}
            />
          </View>

          {/* ZIP Code Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>ZIP Code</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g., 98001"
              placeholderTextColor={colors.muted}
              value={zip}
              onChangeText={setZip}
              keyboardType="numeric"
            />
          </View>

          {/* Phone Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Phone</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g., 206-555-0123"
              placeholderTextColor={colors.muted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Results Section */}
        <View style={styles.resultsSection}>
          <Text style={[styles.resultsTitle, { color: colors.foreground }]}>
            {filteredResults.length} Result{filteredResults.length !== 1 ? "s" : ""} Found
          </Text>

          {searchQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.muted }]}>Searching...</Text>
            </View>
          ) : filteredResults.length > 0 ? (
            <FlatList
              data={filteredResults}
              renderItem={renderCustomerCard}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
          ) : name.length > 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                No customers found matching your search
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.muted }]}>
                Try adjusting your filters
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Start typing a name to search
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 14 },
  searchForm: { marginBottom: 24, gap: 12 },
  inputGroup: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  resultsSection: { marginBottom: 32 },
  resultsTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  loadingContainer: { alignItems: "center", paddingVertical: 40 },
  loadingText: { marginTop: 12, fontSize: 14 },
  customerCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  cardHeader: { marginBottom: 12 },
  nameSection: { gap: 4 },
  customerName: { fontSize: 18, fontWeight: "700" },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 14, fontWeight: "600", color: "#FFB800" },
  reviewCount: { fontSize: 12 },
  cardDetails: { gap: 6, marginBottom: 12 },
  detailText: { fontSize: 13 },
  divider: { height: 1, marginVertical: 10 },
  viewReviews: { fontSize: 13, fontWeight: "600" },
  emptyContainer: { paddingVertical: 40, alignItems: "center" },
  emptyText: { fontSize: 16, fontWeight: "500", marginBottom: 4 },
  emptySubtext: { fontSize: 13 },
});
