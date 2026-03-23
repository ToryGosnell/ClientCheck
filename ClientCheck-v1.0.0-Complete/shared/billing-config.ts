/**
 * Centralized billing configuration.
 * All pricing, plan types, and Stripe product references live here.
 * Both server and client import from this file for consistency.
 */

// ── Plan types ────────────────────────────────────────────────────────────────

export type BillingPlanType =
  | "verified_contractor_free_year"
  | "contractor_annual"
  | "customer_monthly"
  | "none";

export type SubscriptionStatus = "trial" | "active" | "cancelled" | "expired";

// ── Pricing constants ─────────────────────────────────────────────────────────

export const CONTRACTOR_ANNUAL_PRICE_CENTS = 12000; // $120.00
export const CONTRACTOR_ANNUAL_PRICE_DISPLAY = "$120.00";

export const CUSTOMER_MONTHLY_PRICE_CENTS = 999; // $9.99
export const CUSTOMER_MONTHLY_PRICE_DISPLAY = "$9.99";

export const CONTRACTOR_FREE_YEAR_MONTHS = 12;

// ── Stripe product & price IDs ───────────────────────────────────────────────
// Created via Stripe MCP plugin. Override with env vars if needed.

export const STRIPE_PRODUCT_ID_CONTRACTOR = process.env.STRIPE_PRODUCT_ID_CONTRACTOR || "prod_UBtvKn3aCsXHU3";
export const STRIPE_PRODUCT_ID_CUSTOMER = process.env.STRIPE_PRODUCT_ID_CUSTOMER || "prod_UBtvxiCvktU4oo";

export const STRIPE_PRICE_ID_CONTRACTOR_ANNUAL = process.env.STRIPE_PRICE_ID_YEARLY || "price_1TDW8DA5TLBlpCILStwOTXZf";
export const STRIPE_PRICE_ID_CUSTOMER_MONTHLY = process.env.STRIPE_PRICE_ID_MONTHLY || "price_1TDW8KA5TLBlpCILQe0qFO4n";

export function getStripePriceId(plan: "contractor_annual" | "customer_monthly"): string | null {
  switch (plan) {
    case "contractor_annual":
      return STRIPE_PRICE_ID_CONTRACTOR_ANNUAL;
    case "customer_monthly":
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
      return "Contractor Annual";
    case "customer_monthly":
      return "Customer Monthly";
    case "none":
      return "No Plan";
    default:
      return "Unknown";
  }
}

export function getPlanPrice(plan: BillingPlanType): { cents: number; display: string; interval: string } | null {
  switch (plan) {
    case "contractor_annual":
      return { cents: CONTRACTOR_ANNUAL_PRICE_CENTS, display: CONTRACTOR_ANNUAL_PRICE_DISPLAY, interval: "year" };
    case "customer_monthly":
      return { cents: CUSTOMER_MONTHLY_PRICE_CENTS, display: CUSTOMER_MONTHLY_PRICE_DISPLAY, interval: "month" };
    case "verified_contractor_free_year":
      return { cents: 0, display: "Free", interval: "year" };
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
  displayName: "Contractor Access",
  description: "Access customer history, reduce risk, and protect your business before taking new jobs.",
  priceDisplay: "$120",
  cadence: "/year",
  priceCents: CONTRACTOR_ANNUAL_PRICE_CENTS,
  features: [
    "Search contractor customer experiences",
    "View risk signals before accepting jobs",
    "Track reviews and account activity",
    "Access the contractor platform without license verification",
  ],
  trustItems: [
    "Secure payment",
    "Processed by Stripe",
    "Clear annual billing",
    "No hidden fees",
  ],
  ctaLabel: "Unlock full report",
  successRoute: "/payment-success",
  cancelRoute: "/payment-cancelled",
};

export const CUSTOMER_MONTHLY_PLAN: PlanConfig = {
  id: "customer_monthly",
  displayName: "Customer Membership",
  description: "Manage your profile, respond to reviews, and dispute inaccurate feedback.",
  priceDisplay: "$9.99",
  cadence: "/month",
  priceCents: CUSTOMER_MONTHLY_PRICE_CENTS,
  features: [
    "View your account activity",
    "Respond to reviews",
    "Submit dispute requests",
    "Manage membership in your account settings",
  ],
  trustItems: [
    "Secure payment",
    "Processed by Stripe",
    "Monthly billing",
    "Cancel anytime",
  ],
  ctaLabel: "Start Membership",
  successRoute: "/customer-payment-success",
  cancelRoute: "/payment-cancelled",
};

export function getPlanConfig(plan: BillingPlanType): PlanConfig | null {
  if (plan === "contractor_annual") return CONTRACTOR_ANNUAL_PLAN;
  if (plan === "customer_monthly") return CUSTOMER_MONTHLY_PLAN;
  return null;
}

// ── Billing copy (Google Play / App Store safe) ───────────────────────────────

export const BILLING_COPY = {
  contractorFreeYear: "12 months free for all contractors from signup.",
  contractorAnnualRenewal: `After the free period, membership renews at ${CONTRACTOR_ANNUAL_PRICE_DISPLAY}/year.`,
  customerFree: "Customer accounts are free and include dispute tools.",
  renewalReminder: "You'll be reminded before your membership renews.",
  paymentSecure: "Payments are processed securely through Stripe. We never store your card details.",
} as const;
