/**
 * Web-only: Stripe Payment Element via @stripe/stripe-js (DOM).
 * File extension ensures this is never bundled for iOS/Android.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js";
import type { StripeWebPaymentSectionProps } from "./stripe-web-payment-types";
export type { StripeWebPaymentSectionProps };

export function StripeWebPaymentSection({
  publishableKey,
  clientSecret,
  returnUrl,
  onPaymentSucceeded,
  onError,
}: StripeWebPaymentSectionProps) {
  const hostId = useMemo(() => `stripe-pe-${Math.random().toString(36).slice(2, 11)}`, []);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
  const paymentElementRef = useRef<{ unmount: () => void } | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setReady(false);
      const stripe = await loadStripe(publishableKey);
      if (cancelled || !stripe) {
        if (!cancelled && !stripe) onErrorRef.current("Could not load Stripe.");
        return;
      }
      stripeRef.current = stripe;

      const mountEl =
        typeof document !== "undefined" ? document.getElementById(hostId) : null;
      if (!mountEl) {
        if (!cancelled) onErrorRef.current("Payment form container not available.");
        return;
      }
      mountEl.innerHTML = "";

      const elements = stripe.elements({
        clientSecret,
        appearance: { theme: "stripe" },
      });
      elementsRef.current = elements;

      const paymentElement = elements.create("payment");
      paymentElement.mount(mountEl);
      paymentElementRef.current = paymentElement;

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
      paymentElementRef.current?.unmount();
      paymentElementRef.current = null;
      elementsRef.current = null;
      stripeRef.current = null;
      const el = typeof document !== "undefined" ? document.getElementById(hostId) : null;
      if (el) el.innerHTML = "";
    };
  }, [publishableKey, clientSecret, hostId]);

  const handlePay = async () => {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) {
      onError("Payment form is not ready.");
      return;
    }
    setSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message ?? "Payment failed.");
        return;
      }

      const status = paymentIntent?.status;
      if (status === "succeeded" || status === "processing") {
        onPaymentSucceeded();
        return;
      }

      if (paymentIntent?.status === "requires_action") {
        // 3DS may redirect; Stripe handles via return_url
        return;
      }

      onError("Payment was not completed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="gap-4 py-2">
      <Text className="text-sm font-semibold text-foreground">Payment details</Text>
      <View
        nativeID={hostId}
        // minHeight so layout reserves space while Stripe.js mounts
        style={{ minHeight: 140, width: "100%" }}
      />
      {!ready && (
        <View className="flex-row items-center gap-2 py-2">
          <ActivityIndicator />
          <Text className="text-sm text-muted">Loading secure payment form…</Text>
        </View>
      )}
      <Pressable
        onPress={handlePay}
        disabled={!ready || submitting}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        className={`py-3 px-4 rounded-lg items-center ${!ready || submitting ? "bg-primary/50" : "bg-primary"}`}
      >
        <Text className="text-white font-bold">
          {submitting ? "Processing…" : "Complete payment"}
        </Text>
      </Pressable>
    </View>
  );
}
