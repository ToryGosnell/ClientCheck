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
  /** Product analytics alias for review submission (beta funnel). */
  review_submitted: { customer_id: number; overall_rating: number };
  review_helpful_clicked: { review_id: number };
  checkout_started: { plan: string; price: string };
  checkout_completed: { plan: string };
  checkout_cancelled: { plan: string };
  paywall_shown:
    | { type: "contractor" }
    | { type: "customer" }
    | { type: "verify_customer_identity"; trigger?: string };
  paywall_dismissed: { surface?: string; trigger?: string };
  paywall_converted: { trigger?: string };
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
  /** Contractor opened the post-review share sheet (link generated for this customer). */
  share_link_created: { customer_id: number; referrer_user_id: number };
  /** Someone opened a shared customer landing URL `/c/:id` (may be unauthenticated). */
  share_link_clicked: { customer_id: number; referrer_user_id?: number };
  /** Referrer was stored on the new user after login (server accepted `record-share-referral`). */
  user_signed_up_from_referral: { referrer_user_id: number };
  /** Share modal showed weekly contractor view social proof (real count from API). */
  social_proof_seen: { customer_id: number; weekly_views: number };
  /** User tapped a share action after seeing non-zero weekly views. */
  share_clicked_after_social_proof: { customer_id: number; channel: "sms" | "copy" | "facebook" };
  referral_link_clicked: { surface?: string };
  referral_signup: { referrer_user_id: number };
  /** Referral attributed after signup completes (beta funnel). */
  referral_signup_completed: { referrer_user_id: number; source: "share_link" | "contractor_invite" };
  referral_verified: { referrer_user_id: number; referred_user_id: number };
  reward_earned: { free_months: number; source?: string };
};

export type EventName = keyof EventMap;

export const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? "";
export const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export const POSTHOG_CONFIG = {
  apiKey: POSTHOG_API_KEY,
  host: POSTHOG_HOST,
};
