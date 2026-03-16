import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { StarRating } from "@/components/star-rating";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { parseRedFlags, RED_FLAG_LABELS } from "@/shared/types";

type MyReview = {
  id: number;
  customerId: number;
  overallRating: number;
  reviewText: string | null;
  jobType: string | null;
  jobDate: string | null;
  redFlags: string | null;
  helpfulCount: number;
  createdAt: Date;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerCity: string | null;
  customerState: string | null;
};

export default function MyReviewsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const { data: reviews, isLoading, refetch } = trpc.reviews.getMyReviews.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const deleteReview = trpc.reviews.delete.useMutation({ onSuccess: () => refetch() });

  const handleDelete = (reviewId: number) => {
    deleteReview.mutate({ reviewId });
  };

  const renderItem = ({ item }: { item: MyReview }) => {
    const flags = parseRedFlags(item.redFlags);
    const date = new Date(item.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return (
      <Pressable
        onPress={() => router.push(`/customer/${item.customerId}` as never)}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && { opacity: 0.8 },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {(item.customerFirstName ?? "?")[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.customerName, { color: colors.foreground }]}>
              {item.customerFirstName} {item.customerLastName}
            </Text>
            {(item.customerCity || item.customerState) && (
              <Text style={[styles.location, { color: colors.muted }]}>
                📍 {[item.customerCity, item.customerState].filter(Boolean).join(", ")}
              </Text>
            )}
            <StarRating rating={item.overallRating} size={14} />
          </View>
          <View style={styles.cardMeta}>
            <Text style={[styles.date, { color: colors.muted }]}>{date}</Text>
            {item.jobType && (
              <Text style={[styles.jobTag, { backgroundColor: colors.primary + "18", color: colors.primary }]}>
                {item.jobType}
              </Text>
            )}
          </View>
        </View>

        {item.reviewText && (
          <Text style={[styles.reviewText, { color: colors.foreground }]} numberOfLines={2}>
            "{item.reviewText}"
          </Text>
        )}

        {flags.length > 0 && (
          <View style={styles.flagsRow}>
            {flags.slice(0, 2).map((f) => (
              <View key={f} style={[styles.flagChip, { backgroundColor: colors.error + "18", borderColor: colors.error + "44" }]}>
                <Text style={[styles.flagText, { color: colors.error }]}>🚩 {RED_FLAG_LABELS[f]}</Text>
              </View>
            ))}
            {flags.length > 2 && (
              <Text style={[styles.moreFlagsText, { color: colors.muted }]}>+{flags.length - 2} more</Text>
            )}
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={[styles.helpful, { color: colors.muted }]}>
            👍 {item.helpfulCount} found helpful
          </Text>
          <Pressable
            onPress={() => handleDelete(item.id)}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Text style={[styles.deleteText, { color: colors.error }]}>Delete</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View style={[styles.titleBar, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>My Reviews</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Reviews you've submitted for customers
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : reviews && reviews.length > 0 ? (
        <FlatList
          data={reviews as MyReview[]}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.count, { color: colors.muted }]}>
              {reviews.length} {reviews.length === 1 ? "review" : "reviews"} submitted
            </Text>
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📝</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Reviews Yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.muted }]}>
            You haven't reviewed any customers yet. After completing a job, add a review to help other contractors vet this client.
          </Text>
          <Pressable
            onPress={() => router.push("/add-review" as never)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.addBtnText}>Add Your First Review</Text>
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
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  count: {
    fontSize: 13,
    marginBottom: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  customerName: {
    fontSize: 15,
    fontWeight: "600",
  },
  location: {
    fontSize: 12,
  },
  cardMeta: {
    alignItems: "flex-end",
    gap: 4,
  },
  date: {
    fontSize: 11,
  },
  jobTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: "600",
    overflow: "hidden",
  },
  reviewText: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: "italic",
  },
  flagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  flagChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  flagText: {
    fontSize: 11,
    fontWeight: "500",
  },
  moreFlagsText: {
    fontSize: 11,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  helpful: {
    fontSize: 12,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: "500",
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
  addBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
