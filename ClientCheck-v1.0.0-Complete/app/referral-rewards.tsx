import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Share } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

export default function ReferralRewardsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const [referralLink, setReferralLink] = useState("");
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    completedReferrals: 0,
    premiumMonthsEarned: 0,
    referralsNeeded: 3,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const response = await fetch(`/api/referrals/status?userId=${user?.id}`);
      if (response.ok) {
        const data = await response.json();
        setReferralStats(data);
        setReferralLink(`https://app.contractorvet.com?ref=${data.referralCode}`);
      }
    } catch (error) {
      console.error("Fetch referral data error:", error);
    }
  };

  const handleCopyLink = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Clipboard.setStringAsync(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Copy error:", error);
    }
  };

  const handleShareLink = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: `Join ClientCheck and get 1 month free premium! ${referralLink}`,
        title: "Join ClientCheck",
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const progressPercent = (referralStats.completedReferrals / 3) * 100;
  const isUnlocked = referralStats.completedReferrals >= 3;

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backBtn, { color: colors.primary }]}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Refer & Earn</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🎁</Text>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            Invite Friends, Earn Free Premium
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
            Refer 3 contractors and unlock 1 month of premium features free
          </Text>
        </View>

        {/* Progress Card */}
        <View
          style={[
            styles.progressCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: colors.foreground }]}>
              Your Progress
            </Text>
            <Text style={[styles.progressBadge, { color: colors.primary }]}>
              {referralStats.completedReferrals}/3
            </Text>
          </View>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: isUnlocked ? colors.success : colors.primary,
                  width: `${Math.min(progressPercent, 100)}%`,
                },
              ]}
            />
          </View>

          <Text style={[styles.progressText, { color: colors.muted }]}>
            {isUnlocked
              ? "🎉 You've unlocked 1 month free premium!"
              : `${referralStats.referralsNeeded} more referrals to unlock`}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={styles.statEmoji}>👥</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {referralStats.totalReferrals}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Invited</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={styles.statEmoji}>✅</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {referralStats.completedReferrals}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Signed Up</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {referralStats.premiumMonthsEarned}
            </Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Months Earned</Text>
          </View>
        </View>

        {/* Share Section */}
        <View style={styles.shareSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Share Your Link
          </Text>

          <View
            style={[
              styles.linkBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.linkText, { color: colors.muted }]} numberOfLines={1}>
              {referralLink}
            </Text>
            <TouchableOpacity
              onPress={handleCopyLink}
              style={[
                styles.copyButton,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <Text style={[styles.copyButtonText, { color: colors.primary }]}>
                {copied ? "✓ Copied" : "Copy"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleShareLink}
            style={[styles.shareButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.shareButtonIcon}>📤</Text>
            <Text style={styles.shareButtonText}>Share with Friends</Text>
          </TouchableOpacity>
        </View>

        {/* How It Works */}
        <View style={styles.howItWorks}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            How It Works
          </Text>

          <View style={styles.stepsList}>
            <View style={styles.step}>
              <View
                style={[
                  styles.stepNumber,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                  Share Your Link
                </Text>
                <Text style={[styles.stepDesc, { color: colors.muted }]}>
                  Send your referral link to contractors you know
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View
                style={[
                  styles.stepNumber,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                  They Sign Up
                </Text>
                <Text style={[styles.stepDesc, { color: colors.muted }]}>
                  Your friend creates an account using your link
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View
                style={[
                  styles.stepNumber,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                  You Both Win
                </Text>
                <Text style={[styles.stepDesc, { color: colors.muted }]}>
                  Earn 1 month free premium for every 3 referrals
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Info Box */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: colors.primary + "10", borderColor: colors.primary },
          ]}
        >
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            No limits! Refer as many contractors as you want and earn unlimited free premium months.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 100,
    gap: 20,
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
  hero: {
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  heroEmoji: {
    fontSize: 48,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  progressCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  progressBadge: {
    fontSize: 16,
    fontWeight: "700",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "500",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  statEmoji: {
    fontSize: 28,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  shareSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  linkBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  linkText: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  copyButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  shareButton: {
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  shareButtonIcon: {
    fontSize: 18,
  },
  shareButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  howItWorks: {
    gap: 12,
  },
  stepsList: {
    gap: 16,
  },
  step: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  stepDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  infoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  infoIcon: {
    fontSize: 20,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});
