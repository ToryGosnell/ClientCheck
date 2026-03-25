import { Pressable, Text, View } from "react-native";

export type RatingValue = 1 | 2 | 3 | 4 | 5 | null;

export type RatingSelectorProps = {
  label: string;
  value: RatingValue;
  onChange: (value: RatingValue) => void;
};

export function RatingSelector({ label, value, onChange }: RatingSelectorProps) {
  const isNaSelected = value === null;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ marginBottom: 8 }}>{label}</Text>

      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {[1, 2, 3, 4, 5].map((score) => {
          const selected = value === score;
          return (
            <Pressable
              key={score}
              onPress={() => onChange(score as RatingValue)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: selected ? "#fff" : "rgba(255,255,255,0.25)",
                backgroundColor: selected ? "rgba(255,255,255,0.18)" : "transparent",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: selected ? "700" : "500" }}>
                {score}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => onChange(null)}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: isNaSelected ? "#fff" : "rgba(255,255,255,0.25)",
            backgroundColor: isNaSelected ? "rgba(255,255,255,0.18)" : "transparent",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: isNaSelected ? "700" : "500" }}>
            N/A
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
