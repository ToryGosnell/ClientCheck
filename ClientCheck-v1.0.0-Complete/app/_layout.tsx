import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { StripeProvider } from "@/lib/stripe";
import * as Sentry from "@sentry/react-native";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { AnalyticsProvider } from "@/components/posthog-wrapper";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { CallDetectionProvider } from "@/lib/call-detection-context";
import { CallDetectionWrapper } from "@/components/call-detection-wrapper";
import { ErrorBoundary } from "@/components/error-boundary";
import { AdminPreviewBanner } from "@/components/admin-preview-banner";
import { hydrateUserDataFromDevice } from "@/lib/user-data";

const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    // https://docs.sentry.io/platforms/react-native/data-management/data-collected/
    sendDefaultPii: true,
    // Learn more:
    // https://docs.sentry.io/platforms/react-native/configuration/options/#traces-sample-rate
    tracesSampleRate: 1.0,
    enableLogs: true,
    // profilesSampleRate is relative to tracesSampleRate.
    profilesSampleRate: 1.0,
    // Record session replays for 100% of errors and 10% of sessions.
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    integrations: [Sentry.mobileReplayIntegration()],
  });
}

SplashScreen.preventAutoHideAsync().catch(() => {});

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  useEffect(() => {
    initManusRuntime();
    void hydrateUserDataFromDevice();
    // Hide splash once layout is mounted (auth state will resolve in individual screens)
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus for mobile
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <ErrorBoundary>
      <AnalyticsProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StripeProvider publishableKey={publishableKey}>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <CallDetectionProvider>
            <AdminPreviewBanner />
            {/* Default to hiding native headers so raw route segments don't appear (e.g. "(tabs)", "products/[id]"). */}
            {/* If a screen needs the native header, explicitly enable it and set a human title via Stack.Screen options. */}
            {/* in order for ios apps tab switching to work properly, use presentation: "fullScreenModal" for login page, whenever you decide to use presentation: "modal*/}
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="oauth/callback" />
              <Stack.Screen name="add-review" options={{ presentation: "modal" }} />
              <Stack.Screen name="dispute-response" options={{ presentation: "modal" }} />
              <Stack.Screen name="customer/[id]" />
              <Stack.Screen name="c/[customerId]" />
              <Stack.Screen name="review/[id]" />
              <Stack.Screen name="select-account" />
              <Stack.Screen name="invite" />
              <Stack.Screen name="pricing" />
              <Stack.Screen name="subscription" />
              <Stack.Screen name="contractor-paywall" />
              <Stack.Screen name="customer-paywall" />
              <Stack.Screen name="payment-cancelled" />
              <Stack.Screen name="legal-acceptance" />
              <Stack.Screen name="licenses" />
              <Stack.Screen name="moderation" />
              <Stack.Screen name="verification" />
              <Stack.Screen name="terms" />
              <Stack.Screen name="privacy" />
              <Stack.Screen name="dispute-policy" />
              <Stack.Screen name="content-policy" />
              <Stack.Screen name="privacy-policy" />
              <Stack.Screen name="terms-of-service" />
              <Stack.Screen name="dmca-takedown" />
              <Stack.Screen name="unlock-profile" />
            </Stack>
              <CallDetectionWrapper />
              <StatusBar style="auto" />
            </CallDetectionProvider>
          </QueryClientProvider>
        </trpc.Provider>
        </StripeProvider>
      </GestureHandlerRootView>
      </AnalyticsProvider>
    </ErrorBoundary>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}

// Wrap root with Sentry for unhandled error capture.
export default Sentry.wrap(RootLayout);
