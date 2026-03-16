import React from "react";
import { View, Text } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface SafeToWorkChecklistProps {
  paymentHistory: "always" | "usually" | "reminders" | "late" | "disputes";
  scopeCreepRisk: number; // 0-100, percentage of reviews mentioning scope creep
  communicationRating: number; // 0-5
  activeDisputes: number;
  clientScore: number; // 0-100
}

export function SafeToWorkChecklist({
  paymentHistory,
  scopeCreepRisk,
  communicationRating,
  activeDisputes,
  clientScore,
}: SafeToWorkChecklistProps) {
  const colors = useColors();

  const checks: { label: string; status: "pass" | "caution" | "fail"; details: string }[] = [
    {
      label: "Payment History",
      status:
        paymentHistory === "always" || paymentHistory === "usually"
          ? ("pass" as const)
          : paymentHistory === "reminders"
            ? ("caution" as const)
            : ("fail" as const),
      details:
        paymentHistory === "always"
          ? "Always pays on time"
          : paymentHistory === "usually"
            ? "Usually pays on time"
            : paymentHistory === "reminders"
              ? "Pays with reminders"
              : paymentHistory === "late"
                ? "Frequently late"
                : "Payment disputes",
    },
    {
      label: "Scope Creep Risk",
      status: scopeCreepRisk < 20 ? ("pass" as const) : scopeCreepRisk < 50 ? ("caution" as const) : ("fail" as const),
      details: `${scopeCreepRisk}% of reviews mention scope changes`,
    },
    {
      label: "Communication",
      status:
        communicationRating >= 4
          ? ("pass" as const)
          : communicationRating >= 3
            ? ("caution" as const)
            : ("fail" as const),
      details: `${communicationRating.toFixed(1)}/5 rating`,
    },
    {
      label: "Active Disputes",
      status: activeDisputes === 0 ? ("pass" as const) : activeDisputes <= 2 ? ("caution" as const) : ("fail" as const),
      details:
        activeDisputes === 0
          ? "No active disputes"
          : `${activeDisputes} active dispute${activeDisputes !== 1 ? "s" : ""}`,
    },
  ];

  const CheckItem = ({
    label,
    status,
    details,
  }: {
    label: string;
    status: "pass" | "caution" | "fail";
    details: string;
  }) => {
    const statusConfig = {
      pass: { icon: "✓", color: "bg-success", textColor: "text-success" },
      caution: { icon: "⚠", color: "bg-warning", textColor: "text-warning" },
      fail: { icon: "✗", color: "bg-error", textColor: "text-error" },
    };

    const config = statusConfig[status];

    return (
      <View className="flex-row items-center gap-3 mb-3 p-3 bg-surface rounded-lg">
        <View className={`w-8 h-8 rounded-full ${config.color} items-center justify-center`}>
          <Text className={`text-lg font-bold text-background`}>{config.icon}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground">{label}</Text>
          <Text className={`text-xs ${config.textColor}`}>{details}</Text>
        </View>
      </View>
    );
  };

  const overallStatus: "pass" | "caution" | "fail" =
    clientScore >= 70
      ? "pass"
      : clientScore >= 40
        ? "caution"
        : "fail"

  const overallMessage =
    clientScore >= 70
      ? "Safe to work with this customer"
      : clientScore >= 40
        ? "Proceed with caution"
        : "Not recommended for service";

  return (
    <View className="bg-surface rounded-2xl p-6 mb-6">
      <Text className="text-lg font-bold text-foreground mb-4">
        Safe-to-Work Checklist
      </Text>

      {/* Overall recommendation */}
      <View
        className={`p-4 rounded-lg mb-6 ${
          overallStatus === "pass"
            ? "bg-success bg-opacity-20"
            : overallStatus === "caution"
              ? "bg-warning bg-opacity-20"
              : "bg-error bg-opacity-20"
        }`}
      >
        <Text
          className={`text-base font-bold ${
            overallStatus === "pass"
              ? "text-success"
              : overallStatus === "caution"
                ? "text-warning"
                : "text-error"
          }`}
        >
          {overallMessage}
        </Text>
      </View>

      {/* Individual checks */}
      {checks.map((check) => (
        <CheckItem
          key={check.label}
          label={check.label}
          status={check.status}
          details={check.details}
        />
      ))}

      {/* Summary */}
      <View className="mt-6 pt-6 border-t border-border">
        <Text className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
          Client Score
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="flex-1 h-2 bg-background rounded-full overflow-hidden">
            <View
              className={`h-full rounded-full ${
                clientScore >= 70
                  ? "bg-success"
                  : clientScore >= 40
                    ? "bg-warning"
                    : "bg-error"
              }`}
              style={{ width: `${clientScore}%` }}
            />
          </View>
          <Text className="text-sm font-bold text-foreground">{clientScore}/100</Text>
        </View>
      </View>
    </View>
  );
}
