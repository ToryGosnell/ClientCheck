import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { StarRating } from "@/components/star-rating";

interface CategoryRatingProps {
  label: string;
  description?: string;
  rating: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
}

export function CategoryRating({
  label,
  description,
  rating,
  onRatingChange,
  interactive = false,
}: CategoryRatingProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
        {description && (
          <Text style={[styles.description, { color: colors.muted }]}>{description}</Text>
        )}
      </View>
      <StarRating
        rating={rating}
        size={interactive ? 28 : 18}
        interactive={interactive}
        onRatingChange={onRatingChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  labelContainer: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
  },
  description: {
    fontSize: 12,
    marginTop: 1,
  },
});
