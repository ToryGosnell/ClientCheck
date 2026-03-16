import { View, TouchableOpacity, Text, StyleSheet, Alert } from "react-native";
import { useColors } from "@/hooks/use-colors";
// Sharing removed for MVP - will be added in next iteration

interface CustomerActionButtonsProps {
  customerId: number;
  customerName: string;
  onBlock?: (customerId: number) => void;
  onReport?: (customerId: number) => void;
  onExport?: (customerId: number) => void;
}

export function CustomerActionButtons({
  customerId,
  customerName,
  onBlock,
  onReport,
  onExport,
}: CustomerActionButtonsProps) {
  const colors = useColors();

  const handleBlock = () => {
    Alert.alert(
      "Block Customer",
      `Are you sure you want to block ${customerName}? You won't see their profile or incoming calls from them.`,
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Block",
          onPress: () => onBlock?.(customerId),
          style: "destructive",
        },
      ]
    );
  };

  const handleReport = () => {
    Alert.alert(
      "Report Customer",
      `Report ${customerName} for suspicious or fraudulent activity.`,
      [
        { text: "Cancel", onPress: () => {}, style: "cancel" },
        {
          text: "Report",
          onPress: () => onReport?.(customerId),
          style: "destructive",
        },
      ]
    );
  };

  const handleExport = async () => {
    try {
      Alert.alert("Export", `Reviews for ${customerName} will be exported`);
      onExport?.(customerId);
    } catch (error) {
      Alert.alert("Error", "Could not export reviews");
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleBlock}
        style={[
          styles.button,
          {
            backgroundColor: colors.error + "20",
            borderColor: colors.error,
          },
        ]}
      >
        <Text style={[styles.buttonIcon, { fontSize: 16 }]}>🚫</Text>
        <Text style={[styles.buttonText, { color: colors.error }]}>Block</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleReport}
        style={[
          styles.button,
          {
            backgroundColor: colors.warning + "20",
            borderColor: colors.warning,
          },
        ]}
      >
        <Text style={[styles.buttonIcon, { fontSize: 16 }]}>🚩</Text>
        <Text style={[styles.buttonText, { color: colors.warning }]}>
          Report
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleExport}
        style={[
          styles.button,
          {
            backgroundColor: colors.primary + "20",
            borderColor: colors.primary,
          },
        ]}
      >
        <Text style={[styles.buttonIcon, { fontSize: 16 }]}>📤</Text>
        <Text style={[styles.buttonText, { color: colors.primary }]}>
          Export
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },
  buttonIcon: {
    fontWeight: "700",
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
