/**
 * Platform entry for analytics — delegates to web or native PostHog at runtime.
 */
import { Platform } from "react-native";
import type { EventMap, EventName } from "./analytics-types";

export type { EventMap, EventName } from "./analytics-types";
export { POSTHOG_CONFIG } from "./analytics-types";

function getImpl(): typeof import("./analytics.web") {
  return Platform.OS === "web" ? require("./analytics.web") : require("./analytics.native");
}

export function track<E extends EventName>(
  event: E,
  ...args: EventMap[E] extends undefined ? [] : [properties: EventMap[E]]
): void {
  try {
    const fn = getImpl().track as (e: EventName, props?: unknown) => void;
    if (args.length > 0) fn(event, args[0]);
    else fn(event);
  } catch {
    /* Never break user flows if analytics fails */
  }
}

export function identify(userId: string, properties?: Record<string, unknown>): void {
  try {
    getImpl().identify(userId, properties);
  } catch {
    /* ignore */
  }
}

export function reset(): void {
  try {
    getImpl().reset();
  } catch {
    /* ignore */
  }
}
