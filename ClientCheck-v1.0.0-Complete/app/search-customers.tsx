import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { CustomerSearchService } from "@/lib/customer-search-service";

interface CustomerResult {
  id: string;
  name: string;
  averageRating: number;
  reviewCount: number;
  riskLevel: "low" | "medium" | "high";
  redFlags: string[];
}

export default function SearchCustomersScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "low" | "medium" | "high">("all");

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    handlePress();

    try {
      // In production, call search API
      const searchResults = await CustomerSearchService.searchCustomers(searchQuery);
      setResults(searchResults as CustomerResult[]);
      setSearched(true);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (riskLevel: "low" | "medium" | "high") => {
    if (riskLevel === "low") return "bg-green-900/20 border-green-600/30";
    if (riskLevel === "medium") return "bg-yellow-900/20 border-yellow-600/30";
    return "bg-red-900/20 border-red-600/30";
  };

  const getRiskLevelText = (riskLevel: "low" | "medium" | "high") => {
    if (riskLevel === "low") return "✅ Low Risk";
    if (riskLevel === "medium") return "⚠️ Medium Risk";
    return "🚨 High Risk";
  };

  const getRiskLevelTextColor = (riskLevel: "low" | "medium" | "high") => {
    if (riskLevel === "low") return "text-green-400";
    if (riskLevel === "medium") return "text-yellow-400";
    return "text-red-400";
  };

  const renderCustomerCard = ({ item }: { item: CustomerResult }) => (
    <Pressable
      onPress={() => {
        handlePress();
        router.push({
          pathname: "/customer-profile",
          params: { customerId: item.id },
        });
      }}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
      className={`border rounded-xl p-4 gap-3 mb-3 ${getRiskLevelColor(item.riskLevel)}`}
    >
      {/* Name and Risk Level */}
      <View className="flex-row justify-between items-start gap-2">
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">{item.name}</Text>
          <Text className={`text-sm font-semibold ${getRiskLevelTextColor(item.riskLevel)}`}>
            {getRiskLevelText(item.riskLevel)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-2xl font-bold text-foreground">{item.averageRating}</Text>
          <Text className="text-xs text-muted">{item.reviewCount} reviews</Text>
        </View>
      </View>

      {/* Red Flags */}
      {item.redFlags.length > 0 && (
        <View className="gap-1">
          <Text className="text-xs font-semibold text-muted">Red Flags:</Text>
          <View className="flex-row flex-wrap gap-2">
            {item.redFlags.slice(0, 3).map((flag, index) => (
              <View key={index} className="bg-red-600/20 rounded px-2 py-1">
                <Text className="text-xs text-red-300">{flag}</Text>
              </View>
            ))}
            {item.redFlags.length > 3 && (
              <View className="bg-red-600/20 rounded px-2 py-1">
                <Text className="text-xs text-red-300">+{item.redFlags.length - 3} more</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* View Details Button */}
      <View className="pt-2 border-t border-border">
        <Text className="text-sm text-primary font-semibold">View Details →</Text>
      </View>
    </Pressable>
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 gap-4 px-6 py-8">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-4xl font-bold text-foreground">Search Customers</Text>
            <Text className="text-base text-muted">
              Check customer reviews before accepting jobs
            </Text>
          </View>

          {/* Search Bar */}
          <View className="gap-3">
            <View className="flex-row gap-2 items-center">
              <TextInput
                placeholder="Search by name or business..."
                placeholderTextColor="#687076"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                className="flex-1 bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              />
              <Pressable
                onPress={handleSearch}
                disabled={loading}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                className="bg-primary rounded-lg p-3"
              >
                <Text className="text-white font-bold text-lg">🔍</Text>
              </Pressable>
            </View>

            {/* Filter Buttons */}
            <View className="flex-row gap-2">
              {(["all", "low", "medium", "high"] as const).map((filter) => (
                <Pressable
                  key={filter}
                  onPress={() => {
                    handlePress();
                    setSelectedFilter(filter);
                  }}
                  className={`px-4 py-2 rounded-lg ${
                    selectedFilter === filter
                      ? "bg-primary"
                      : "bg-surface border border-border"
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      selectedFilter === filter ? "text-white" : "text-foreground"
                    }`}
                  >
                    {filter === "all"
                      ? "All"
                      : filter === "low"
                        ? "✅ Low Risk"
                        : filter === "medium"
                          ? "⚠️ Medium"
                          : "🚨 High Risk"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Loading State */}
          {loading && (
            <View className="py-8 items-center">
              <ActivityIndicator size="large" color="#0a7ea4" />
              <Text className="text-muted mt-2">Searching customers...</Text>
            </View>
          )}

          {/* Results */}
          {!loading && searched && results.length > 0 && (
            <View className="flex-1">
              <Text className="text-sm font-semibold text-muted mb-3">
                Found {results.length} customer{results.length !== 1 ? "s" : ""}
              </Text>
              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                renderItem={renderCustomerCard}
                scrollEnabled={false}
              />
            </View>
          )}

          {/* No Results */}
          {!loading && searched && results.length === 0 && (
            <View className="flex-1 items-center justify-center gap-4">
              <Text className="text-6xl">🔍</Text>
              <Text className="text-lg font-bold text-foreground">No customers found</Text>
              <Text className="text-sm text-muted text-center">
                Try searching with a different name or business
              </Text>
            </View>
          )}

          {/* Initial State */}
          {!searched && (
            <View className="flex-1 gap-4">
              <View className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 gap-3">
                <Text className="text-lg font-bold text-foreground">How It Works</Text>
                <View className="gap-2">
                  <View className="flex-row gap-3">
                    <Text className="text-lg">1️⃣</Text>
                    <Text className="flex-1 text-sm text-muted">
                      Search for a customer or business name
                    </Text>
                  </View>
                  <View className="flex-row gap-3">
                    <Text className="text-lg">2️⃣</Text>
                    <Text className="flex-1 text-sm text-muted">
                      View their rating, reviews, and red flags
                    </Text>
                  </View>
                  <View className="flex-row gap-3">
                    <Text className="text-lg">3️⃣</Text>
                    <Text className="flex-1 text-sm text-muted">
                      Make informed decisions before accepting jobs
                    </Text>
                  </View>
                </View>
              </View>

              <View className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 gap-2">
                <Text className="text-sm font-bold text-green-300">✅ Low Risk</Text>
                <Text className="text-xs text-muted">
                  Rating 4+, no major complaints, good payment history
                </Text>
              </View>

              <View className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 gap-2">
                <Text className="text-sm font-bold text-yellow-300">⚠️ Medium Risk</Text>
                <Text className="text-xs text-muted">
                  Rating 2.5-4, some complaints, proceed with caution
                </Text>
              </View>

              <View className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 gap-2">
                <Text className="text-sm font-bold text-red-300">🚨 High Risk</Text>
                <Text className="text-xs text-muted">
                  Rating below 2.5, multiple red flags, consider declining
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
