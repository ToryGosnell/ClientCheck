import React, { useCallback, useState } from "react";
import { ScrollView, View, Text, Pressable, Alert } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { CustomerSubscriptionService } from "@/lib/customer-subscription-service";
import { StripePaymentHandler } from "@/lib/stripe-payment-handler";
import { StripeCustomerService } from "@/lib/stripe-customer-service";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { StripeWebPaymentSection } from "@/components/stripe-web-payment-section";

type PaymentBundle = {
  clientSecret: string;
  stripeCustomerId: string;
  paymentIntentId: string | null;
};

/**
 * Web: Stripe.js Payment Element (see `components/stripe-web-payment-section.web.tsx`).
 * `@stripe/stripe-react-native` is never imported on this platform.
 */
export default function CustomerSubscriptionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [paymentBundle, setPaymentBundle] = useState<PaymentBundle | null>(null);

  const createCustomer = trpc.payments.createStripeCustomerForApp.useMutation();
  const createPaymentIntent = trpc.payments.createCustomerPaymentIntentForApp.useMutation();
  const createSubscription = trpc.payments.createCustomerSubscriptionForApp.useMutation();

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const publishableKey = StripeCustomerService.getPublishableKey();
  const returnUrl = Linking.createURL("/customer-payment-success");

  const finalizeSubscription = useCallback(
    async (bundle: PaymentBundle) => {
      try {
        const subscriptionResult = await createSubscription.mutateAsync({
          stripeCustomerId: bundle.stripeCustomerId,
          plan: selectedPlan,
          paymentIntentId: bundle.paymentIntentId ?? undefined,
        });
        if ("error" in subscriptionResult) {
          Alert.alert("Error", subscriptionResult.error || "Failed to create subscription.");
          return;
        }
        setPaymentBundle(null);
        router.push({
          pathname: "/customer-payment-success",
          params: {
            plan: selectedPlan,
            paymentIntentId: bundle.paymentIntentId ?? "",
          },
        } as never);
      } catch (e) {
        console.error("Finalize subscription:", e);
        Alert.alert("Error", "Could not complete subscription. Please contact support.");
      }
    },
    [createSubscription, router, selectedPlan],
  );

  const handleSubscribe = async () => {
    if (!user?.email || !user?.name) {
      Alert.alert("Error", "Please sign in to subscribe.");
      return;
    }
    if (!publishableKey) {
      Alert.alert("Error", "Payment processor not configured. Please contact support.");
      return;
    }

    setLoading(true);
    await handlePress();

    try {
      const planDetails = StripePaymentHandler.getPlanDetails(selectedPlan);
      const amountCents = StripePaymentHandler.formatAmount(planDetails.amount);

      const customerResult = await createCustomer.mutateAsync({
        email: user.email,
        name: user.name,
      });

      if ("error" in customerResult) {
        Alert.alert("Error", customerResult.error || "Failed to create customer account.");
        return;
      }
      const stripeCustomerId = customerResult.customerId;

      const paymentIntentResult = await createPaymentIntent.mutateAsync({
        stripeCustomerId,
        amountCents,
        plan: selectedPlan,
      });

      if ("error" in paymentIntentResult) {
        Alert.alert("Error", paymentIntentResult.error || "Failed to create payment.");
        return;
      }
      const { clientSecret, paymentIntentId } = paymentIntentResult;

      if (!clientSecret) {
        Alert.alert("Error", "Payment could not be prepared.");
        return;
      }

      setPaymentBundle({
        clientSecret,
        stripeCustomerId,
        paymentIntentId: paymentIntentId ?? null,
      });
    } catch (error) {
      console.error("Subscription error:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayment = () => {
    setPaymentBundle(null);
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 gap-6 px-6 py-8">
          <View className="gap-2">
            <Text className="text-4xl font-bold text-foreground">Join ClientCheck</Text>
            <Text className="text-base text-muted">
              Participate in fair, verified reviews of contractors
            </Text>
          </View>

          <View className="bg-blue-900/20 border border-blue-600/30 rounded-xl p-4 gap-3">
            <Text className="text-lg font-bold text-foreground">Why We Charge Both Sides</Text>
            <View className="gap-2">
              <View className="flex-row gap-3">
                <Text className="text-xl">🛡️</Text>
                <Text className="flex-1 text-sm text-muted">
                  <Text className="font-semibold text-foreground">Ensures Honest Reviews</Text> —
                  When both contractors and customers pay, everyone has skin in the game
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-xl">✅</Text>
                <Text className="flex-1 text-sm text-muted">
                  <Text className="font-semibold text-foreground">Prevents Fraud</Text> — Reduces
                  fake accounts and frivolous disputes
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-xl">⚖️</Text>
                <Text className="flex-1 text-sm text-muted">
                  <Text className="font-semibold text-foreground">Fair Moderation</Text> — Both
                  sides fund independent review process
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-xl">🔒</Text>
                <Text className="flex-1 text-sm text-muted">
                  <Text className="font-semibold text-foreground">Quality Community</Text> —
                  Committed members only
                </Text>
              </View>
            </View>
          </View>

          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Choose Your Plan</Text>

            <Pressable
              onPress={() => {
                handlePress();
                setSelectedPlan("monthly");
              }}
              disabled={!!paymentBundle}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              className={`border-2 rounded-xl p-4 gap-2 ${
                selectedPlan === "monthly"
                  ? "bg-primary/10 border-primary"
                  : "bg-surface border-border"
              }`}
            >
              <View className="flex-row items-center justify-between">
                <View className="gap-1">
                  <Text
                    className={`text-lg font-bold ${
                      selectedPlan === "monthly" ? "text-primary" : "text-foreground"
                    }`}
                  >
                    Monthly
                  </Text>
                  <Text className="text-sm text-muted">Flexible, cancel anytime</Text>
                </View>
                <View className="items-end gap-1">
                  <Text className="text-3xl font-bold text-foreground">$9.99</Text>
                  <Text className="text-xs text-muted">/month</Text>
                </View>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                handlePress();
                setSelectedPlan("yearly");
              }}
              disabled={!!paymentBundle}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              className={`border-2 rounded-xl p-4 gap-2 relative ${
                selectedPlan === "yearly"
                  ? "bg-green-900/10 border-green-500"
                  : "bg-surface border-border"
              }`}
            >
              <View className="absolute -top-3 right-4 bg-green-600 px-3 py-1 rounded-full">
                <Text className="text-xs font-bold text-white">
                  Save {CustomerSubscriptionService.YEARLY_SAVINGS}%
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <View className="gap-1">
                  <Text
                    className={`text-lg font-bold ${
                      selectedPlan === "yearly" ? "text-green-500" : "text-foreground"
                    }`}
                  >
                    Yearly
                  </Text>
                  <Text className="text-sm text-muted">Best value, commit for a year</Text>
                </View>
                <View className="items-end gap-1">
                  <Text className="text-3xl font-bold text-foreground">$120</Text>
                  <Text className="text-xs text-muted">/year</Text>
                </View>
              </View>
            </Pressable>
          </View>

          <View className="bg-surface border border-border rounded-xl p-4 gap-3">
            <Text className="font-bold text-foreground">What's Included</Text>
            <View className="gap-2">
              <Text className="text-sm text-muted">✓ View all contractor reviews and ratings</Text>
              <Text className="text-sm text-muted">✓ Respond to reviews about your business</Text>
              <Text className="text-sm text-muted">✓ File disputes with evidence</Text>
              <Text className="text-sm text-muted">✓ Track your reputation score</Text>
              <Text className="text-sm text-muted">✓ Priority support</Text>
            </View>
          </View>

          <View className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
            <Text className="text-xs text-muted leading-relaxed">
              <Text className="font-semibold">Our Commitment:</Text> Both contractors and customers
              pay equally. This ensures fair moderation, prevents fake reviews, and creates a
              trusted community where honest feedback matters.
            </Text>
          </View>

          {paymentBundle && publishableKey ? (
            <View className="bg-surface border border-border rounded-xl p-4 gap-2">
              <Text className="font-semibold text-foreground">Secure checkout</Text>
              <Text className="text-sm text-muted mb-2">
                Enter your card details below, then tap Complete payment.
              </Text>
              <StripeWebPaymentSection
                key={paymentBundle.clientSecret}
                publishableKey={publishableKey}
                clientSecret={paymentBundle.clientSecret}
                returnUrl={returnUrl}
                onPaymentSucceeded={() => void finalizeSubscription(paymentBundle)}
                onError={(message: string) => Alert.alert("Payment", message)}
              />
              <Pressable onPress={handleCancelPayment} className="py-2 items-center">
                <Text className="text-sm text-primary font-semibold">Cancel and change plan</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handleSubscribe}
              disabled={loading}
              style={({ pressed }) => [
                { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
              className={`py-4 px-6 rounded-lg items-center ${
                loading ? "bg-primary/50" : "bg-primary"
              }`}
            >
              <Text className="text-white font-bold text-lg">
                {loading
                  ? "Preparing checkout…"
                  : `Subscribe to ${selectedPlan === "monthly" ? "Monthly" : "Yearly"} Plan`}
              </Text>
            </Pressable>
          )}

          <View className="items-center gap-2">
            <Text className="text-xs text-muted">
              Non-refundable annual subscription • Cancel monthly anytime
            </Text>
            <Pressable onPress={() => router.back()}>
              <Text className="text-sm text-primary font-semibold">Back</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
