import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { StarRating } from "@/components/star-rating";

interface CategoryRatingProps {
  label: string;
  description?: string;
  rating: number | null;
  notApplicable?: boolean;
  onRatingChange?: (rating: number) => void;
  onNotApplicableChange?: (na: boolean) => void;
  interactive?: boolean;
}

export function CategoryRating({
  label,
  description,
  rating,
  notApplicable = false,
  onRatingChange,
  onNotApplicableChange,
  interactive = false,
}: CategoryRatingProps) {
  const colors = useColors();

  const handleStarPress = (r: number) => {
    if (notApplicable) onNotApplicableChange?.(false);
    onRatingChange?.(r);
  };

  const handleNaPress = () => {
    const next = !notApplicable;
    onNotApplicableChange?.(next);
    if (next) onRatingChange?.(0);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
        {!!description && (
          <Text style={[styles.description, { color: colors.muted }]}>{description}</Text>
        )}
      </View>
      <View style={styles.ratingArea}>
        {notApplicable ? (
          <Text style={[styles.naActive, { color: colors.muted }]}>N/A</Text>
        ) : (
          <StarRating
            rating={rating ?? 0}
            size={interactive ? 26 : 18}
            interactive={interactive}
            onRatingChange={handleStarPress}
            positionalColors
          />
        )}
        {interactive && (
          <Pressable
            onPress={handleNaPress}
            style={({ pressed }) => [
              styles.naBtn,
              {
                backgroundColor: notApplicable ? colors.primary + "22" : "transparent",
                borderColor: notApplicable ? colors.primary : colors.border,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.naBtnText,
                { color: notApplicable ? colors.primary : colors.muted },
              ]}
            >
              N/A
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  labelContainer: {
    flex: 1,
    marginRight: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  description: {
    fontSize: 11,
    marginTop: 1,
  },
  ratingArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  naActive: {
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 4,
  },
  naBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  naBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
