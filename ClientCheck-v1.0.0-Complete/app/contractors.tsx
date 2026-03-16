import React, { useState } from "react";
import { ScrollView, Text, View, Pressable, TextInput, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

interface Contractor {
  id: number;
  name: string;
  trade: string;
  city: string;
  state: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  reputationScore: number;
}

// Mock contractor data
const MOCK_CONTRACTORS: Contractor[] = [
  {
    id: 1,
    name: "John Smith",
    trade: "Electrician",
    city: "Austin",
    state: "TX",
    rating: 4.8,
    reviewCount: 42,
    verified: true,
    reputationScore: 92,
  },
  {
    id: 2,
    name: "Maria Garcia",
    trade: "Plumber",
    city: "Austin",
    state: "TX",
    rating: 4.9,
    reviewCount: 38,
    verified: true,
    reputationScore: 95,
  },
  {
    id: 3,
    name: "David Lee",
    trade: "HVAC",
    city: "Austin",
    state: "TX",
    rating: 4.6,
    reviewCount: 25,
    verified: false,
    reputationScore: 78,
  },
  {
    id: 4,
    name: "Sarah Johnson",
    trade: "Electrician",
    city: "Austin",
    state: "TX",
    rating: 4.7,
    reviewCount: 31,
    verified: true,
    reputationScore: 88,
  },
];

export default function ContractorsScreen() {
  const colors = useColors();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"rating" | "reviews" | "reputation">("reputation");

  const trades = ["All Trades", "Electrician", "Plumber", "HVAC", "Carpenter", "Painter"];

  const filteredContractors = MOCK_CONTRACTORS.filter((contractor) => {
    const matchesSearch =
      contractor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contractor.trade.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTrade = !selectedTrade || selectedTrade === "All Trades" || contractor.trade === selectedTrade;
    return matchesSearch && matchesTrade;
  }).sort((a, b) => {
    if (sortBy === "rating") return b.rating - a.rating;
    if (sortBy === "reviews") return b.reviewCount - a.reviewCount;
    return b.reputationScore - a.reputationScore;
  });

  const renderContractor = ({ item }: { item: Contractor }) => (
    <Pressable
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        className="rounded-lg p-4 mb-3 flex-row items-center gap-3"
        style={{ backgroundColor: colors.surface }}
      >
        {/* Avatar */}
        <View
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.primary }}
        >
          <Text className="text-lg font-bold text-white">
            {item.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </Text>
        </View>

        {/* Info */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-bold text-foreground">{item.name}</Text>
            {item.verified && <Text className="text-xs text-success">✓ Verified</Text>}
          </View>
          <Text className="text-xs text-muted">{item.trade}</Text>
          <Text className="text-xs text-muted">
            {item.city}, {item.state}
          </Text>
        </View>

        {/* Stats */}
        <View className="items-end gap-1">
          <View className="flex-row items-center gap-1">
            <Text className="text-sm font-bold text-foreground">{item.rating}</Text>
            <Text className="text-xs text-yellow-500">★</Text>
          </View>
          <Text className="text-xs text-muted">{item.reviewCount} reviews</Text>
          <Text className="text-xs font-bold text-success">{item.reputationScore} score</Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-4">
          {/* Header */}
          <View>
            <Text className="text-3xl font-bold text-foreground">Contractor Network</Text>
            <Text className="text-sm text-muted mt-1">
              Find verified contractors in your area
            </Text>
          </View>

          {/* Search */}
          <TextInput
            placeholder="Search contractors..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.muted}
            style={{
              backgroundColor: colors.surface,
              color: colors.foreground,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
            }}
          />

          {/* Trade Filter */}
          <View>
            <Text className="text-sm font-bold text-foreground mb-2">Filter by Trade</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {trades.map((trade) => (
                  <Pressable
                    key={trade}
                    onPress={() => setSelectedTrade(trade === "All Trades" ? null : trade)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <View
                      className="rounded-full px-4 py-2"
                      style={{
                        backgroundColor:
                          (trade === "All Trades" && !selectedTrade) || selectedTrade === trade
                            ? colors.primary
                            : colors.surface,
                        borderColor: colors.border,
                        borderWidth: 1,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            (trade === "All Trades" && !selectedTrade) || selectedTrade === trade
                              ? "#fff"
                              : colors.foreground,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        {trade}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Sort Options */}
          <View>
            <Text className="text-sm font-bold text-foreground mb-2">Sort By</Text>
            <View className="flex-row gap-2">
              {(["reputation", "rating", "reviews"] as const).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setSortBy(option)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View
                    className="rounded-lg px-3 py-2"
                    style={{
                      backgroundColor: sortBy === option ? colors.primary : colors.surface,
                      borderColor: colors.border,
                      borderWidth: 1,
                    }}
                  >
                    <Text
                      style={{
                        color: sortBy === option ? "#fff" : colors.foreground,
                        fontSize: 12,
                        fontWeight: "600",
                        textTransform: "capitalize",
                      }}
                    >
                      {option}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Contractors List */}
          <View>
            <Text className="text-sm font-bold text-foreground mb-2">
              {filteredContractors.length} Contractors
            </Text>
            <FlatList
              data={filteredContractors}
              renderItem={renderContractor}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
