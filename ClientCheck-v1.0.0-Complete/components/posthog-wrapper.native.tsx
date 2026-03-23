import React from "react";
import { PostHogProvider } from "posthog-react-native";
import { POSTHOG_CONFIG } from "@/lib/analytics";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  if (!POSTHOG_CONFIG.apiKey) return <>{children}</>;

  return (
    <PostHogProvider
      apiKey={POSTHOG_CONFIG.apiKey}
      options={{ host: POSTHOG_CONFIG.host }}
      autocapture={{ captureTouches: false, captureScreens: true }}
    >
      {children}
    </PostHogProvider>
  );
}
