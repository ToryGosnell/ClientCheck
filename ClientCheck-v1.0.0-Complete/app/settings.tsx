import { View, Text, ScrollView, Pressable, Switch, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useState } from "react";
import * as SecureStore from "expo-secure-store";
import { CancelSubscriptionModal } from "@/components/cancel-subscription-modal";
import { cancelSubscription } from "@/lib/cancel-subscription-service";

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const colorScheme = useColorScheme();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [darkMode, setDarkMode] = useState(colorScheme === "dark");

  const handleToggleDarkMode = async () => {
    setDarkMode(!darkMode);
    // Store preference
    await SecureStore.setItemAsync("theme", darkMode ? "light" : "dark");
  };

  const handleCancelSubscription = async () => {
    if (!user?.id) return;
    try {
      await cancelSubscription({
        userId: String(user.id),
        reason: "User cancelled from settings",
      });
      setShowCancelModal(false);
      // Navigate to subscription screen
      router.push("/subscription");
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="p-6">
        <View style={styles.authPrompt}>
          <Text style={styles.authEmoji}>🔐</Text>
          <Text style={[styles.authTitle, { color: colors.foreground }]}>
            Sign In Required
          </Text>
          <Text style={[styles.authDesc, { color: colors.muted }]}>
            Please sign in to access settings.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.backText, { color: colors.primary }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Account</Text>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View>
                <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                  Email
                </Text>
                <Text style={[styles.settingValue, { color: colors.muted }]}>
                  {user?.email || "Not set"}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                Name
              </Text>
              <Text style={[styles.settingValue, { color: colors.muted }]}>
                {user?.name || "Not set"}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                Member Since
              </Text>
              <Text style={[styles.settingValue, { color: colors.muted }]}>
                March 2026
              </Text>
            </View>
          </View>
        </View>

        {/* Preferences Section */}
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Preferences</Text>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.settingRow, styles.switchRow]}>
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                Dark Mode
              </Text>
              <Switch
                value={darkMode}
                onValueChange={handleToggleDarkMode}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Pressable
              onPress={() => router.push("/privacy-policy")}
              style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                Privacy Policy
              </Text>
              <Text style={[styles.settingValue, { color: colors.muted }]}>›</Text>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Pressable
              onPress={() => router.push("/privacy-policy")}
              style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                Terms of Service
              </Text>
              <Text style={[styles.settingValue, { color: colors.muted }]}>›</Text>
            </Pressable>
          </View>
        </View>

        {/* Subscription Section */}
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Subscription</Text>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              onPress={() => router.push("/subscription")}
              style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                Manage Subscription
              </Text>
              <Text style={[styles.settingValue, { color: colors.muted }]}>›</Text>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Pressable
              onPress={() => setShowCancelModal(true)}
              style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.settingLabel, { color: colors.error }]}>
                Cancel Subscription
              </Text>
              <Text style={[styles.settingValue, { color: colors.error }]}>›</Text>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Pressable
              onPress={() => router.push("/subscription-reactivate")}
              style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.settingLabel, { color: colors.primary }]}>
                Reactivate Subscription
              </Text>
              <Text style={[styles.settingValue, { color: colors.primary }]}>›</Text>
            </Pressable>
          </View>
        </View>

        {/* Support Section */}
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Support</Text>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                Help & FAQ
              </Text>
              <Text style={[styles.settingValue, { color: colors.muted }]}>›</Text>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>
                Contact Support
              </Text>
              <Text style={[styles.settingValue, { color: colors.muted }]}>›</Text>
            </Pressable>
          </View>
        </View>

        {/* Logout Button */}
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutBtn,
            { borderColor: colors.error },
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text style={[styles.logoutBtnText, { color: colors.error }]}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      {/* Cancel Subscription Modal */}
      <CancelSubscriptionModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirmCancel={handleCancelSubscription}
        subscriptionPlan="monthly"
        nextBillingDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 60,
  },
  backText: {
    fontSize: 17,
    fontWeight: "500",
  },
  topTitle: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  scroll: {
    padding: 16,
    paddingBottom: 100,
    gap: 24,
  },
  authPrompt: {
    alignItems: "center",
    gap: 12,
  },
  authEmoji: {
    fontSize: 48,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  authDesc: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  switchRow: {
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  settingValue: {
    fontSize: 14,
  },
  divider: {
    height: 0.5,
    marginHorizontal: 16,
  },
  logoutBtn: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  logoutBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
