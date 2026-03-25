/**
 * Fire-and-forget PostHog capture from the API process (referral funnel).
 * Uses the same project key as the client when set, or POSTHOG_CAPTURE_API_KEY for server-only envs.
 */

function getCaptureConfig(): { apiKey: string; host: string } | null {
  const apiKey =
    process.env.POSTHOG_CAPTURE_API_KEY?.trim() ||
    process.env.EXPO_PUBLIC_POSTHOG_API_KEY?.trim() ||
    "";
  if (!apiKey) return null;
  const host = (
    process.env.POSTHOG_CAPTURE_HOST?.trim() ||
    process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() ||
    "https://us.i.posthog.com"
  ).replace(/\/$/, "");
  return { apiKey, host };
}

export function capturePostHogServer(
  event: string,
  distinctId: string,
  properties: Record<string, unknown>,
): void {
  const cfg = getCaptureConfig();
  if (!cfg) return;
  const url = `${cfg.host}/capture/`;
  const body = JSON.stringify({
    api_key: cfg.apiKey,
    event,
    distinct_id: distinctId,
    properties: { ...properties, $lib: "server-api" },
  });
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {});
}
