import React, { useState } from "react";
import { ScrollView, Text, View, Pressable, TextInput } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";
import { CustomerIdentityVerifiedBadge } from "@/components/customer-identity-verified-badge";

interface RiskEvent {
  date: string;
  type: "payment_delay" | "scope_creep" | "dispute" | "negative_review";
  description: string;
  severity: "low" | "medium" | "high";
}

export default function CustomerIntelligenceScreen() {
  const colors = useColors();
  const params = useLocalSearchParams();
  const customerId = params.id ? parseInt(params.id as string) : null;
  const [selectedTab, setSelectedTab] = useState<"timeline" | "patterns" | "alerts">("timeline");

  // Get customer data
  const { data: customer } = trpc.customers.getById.useQuery(
    { id: customerId || 0 },
    { enabled: !!customerId }
  );

  const { data: reviewsData } = trpc.reviews.getForCustomer.useQuery(
    { customerId: customerId || 0 },
    { enabled: !!customerId }
  );
  const reviews = reviewsData?.reviews ?? [];

  // Mock risk timeline
  const riskTimeline: RiskEvent[] = [
    {
      date: "2024-03-10",
      type: "negative_review",
      description: "Contractor reported scope creep on kitchen renovation",
      severity: "high",
    },
    {
      date: "2024-03-05",
      type: "payment_delay",
      description: "Payment received 10 days late",
      severity: "medium",
    },
    {
      date: "2024-02-28",
      type: "scope_creep",
      description: "Added $5K in extras without approval",
      severity: "high",
    },
    {
      date: "2024-02-15",
      type: "dispute",
      description: "Customer disputed invoice amount",
      severity: "medium",
    },
  ];

  const getSeverityColor = (severity: string) => {
    if (severity === "high") return "#DC2626";
    if (severity === "medium") return "#EAB308";
    return colors.success;
  };

  const getEventIcon = (type: string) => {
    if (type === "payment_delay") return "💰";
    if (type === "scope_creep") return "📈";
    if (type === "dispute") return "⚖️";
    return "⚠️";
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-4">
          {/* Header */}
          <View>
            <Text className="text-3xl font-bold text-foreground">Customer Intelligence</Text>
            {customer && (
              <View className="flex-row items-center gap-2 flex-wrap mt-1">
                <Text className="text-sm text-muted">
                  {customer.firstName} {customer.lastName}
                </Text>
                {(customer as { identityVerified?: boolean }).identityVerified ? (
                  <CustomerIdentityVerifiedBadge size="sm" />
                ) : null}
              </View>
            )}
          </View>

          {/* Quick Stats */}
          {customer && (
            <View className="flex-row gap-2">
              <View
                className="flex-1 rounded-lg p-3"
                style={{ backgroundColor: colors.surface }}
              >
                <Text className="text-xs text-muted">Avg Payment Time</Text>
                <Text className="text-lg font-bold text-foreground mt-1">12 days</Text>
              </View>
              <View
                className="flex-1 rounded-lg p-3"
                style={{ backgroundColor: colors.surface }}
              >
                <Text className="text-xs text-muted">Risk Events</Text>
                <Text className="text-lg font-bold text-foreground mt-1">4</Text>
              </View>
              <View
                className="flex-1 rounded-lg p-3"
                style={{ backgroundColor: colors.surface }}
              >
                <Text className="text-xs text-muted">Contractors</Text>
                <Text className="text-lg font-bold text-foreground mt-1">
                  {reviews.length || 0}
                </Text>
              </View>
            </View>
          )}

          {/* Tab Navigation */}
          <View className="flex-row gap-2 border-b" style={{ borderBottomColor: colors.border }}>
            {(["timeline", "patterns", "alerts"] as const).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setSelectedTab(tab)}
                style={{
                  paddingBottom: 12,
                  borderBottomWidth: selectedTab === tab ? 2 : 0,
                  borderBottomColor: selectedTab === tab ? colors.primary : "transparent",
                }}
              >
                <Text
                  style={{
                    color: selectedTab === tab ? colors.primary : colors.muted,
                    fontWeight: selectedTab === tab ? "bold" : "normal",
                    textTransform: "capitalize",
                  }}
                >
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Timeline Tab */}
          {selectedTab === "timeline" && (
            <View className="gap-3">
              <Text className="text-sm font-bold text-foreground">Risk Timeline</Text>
              {riskTimeline.map((event, index) => (
                <View
                  key={index}
                  className="rounded-lg p-3 flex-row gap-3"
                  style={{ backgroundColor: colors.surface }}
                >
                  <Text className="text-2xl">{getEventIcon(event.type)}</Text>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="font-bold text-foreground text-capitalize">
                        {event.type.replace(/_/g, " ")}
                      </Text>
                      <View
                        className="rounded-full px-2 py-1"
                        style={{ backgroundColor: getSeverityColor(event.severity) }}
                      >
                        <Text
                          className="text-xs font-bold"
                          style={{
                            color: event.severity === "high" ? "#fff" : "#000",
                          }}
                        >
                          {event.severity.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs text-muted mt-1">{event.description}</Text>
                    <Text className="text-xs text-muted mt-1">{event.date}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Patterns Tab */}
          {selectedTab === "patterns" && (
            <View className="gap-3">
              <Text className="text-sm font-bold text-foreground">Payment Patterns</Text>
              <View className="rounded-lg p-4" style={{ backgroundColor: colors.surface }}>
                <View className="gap-3">
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">Average Payment Time</Text>
                    <Text className="font-bold text-foreground">12 days</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">Longest Delay</Text>
                    <Text className="font-bold text-foreground">25 days</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">On-Time Payments</Text>
                    <Text className="font-bold text-success">60%</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-muted">Disputed Invoices</Text>
                    <Text className="font-bold text-error">2</Text>
                  </View>
                </View>
              </View>

              <Text className="text-sm font-bold text-foreground mt-3">Scope Creep Risk</Text>
              <View className="rounded-lg p-4" style={{ backgroundColor: colors.surface }}>
                <Text className="text-2xl font-bold text-error">HIGH RISK</Text>
                <Text className="text-xs text-muted mt-2">
                  3 out of 4 projects had scope changes. Average additional cost: $2,500
                </Text>
              </View>
            </View>
          )}

          {/* Alerts Tab */}
          {selectedTab === "alerts" && (
            <View className="gap-3">
              <Text className="text-sm font-bold text-foreground">Custom Alerts</Text>
              <Text className="text-sm text-muted mb-2">
                Get notified when this customer appears in new reviews
              </Text>

              <View className="gap-2">
                <Pressable
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View
                    className="rounded-lg p-3 flex-row items-center justify-between"
                    style={{ backgroundColor: colors.surface }}
                  >
                    <View className="flex-1">
                      <Text className="font-bold text-foreground">Multiple Red Flags</Text>
                      <Text className="text-xs text-muted mt-1">Alert when 3+ flags appear</Text>
                    </View>
                    <View
                      className="w-6 h-6 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <Text className="text-white font-bold">✓</Text>
                    </View>
                  </View>
                </Pressable>

                <Pressable
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View
                    className="rounded-lg p-3 flex-row items-center justify-between"
                    style={{ backgroundColor: colors.surface }}
                  >
                    <View className="flex-1">
                      <Text className="font-bold text-foreground">Payment Delays</Text>
                      <Text className="text-xs text-muted mt-1">Alert on late payments</Text>
                    </View>
                    <View
                      className="w-6 h-6 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }}
                    >
                      <Text className="text-foreground font-bold"></Text>
                    </View>
                  </View>
                </Pressable>

                <Pressable
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View
                    className="rounded-lg p-3 flex-row items-center justify-between"
                    style={{ backgroundColor: colors.surface }}
                  >
                    <View className="flex-1">
                      <Text className="font-bold text-foreground">Dispute Activity</Text>
                      <Text className="text-xs text-muted mt-1">Alert on new disputes</Text>
                    </View>
                    <View
                      className="w-6 h-6 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <Text className="text-white font-bold">✓</Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
