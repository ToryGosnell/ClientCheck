/**
 * Server-side PostHog HogQL for beta funnel debug (personal API key — never expose to clients).
 */

const TRACKED_EVENTS = [
  "search_performed",
  "search_result_clicked",
  "search_no_results",
  "customer_profile_viewed",
  "customer_tracked",
  "alerts_viewed",
  "dispute_started",
  "dispute_submitted",
  "paywall_viewed",
  "subscription_started",
  "payment_successful",
] as const;

/** Ordered steps for simple sequential drop-off (event volume, not strict user funnel). */
const FUNNEL_SEQUENCE = [
  "search_performed",
  "search_result_clicked",
  "customer_profile_viewed",
  "customer_tracked",
  "alerts_viewed",
  "dispute_started",
  "dispute_submitted",
  "paywall_viewed",
  "subscription_started",
  "payment_successful",
] as const;

export type BetaFunnelAnalyticsResult = {
  configured: boolean;
  error?: string;
  days: number;
  queryHost?: string;
  counts: Record<string, number>;
  funnel: { event: string; count: number; dropOffFromPriorPct: number | null }[];
  profileSources: { source: string; count: number }[];
  noResultsRate: number | null;
  trackAfterProfilePct: number | null;
  paymentAfterSubPct: number | null;
};

function getQueryConfig(): { key?: string; projectId?: string; host: string; ok: boolean } {
  const key = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim();
  const host = (process.env.POSTHOG_QUERY_HOST?.trim() || "https://us.posthog.com").replace(/\/$/, "");
  return { key, projectId, host, ok: Boolean(key && projectId) };
}

async function runHogQL(query: string): Promise<{ columns?: string[]; results?: unknown[][] }> {
  const { key, projectId, host, ok } = getQueryConfig();
  if (!ok || !key || !projectId) throw new Error("PostHog query API not configured");

  const res = await fetch(`${host}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
  });

  let json: Record<string, unknown>;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    throw new Error(`PostHog HTTP ${res.status}: response was not JSON`);
  }
  if (!res.ok) {
    const detail = typeof json.detail === "string" ? json.detail : JSON.stringify(json).slice(0, 400);
    throw new Error(detail || `PostHog HTTP ${res.status}`);
  }
  return json as { columns?: string[]; results?: unknown[][] };
}

function parseEventCounts(data: { columns?: string[]; results?: unknown[][] }): Record<string, number> {
  const cols = data.columns ?? [];
  const results = data.results ?? [];
  let ei = cols.indexOf("event");
  let ci = cols.findIndex((c) => /^(cnt|count|c)$/i.test(String(c).trim()));
  if ((ei < 0 || ci < 0) && cols.length >= 2 && results.length > 0) {
    ei = 0;
    ci = 1;
  }
  const out: Record<string, number> = {};
  if (ei < 0 || ci < 0) return out;
  for (const row of results) {
    const ev = String(row[ei] ?? "");
    const n = Number(row[ci]);
    if (ev) out[ev] = Number.isFinite(n) ? n : 0;
  }
  return out;
}

function parseSourceRows(data: { columns?: string[]; results?: unknown[][] }): { source: string; count: number }[] {
  const cols = data.columns ?? [];
  const results = data.results ?? [];
  let si = cols.findIndex((c) => /^src$/i.test(String(c)) || String(c).toLowerCase() === "source");
  let ci = cols.findIndex((c) => /^(cnt|count|c)$/i.test(String(c).trim()));
  if ((si < 0 || ci < 0) && cols.length >= 2 && results.length > 0) {
    si = 0;
    ci = 1;
  }
  if (si < 0 || ci < 0) return [];
  return results.map((row) => ({
    source: String(row[si] ?? "unknown"),
    count: Number(row[ci]) || 0,
  }));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function fetchBetaFunnelAnalytics(days: number): Promise<BetaFunnelAnalyticsResult> {
  const { host, ok } = getQueryConfig();
  const d = Math.min(90, Math.max(1, Math.floor(days)));

  const empty: BetaFunnelAnalyticsResult = {
    configured: ok,
    days: d,
    queryHost: host,
    counts: Object.fromEntries(TRACKED_EVENTS.map((e) => [e, 0])) as Record<string, number>,
    funnel: [],
    profileSources: [],
    noResultsRate: null,
    trackAfterProfilePct: null,
    paymentAfterSubPct: null,
  };

  if (!ok) {
    return {
      ...empty,
      configured: false,
      error:
        "Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID on the API server (personal key with Query read). Optional: POSTHOG_QUERY_HOST (default https://us.posthog.com, EU: https://eu.posthog.com).",
    };
  }

  const eventInList = TRACKED_EVENTS.map((e) => `'${e}'`).join(", ");

  const qEvents = `
    SELECT event, count() AS cnt
    FROM events
    WHERE timestamp >= now() - INTERVAL ${d} DAY
      AND event IN (${eventInList})
    GROUP BY event
  `;

  const qSources = `
    SELECT
      if(
        empty(JSONExtractString(properties, 'source')),
        'other',
        JSONExtractString(properties, 'source')
      ) AS src,
      count() AS cnt
    FROM events
    WHERE event = 'customer_profile_viewed'
      AND timestamp >= now() - INTERVAL ${d} DAY
    GROUP BY src
    ORDER BY cnt DESC
    LIMIT 20
  `;

  try {
    const [r1, r2] = await Promise.all([runHogQL(qEvents), runHogQL(qSources)]);
    const counts = { ...empty.counts, ...parseEventCounts(r1) };

    const funnel: BetaFunnelAnalyticsResult["funnel"] = [];
    let prior = 0;
    for (let i = 0; i < FUNNEL_SEQUENCE.length; i++) {
      const ev = FUNNEL_SEQUENCE[i];
      const count = counts[ev] ?? 0;
      let dropOffFromPriorPct: number | null = null;
      if (i > 0 && prior > 0) {
        dropOffFromPriorPct = round1((1 - count / prior) * 100);
      }
      funnel.push({ event: ev, count, dropOffFromPriorPct });
      prior = count;
    }

    const searchPerf = counts.search_performed ?? 0;
    const noRes = counts.search_no_results ?? 0;
    const prof = counts.customer_profile_viewed ?? 0;
    const tracked = counts.customer_tracked ?? 0;
    const subStart = counts.subscription_started ?? 0;
    const payOk = counts.payment_successful ?? 0;

    return {
      configured: true,
      days: d,
      queryHost: host,
      counts,
      funnel,
      profileSources: parseSourceRows(r2),
      noResultsRate: searchPerf > 0 ? round1((noRes / searchPerf) * 100) : null,
      trackAfterProfilePct: prof > 0 ? round1((tracked / prof) * 100) : null,
      paymentAfterSubPct: subStart > 0 ? round1((payOk / subStart) * 100) : null,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ...empty,
      configured: true,
      error: msg,
    };
  }
}

