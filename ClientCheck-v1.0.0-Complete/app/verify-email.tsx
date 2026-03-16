import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import * as Haptics from "expo-haptics";
import { apiFetch } from "@/lib/api";

export default function VerifyEmailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "verified" | "error">("pending");
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (token) {
      verifyEmail();
    }
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await apiFetch("/api/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setVerificationStatus("verified");
        setTimeout(() => {
          router.push("/(tabs)");
        }, 2000);
      } else {
        setVerificationStatus("error");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error("Verification error:", error);
      setVerificationStatus("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleResendEmail = async () => {
    try {
      setIsResending(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const response = await apiFetch("/api/email/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, email: user?.email }),
      });

      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setVerificationStatus("pending");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error("Resend error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Verify Your Email</Text>
        </View>

        {/* Status Section */}
        <View style={styles.statusSection}>
          {verificationStatus === "pending" && (
            <>
              <Text style={styles.statusEmoji}>📧</Text>
              <Text style={[styles.statusTitle, { color: colors.foreground }]}>
                Check Your Email
              </Text>
              <Text style={[styles.statusDescription, { color: colors.muted }]}>
                We've sent a verification link to {user?.email}
              </Text>
              <Text style={[styles.statusSubtext, { color: colors.muted }]}>
                Click the link in the email to verify your account.
              </Text>
            </>
          )}

          {verificationStatus === "verified" && (
            <>
              <Text style={styles.statusEmoji}>✅</Text>
              <Text style={[styles.statusTitle, { color: colors.success }]}>
                Email Verified!
              </Text>
              <Text style={[styles.statusDescription, { color: colors.muted }]}>
                Your email has been successfully verified.
              </Text>
              <Text style={[styles.statusSubtext, { color: colors.muted }]}>
                Redirecting you to the app...
              </Text>
            </>
          )}

          {verificationStatus === "error" && (
            <>
              <Text style={styles.statusEmoji}>❌</Text>
              <Text style={[styles.statusTitle, { color: colors.error }]}>
                Verification Failed
              </Text>
              <Text style={[styles.statusDescription, { color: colors.muted }]}>
                The verification link may have expired or is invalid.
              </Text>
              <Text style={[styles.statusSubtext, { color: colors.muted }]}>
                Please try requesting a new verification email.
              </Text>
            </>
          )}
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
            Verification helps us prevent spam and improve data quality for contractor outreach.
          </Text>
        </View>

        {/* Actions */}
        {verificationStatus !== "verified" && (
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleResendEmail}
              disabled={isResending}
              style={[
                styles.resendButton,
                { borderColor: colors.primary, opacity: isResending ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.resendButtonText, { color: colors.primary }]}>
                {isResending ? "Sending..." : "Resend Verification Email"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(tabs)")}
              style={styles.skipButton}
            >
              <Text style={[styles.skipButtonText, { color: colors.muted }]}>
                Skip for now
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={[styles.tipsTitle, { color: colors.foreground }]}>Tips:</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={[styles.tipText, { color: colors.muted }]}>
              Check your spam folder if you don't see the email
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={[styles.tipText, { color: colors.muted }]}>
              Verification links expire after 24 hours
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={[styles.tipText, { color: colors.muted }]}>
              You can still use the app while verifying your email
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 100,
    gap: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  statusSection: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 32,
  },
  statusEmoji: {
    fontSize: 64,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  statusDescription: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  statusSubtext: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
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
  actions: {
    gap: 12,
  },
  resendButton: {
    borderRadius: 12,
    borderWidth: 2,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  tipsSection: {
    gap: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  tipItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  tipBullet: {
    fontSize: 16,
    fontWeight: "500",
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});