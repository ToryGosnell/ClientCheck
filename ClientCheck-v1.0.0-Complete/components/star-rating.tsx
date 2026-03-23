import { Pressable, StyleSheet, View } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getStarColorByPosition } from "@/shared/review-categories";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  /** Use positional colors (red/yellow/green) instead of a single accent */
  positionalColors?: boolean;
}

export function StarRating({
  rating,
  maxStars = 5,
  size = 24,
  interactive = false,
  onRatingChange,
  positionalColors = false,
}: StarRatingProps) {
  const colors = useColors();

  const getStarIcon = (index: number): "star.fill" | "star.leadinghalf.filled" | "star" => {
    const starNumber = index + 1;
    if (rating >= starNumber) return "star.fill";
    if (rating >= starNumber - 0.5) return "star.leadinghalf.filled";
    return "star";
  };

  const getStarColor = (index: number) => {
    const starNumber = index + 1;
    const filled = rating >= starNumber - 0.5;
    if (positionalColors) {
      return getStarColorByPosition(starNumber, filled, colors.border);
    }
    return filled ? colors.accent : colors.border;
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: maxStars }, (_, i) => {
        if (interactive) {
          return (
            <Pressable
              key={i}
              onPress={() => onRatingChange?.(i + 1)}
              style={({ pressed }) => [
                styles.star,
                pressed && { opacity: 0.7, transform: [{ scale: 0.9 }] },
              ]}
            >
              <IconSymbol name={getStarIcon(i)} size={size} color={getStarColor(i)} />
            </Pressable>
          );
        }
        return (
          <View key={i} style={styles.star}>
            <IconSymbol name={getStarIcon(i)} size={size} color={getStarColor(i)} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  star: {
    marginHorizontal: 1,
  },
});
