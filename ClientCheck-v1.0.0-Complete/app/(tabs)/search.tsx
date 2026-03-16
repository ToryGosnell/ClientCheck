import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { CustomerCard } from "@/components/customer-card";
import { useColors } from "@/hooks/use-colors";
import { useSearch } from "@/hooks/useSearch";
import { useAuth } from "@/hooks/use-auth";
import type { Customer } from "@/drizzle/schema";

type FilterType = "all" | "high" | "medium" | "low";
type VerificationFilter = "all" | "verified" | "unverified";

const FILTERS: { key: FilterType; label: string; emoji: string }[] = [
  { key: "all", label: "All", emoji: "🔍" },
  { key: "high", label: "High Risk", emoji: "🔴" },
  { key: "medium", label: "Caution", emoji: "🟡" },
  { key: "low", label: "Good", emoji: "🟢" },
];

const VERIFICATION_FILTERS: { key: VerificationFilter; label: string }[] = [
  { key: "all", label: "All Contractors" },
  { key: "verified", label: "Verified Only" },
  { key: "unverified", label: "Unverified" },
];

export default function SearchScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>("all");

  const { data: results, isLoading } = trpc.customers.search.useQuery(
    { query },
    { enabled: isAuthenticated && query.length >= 2 }
  );

  const { data: flaggedCustomers } = trpc.customers.getFlagged.useQuery(
    undefined,
    { enabled: isAuthenticated && query.length < 2 && activeFilter === "high" }
  );

  const { data: topRated } = trpc.customers.getTopRated.useQuery(
    undefined,
    { enabled: isAuthenticated && query.length < 2 && activeFilter === "low" }
  );

  const getDisplayData = (): Customer[] => {
    if (query.length >= 2) {
      const res = (results ?? []) as Customer[];
      if (activeFilter === "all") return res;
      return res.filter((c) => c.riskLevel === activeFilter);
    }
    if (activeFilter === "high") return (flaggedCustomers ?? []) as Customer[];
    if (activeFilter === "low") return (topRated ?? []) as Customer[];
    return [];
  };

  const displayData = getDisplayData();

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Title */}
      <View style={[styles.titleBar, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Search Customers</Text>
      </View>

      {/* Search Input */}
      <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchInputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.searchIcon, { color: colors.muted }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Name, phone number, or city..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="words"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
              <Text style={[styles.clearBtn, { color: colors.muted }]}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Risk Filters */}
      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => {
          setActiveFilter(f.key);
          if (f.key === "high") loadFlaggedCustomers();
          if (f.key === "low") loadTopRatedCustomers();
        }}
            style={({ pressed }) => [
              styles.filterChip,
              {
                backgroundColor: activeFilter === f.key ? colors.primary : colors.surface,
                borderColor: activeFilter === f.key ? colors.primary : colors.border,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: activeFilter === f.key ? "#fff" : colors.muted },
              ]}
            >
              {f.emoji} {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Verification Filters */}
      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {VERIFICATION_FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setVerificationFilter(f.key)}
            style={({ pressed }) => [
              styles.filterChip,
              {
                backgroundColor: verificationFilter === f.key ? colors.primary : colors.surface,
                borderColor: verificationFilter === f.key ? colors.primary : colors.border,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: verificationFilter === f.key ? "#fff" : colors.muted },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Results */}
      {query.length < 2 && activeFilter === "all" ? (
        <View style={styles.promptContainer}>
          <Text style={[styles.promptEmoji]}>🔍</Text>
          <Text style={[styles.promptTitle, { color: colors.foreground }]}>
            Search for a Customer
          </Text>
          <Text style={[styles.promptDesc, { color: colors.muted }]}>
            Type at least 2 characters to search by name, phone number, or city. Use the filters to browse high-risk or top-rated customers.
          </Text>
          <Pressable
            onPress={() => router.push("/add-review" as never)}
            style={[styles.addBtn, { borderColor: colors.primary }]}
          >
            <Text style={[styles.addBtnText, { color: colors.primary }]}>
              + Add New Customer Review
            </Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : displayData.length > 0 ? (
        <FlatList
          data={displayData}
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
            <Text style={[styles.resultCount, { color: colors.muted }]}>
              {displayData.length} {displayData.length === 1 ? "result" : "results"}
            </Text>
          }
        />
      ) : (
        <View style={styles.promptContainer}>
          <Text style={styles.promptEmoji}>😕</Text>
          <Text style={[styles.promptTitle, { color: colors.foreground }]}>No Results Found</Text>
          <Text style={[styles.promptDesc, { color: colors.muted }]}>
            No customers match your search. You can add a new customer profile and be the first to review them.
          </Text>
          <Pressable
            onPress={() => router.push("/add-review" as never)}
            style={[styles.addBtn, { borderColor: colors.primary }]}
          >
            <Text style={[styles.addBtnText, { color: colors.primary }]}>
              + Add New Customer
            </Text>
          </Pressable>
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
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 0.5,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearBtn: {
    fontSize: 16,
    padding: 2,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 0.5,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  resultCount: {
    fontSize: 13,
    marginBottom: 8,
  },
  promptContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  promptEmoji: {
    fontSize: 48,
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  promptDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  addBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
    borderStyle: "dashed",
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
