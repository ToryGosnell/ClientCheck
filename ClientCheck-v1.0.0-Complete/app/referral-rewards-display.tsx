import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  FlatList,
} from "react-native";
import { useState, useEffect } from "react";
import * as Clipboard from "expo-clipboard";
import { useColors } from "@/hooks/use-colors";
import { ScreenContainer } from "@/components/screen-container";

interface Referral {
  id: string;
  name: string;
  email: string;
  status: "pending" | "completed";
  date: string;
}

export default function ReferralRewardsScreen() {
  const colors = useColors();
  const [referralLink, setReferralLink] = useState("https://clientcheck.app/signup?ref=12345");
  const [stats, setStats] = useState({
    totalReferrals: 2,
    completedReferrals: 1,
    pendingReferrals: 1,
    freeMonthsEarned: 1,
  });

  const [referrals, setReferrals] = useState<Referral[]>([
    {
      id: "1",
      name: "John Smith",
      email: "john@example.com",
      status: "completed",
      date: "2026-03-10",
    },
    {
      id: "2",
      name: "Jane Doe",
      email: "jane@example.com",
      status: "pending",
      date: "2026-03-12",
    },
  ]);

  const [milestones] = useState([
    { level: "Bronze", referrals: 1, reward: "1 Free Month", icon: "🥉" },
    { level: "Silver", referrals: 3, reward: "1 Free Month", icon: "🥈" },
    { level: "Gold", referrals: 5, reward: "2 Free Months", icon: "🥇" },
  ]);

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(referralLink);
    Alert.alert("✅ Copied", "Referral link copied to clipboard");
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: `Join me on ClientCheck - the contractor's tool to vet customers! ${referralLink}`,
        title: "Join ClientCheck",
      });
    } catch (error) {
      Alert.alert("Error", "Failed to share");
    }
  };

  const renderMilestone = ({ item }: { item: (typeof milestones)[0] }) => (
    <View
      style={[
        styles.milestone,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={styles.milestoneIcon}>{item.icon}</Text>
      <View style={styles.milestoneContent}>
        <Text style={[styles.milestoneLevel, { color: colors.foreground }]}>
          {item.level}
        </Text>
        <Text style={[styles.milestoneDetail, { color: colors.muted }]}>
          {item.referrals} referrals
        </Text>
      </View>
      <Text style={[styles.milestoneReward, { color: colors.primary }]}>
        {item.reward}
      </Text>
    </View>
  );

  const renderReferral = ({ item }: { item: Referral }) => (
    <View
      style={[
        styles.referralCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.referralHeader}>
        <View>
          <Text style={[styles.referralName, { color: colors.foreground }]}>
            {item.name}
          </Text>
          <Text style={[styles.referralEmail, { color: colors.muted }]}>
            {item.email}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === "completed" ? "#10b981" : "#f59e0b",
            },
          ]}
        >
          <Text style={styles.statusText}>
            {item.status === "completed" ? "✓ Joined" : "⏳ Pending"}
          </Text>
        </View>
      </View>
      <Text style={[styles.referralDate, { color: colors.muted }]}>
        {item.date}
      </Text>
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Referral Rewards
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Invite contractors and earn free months
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {stats.totalReferrals}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              Total Referrals
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {stats.completedReferrals}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              Completed
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {stats.freeMonthsEarned}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>
              Free Months
            </Text>
          </View>
        </View>

        {/* Referral Link */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Your Referral Link
          </Text>
          <View
            style={[
              styles.linkBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.linkText, { color: colors.foreground }]}>
              {referralLink}
            </Text>
          </View>
          <View style={styles.linkActions}>
            <TouchableOpacity
              onPress={handleCopyLink}
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.actionButtonText}>📋 Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShareLink}
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.primary,
                  opacity: 0.8,
                },
              ]}
            >
              <Text style={styles.actionButtonText}>📤 Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Milestones */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Unlock Rewards
          </Text>
          <FlatList
            data={milestones}
            renderItem={renderMilestone}
            keyExtractor={(item) => item.level}
            scrollEnabled={false}
            contentContainerStyle={styles.milestoneList}
          />
        </View>

        {/* Referrals List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Your Referrals
          </Text>
          {referrals.length > 0 ? (
            <FlatList
              data={referrals}
              renderItem={renderReferral}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.referralList}
            />
          ) : (
            <View
              style={[
                styles.emptyState,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.emptyStateText, { color: colors.muted }]}>
                No referrals yet. Share your link to get started!
              </Text>
            </View>
          )}
        </View>

        {/* Info Box */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: colors.primary + "15", borderColor: colors.primary },
          ]}
        >
          <Text style={[styles.infoText, { color: colors.primary }]}>
            💡 When your referrals sign up and verify their license, you'll automatically unlock free months. No charges during your promo period!
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
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  linkBox: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  linkActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
  },
  actionButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  milestoneList: {
    gap: 10,
  },
  milestone: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  milestoneIcon: {
    fontSize: 24,
  },
  milestoneContent: {
    flex: 1,
    gap: 4,
  },
  milestoneLevel: {
    fontSize: 13,
    fontWeight: "700",
  },
  milestoneDetail: {
    fontSize: 11,
  },
  milestoneReward: {
    fontSize: 12,
    fontWeight: "700",
  },
  referralList: {
    gap: 10,
  },
  referralCard: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  referralHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  referralName: {
    fontSize: 13,
    fontWeight: "700",
  },
  referralEmail: {
    fontSize: 11,
  },
  referralDate: {
    fontSize: 11,
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
  emptyState: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 13,
    textAlign: "center",
  },
  infoBox: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
