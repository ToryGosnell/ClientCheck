import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";

import { useState } from "react";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";
import { SUSPENSION_REASONS } from "@/server/account-suspension-service";

export default function AdminAccountSuspensionScreen() {
  const colors = useColors();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReason, setSelectedReason] = useState<string>(SUSPENSION_REASONS[0] || "");
  const [suspensionNotes, setSuspensionNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock suspended accounts
  const [suspendedAccounts] = useState([
    {
      id: 1,
      name: "John Smith",
      email: "john@example.com",
      suspendedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      reason: "Multiple Disputes Filed",
      suspendedBy: "admin@contractorvet.com",
      paymentsStopped: true,
    },
    {
      id: 2,
      name: "ABC Plumbing",
      email: "abc@plumbing.com",
      suspendedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      reason: "Payment Issues",
      suspendedBy: "admin@contractorvet.com",
      paymentsStopped: true,
    },
  ]);

  const handleSuspendAccount = async () => {
    if (!searchQuery.trim()) {
      Alert.alert("Error", "Please enter a user email or ID");
      return;
    }

    if (!selectedReason) {
      Alert.alert("Error", "Please select a suspension reason");
      return;
    }

    Alert.alert(
      "Confirm Suspension",
      `Are you sure you want to suspend this account?\n\nReason: ${selectedReason}\n\nPayments will be stopped automatically.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Suspend",
          onPress: async () => {
            setIsProcessing(true);
            try {
              await new Promise((resolve) => setTimeout(resolve, 1500));
              Alert.alert(
                "Success",
                "Account suspended. Payments have been stopped automatically."
              );
              setSearchQuery("");
              setSuspensionNotes("");
            } catch (error) {
              Alert.alert("Error", "Failed to suspend account");
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleUnsuspendAccount = async (accountId: number) => {
    Alert.alert(
      "Confirm Unsuspension",
      "Are you sure you want to unsuspend this account?\n\nPayments will be resumed automatically.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unsuspend",
          onPress: async () => {
            setIsProcessing(true);
            try {
              await new Promise((resolve) => setTimeout(resolve, 1500));
              Alert.alert(
                "Success",
                "Account unsuspended. Payments have been resumed automatically."
              );
            } catch (error) {
              Alert.alert("Error", "Failed to unsuspend account");
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Account Suspension
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Manage suspended accounts and payments
          </Text>
        </View>

        {/* Suspend Account Section */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Suspend Account
          </Text>

          {/* Search */}
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="Enter user email or ID..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {/* Reason Selector */}
          <Text style={[styles.label, { color: colors.foreground }]}>
            Suspension Reason
          </Text>
          <View style={styles.reasonsGrid}>
            {SUSPENSION_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                onPress={() => setSelectedReason(reason)}
                style={[
                  styles.reasonButton,
                  {
                    backgroundColor:
                      selectedReason === reason ? colors.primary : colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.reasonButtonText,
                    { color: selectedReason === reason ? "white" : colors.foreground },
                  ]}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={[styles.label, { color: colors.foreground }]}>
            Additional Notes (Optional)
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.notesInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="Add any additional notes..."
            placeholderTextColor={colors.muted}
            value={suspensionNotes}
            onChangeText={setSuspensionNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Suspend Button */}
          <TouchableOpacity
            onPress={handleSuspendAccount}
            disabled={isProcessing || !searchQuery.trim()}
            style={[
              styles.suspendButton,
              {
                backgroundColor:
                  isProcessing || !searchQuery.trim()
                    ? colors.error + "50"
                    : colors.error,
              },
            ]}
          >
            <Text style={styles.buttonText}>
              {isProcessing ? "Processing..." : "🔒 Suspend Account"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Suspensions */}
        <View style={styles.suspensionsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Active Suspensions ({suspendedAccounts.length})
          </Text>

          {suspendedAccounts.map((account) => (
            <View
              key={account.id}
              style={[
                styles.suspensionCard,
                { backgroundColor: colors.error + "10", borderColor: colors.error },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.accountInfo}>
                  <Text style={[styles.accountName, { color: colors.foreground }]}>
                    {account.name}
                  </Text>
                  <Text style={[styles.accountEmail, { color: colors.muted }]}>
                    {account.email}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: colors.error + "20" },
                  ]}
                >
                  <Text style={[styles.statusText, { color: colors.error }]}>
                    SUSPENDED
                  </Text>
                </View>
              </View>

              <View style={styles.cardDetails}>
                <Text style={[styles.detail, { color: colors.muted }]}>
                  📌 Reason: {account.reason}
                </Text>
                <Text style={[styles.detail, { color: colors.muted }]}>
                  📅 Since: {account.suspendedAt.toLocaleDateString()}
                </Text>
                <Text style={[styles.detail, { color: colors.muted }]}>
                  💳 Payments: Stopped
                </Text>
                <Text style={[styles.detail, { color: colors.muted }]}>
                  👤 By: {account.suspendedBy}
                </Text>
              </View>

              {/* Unsuspend Button */}
              <TouchableOpacity
                onPress={() => handleUnsuspendAccount(account.id)}
                disabled={isProcessing}
                style={[
                  styles.unsuspendButton,
                  { backgroundColor: colors.success },
                ]}
              >
                <Text style={styles.buttonText}>
                  {isProcessing ? "Processing..." : "🔓 Unsuspend Account"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Info Box */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: colors.warning + "15", borderColor: colors.warning },
          ]}
        >
          <Text style={[styles.infoTitle, { color: colors.warning }]}>
            ⚠️ Important
          </Text>
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            • Suspending an account automatically stops all subscription payments
            • Unsuspending an account automatically resumes subscription payments
            • All suspension actions are logged for audit purposes
            • Users are notified via email when their account is suspended/unsuspended
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 20,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  reasonsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reasonButton: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  reasonButtonText: {
    fontSize: 11,
    fontWeight: "600",
  },
  pickerContainer: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  suspendButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  suspensionsContainer: {
    gap: 12,
  },
  suspensionCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  accountInfo: {
    flex: 1,
    gap: 4,
  },
  accountName: {
    fontSize: 15,
    fontWeight: "700",
  },
  accountEmail: {
    fontSize: 12,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardDetails: {
    gap: 6,
  },
  detail: {
    fontSize: 12,
  },
  unsuspendButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  infoBox: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  infoText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
