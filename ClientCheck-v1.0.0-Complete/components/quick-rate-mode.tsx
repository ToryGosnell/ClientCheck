import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { StarRating } from "./star-rating";
// Using inline red flag chips instead of RedFlagChips component
import { RED_FLAGS, type RedFlag } from "@/shared/types";
import { useColors } from "@/hooks/use-colors";

interface QuickRateModeProps {
  onComplete: (data: {
    overallRating: number;
    wouldWorkAgain: number;
    paymentReliability: number;
    selectedRedFlags: RedFlag[];
  }) => void;
  onCancel: () => void;
}

export function QuickRateMode({ onComplete, onCancel }: QuickRateModeProps) {
  const colors = useColors();
  const [step, setStep] = useState(1);
  const [overallRating, setOverallRating] = useState(0);
  const [wouldWorkAgain, setWouldWorkAgain] = useState(0);
  const [paymentReliability, setPaymentReliability] = useState(0);
  const [selectedRedFlags, setSelectedRedFlags] = useState<RedFlag[]>([]);

  const handleRedFlagToggle = (flag: RedFlag) => {
    setSelectedRedFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      onComplete({
        overallRating,
        wouldWorkAgain,
        paymentReliability,
        selectedRedFlags,
      });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const isStepValid = () => {
    if (step === 1) return overallRating > 0;
    if (step === 2) return wouldWorkAgain > 0;
    if (step === 3) return paymentReliability > 0;
    if (step === 4) return true;
    return false;
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      className="flex-1 bg-background"
    >
      <View className="flex-1 p-6 justify-between">
        {/* Progress indicator */}
        <View className="mb-6">
          <View className="flex-row gap-2">
            {[1, 2, 3, 4].map((s) => (
              <View
                key={s}
                className={`flex-1 h-1 rounded-full ${
                  s <= step ? "bg-primary" : "bg-surface"
                }`}
              />
            ))}
          </View>
          <Text className="text-sm text-muted mt-2">
            Step {step} of 4
          </Text>
        </View>

        {/* Step 1: Overall Rating */}
        {step === 1 && (
          <View>
            <Text className="text-2xl font-bold text-foreground mb-2">
              Would you work with this customer again?
            </Text>
            <Text className="text-base text-muted mb-8">
              Rate your overall experience
            </Text>
            <View className="items-center">
              <StarRating
                rating={overallRating}
                onRatingChange={setOverallRating}
                size={60}
              />
            </View>
          </View>
        )}

        {/* Step 2: Would Work Again */}
        {step === 2 && (
          <View>
            <Text className="text-2xl font-bold text-foreground mb-2">
              Likelihood to work together again?
            </Text>
            <Text className="text-base text-muted mb-8">
              1 = Never, 5 = Definitely
            </Text>
            <View className="items-center">
              <StarRating
                rating={wouldWorkAgain}
                onRatingChange={setWouldWorkAgain}
                size={60}
              />
            </View>
          </View>
        )}

        {/* Step 3: Payment Reliability */}
        {step === 3 && (
          <View>
            <Text className="text-2xl font-bold text-foreground mb-2">
              How reliable was their payment?
            </Text>
            <Text className="text-base text-muted mb-8">
              1 = Major issues, 5 = Always on time
            </Text>
            <View className="items-center">
              <StarRating
                rating={paymentReliability}
                onRatingChange={setPaymentReliability}
                size={60}
              />
            </View>
          </View>
        )}

        {/* Step 4: Red Flags */}
        {step === 4 && (
          <View>
            <Text className="text-2xl font-bold text-foreground mb-2">
              Any red flags?
            </Text>
            <Text className="text-base text-muted mb-6">
              Select all that apply (optional)
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {RED_FLAGS.map((flag) => (
                <Pressable
                  key={flag}
                  onPress={() => handleRedFlagToggle(flag)}
                  className={`px-3 py-2 rounded-full border ${
                    selectedRedFlags.includes(flag)
                      ? "bg-error border-error"
                      : "bg-surface border-border"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selectedRedFlags.includes(flag)
                        ? "text-background"
                        : "text-foreground"
                    }`}
                  >
                    {flag.replace(/_/g, " ")}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View className="flex-row gap-3 mt-8">
          <Pressable
            onPress={step === 1 ? onCancel : handleBack}
            className="flex-1 py-3 px-4 rounded-lg border border-border items-center"
          >
            <Text className="text-foreground font-semibold">
              {step === 1 ? "Cancel" : "Back"}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleNext}
            disabled={!isStepValid()}
            className={`flex-1 py-3 px-4 rounded-lg items-center ${
              isStepValid() ? "bg-primary" : "bg-surface opacity-50"
            }`}
          >
            <Text
              className={`font-semibold ${
                isStepValid() ? "text-background" : "text-muted"
              }`}
            >
              {step === 4 ? "Submit" : "Next"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
