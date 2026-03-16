import React, { useState, useEffect } from "react";
import { ScrollView, View, Text, Pressable, Switch, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

interface NotificationPreferences {
  reviewPosted: boolean;
  reviewApproved: boolean;
  reviewRejected: boolean;
  disputeFiled: boolean;
  disputeResolved: boolean;
  weeklySummary: boolean;
  subscriptionExpiring: boolean;
  paymentReceipts: boolean;
  highPriorityReviews: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  reviewPosted: true,
  reviewApproved: true,
  reviewRejected: true,
  disputeFiled: true,
  disputeResolved: true,
  weeklySummary: true,
  subscriptionExpiring: true,
  paymentReceipts: true,
  highPriorityReviews: true,
};

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      // In production, fetch from API
      // const result = await api.get('/user/notification-preferences');
      // setPreferences(result.data);

      // Simulate loading
      await new Promise((resolve) => setTimeout(resolve, 500));
      setPreferences(DEFAULT_PREFERENCES);
    } catch (error) {
      console.error("Failed to load preferences:", error);
      Alert.alert("Error", "Failed to load notification preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    handlePress();
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setLoading(true);
    handlePress();

    try {
      // In production, save to API
      // await api.post('/user/notification-preferences', preferences);

      // Simulate saving
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSaved(true);
      Alert.alert("Success", "Notification preferences saved");

      // Clear saved indicator after 2 seconds
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      Alert.alert("Error", "Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  const PreferenceToggle = ({
    label,
    description,
    value,
    onToggle,
  }: {
    label: string;
    description: string;
    value: boolean;
    onToggle: () => void;
  }) => (
    <View className="bg-surface border border-border rounded-lg p-4 flex-row justify-between items-center mb-3">
      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold text-foreground">{label}</Text>
        <Text className="text-sm text-muted">{description}</Text>
      </View>
      <Switch value={value} onValueChange={onToggle} />
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 gap-6 px-6 py-8">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-4xl font-bold text-foreground">Notifications</Text>
            <Text className="text-base text-muted">Manage your email notification preferences</Text>
          </View>

          {/* Info Banner */}
          <View className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
            <Text className="text-sm text-blue-300">
              💡 You'll always receive critical notifications like payment confirmations and account
              security alerts, regardless of these settings.
            </Text>
          </View>

          {/* Review Notifications */}
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Review Notifications</Text>

            <PreferenceToggle
              label="Review Posted"
              description="When someone leaves a review about you"
              value={preferences.reviewPosted}
              onToggle={() => handleToggle("reviewPosted")}
            />

            <PreferenceToggle
              label="Review Approved"
              description="When your review has been approved"
              value={preferences.reviewApproved}
              onToggle={() => handleToggle("reviewApproved")}
            />

            <PreferenceToggle
              label="Review Rejected"
              description="When your review doesn't meet our guidelines"
              value={preferences.reviewRejected}
              onToggle={() => handleToggle("reviewRejected")}
            />

            <PreferenceToggle
              label="High Priority Reviews"
              description="When suspicious reviews need attention (admins only)"
              value={preferences.highPriorityReviews}
              onToggle={() => handleToggle("highPriorityReviews")}
            />
          </View>

          {/* Dispute Notifications */}
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Dispute Notifications</Text>

            <PreferenceToggle
              label="Dispute Filed"
              description="When someone disputes your review"
              value={preferences.disputeFiled}
              onToggle={() => handleToggle("disputeFiled")}
            />

            <PreferenceToggle
              label="Dispute Resolved"
              description="When a dispute has been resolved"
              value={preferences.disputeResolved}
              onToggle={() => handleToggle("disputeResolved")}
            />
          </View>

          {/* Summary & Account Notifications */}
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Summary & Account</Text>

            <PreferenceToggle
              label="Weekly Summary"
              description="Get a weekly digest of your review activity"
              value={preferences.weeklySummary}
              onToggle={() => handleToggle("weeklySummary")}
            />

            <PreferenceToggle
              label="Subscription Expiring"
              description="Reminder when your subscription is about to expire"
              value={preferences.subscriptionExpiring}
              onToggle={() => handleToggle("subscriptionExpiring")}
            />

            <PreferenceToggle
              label="Payment Receipts"
              description="Confirmation when payments are processed"
              value={preferences.paymentReceipts}
              onToggle={() => handleToggle("paymentReceipts")}
            />
          </View>

          {/* Save Button */}
          <View className="gap-3 mt-6">
            <Pressable
              onPress={handleSave}
              disabled={loading || saved}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              className={`py-4 px-6 rounded-lg items-center ${
                saved ? "bg-green-600" : "bg-primary"
              }`}
            >
              <Text className="text-white font-bold text-lg">
                {loading ? "Saving..." : saved ? "✓ Saved" : "Save Preferences"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                handlePress();
                router.back();
              }}
              className="py-4 items-center"
            >
              <Text className="text-muted font-semibold">Cancel</Text>
            </Pressable>
          </View>

          {/* Unsubscribe Option */}
          <View className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 mt-6">
            <Text className="text-sm font-bold text-red-300 mb-2">Unsubscribe from All</Text>
            <Text className="text-xs text-red-200 mb-3">
              You can unsubscribe from all non-critical emails, but you'll still receive important
              account and payment notifications.
            </Text>
            <Pressable
              onPress={() => {
                handlePress();
                Alert.alert(
                  "Unsubscribe from All",
                  "Are you sure? You'll stop receiving all non-critical emails.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Unsubscribe",
                      style: "destructive",
                      onPress: async () => {
                        // In production, call API to unsubscribe
                        Alert.alert("Success", "You've been unsubscribed from all non-critical emails");
                      },
                    },
                  ]
                );
              }}
              className="py-2 px-4 border border-red-600/50 rounded-lg items-center"
            >
              <Text className="text-red-300 font-semibold">Unsubscribe</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
