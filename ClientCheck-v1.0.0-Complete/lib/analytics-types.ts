export type EventMap = {
  app_opened: undefined;
  signup_started: { account_type: "contractor" | "customer" };
  signup_completed: { account_type: "contractor" | "customer" };
  login: { method: string };
  logout: undefined;
  search_performed: {
    query: string;
    result_count: number;
    scope?: string;
    state?: string;
    /** Character length of the query (safe for analytics; use with query only in trusted pipelines). */
    query_length?: number;
    search_source?: "algolia" | "trpc_fallback";
    state_filter_applied?: boolean;
  };
  /** User opened a customer from the search results list (tab search). */
  search_result_clicked: {
    customer_id: number;
    position: number;
    query_length: number;
    state_filter_applied: boolean;
    search_source?: "algolia" | "trpc_fallback";
  };
  /** Search finished successfully with zero hits (not a transport/query error). */
  search_no_results: {
    query_length: number;
    search_source?: "algolia" | "trpc_fallback";
    state_filter_applied: boolean;
  };
  search_limit_hit: undefined;
  customer_viewed: { customer_id: number; risk_level: string };
  review_viewed: { review_id: number };
  review_created: { customer_id: number; overall_rating: number };
  review_helpful_clicked: { review_id: number };
  checkout_started: { plan: string; price: string };
  checkout_completed: { plan: string };
  checkout_cancelled: { plan: string };
  paywall_shown: { type: "contractor" | "customer" };
  license_submitted: undefined;
  license_verified: { success: boolean };
  legal_accepted: undefined;
  /** Customer opened the dispute form (dispute-review screen). */
  dispute_started: { customer_id: number };
  /** Dispute successfully persisted (API success). */
  dispute_submitted: { customer_id: number };
  customer_profile_viewed: {
    customer_id: number;
    source: "search" | "alerts" | "direct" | "other";
  };
  customer_tracked: { customer_id: number };
  alerts_viewed: undefined;
  paywall_viewed: { surface?: "contractor" | "customer" | "unlock" };
  subscription_started: { plan: string; price?: string };
  payment_successful: { plan?: string };
  share_flagged_customer: undefined;
  location_scope_changed: { scope: string; state?: string };
  watch_toggled: { customer_id: number; watching: boolean };
  watch_toggled_from_search: { customer_id: number; watching: boolean };
  page_viewed: { screen: string };
};

export type EventName = keyof EventMap;

export const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? "";
export const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export const POSTHOG_CONFIG = {
  apiKey: POSTHOG_API_KEY,
  host: POSTHOG_HOST,
};
