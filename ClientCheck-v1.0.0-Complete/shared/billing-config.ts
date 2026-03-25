/**
 * Centralized billing configuration.
 * All pricing, plan types, and Stripe product references live here.
 * Both server and client import from this file for consistency.
 */

// ── Plan types ────────────────────────────────────────────────────────────────

/** Persisted on `subscriptions.planType` (MySQL enum). */
export type DbSubscriptionPlanType =
  | "verified_contractor_free_year"
  | "contractor_annual"
  | "contractor_pro_monthly"
  | "customer_monthly"
  | "annual_paid"
  | "none";

/** UI + API: includes virtual plans not stored in the database. */
export type BillingPlanType =
  | DbSubscriptionPlanType
  | "free_customer"
  | "customer_identity_verification";

export type SubscriptionStatus = "trial" | "active" | "cancelled" | "expired";

/** App checkout: distinguishes contractor Pro vs customer identity when using `plan` monthly/yearly. */
export type AppSubscriptionProductLine = "customer_identity" | "contractor_pro";

// ── Contractor Pro pricing ───────────────────────────────────────────────────

export const CONTRACTOR_FREE_TIER_LABEL = "Free";
export const CONTRACTOR_FREE_TIER_SEARCH_LIMIT_NOTE = "Limited searches";

export const CONTRACTOR_PRO_MONTHLY_PRICE_CENTS = 1900; // $19.00
export const CONTRACTOR_PRO_MONTHLY_PRICE_DISPLAY = "$19";

export const CONTRACTOR_PRO_ANNUAL_PRICE_CENTS = 14900; // $149.00
export const CONTRACTOR_PRO_ANNUAL_PRICE_DISPLAY = "$149";

/** Pro feature list (marketing / paywalls). */
export const CONTRACTOR_PRO_FEATURES = [
  "Unlimited search",
  "Risk scores",
  "Red flags",
  "Alerts",
] as const;

/** @deprecated Use CONTRACTOR_PRO_ANNUAL_* — kept for imports that still reference annual contractor price. */
export const CONTRACTOR_ANNUAL_PRICE_CENTS = CONTRACTOR_PRO_ANNUAL_PRICE_CENTS;
/** @deprecated Use CONTRACTOR_PRO_ANNUAL_PRICE_DISPLAY */
export const CONTRACTOR_ANNUAL_PRICE_DISPLAY = CONTRACTOR_PRO_ANNUAL_PRICE_DISPLAY;

// ── Customer pricing (no required subscription) ───────────────────────────────

export const CUSTOMER_VIEW_RESPOND_FREE_LINE =
  "Customers can view and respond for free. Optional tools available.";

/** Shown where a subscription was once implied — use with pay-per-dispute + monitoring context. */
export const CUSTOMER_NO_SUBSCRIPTION_REQUIRED_LINE = CUSTOMER_VIEW_RESPOND_FREE_LINE;

/** Short account-status line for customer billing / profile surfaces. */
export const CUSTOMER_FREE_ACCOUNT_NO_SUBSCRIPTION_LINE = "Free account — no subscription required.";

export const CUSTOMER_PAY_PER_DISPUTE_LABEL = "Pay-per-dispute";
export const CUSTOMER_PAY_PER_DISPUTE_NOTE =
  "Submit disputes when you need to; you pay only for that dispute flow — not a monthly membership.";

export const CUSTOMER_OPTIONAL_MONITORING_LABEL = "Optional monitoring plan";
export const CUSTOMER_OPTIONAL_MONITORING_NOTE =
  "Add monitoring if you want ongoing alerts and tools beyond the free account.";

/** Optional customer identity verification badge (monthly). */
export const CUSTOMER_IDENTITY_VERIFICATION_PRICE_CENTS = 999; // $9.99
export const CUSTOMER_IDENTITY_VERIFICATION_PRICE_DISPLAY = "$9.99";

/** @deprecated Use CUSTOMER_IDENTITY_VERIFICATION_PRICE_CENTS */
export const CUSTOMER_MONTHLY_PRICE_CENTS = CUSTOMER_IDENTITY_VERIFICATION_PRICE_CENTS;
/** @deprecated Use CUSTOMER_IDENTITY_VERIFICATION_PRICE_DISPLAY */
export const CUSTOMER_MONTHLY_PRICE_DISPLAY = CUSTOMER_IDENTITY_VERIFICATION_PRICE_DISPLAY;

export const CONTRACTOR_FREE_YEAR_MONTHS = 12;

// ── Stripe product & price IDs ───────────────────────────────────────────────

export const STRIPE_PRODUCT_ID_CONTRACTOR = process.env.STRIPE_PRODUCT_ID_CONTRACTOR || "prod_UBtvKn3aCsXHU3";
export const STRIPE_PRODUCT_ID_CUSTOMER = process.env.STRIPE_PRODUCT_ID_CUSTOMER || "prod_UBtvxiCvktU4oo";

export const STRIPE_PRICE_ID_CONTRACTOR_ANNUAL = process.env.STRIPE_PRICE_ID_YEARLY || "price_1TDW8DA5TLBlpCILStwOTXZf";
/** Create a $19/mo price in Stripe and set STRIPE_PRICE_ID_CONTRACTOR_PRO_MONTHLY. */
export const STRIPE_PRICE_ID_CONTRACTOR_PRO_MONTHLY =
  process.env.STRIPE_PRICE_ID_CONTRACTOR_PRO_MONTHLY || process.env.STRIPE_PRICE_ID_CONTRACTOR_MONTHLY || "";
export const STRIPE_PRICE_ID_CUSTOMER_MONTHLY = process.env.STRIPE_PRICE_ID_MONTHLY || "price_1TDW8KA5TLBlpCILQe0qFO4n";

/** Stripe Checkout for customer identity verification (POST /api/billing/identity-checkout). */
export const STRIPE_PRICE_ID_CUSTOMER_IDENTITY_CHECKOUT =
  process.env.STRIPE_IDENTITY_PRICE_ID?.trim() || STRIPE_PRICE_ID_CUSTOMER_MONTHLY;

export type StripePricePlanKey =
  | "contractor_annual"
  | "contractor_pro_monthly"
  | "customer_monthly"
  | "customer_identity_verification";

export function getStripePriceId(plan: StripePricePlanKey): string | null {
  switch (plan) {
    case "contractor_annual":
      return STRIPE_PRICE_ID_CONTRACTOR_ANNUAL;
    case "contractor_pro_monthly":
      return STRIPE_PRICE_ID_CONTRACTOR_PRO_MONTHLY || null;
    case "customer_monthly":
    case "customer_identity_verification":
      return STRIPE_PRICE_ID_CUSTOMER_MONTHLY;
    default:
      return null;
  }
}

// ── Display helpers ───────────────────────────────────────────────────────────

export function getPlanDisplayName(plan: BillingPlanType): string {
  switch (plan) {
    case "verified_contractor_free_year":
      return "Verified Contractor — Free Year";
    case "contractor_annual":
      return "Contractor Pro — Annual";
    case "contractor_pro_monthly":
      return "Contractor Pro — Monthly";
    case "customer_monthly":
    case "customer_identity_verification":
      return "Customer — Identity verification";
    case "free_customer":
      return "Customer — Free";
    case "none":
      return "No Plan";
    default:
      return "Unknown";
  }
}

export function getPlanPrice(plan: BillingPlanType): { cents: number; display: string; interval: string } | null {
  switch (plan) {
    case "contractor_annual":
      return {
        cents: CONTRACTOR_PRO_ANNUAL_PRICE_CENTS,
        display: CONTRACTOR_PRO_ANNUAL_PRICE_DISPLAY,
        interval: "year",
      };
    case "contractor_pro_monthly":
      return {
        cents: CONTRACTOR_PRO_MONTHLY_PRICE_CENTS,
        display: CONTRACTOR_PRO_MONTHLY_PRICE_DISPLAY,
        interval: "month",
      };
    case "customer_monthly":
    case "customer_identity_verification":
      return {
        cents: CUSTOMER_IDENTITY_VERIFICATION_PRICE_CENTS,
        display: CUSTOMER_IDENTITY_VERIFICATION_PRICE_DISPLAY,
        interval: "month",
      };
    case "verified_contractor_free_year":
      return { cents: 0, display: "Free", interval: "year" };
    case "free_customer":
      return { cents: 0, display: "Free", interval: "none" };
    default:
      return null;
  }
}

// ── Full plan display definitions ─────────────────────────────────────────────

export interface PlanConfig {
  id: BillingPlanType;
  displayName: string;
  description: string;
  priceDisplay: string;
  cadence: string;
  priceCents: number;
  features: string[];
  trustItems: string[];
  ctaLabel: string;
  successRoute: string;
  cancelRoute: string;
}

export const CONTRACTOR_ANNUAL_PLAN: PlanConfig = {
  id: "contractor_annual",
  displayName: "Contractor Pro — Annual",
  description: `Full contractor intelligence: ${CONTRACTOR_PRO_FEATURES.join(", ").toLowerCase()}.`,
  priceDisplay: CONTRACTOR_PRO_ANNUAL_PRICE_DISPLAY,
  cadence: "/year",
  priceCents: CONTRACTOR_PRO_ANNUAL_PRICE_CENTS,
  features: [...CONTRACTOR_PRO_FEATURES],
  trustItems: [
    "Secure payment",
    "Processed by Stripe",
    "Clear annual billing",
    "No hidden fees",
  ],
  ctaLabel: "Subscribe annually",
  successRoute: "/payment-success",
  cancelRoute: "/payment-cancelled",
};

export const CONTRACTOR_PRO_MONTHLY_PLAN: PlanConfig = {
  id: "contractor_pro_monthly",
  displayName: "Contractor Pro — Monthly",
  description: `Same Pro features, billed monthly: ${CONTRACTOR_PRO_FEATURES.join(", ").toLowerCase()}.`,
  priceDisplay: CONTRACTOR_PRO_MONTHLY_PRICE_DISPLAY,
  cadence: "/month",
  priceCents: CONTRACTOR_PRO_MONTHLY_PRICE_CENTS,
  features: [...CONTRACTOR_PRO_FEATURES],
  trustItems: ["Secure payment", "Processed by Stripe", "Monthly billing", "Cancel anytime"],
  ctaLabel: "Subscribe monthly",
  successRoute: "/payment-success",
  cancelRoute: "/payment-cancelled",
};

/** Optional paid add-on. Core customer account, reviews, responses are free. */
export const CUSTOMER_IDENTITY_VERIFICATION_PLAN: PlanConfig = {
  id: "customer_identity_verification",
  displayName: "Identity verification badge",
  description:
    "Optional: verified badge on your profile. Not required to view, respond, or use pay-per-dispute / monitoring.",
  priceDisplay: CUSTOMER_IDENTITY_VERIFICATION_PRICE_DISPLAY,
  cadence: "/month",
  priceCents: CUSTOMER_IDENTITY_VERIFICATION_PRICE_CENTS,
  features: [
    "Verified identity badge on your profile",
    "Cancel anytime (Stripe)",
    CUSTOMER_VIEW_RESPOND_FREE_LINE,
  ],
  trustItems: [
    "Secure payment",
    "Processed by Stripe",
    "Monthly billing",
    "Cancel anytime",
  ],
  ctaLabel: "Add verification badge",
  successRoute: "/customer-payment-success",
  cancelRoute: "/payment-cancelled",
};

/** @deprecated Use CUSTOMER_IDENTITY_VERIFICATION_PLAN */
export const CUSTOMER_MONTHLY_PLAN = CUSTOMER_IDENTITY_VERIFICATION_PLAN;

export function getPlanConfig(plan: BillingPlanType): PlanConfig | null {
  if (plan === "contractor_annual") return CONTRACTOR_ANNUAL_PLAN;
  if (plan === "contractor_pro_monthly") return CONTRACTOR_PRO_MONTHLY_PLAN;
  if (plan === "customer_monthly" || plan === "customer_identity_verification") {
    return CUSTOMER_IDENTITY_VERIFICATION_PLAN;
  }
  return null;
}

// ── Billing copy (Google Play / App Store safe) ───────────────────────────────

export const BILLING_COPY = {
  contractorFreeTier: `Contractor Free: ${CONTRACTOR_FREE_TIER_SEARCH_LIMIT_NOTE} — upgrade to Pro anytime.`,
  contractorPro: `Contractor Pro: ${CONTRACTOR_PRO_MONTHLY_PRICE_DISPLAY}/month or ${CONTRACTOR_PRO_ANNUAL_PRICE_DISPLAY}/year — unlimited search, risk scores, red flags, and alerts.`,
  contractorFreeYear: "Verified contractors may qualify for a promotional free period after license verification.",
  contractorAnnualRenewal: `Pro renews at ${CONTRACTOR_PRO_ANNUAL_PRICE_DISPLAY}/year on annual billing.`,
  customerFree: `${CUSTOMER_FREE_ACCOUNT_NO_SUBSCRIPTION_LINE} ${CUSTOMER_VIEW_RESPOND_FREE_LINE}`,
  customerSecondary: CUSTOMER_VIEW_RESPOND_FREE_LINE,
  renewalReminder: "You'll be reminded before your membership renews.",
  paymentSecure: "Payments are processed securely through Stripe. We never store your card details.",
} as const;
