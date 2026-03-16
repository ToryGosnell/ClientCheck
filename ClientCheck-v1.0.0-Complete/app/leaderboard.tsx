import { ScrollView, StyleSheet, Text, View, Pressable, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useRouter } from "expo-router";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState } from "react";

export default function LeaderboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const [filterCity, setFilterCity] = useState<string | null>(null);
  const [filterTrade, setFilterTrade] = useState<string | null>(null);

  const topContractorsQuery = trpc.analytics.getTopContractors.useQuery({
    limit: 50,
  });

  const contractors = topContractorsQuery.data || [];

  const renderContractor = ({ item, index }: { item: any; index: number }) => (
    <Pressable
      onPress={() => router.push(`/customer/${item.contractorUserId}`)}
      style={({ pressed }) => [
        styles.contractorCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.rankBadge}>
        <Text style={[styles.rankNumber, { color: colors.primary }]}>#{index + 1}</Text>
      </View>

      <View style={styles.contractorInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.contractorName, { color: colors.foreground }]}>
            {item.name}
          </Text>
          {item.isVerified && (
            <IconSymbol name="checkmark.seal.fill" size={18} color={colors.success} />
          )}
        </View>

        <Text style={[styles.contractorTrade, { color: colors.muted }]}>
          {item.trade} • {item.city}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {item.reputationScore.toFixed(1)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Reputation</Text>
          </View>

          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {item.totalReviews}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Reviews</Text>
          </View>

          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {item.disputeResponseRate}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Response</Text>
          </View>
        </View>
      </View>

      <IconSymbol name="chevron.right" size={20} color={colors.muted} />
    </Pressable>
  );

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Top Contractors</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Highest rated and most trusted
          </Text>
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setFilterCity(filterCity ? null : "New York")}
            style={({ pressed }) => [
              styles.filterBtn,
              {
                backgroundColor: filterCity ? colors.primary : colors.surface,
                borderColor: colors.border,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text
              style={[
                styles.filterBtnText,
                { color: filterCity ? "#fff" : colors.foreground },
              ]}
            >
              City
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilterTrade(filterTrade ? null : "Plumbing")}
            style={({ pressed }) => [
              styles.filterBtn,
              {
                backgroundColor: filterTrade ? colors.primary : colors.surface,
                borderColor: colors.border,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text
              style={[
                styles.filterBtnText,
                { color: filterTrade ? "#fff" : colors.foreground },
              ]}
            >
              Trade
            </Text>
          </Pressable>
        </View>

        {/* Contractors List */}
        {contractors.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              No contractors found
            </Text>
          </View>
        ) : (
          <FlatList
            data={contractors}
            renderItem={renderContractor}
            keyExtractor={(item) => String(item.contractorUserId)}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    gap: 12,
  },
  contractorCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: "700",
  },
  contractorInfo: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contractorName: {
    fontSize: 16,
    fontWeight: "700",
  },
  contractorTrade: {
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  emptyState: {
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
  },
});
