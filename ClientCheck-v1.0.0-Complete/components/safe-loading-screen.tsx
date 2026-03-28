import { Text, View } from "react-native";

export function SafeLoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Loading...</Text>
    </View>
  );
}
