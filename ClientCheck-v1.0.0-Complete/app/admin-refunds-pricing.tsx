import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
} from "react-native";
import { useState } from "react";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";

type Tab = "refunds" | "pricing";

interface RefundItem {
  id: string;
  userName: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  date: string;
}

interface PricingItem {
  id: string;
  userName: string;
  originalPrice: number;
  newPrice: number;
  reason: string;
  validUntil?: string;
}

export default function AdminRefundsPricingScreen() {
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<Tab>("refunds");
  const [refunds, setRefunds] = useState<RefundItem[]>([
    {
      id: "ref_1",
      userName: "John Smith",
      amount: 9.99,
      reason: "User requested",
      status: "pending",
      date: "2026-03-12",
    },
  ]);

  const [pricingAdjustments, setPricingAdjustments] = useState<PricingItem[]>([
    {
      id: "adj_1",
      userName: "Jane Doe",
      originalPrice: 9.99,
      newPrice: 7.99,
      reason: "Loyalty discount",
      validUntil: "2026-06-12",
    },
  ]);

  const [showRefundForm, setShowRefundForm] = useState(false);
  const [showPricingForm, setShowPricingForm] = useState(false);
  const [refundForm, setRefundForm] = useState({
    userId: "",
    amount: "",
    reason: "",
  });
  const [pricingForm, setPricingForm] = useState({
    userId: "",
    newPrice: "",
    reason: "",
    validUntil: "",
  });

  const handleIssueRefund = () => {
    if (!refundForm.userId || !refundForm.amount || !refundForm.reason) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const newRefund: RefundItem = {
      id: `ref_${Date.now()}`,
      userName: `User ${refundForm.userId}`,
      amount: parseFloat(refundForm.amount),
      reason: refundForm.reason,
      status: "approved",
      date: new Date().toISOString().split("T")[0],
    };

    setRefunds([...refunds, newRefund]);
    setRefundForm({ userId: "", amount: "", reason: "" });
    setShowRefundForm(false);
    Alert.alert("✅ Refund Issued", `$${refundForm.amount} refunded successfully`);
  };

  const handleAdjustPricing = () => {
    if (!pricingForm.userId || !pricingForm.newPrice || !pricingForm.reason) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const newAdjustment: PricingItem = {
      id: `adj_${Date.now()}`,
      userName: `User ${pricingForm.userId}`,
      originalPrice: 9.99,
      newPrice: parseFloat(pricingForm.newPrice),
      reason: pricingForm.reason,
      validUntil: pricingForm.validUntil || undefined,
    };

    setPricingAdjustments([...pricingAdjustments, newAdjustment]);
    setPricingForm({ userId: "", newPrice: "", reason: "", validUntil: "" });
    setShowPricingForm(false);
    Alert.alert("✅ Pricing Adjusted", `Price updated to $${pricingForm.newPrice}/month`);
  };

  const renderRefundItem = ({ item }: { item: RefundItem }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>
          {item.userName}
        </Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === "approved"
                  ? "#10b981"
                  : item.status === "rejected"
                    ? "#ef4444"
                    : "#f59e0b",
            },
          ]}
        >
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={[styles.cardAmount, { color: colors.primary }]}>
        ${item.amount.toFixed(2)}
      </Text>
      <Text style={[styles.cardDetail, { color: colors.muted }]}>
        {item.reason}
      </Text>
      <Text style={[styles.cardDate, { color: colors.muted }]}>
        {item.date}
      </Text>
    </View>
  );

  const renderPricingItem = ({ item }: { item: PricingItem }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>
          {item.userName}
        </Text>
      </View>
      <View style={styles.priceChange}>
        <Text style={[styles.priceOld, { color: colors.muted }]}>
          ${item.originalPrice.toFixed(2)}
        </Text>
        <Text style={[styles.priceArrow, { color: colors.muted }]}>→</Text>
        <Text style={[styles.priceNew, { color: colors.primary }]}>
          ${item.newPrice.toFixed(2)}
        </Text>
      </View>
      <Text style={[styles.cardDetail, { color: colors.muted }]}>
        {item.reason}
      </Text>
      {item.validUntil && (
        <Text style={[styles.cardDate, { color: colors.muted }]}>
          Valid until: {item.validUntil}
        </Text>
      )}
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Tabs */}
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => setActiveTab("refunds")}
            style={[
              styles.tab,
              {
                borderBottomColor:
                  activeTab === "refunds" ? colors.primary : "transparent",
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === "refunds" ? colors.primary : colors.muted,
                  fontWeight: activeTab === "refunds" ? "700" : "500",
                },
              ]}
            >
              Refunds
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("pricing")}
            style={[
              styles.tab,
              {
                borderBottomColor:
                  activeTab === "pricing" ? colors.primary : "transparent",
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === "pricing" ? colors.primary : colors.muted,
                  fontWeight: activeTab === "pricing" ? "700" : "500",
                },
              ]}
            >
              Pricing
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "refunds" ? (
            <View>
              <TouchableOpacity
                onPress={() => setShowRefundForm(!showRefundForm)}
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.actionButtonText}>+ Issue Refund</Text>
              </TouchableOpacity>

              {showRefundForm && (
                <View
                  style={[
                    styles.form,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.foreground,
                      },
                    ]}
                    placeholder="User ID"
                    placeholderTextColor={colors.muted}
                    value={refundForm.userId}
                    onChangeText={(text) =>
                      setRefundForm({ ...refundForm, userId: text })
                    }
                  />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.foreground,
                      },
                    ]}
                    placeholder="Amount ($)"
                    placeholderTextColor={colors.muted}
                    value={refundForm.amount}
                    onChangeText={(text) =>
                      setRefundForm({ ...refundForm, amount: text })
                    }
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={[
                      styles.input,
                      styles.textArea,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.foreground,
                      },
                    ]}
                    placeholder="Reason"
                    placeholderTextColor={colors.muted}
                    value={refundForm.reason}
                    onChangeText={(text) =>
                      setRefundForm({ ...refundForm, reason: text })
                    }
                    multiline
                  />
                  <TouchableOpacity
                    onPress={handleIssueRefund}
                    style={[styles.submitButton, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.submitButtonText}>Issue Refund</Text>
                  </TouchableOpacity>
                </View>
              )}

              <FlatList
                data={refunds}
                renderItem={renderRefundItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.listContent}
              />
            </View>
          ) : (
            <View>
              <TouchableOpacity
                onPress={() => setShowPricingForm(!showPricingForm)}
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.actionButtonText}>+ Adjust Pricing</Text>
              </TouchableOpacity>

              {showPricingForm && (
                <View
                  style={[
                    styles.form,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.foreground,
                      },
                    ]}
                    placeholder="User ID"
                    placeholderTextColor={colors.muted}
                    value={pricingForm.userId}
                    onChangeText={(text) =>
                      setPricingForm({ ...pricingForm, userId: text })
                    }
                  />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.foreground,
                      },
                    ]}
                    placeholder="New Monthly Price ($)"
                    placeholderTextColor={colors.muted}
                    value={pricingForm.newPrice}
                    onChangeText={(text) =>
                      setPricingForm({ ...pricingForm, newPrice: text })
                    }
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.foreground,
                      },
                    ]}
                    placeholder="Reason"
                    placeholderTextColor={colors.muted}
                    value={pricingForm.reason}
                    onChangeText={(text) =>
                      setPricingForm({ ...pricingForm, reason: text })
                    }
                  />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.foreground,
                      },
                    ]}
                    placeholder="Valid Until (YYYY-MM-DD)"
                    placeholderTextColor={colors.muted}
                    value={pricingForm.validUntil}
                    onChangeText={(text) =>
                      setPricingForm({ ...pricingForm, validUntil: text })
                    }
                  />
                  <TouchableOpacity
                    onPress={handleAdjustPricing}
                    style={[styles.submitButton, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.submitButtonText}>Adjust Pricing</Text>
                  </TouchableOpacity>
                </View>
              )}

              <FlatList
                data={pricingAdjustments}
                renderItem={renderPricingItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.listContent}
              />
            </View>
          )}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  actionButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  form: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  input: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  submitButton: {
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  submitButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
  listContent: {
    gap: 12,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardDetail: {
    fontSize: 12,
  },
  cardDate: {
    fontSize: 11,
  },
  priceChange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priceOld: {
    fontSize: 13,
    textDecorationLine: "line-through",
  },
  priceArrow: {
    fontSize: 14,
  },
  priceNew: {
    fontSize: 14,
    fontWeight: "700",
  },
});
