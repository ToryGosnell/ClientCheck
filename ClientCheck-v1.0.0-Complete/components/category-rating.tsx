import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { StarRating } from "@/components/star-rating";

/** `undefined` = not chosen yet; `null` = N/A; `1`–`5` = star rating. */
export type CategoryRatingValue = 1 | 2 | 3 | 4 | 5 | null | undefined;

interface CategoryRatingProps {
  label: string;
  description?: string;
  value: CategoryRatingValue;
  onValueChange?: (value: CategoryRatingValue) => void;
  interactive?: boolean;
}

export function CategoryRating({
  label,
  description,
  value,
  onValueChange,
  interactive = false,
}: CategoryRatingProps) {
  const colors = useColors();

  const isNaSelected = value === null;
  const starRating = typeof value === "number" && value >= 1 && value <= 5 ? value : 0;

  const handleStarPress = (r: number) => {
    if (r >= 1 && r <= 5) onValueChange?.(r as 1 | 2 | 3 | 4 | 5);
  };

  const handleNaPress = () => {
    if (value === null) {
      onValueChange?.(undefined);
      return;
    }
    onValueChange?.(null);
  };

  const naHighlight = interactive && isNaSelected;

  return (
    <View
      style={[
        styles.container,
        naHighlight && {
          backgroundColor: "rgba(59, 130, 246, 0.08)",
          borderRadius: 10,
          paddingHorizontal: 8,
          marginHorizontal: -8,
          borderLeftWidth: 3,
          borderLeftColor: "#3b82f6",
        },
      ]}
    >
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
        {!!description && (
          <Text style={[styles.description, { color: colors.muted }]}>{description}</Text>
        )}
      </View>
      <View style={styles.ratingArea}>
        {isNaSelected ? (
          <Text style={[styles.naActive, { color: naHighlight ? colors.primary : colors.muted }]}>
            N/A
          </Text>
        ) : (
          <StarRating
            rating={starRating}
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
                backgroundColor: isNaSelected ? "rgba(255,255,255,0.22)" : "transparent",
                borderColor: isNaSelected ? "rgba(255,255,255,0.55)" : colors.border,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[
                styles.naBtnText,
                { color: isNaSelected ? "rgba(255,255,255,0.95)" : colors.muted },
                isNaSelected && { fontWeight: "800" },
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
