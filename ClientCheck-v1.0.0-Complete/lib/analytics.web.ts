import { POSTHOG_CONFIG, type EventMap, type EventName } from "./analytics-types";

export { POSTHOG_CONFIG };

let _posthog: any = null;
let _initAttempted = false;

async function getClient(): Promise<any> {
  if (_posthog) return _posthog;
  if (_initAttempted) return null;
  _initAttempted = true;
  if (!POSTHOG_CONFIG.apiKey) return null;
  try {
    const mod = await import("posthog-js");
    const posthog = mod.default ?? mod;
    posthog.init(POSTHOG_CONFIG.apiKey, {
      api_host: POSTHOG_CONFIG.host,
      loaded: (ph: any) => { _posthog = ph; },
    });
    _posthog = posthog;
    return posthog;
  } catch {
    return null;
  }
}

// Fire-and-forget init on module load
getClient();

export function track<E extends EventName>(
  event: E,
  ...args: EventMap[E] extends undefined ? [] : [properties: EventMap[E]]
): void {
  try {
    const properties = args[0] as Record<string, unknown> | undefined;
    if (_posthog) _posthog.capture(event, properties);
  } catch {
    /* ignore */
  }
}

export function identify(userId: string, properties?: Record<string, unknown>): void {
  try {
    if (_posthog) _posthog.identify(userId, properties);
  } catch {
    /* ignore */
  }
}

export function reset(): void {
  try {
    if (_posthog) _posthog.reset();
  } catch {
    /* ignore */
  }
}
