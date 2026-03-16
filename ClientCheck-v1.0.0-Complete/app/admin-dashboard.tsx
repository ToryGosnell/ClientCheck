import React, { useState } from "react";
import { ScrollView, View, Text, Pressable, FlatList } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

interface AdminStats {
  totalReviews: number;
  pendingReviews: number;
  flaggedReviews: number;
  disputes: number;
  activeUsers: number;
  revenue: number;
}

interface PendingReview {
  id: string;
  contractorName: string;
  customerName: string;
  rating: number;
  riskScore: number;
  flags: string[];
  createdAt: number;
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [stats] = useState<AdminStats>({
    totalReviews: 1247,
    pendingReviews: 23,
    flaggedReviews: 8,
    disputes: 5,
    activeUsers: 342,
    revenue: 3421.5,
  });
  const [pendingReviews] = useState<PendingReview[]>([
    {
      id: "1",
      contractorName: "John Smith",
      customerName: "Jane Doe",
      rating: 1,
      riskScore: 78,
      flags: ["Revenge review pattern", "Extremely low rating"],
      createdAt: Date.now() - 1000 * 60 * 30,
    },
    {
      id: "2",
      contractorName: "Mike Johnson",
      customerName: "Bob Wilson",
      rating: 5,
      riskScore: 45,
      flags: ["Suspicious rating pattern"],
      createdAt: Date.now() - 1000 * 60 * 60,
    },
  ]);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return "bg-red-600";
    if (score >= 50) return "bg-amber-600";
    return "bg-yellow-600";
  };

  const getRiskEmoji = (score: number) => {
    if (score >= 70) return "🚨";
    if (score >= 50) return "⚠️";
    return "⚡";
  };

  const StatCard = ({ label, value, color }: { label: string; value: string | number; color?: string }) => (
    <View className={`flex-1 ${color || "bg-surface"} border border-border rounded-lg p-4 gap-1`}>
      <Text className="text-xs text-muted">{label}</Text>
      <Text className="text-2xl font-bold text-foreground">{value}</Text>
    </View>
  );

  const ReviewCard = ({ review }: { review: PendingReview }) => (
    <Pressable
      onPress={() => {
        handlePress();
      }}
      className="bg-surface border border-border rounded-lg p-4 mb-3"
    >
      <View className="gap-3">
        <View className="flex-row justify-between items-start gap-2">
          <View className="flex-1 gap-1">
            <Text className="text-sm font-bold text-foreground">{review.contractorName}</Text>
            <Text className="text-xs text-muted">about {review.customerName}</Text>
          </View>
          <View className={`${getRiskColor(review.riskScore)} px-3 py-1 rounded-full`}>
            <Text className="text-white font-bold text-xs">
              {getRiskEmoji(review.riskScore)} {review.riskScore}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-semibold text-foreground">Rating:</Text>
          <Text className="text-sm">{"⭐".repeat(review.rating)}</Text>
        </View>

        <View className="gap-1">
          {review.flags.map((flag, idx) => (
            <Text key={idx} className="text-xs text-amber-300">
              • {flag}
            </Text>
          ))}
        </View>

        <Text className="text-xs text-muted">
          {Math.floor((Date.now() - review.createdAt) / 1000 / 60)} minutes ago
        </Text>
      </View>
    </Pressable>
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 gap-6 px-6 py-8">
          {/* Header */}
          <View className="flex-row justify-between items-start gap-2">
            <View className="flex-1 gap-1">
              <Text className="text-3xl font-bold text-foreground">Admin Dashboard</Text>
              <Text className="text-sm text-muted">Moderation & Platform Overview</Text>
            </View>
            <Pressable
              onPress={() => {
                handlePress();
                router.push("/");
              }}
              className="bg-surface border border-border rounded-lg p-2"
            >
              <Text className="text-lg">👤</Text>
            </Pressable>
          </View>

          {/* Stats Grid */}
          <View className="gap-3">
            <View className="flex-row gap-3">
              <StatCard label="Total Reviews" value={stats.totalReviews} color="bg-blue-900/20" />
              <StatCard label="Pending" value={stats.pendingReviews} color="bg-amber-900/20" />
            </View>
            <View className="flex-row gap-3">
              <StatCard label="Flagged" value={stats.flaggedReviews} color="bg-red-900/20" />
              <StatCard label="Disputes" value={stats.disputes} color="bg-orange-900/20" />
            </View>
            <View className="flex-row gap-3">
              <StatCard label="Active Users" value={stats.activeUsers} color="bg-green-900/20" />
              <StatCard label="Revenue" value={`$${stats.revenue.toFixed(2)}`} color="bg-purple-900/20" />
            </View>
          </View>

          {/* Quick Actions */}
          <View className="gap-2">
            <Text className="text-lg font-bold text-foreground">Quick Actions</Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => {
                  handlePress();
                }}
                className="flex-1 bg-primary rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">👥 Users</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  handlePress();
                }}
                className="flex-1 bg-primary rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">📊 Analytics</Text>
              </Pressable>
            </View>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => {
                  handlePress();
                }}
                className="flex-1 bg-primary rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">⚙️ Settings</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  handlePress();
                  router.push("/");
                }}
                className="flex-1 bg-surface border border-border rounded-lg py-3 items-center"
              >
                <Text className="text-foreground font-semibold">🚪 Logout</Text>
              </Pressable>
            </View>
          </View>

          {/* Pending Reviews */}
          <View className="gap-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-lg font-bold text-foreground">Pending Moderation</Text>
              <Pressable
                onPress={() => {
                  handlePress();
                }}
              >
                <Text className="text-primary font-semibold text-sm">View All →</Text>
              </Pressable>
            </View>

            {pendingReviews.length > 0 ? (
              <FlatList
                data={pendingReviews}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ReviewCard review={item} />}
                scrollEnabled={false}
              />
            ) : (
              <View className="bg-surface border border-border rounded-lg p-6 items-center gap-2">
                <Text className="text-3xl">✅</Text>
                <Text className="text-sm font-semibold text-foreground">All caught up!</Text>
                <Text className="text-xs text-muted">No pending reviews to moderate</Text>
              </View>
            )}
          </View>

          {/* Recent Activity */}
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Recent Activity</Text>
            <View className="bg-surface border border-border rounded-lg p-4 gap-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-foreground">23 reviews submitted today</Text>
                <Text className="text-xs text-muted">Today</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-foreground">5 disputes filed</Text>
                <Text className="text-xs text-muted">Today</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-foreground">$342.50 in payments</Text>
                <Text className="text-xs text-muted">Today</Text>
              </View>
            </View>
          </View>

          {/* System Status */}
          <View className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 gap-2">
            <Text className="text-sm font-bold text-green-300">✅ System Status: All Systems Operational</Text>
            <Text className="text-xs text-green-200">Database: Healthy | API: Responsive | Emails: Sending</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
