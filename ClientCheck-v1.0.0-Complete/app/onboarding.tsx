import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator , Platform } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRouter } from "expo-router";
import { useState } from "react";
import * as Haptics from "expo-haptics";

const TRADE_TYPES = [
  "Electrician",
  "Plumber",
  "HVAC",
  "Carpenter",
  "Painter",
  "Roofer",
  "General Contractor",
  "Landscaper",
  "Mason",
  "Flooring",
  "Other",
];

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useColors();
  const [step, setStep] = useState(1);
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!selectedTrade) {
        alert("Please select a trade");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      setLoading(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setTimeout(() => {
        router.replace("/contractor-paywall" as never);
      }, 500);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                {
                  backgroundColor: s <= step ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        </View>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Welcome to ClientCheck
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Get started in 3 quick steps
            </Text>

            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                📋 Complete Your Profile
              </Text>
              <Text style={[styles.cardText, { color: colors.muted }]}>
                Add your company name, location, and bio so contractors can find you.
              </Text>
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                🔧 Select Your Trade
              </Text>
              <Text style={[styles.cardText, { color: colors.muted }]}>
                Choose your primary trade to help contractors filter reviews.
              </Text>
            </View>

            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                ✅ Verify Your Account
              </Text>
              <Text style={[styles.cardText, { color: colors.muted }]}>
                Upload your ID and license to get a verified badge.
              </Text>
            </View>
          </View>
        )}

        {/* Step 2: Select Trade */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              What's Your Trade?
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Select your primary trade
            </Text>

            <View style={styles.tradeGrid}>
              {TRADE_TYPES.map((trade) => (
                <Pressable
                  key={trade}
                  onPress={() => setSelectedTrade(trade)}
                  style={({ pressed }) => [
                    styles.tradeButton,
                    {
                      backgroundColor:
                        selectedTrade === trade ? colors.primary : colors.surface,
                      borderColor: colors.border,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.tradeButtonText,
                      {
                        color:
                          selectedTrade === trade ? "#fff" : colors.foreground,
                      },
                    ]}
                  >
                    {trade}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Step 3: Verification */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Get Verified
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Optional: Upload documents for a verified badge
            </Text>

            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                Why Get Verified?
              </Text>
              <Text style={[styles.cardText, { color: colors.muted }]}>
                • Build trust with customers{"\n"}
                • Stand out from competitors{"\n"}
                • Get a verified badge on your profile
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.uploadButton,
                { borderColor: colors.primary },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.uploadButtonText, { color: colors.primary }]}>
                + Upload Documents
              </Text>
            </Pressable>

            <Text style={[styles.skipText, { color: colors.muted }]}>
              You can verify later in your profile settings.
            </Text>
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          {step > 1 && (
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [
                styles.backButton,
                { borderColor: colors.primary },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.backButtonText, { color: colors.primary }]}>
                Back
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleNext}
            disabled={loading}
            style={({ pressed }) => [
              styles.nextButton,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              loading && { opacity: 0.6 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextButtonText}>
                {step === 3 ? "Get Started" : "Next"}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 40,
    gap: 24,
  },
  progressContainer: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 20,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepContainer: {
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    marginTop: -8,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
  },
  tradeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tradeButton: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  tradeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  uploadButton: {
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: "dashed",
    paddingVertical: 16,
    alignItems: "center",
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  skipText: {
    fontSize: 13,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  backButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  nextButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
