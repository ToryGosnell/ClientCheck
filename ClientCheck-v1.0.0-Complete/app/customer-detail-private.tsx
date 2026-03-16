import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

interface CustomerData {
  id: number;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  email?: string;
  city: string;
  state: string;
  zip: string;
  overallRating: number;
  reviewCount: number;
  riskLevel: string;
  createdByUserId: number;
}

export default function CustomerDetailPrivateScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [canViewSensitive, setCanViewSensitive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCustomerData();
  }, [customerId]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customers/${customerId}`);

      if (response.ok) {
        const data = await response.json();
        setCustomer(data);

        // Check if user can view sensitive data
        const isAdmin = (user as any)?.role === "admin";
        const isCreator = user?.id === data.createdByUserId;
        setCanViewSensitive(isAdmin || isCreator);
      } else if (response.status === 403) {
        // Unauthorized - show public view only
        setCanViewSensitive(false);
      }
    } catch (error) {
      console.error("Fetch customer error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPhone = async () => {
    if (!customer?.phone) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Clipboard.setStringAsync(customer.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Copy error:", error);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high":
        return colors.error;
      case "medium":
        return colors.warning;
      case "low":
        return colors.success;
      default:
        return colors.muted;
    }
  };

  if (loading) {
    return (
      <ScreenContainer edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!customer) {
    return (
      <ScreenContainer edges={["top", "left", "right"]}>
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            Customer not found
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { borderColor: colors.primary }]}
          >
            <Text style={[styles.backButtonText, { color: colors.primary }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backBtn, { color: colors.primary }]}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Customer Details</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Customer Name Card */}
        <View
          style={[
            styles.nameCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.nameText, { color: colors.foreground }]}>
            {customer.firstName} {customer.lastName}
          </Text>
          <View
            style={[
              styles.riskBadge,
              { backgroundColor: getRiskColor(customer.riskLevel) + "20" },
            ]}
          >
            <Text
              style={[
                styles.riskBadgeText,
                { color: getRiskColor(customer.riskLevel) },
              ]}
            >
              {customer.riskLevel.toUpperCase()} RISK
            </Text>
          </View>
        </View>

        {/* Public Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Public Information
          </Text>

          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Location</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {customer.city}, {customer.state} {customer.zip}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>
                Overall Rating
              </Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {customer.overallRating} / 5.0
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.muted }]}>Reviews</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {customer.reviewCount} review{customer.reviewCount !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        </View>

        {/* Sensitive Information (Admin/Creator Only) */}
        {canViewSensitive && (
          <View style={styles.section}>
            <View style={styles.sensitiveHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Sensitive Information
              </Text>
              <Text style={[styles.sensitiveLabel, { color: colors.warning }]}>
                🔒 Private
              </Text>
            </View>

            <View
              style={[
                styles.sensitiveCard,
                {
                  backgroundColor: colors.warning + "10",
                  borderColor: colors.warning,
                },
              ]}
            >
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Phone</Text>
                <View style={styles.phoneRow}>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>
                    {customer.phone}
                  </Text>
                  <TouchableOpacity
                    onPress={handleCopyPhone}
                    style={[
                      styles.copyButton,
                      { backgroundColor: colors.primary + "20" },
                    ]}
                  >
                    <Text style={[styles.copyButtonText, { color: colors.primary }]}>
                      {copied ? "✓" : "Copy"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Address</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>
                  {customer.address}
                </Text>
              </View>

              {customer.email && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.muted }]}>
                      Email
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.foreground }]}>
                      {customer.email}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Privacy Notice */}
            <View
              style={[
                styles.privacyNotice,
                {
                  backgroundColor: colors.warning + "10",
                  borderColor: colors.warning,
                },
              ]}
            >
              <Text style={styles.privacyIcon}>🔒</Text>
              <Text style={[styles.privacyText, { color: colors.foreground }]}>
                This information is only visible to you and admins. It's used for
                internal matching only and never displayed publicly.
              </Text>
            </View>
          </View>
        )}

        {/* No Access Message */}
        {!canViewSensitive && (
          <View
            style={[
              styles.noAccessCard,
              { backgroundColor: colors.error + "10", borderColor: colors.error },
            ]}
          >
            <Text style={styles.noAccessIcon}>🔐</Text>
            <Text style={[styles.noAccessTitle, { color: colors.error }]}>
              Private Information
            </Text>
            <Text style={[styles.noAccessText, { color: colors.muted }]}>
              Phone and address are only visible to the contractor who entered this
              customer and to admins.
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  backButton: {
    borderRadius: 8,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backBtn: {
    fontSize: 18,
    fontWeight: "600",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  nameCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nameText: {
    fontSize: 20,
    fontWeight: "700",
  },
  riskBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  riskBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sensitiveHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sensitiveLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sensitiveCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    gap: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  copyButton: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  divider: {
    height: 1,
  },
  privacyNotice: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  privacyIcon: {
    fontSize: 20,
  },
  privacyText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  noAccessCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  noAccessIcon: {
    fontSize: 40,
  },
  noAccessTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  noAccessText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
});
