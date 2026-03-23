/**
 * Platform entry — native wraps PostHogProvider; web is a no-op shell.
 */
import type { ReactElement, ReactNode } from "react";
import { Platform } from "react-native";

const impl =
  Platform.OS === "web"
    ? require("./posthog-wrapper.web")
    : require("./posthog-wrapper.native");

export const AnalyticsProvider = impl.AnalyticsProvider as (props: {
  children: ReactNode;
}) => ReactElement;
