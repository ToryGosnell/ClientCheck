import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

interface RiskCheckResult {
  customerId: number;
  firstName: string;
  lastName: string;
  phone: string;
  riskScore: number;
  riskLevel: "critical" | "high" | "medium" | "low";
  paymentReliabilityScore: number;
  communicationScore: number;
  scopeManagementScore: number;
  propertyRespectScore: number;
  missedPayments: number;
  noShows: number;
  disputes: number;
  latePayments: number;
  redFlagCount: number;
  reviewsAnalyzed: number;
}

export default function PreJobRiskCheckScreen() {
  const colors = useColors();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RiskCheckResult | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a customer name or phone number");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      // Search for customer by name or phone
      const searchResponse = await fetch(
        `/api/customers/search?query=${encodeURIComponent(searchQuery)}`
      );

      if (!searchResponse.ok) {
        throw new Error("Customer not found");
      }

      const customers = await searchResponse.json();

      if (customers.length === 0) {
        setError("No customers found matching your search");
        setLoading(false);
        return;
      }

      // Get risk score for first result
      const customer = customers[0];
      const riskResponse = await fetch(`/api/risk-scores/${customer.id}`);

      if (!riskResponse.ok) {
        throw new Error("Failed to fetch risk score");
      }

      const riskData = await riskResponse.json();

      setResult({
        customerId: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        riskScore: riskData.riskScore,
        riskLevel: riskData.riskLevel,
        paymentReliabilityScore: riskData.paymentReliabilityScore,
        communicationScore: riskData.communicationScore,
        scopeManagementScore: riskData.scopeManagementScore,
        propertyRespectScore: riskData.propertyRespectScore,
        missedPayments: riskData.missedPayments,
        noShows: riskData.noShows,
        disputes: riskData.disputes,
        latePayments: riskData.latePayments,
        redFlagCount: riskData.redFlagCount,
        reviewsAnalyzed: riskData.reviewsAnalyzed,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch risk information"
      );
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical":
        return colors.error;
      case "high":
        return "#FF9500";
      case "medium":
        return "#FFCC00";
      case "low":
        return colors.success;
      default:
        return colors.muted;
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case "critical":
        return "🔴 CRITICAL RISK";
      case "high":
        return "🟠 HIGH RISK";
      case "medium":
        return "🟡 MEDIUM RISK";
      case "low":
        return "🟢 LOW RISK";
      default:
        return "UNKNOWN";
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">
              Pre-Job Risk Check
            </Text>
            <Text className="text-base text-muted">
              Evaluate customer reliability before accepting a job
            </Text>
          </View>

          {/* Search Box */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">
              Search Customer
            </Text>
            <TextInput
              placeholder="Enter name or phone number"
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="border border-border rounded-lg p-3 text-foreground"
              style={{ color: colors.foreground }}
            />
            <TouchableOpacity
              onPress={handleSearch}
              disabled={loading}
              className={cn(
                "rounded-lg py-3 px-4 items-center justify-center",
                loading ? "opacity-50" : ""
              )}
              style={{ backgroundColor: colors.primary }}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text className="font-semibold text-background">
                  Check Risk Score
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {error && (
            <View
              className="rounded-lg p-4 border border-error"
              style={{ backgroundColor: colors.error + "20" }}
            >
              <Text className="text-error font-semibold">{error}</Text>
            </View>
          )}

          {/* Risk Score Result */}
          {result && (
            <View className="gap-4">
              {/* Customer Info */}
              <View
                className="rounded-lg p-4 border border-border"
                style={{ backgroundColor: colors.surface }}
              >
                <Text className="text-lg font-bold text-foreground">
                  {result.firstName} {result.lastName}
                </Text>
                <Text className="text-sm text-muted">{result.phone}</Text>
              </View>

              {/* Risk Score Card */}
              <View
                className="rounded-lg p-6 items-center gap-3"
                style={{
                  backgroundColor: getRiskColor(result.riskLevel) + "20",
                  borderColor: getRiskColor(result.riskLevel),
                  borderWidth: 2,
                }}
              >
                <Text
                  className="text-2xl font-bold"
                  style={{ color: getRiskColor(result.riskLevel) }}
                >
                  {result.riskScore}/100
                </Text>
                <Text
                  className="text-lg font-bold"
                  style={{ color: getRiskColor(result.riskLevel) }}
                >
                  {getRiskLabel(result.riskLevel)}
                </Text>
              </View>

              {/* Component Scores */}
              <View className="gap-3">
                <Text className="text-sm font-semibold text-foreground">
                  Category Scores
                </Text>

                {/* Payment Reliability */}
                <View className="gap-1">
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">
                      Payment Reliability
                    </Text>
                    <Text className="text-sm font-semibold text-foreground">
                      {result.paymentReliabilityScore}/100
                    </Text>
                  </View>
                  <View
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: colors.border }}
                  >
                    <View
                      className="h-full"
                      style={{
                        width: `${result.paymentReliabilityScore}%`,
                        backgroundColor: colors.primary,
                      }}
                    />
                  </View>
                </View>

                {/* Communication */}
                <View className="gap-1">
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">Communication</Text>
                    <Text className="text-sm font-semibold text-foreground">
                      {result.communicationScore}/100
                    </Text>
                  </View>
                  <View
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: colors.border }}
                  >
                    <View
                      className="h-full"
                      style={{
                        width: `${result.communicationScore}%`,
                        backgroundColor: colors.primary,
                      }}
                    />
                  </View>
                </View>

                {/* Scope Management */}
                <View className="gap-1">
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">Scope Management</Text>
                    <Text className="text-sm font-semibold text-foreground">
                      {result.scopeManagementScore}/100
                    </Text>
                  </View>
                  <View
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: colors.border }}
                  >
                    <View
                      className="h-full"
                      style={{
                        width: `${result.scopeManagementScore}%`,
                        backgroundColor: colors.primary,
                      }}
                    />
                  </View>
                </View>

                {/* Property Respect */}
                <View className="gap-1">
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">Property Respect</Text>
                    <Text className="text-sm font-semibold text-foreground">
                      {result.propertyRespectScore}/100
                    </Text>
                  </View>
                  <View
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: colors.border }}
                  >
                    <View
                      className="h-full"
                      style={{
                        width: `${result.propertyRespectScore}%`,
                        backgroundColor: colors.primary,
                      }}
                    />
                  </View>
                </View>
              </View>

              {/* Risk Factors */}
              <View className="gap-3">
                <Text className="text-sm font-semibold text-foreground">
                  Risk Factors
                </Text>

                <View className="flex-row flex-wrap gap-2">
                  {result.missedPayments > 0 && (
                    <View
                      className="rounded-full px-3 py-1"
                      style={{ backgroundColor: colors.error + "20" }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: colors.error }}
                      >
                        {result.missedPayments} Missed Payments
                      </Text>
                    </View>
                  )}

                  {result.noShows > 0 && (
                    <View
                      className="rounded-full px-3 py-1"
                      style={{ backgroundColor: colors.error + "20" }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: colors.error }}
                      >
                        {result.noShows} No-Shows
                      </Text>
                    </View>
                  )}

                  {result.disputes > 0 && (
                    <View
                      className="rounded-full px-3 py-1"
                      style={{ backgroundColor: "#FF9500" + "20" }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: "#FF9500" }}
                      >
                        {result.disputes} Disputes
                      </Text>
                    </View>
                  )}

                  {result.latePayments > 0 && (
                    <View
                      className="rounded-full px-3 py-1"
                      style={{ backgroundColor: "#FFCC00" + "20" }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: "#FFCC00" }}
                      >
                        {result.latePayments} Late Payments
                      </Text>
                    </View>
                  )}

                  {result.redFlagCount > 0 && (
                    <View
                      className="rounded-full px-3 py-1"
                      style={{ backgroundColor: colors.warning + "20" }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: colors.warning }}
                      >
                        {result.redFlagCount} Red Flags
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Review Stats */}
              <View
                className="rounded-lg p-4 border border-border"
                style={{ backgroundColor: colors.surface }}
              >
                <Text className="text-sm font-semibold text-foreground mb-2">
                  Review History
                </Text>
                <Text className="text-sm text-muted">
                  {result.reviewsAnalyzed} reviews analyzed
                </Text>
              </View>

              {/* Action Button */}
              <TouchableOpacity
                className="rounded-lg py-3 px-4 items-center justify-center"
                style={{ backgroundColor: colors.primary }}
              >
                <Text className="font-semibold text-background">
                  Accept Job
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Empty State */}
          {!result && !error && !loading && (
            <View className="items-center justify-center py-8 gap-3">
              <Text className="text-lg font-semibold text-muted">
                No customer selected
              </Text>
              <Text className="text-sm text-muted text-center">
                Search for a customer to see their risk profile
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
