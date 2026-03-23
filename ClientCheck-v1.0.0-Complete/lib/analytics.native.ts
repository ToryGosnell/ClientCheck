import PostHog from "posthog-react-native";
import { POSTHOG_API_KEY, POSTHOG_HOST, POSTHOG_CONFIG, type EventMap, type EventName } from "./analytics-types";

export { POSTHOG_CONFIG };

let _client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!POSTHOG_API_KEY) return null;
  if (_client) return _client;
  try {
    _client = new PostHog(POSTHOG_API_KEY, { host: POSTHOG_HOST });
    return _client;
  } catch {
    return null;
  }
}

export function track<E extends EventName>(
  event: E,
  ...args: EventMap[E] extends undefined ? [] : [properties: EventMap[E]]
): void {
  try {
    const client = getClient();
    if (!client) return;
    const properties = args[0] as Record<string, unknown> | undefined;
    client.capture(event, properties as Parameters<PostHog["capture"]>[1]);
  } catch {
    /* ignore */
  }
}

export function identify(userId: string, properties?: Record<string, unknown>): void {
  try {
    const client = getClient();
    if (!client) return;
    client.identify(userId, properties as Parameters<PostHog["identify"]>[1]);
  } catch {
    /* ignore */
  }
}

export function reset(): void {
  try {
    const client = getClient();
    if (!client) return;
    client.reset();
  } catch {
    /* ignore */
  }
}
