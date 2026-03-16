import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";

export default function AdminDisputeManagementScreen() {
  const colors = useColors();
  const router = useRouter();

  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDisputes, setSelectedDisputes] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock disputes data
  const [disputes] = useState([
    {
      id: 1,
      customerName: "ABC Plumbing",
      reviewId: 101,
      reason: "False Information",
      status: "submitted",
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      evidence: 2,
      priority: "high",
    },
    {
      id: 2,
      customerName: "John's Construction",
      reviewId: 102,
      reason: "Defamatory",
      status: "submitted",
      submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      evidence: 3,
      priority: "medium",
    },
    {
      id: 3,
      customerName: "Smith Enterprises",
      reviewId: 103,
      reason: "Privacy Violation",
      status: "under_review",
      submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      evidence: 1,
      priority: "low",
    },
    {
      id: 4,
      customerName: "Tech Solutions",
      reviewId: 104,
      reason: "Inaccurate Information",
      status: "submitted",
      submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      evidence: 4,
      priority: "high",
    },
  ]);

  const filteredDisputes = disputes.filter((d) => {
    const matchesStatus = filterStatus === "all" || d.status === filterStatus;
    const matchesSearch =
      d.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSelectDispute = (id: number) => {
    setSelectedDisputes((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedDisputes.length === filteredDisputes.length) {
      setSelectedDisputes([]);
    } else {
      setSelectedDisputes(filteredDisputes.map((d) => d.id));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedDisputes.length === 0) {
      Alert.alert("Error", "Please select disputes to approve.");
      return;
    }

    Alert.alert(
      "Confirm Bulk Approval",
      `Approve ${selectedDisputes.length} dispute(s)? The associated reviews will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            setIsProcessing(true);
            try {
              await new Promise((resolve) => setTimeout(resolve, 1500));
              Alert.alert(
                "Success",
                `${selectedDisputes.length} dispute(s) approved.`
              );
              setSelectedDisputes([]);
            } catch (error) {
              Alert.alert("Error", "Failed to process disputes.");
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleBulkReject = async () => {
    if (selectedDisputes.length === 0) {
      Alert.alert("Error", "Please select disputes to reject.");
      return;
    }

    Alert.alert(
      "Confirm Bulk Rejection",
      `Reject ${selectedDisputes.length} dispute(s)? Customers will be notified.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          onPress: async () => {
            setIsProcessing(true);
            try {
              await new Promise((resolve) => setTimeout(resolve, 1500));
              Alert.alert(
                "Success",
                `${selectedDisputes.length} dispute(s) rejected.`
              );
              setSelectedDisputes([]);
            } catch (error) {
              Alert.alert("Error", "Failed to process disputes.");
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const data = filteredDisputes.map((d) => ({
        id: d.id,
        customer: d.customerName,
        reason: d.reason,
        status: d.status,
        submitted: d.submittedAt.toISOString(),
        evidence: d.evidence,
        priority: d.priority,
      }));

      // Mock export
      await new Promise((resolve) => setTimeout(resolve, 1000));
      Alert.alert("Success", "Dispute data exported as CSV.");
    } catch (error) {
      Alert.alert("Error", "Failed to export data.");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return colors.error;
      case "medium":
        return colors.warning;
      case "low":
        return colors.muted;
      default:
        return colors.muted;
    }
  };

  const renderDisputeRow = ({ item }: any) => (
    <TouchableOpacity
      onPress={() => handleSelectDispute(item.id)}
      style={[
        styles.disputeRow,
        {
          backgroundColor: selectedDisputes.includes(item.id)
            ? colors.primary + "20"
            : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.checkbox}>
        <View
          style={[
            styles.checkboxInner,
            {
              backgroundColor: selectedDisputes.includes(item.id)
                ? colors.primary
                : "transparent",
              borderColor: colors.border,
            },
          ]}
        >
          {selectedDisputes.includes(item.id) && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </View>
      </View>

      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <Text style={[styles.customerName, { color: colors.foreground }]}>
            {item.customerName}
          </Text>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: getPriorityColor(item.priority) + "20" },
            ]}
          >
            <Text
              style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}
            >
              {item.priority.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={[styles.reason, { color: colors.muted }]}>{item.reason}</Text>

        <View style={styles.rowFooter}>
          <Text style={[styles.meta, { color: colors.muted }]}>
            📎 {item.evidence} files
          </Text>
          <Text style={[styles.meta, { color: colors.muted }]}>
            📅 {item.submittedAt.toLocaleDateString()}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: colors.warning + "20" },
            ]}
          >
            <Text style={[styles.statusText, { color: colors.warning }]}>
              {item.status === "submitted" ? "NEW" : "REVIEWING"}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Dispute Management
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Review and process customer disputes
          </Text>
        </View>

        {/* Search */}
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          placeholder="Search by customer or reason..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Filters */}
        <View style={styles.filters}>
          {["all", "submitted", "under_review"].map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setFilterStatus(status)}
              style={[
                styles.filterButton,
                {
                  backgroundColor:
                    filterStatus === status ? colors.primary : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color:
                      filterStatus === status ? "white" : colors.foreground,
                  },
                ]}
              >
                {status === "all"
                  ? "All"
                  : status === "submitted"
                    ? "New"
                    : "Reviewing"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bulk Actions */}
        {selectedDisputes.length > 0 && (
          <View
            style={[
              styles.bulkActionsBar,
              { backgroundColor: colors.primary + "10", borderColor: colors.primary },
            ]}
          >
            <Text style={[styles.bulkText, { color: colors.foreground }]}>
              {selectedDisputes.length} selected
            </Text>
            <View style={styles.bulkButtons}>
              <TouchableOpacity
                onPress={handleBulkApprove}
                disabled={isProcessing}
                style={[styles.bulkButton, { backgroundColor: colors.success }]}
              >
                <Text style={styles.bulkButtonText}>✓ Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleBulkReject}
                disabled={isProcessing}
                style={[styles.bulkButton, { backgroundColor: colors.error }]}
              >
                <Text style={styles.bulkButtonText}>✕ Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Select All */}
        <TouchableOpacity
          onPress={handleSelectAll}
          style={styles.selectAllButton}
        >
          <View
            style={[
              styles.selectAllCheckbox,
              {
                backgroundColor:
                  selectedDisputes.length === filteredDisputes.length
                    ? colors.primary
                    : "transparent",
                borderColor: colors.border,
              },
            ]}
          >
            {selectedDisputes.length === filteredDisputes.length && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>
          <Text style={[styles.selectAllText, { color: colors.foreground }]}>
            Select All ({filteredDisputes.length})
          </Text>
        </TouchableOpacity>

        {/* Disputes List */}
        {filteredDisputes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              No disputes found.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredDisputes}
            renderItem={renderDisputeRow}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        {/* Export Button */}
        <TouchableOpacity
          onPress={handleExportData}
          style={[
            styles.exportButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.exportButtonText, { color: colors.primary }]}>
            📥 Export as CSV
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 16,
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
  searchInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  filters: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
  },
  bulkActionsBar: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bulkText: {
    fontSize: 13,
    fontWeight: "600",
  },
  bulkButtons: {
    flexDirection: "row",
    gap: 8,
  },
  bulkButton: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bulkButtonText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
  selectAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  selectAllCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  checkbox: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxInner: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  disputeRow: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 10,
  },
  rowContent: {
    flex: 1,
    gap: 6,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  customerName: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  priorityBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
  },
  reason: {
    fontSize: 12,
  },
  rowFooter: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  meta: {
    fontSize: 11,
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  separator: {
    height: 8,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
  },
  exportButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
