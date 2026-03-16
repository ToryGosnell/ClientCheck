import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

interface Achievement {
  id: number;
  type: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

const ACHIEVEMENT_DEFINITIONS: Record<string, Achievement> = {
  REVIEWS_10: {
    id: 1,
    type: "REVIEWS_10",
    title: "First 10 Reviews",
    description: "Submit 10 reviews to help the community",
    icon: "📝",
    maxProgress: 10,
  },
  REVIEWS_50: {
    id: 2,
    type: "REVIEWS_50",
    title: "Prolific Vetter",
    description: "Submit 50 reviews and become a trusted vetter",
    icon: "⭐",
    maxProgress: 50,
  },
  REVIEWS_100: {
    id: 3,
    type: "REVIEWS_100",
    title: "Master Vetter",
    description: "Submit 100 reviews - you're an expert!",
    icon: "👑",
    maxProgress: 100,
  },
  TOP_VETTER: {
    id: 4,
    type: "TOP_VETTER",
    title: "Top Vetter",
    description: "Ranked in the top 10 contractors by review count",
    icon: "🏆",
  },
  PAYMENT_DETECTIVE: {
    id: 5,
    type: "PAYMENT_DETECTIVE",
    title: "Payment Detective",
    description: "Identify payment patterns in 10+ customers",
    icon: "🔍",
    maxProgress: 10,
  },
  RED_FLAG_SPOTTER: {
    id: 6,
    type: "RED_FLAG_SPOTTER",
    title: "Red Flag Spotter",
    description: "Flag 20+ red flags across your reviews",
    icon: "🚩",
    maxProgress: 20,
  },
  STREAK_7: {
    id: 7,
    type: "STREAK_7",
    title: "Week Warrior",
    description: "Submit reviews for 7 days in a row",
    icon: "🔥",
  },
  STREAK_30: {
    id: 8,
    type: "STREAK_30",
    title: "Monthly Master",
    description: "Submit reviews for 30 days in a row",
    icon: "⚡",
  },
};

export default function AchievementsScreen() {
  const colors = useColors();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [streak, setStreak] = useState(0);

  // Get user's reviews
  const { data: myReviews } = trpc.reviews.getMyReviews.useQuery();

  useEffect(() => {
    if (myReviews) {
      setReviewCount(myReviews.length);

      // Calculate achievements
      const unlockedAchievements: Achievement[] = [];

      if (myReviews.length >= 10) {
        unlockedAchievements.push({
          ...ACHIEVEMENT_DEFINITIONS.REVIEWS_10,
          unlockedAt: new Date(),
        });
      }

      if (myReviews.length >= 50) {
        unlockedAchievements.push({
          ...ACHIEVEMENT_DEFINITIONS.REVIEWS_50,
          unlockedAt: new Date(),
        });
      }

      if (myReviews.length >= 100) {
        unlockedAchievements.push({
          ...ACHIEVEMENT_DEFINITIONS.REVIEWS_100,
          unlockedAt: new Date(),
        });
      }

      // Count red flags
      const redFlagCount = myReviews.reduce((sum, review) => {
        const flags = review.redFlags ? review.redFlags.split(",").length : 0;
        return sum + flags;
      }, 0);

      if (redFlagCount >= 20) {
        unlockedAchievements.push({
          ...ACHIEVEMENT_DEFINITIONS.RED_FLAG_SPOTTER,
          unlockedAt: new Date(),
        });
      }

      setAchievements(unlockedAchievements);
    }
  }, [myReviews]);

  const lockedAchievements = Object.values(ACHIEVEMENT_DEFINITIONS).filter(
    (a) => !achievements.find((ua) => ua.type === a.type)
  );

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-6">
          {/* Header */}
          <View>
            <Text className="text-3xl font-bold text-foreground">Achievements</Text>
            <Text className="text-sm text-muted mt-1">
              Unlock badges by contributing to the community
            </Text>
          </View>

          {/* Stats */}
          <View className="flex-row gap-3">
            <View
              className="flex-1 rounded-lg p-4"
              style={{ backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }}
            >
              <Text className="text-2xl font-bold text-foreground">{reviewCount}</Text>
              <Text className="text-xs text-muted mt-1">Reviews Submitted</Text>
            </View>

            <View
              className="flex-1 rounded-lg p-4"
              style={{ backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }}
            >
              <Text className="text-2xl font-bold text-foreground">{achievements.length}</Text>
              <Text className="text-xs text-muted mt-1">Badges Unlocked</Text>
            </View>

            <View
              className="flex-1 rounded-lg p-4"
              style={{ backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }}
            >
              <Text className="text-2xl font-bold text-foreground">{streak}</Text>
              <Text className="text-xs text-muted mt-1">Day Streak</Text>
            </View>
          </View>

          {/* Unlocked Achievements */}
          {achievements.length > 0 && (
            <View className="gap-3">
              <Text className="text-lg font-bold text-foreground">Unlocked</Text>
              {achievements.map((achievement) => (
                <View
                  key={achievement.id}
                  className="rounded-lg p-4 flex-row items-center gap-3"
                  style={{ backgroundColor: colors.surface }}
                >
                  <Text className="text-4xl">{achievement.icon}</Text>
                  <View className="flex-1">
                    <Text className="font-bold text-foreground">{achievement.title}</Text>
                    <Text className="text-xs text-muted mt-1">{achievement.description}</Text>
                  </View>
                  <Text className="text-xs font-bold text-success">✓</Text>
                </View>
              ))}
            </View>
          )}

          {/* Locked Achievements */}
          {lockedAchievements.length > 0 && (
            <View className="gap-3">
              <Text className="text-lg font-bold text-foreground">Locked</Text>
              {lockedAchievements.map((achievement) => {
                const progress = achievement.maxProgress
                  ? Math.min(reviewCount, achievement.maxProgress)
                  : 0;
                const progressPercent = achievement.maxProgress
                  ? (progress / achievement.maxProgress) * 100
                  : 0;

                return (
                  <View
                    key={achievement.id}
                    className="rounded-lg p-4 flex-row items-center gap-3"
                    style={{ backgroundColor: colors.surface, opacity: 0.6 }}
                  >
                    <Text className="text-4xl opacity-50">{achievement.icon}</Text>
                    <View className="flex-1">
                      <Text className="font-bold text-foreground">{achievement.title}</Text>
                      <Text className="text-xs text-muted mt-1">{achievement.description}</Text>
                      {achievement.maxProgress && (
                        <View className="mt-2 h-1 rounded-full" style={{ backgroundColor: colors.border }}>
                          <View
                            className="h-1 rounded-full"
                            style={{
                              backgroundColor: colors.primary,
                              width: `${progressPercent}%`,
                            }}
                          />
                        </View>
                      )}
                      {achievement.maxProgress && (
                        <Text className="text-xs text-muted mt-1">
                          {progress} / {achievement.maxProgress}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Referral Section */}
          <View className="rounded-lg p-4 gap-3" style={{ backgroundColor: colors.surface }}>
            <Text className="font-bold text-foreground">Invite & Earn</Text>
            <Text className="text-sm text-muted">
              Invite 5 contractors to unlock premium features free for a month
            </Text>
            <Pressable
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                paddingVertical: 12,
                borderRadius: 8,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text className="text-center font-bold text-white">Share Referral Code</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
