/**
 * Membership, verification, and subscription business logic.
 *
 * Pricing policy:
 *   - Verified contractors start on the free tier (limited searches)
 *   - Verification requires a valid contractor license number
 *   - Contractor Pro (monthly or annual) unlocks full intelligence features
 *   - Renewal reminders before expiration
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type VerificationStatus = "not_submitted" | "pending" | "verified" | "rejected";

export type PlanType = "verified_contractor_free_year" | "annual_paid" | "none";

export type MembershipStatus =
  | "inactive"
  | "free_year_active"
  | "paid_active"
  | "expired"
  | "cancelled"
  | "customer_free";

export interface MembershipState {
  membershipStatus: MembershipStatus;
  planType: PlanType;
  verificationStatus: VerificationStatus;
  contractorLicenseNumber: string | null;
  freeTrialStartAt: string | null;
  freeTrialEndAt: string | null;
  nextBillingAmount: number | null;
  nextBillingDate: string | null;
  paymentMethodOnFile: boolean;
  renewalReminderSentAt: string | null;
  daysRemaining: number | null;
}

export interface MembershipDisplay {
  statusLabel: string;
  statusColor: "green" | "yellow" | "red" | "gray";
  statusEmoji: string;
  headline: string;
  description: string;
  showRenewalReminder: boolean;
  renewalReminderText: string | null;
  showAddPayment: boolean;
  expiresAt: string | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const FREE_YEAR_MONTHS = 12;
export const ANNUAL_PRICE = 149.0;
export const ANNUAL_PRICE_DISPLAY = "$149.00";
export const REMINDER_DAYS_BEFORE_EXPIRY = 30;
export const REMINDER_SCHEDULE = [30, 14, 3, 1] as const;
export const MIN_LICENSE_LENGTH = 4;
export const MAX_LICENSE_LENGTH = 30;

// ── Copy (app-store safe) ───────────────────────────────────────────────────

export const PRICING_COPY = {
  freeOffer: "Verified contractors start on the free tier with limited searches",
  licenseRequired: "Contractor license may be required for verification",
  afterFree: `Upgrade to Contractor Pro anytime — annual plan renews at ${ANNUAL_PRICE_DISPLAY}/year`,
  reminderNotice: "You'll be reminded before your free period ends to add payment information",
  renewalPrompt: (days: number) =>
    `Your contractor membership expires in ${days} day${days === 1 ? "" : "s"}. Renew now for ${ANNUAL_PRICE_DISPLAY}/year to keep full access.`,
  renewalHeadline: (days: number) =>
    days <= 1 ? "Your membership expires tomorrow" :
    days <= 3 ? "Your membership expires soon" :
    days <= 14 ? "Membership renewal coming up" :
    "Heads up — renewal approaching",
} as const;

// ── Validation ──────────────────────────────────────────────────────────────

export function validateContractorLicenseNumber(
  input: string | null | undefined,
): { valid: boolean; error?: string } {
  if (!input || !input.trim()) {
    return { valid: false, error: "Contractor license number is required." };
  }
  const trimmed = input.trim();
  if (trimmed.length < MIN_LICENSE_LENGTH) {
    return { valid: false, error: `License number must be at least ${MIN_LICENSE_LENGTH} characters.` };
  }
  if (trimmed.length > MAX_LICENSE_LENGTH) {
    return { valid: false, error: `License number must be ${MAX_LICENSE_LENGTH} characters or fewer.` };
  }
  if (!/^[A-Za-z0-9\-#]+$/.test(trimmed)) {
    return { valid: false, error: "License number can only contain letters, numbers, hyphens, and #." };
  }
  return { valid: true };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function canActivateVerifiedFreeYear(user: {
  verificationStatus?: VerificationStatus | string | null;
  planType?: PlanType | string | null;
  freeTrialStartAt?: string | Date | null;
}): boolean {
  return (
    user.verificationStatus === "verified" &&
    user.planType !== "verified_contractor_free_year" &&
    user.planType !== "annual_paid" &&
    !user.freeTrialStartAt
  );
}

export function computeFreeYearDates(startDate: Date = new Date()): {
  freeTrialStartAt: Date;
  freeTrialEndAt: Date;
  nextBillingDate: Date;
} {
  const freeTrialStartAt = startDate;
  const freeTrialEndAt = new Date(startDate);
  freeTrialEndAt.setMonth(freeTrialEndAt.getMonth() + FREE_YEAR_MONTHS);
  return {
    freeTrialStartAt,
    freeTrialEndAt,
    nextBillingDate: freeTrialEndAt,
  };
}

export function getDaysRemaining(endDate: string | Date | null | undefined): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function isWithinRenewalReminderWindow(user: {
  freeTrialEndAt?: string | Date | null;
  subscriptionEndsAt?: string | Date | null;
  renewalReminderSentAt?: string | Date | null;
}): boolean {
  const endDate = user.subscriptionEndsAt ?? user.freeTrialEndAt;
  if (!endDate) return false;
  const days = getDaysRemaining(endDate);
  if (days === null) return false;
  return days <= REMINDER_DAYS_BEFORE_EXPIRY && days > 0;
}

/**
 * Returns the current reminder milestone (30/14/3/1) the user has reached,
 * or null if no reminder is due. Compares against `lastReminderDaysMilestone`
 * stored on the user to avoid showing the same milestone twice.
 */
export function getCurrentReminderMilestone(
  daysRemaining: number | null,
  lastReminderDaysMilestone?: number | null,
): number | null {
  if (daysRemaining === null || daysRemaining <= 0) return null;
  for (const milestone of REMINDER_SCHEDULE) {
    if (daysRemaining <= milestone) {
      if (lastReminderDaysMilestone != null && lastReminderDaysMilestone <= milestone) {
        return null;
      }
      return milestone;
    }
  }
  return null;
}

export function shouldShowRenewalReminder(user: {
  freeTrialEndAt?: string | Date | null;
  subscriptionEndsAt?: string | Date | null;
  paymentMethodOnFile?: boolean;
  renewalReminderSentAt?: string | Date | null;
  lastReminderDaysMilestone?: number | null;
  planType?: PlanType | string | null;
  status?: string | null;
}): boolean {
  const isContractorPlan = user.planType === "verified_contractor_free_year" ||
    user.planType === "annual_paid" ||
    user.status === "trial" ||
    user.status === "active";
  if (!isContractorPlan) return false;
  const endDate = user.subscriptionEndsAt ?? user.freeTrialEndAt;
  if (!endDate) return false;
  const days = getDaysRemaining(endDate);
  const milestone = getCurrentReminderMilestone(days, user.lastReminderDaysMilestone);
  return milestone !== null;
}

export function isFreeYearExpired(user: {
  freeTrialEndAt?: string | Date | null;
  planType?: PlanType | string | null;
}): boolean {
  if (user.planType !== "verified_contractor_free_year") return false;
  if (!user.freeTrialEndAt) return false;
  return new Date(user.freeTrialEndAt).getTime() <= Date.now();
}

/** Billing / account messaging for customer role (core access is always free). */
export function getCustomerMembershipDisplayState(user: {
  planType?: string | null;
  subscriptionEndsAt?: string | null;
}): MembershipDisplay {
  const pt = user.planType ?? "free_customer";
  const hasPaidAddon =
    pt === "customer_identity_verification" || pt === "customer_monthly";
  if (hasPaidAddon) {
    const exp = user.subscriptionEndsAt
      ? new Date(user.subscriptionEndsAt).toLocaleDateString()
      : null;
    return {
      statusLabel: "Verification add-on",
      statusColor: "green",
      statusEmoji: "✅",
      headline: "Identity verification badge active",
      description:
        "Optional paid badge on your profile. Responding to reviews and disputes stays free.",
      showRenewalReminder: false,
      renewalReminderText: null,
      showAddPayment: false,
      expiresAt: exp,
    };
  }
  return {
    statusLabel: "Free customer account",
    statusColor: "green",
    statusEmoji: "👤",
    headline: "Free account — no subscription required",
    description:
      "View your profile, respond to reviews, and submit disputes at no charge. Optional identity verification badge available anytime from Billing.",
    showRenewalReminder: false,
    renewalReminderText: null,
    showAddPayment: false,
    expiresAt: null,
  };
}

export function getMembershipDisplayState(user: {
  verificationStatus?: VerificationStatus | string | null;
  planType?: PlanType | string | null;
  freeTrialStartAt?: string | Date | null;
  freeTrialEndAt?: string | Date | null;
  paymentMethodOnFile?: boolean;
  renewalReminderSentAt?: string | Date | null;
}): MembershipDisplay {
  const vs = (user.verificationStatus ?? "not_submitted") as VerificationStatus;
  const pt = (user.planType ?? "none") as PlanType;
  const days = getDaysRemaining(user.freeTrialEndAt);
  const showReminder = shouldShowRenewalReminder(user as any);

  if (vs === "not_submitted") {
    return {
      statusLabel: "Not Verified",
      statusColor: "gray",
      statusEmoji: "📋",
      headline: "Verify to unlock the free tier",
      description: PRICING_COPY.freeOffer + ". " + PRICING_COPY.licenseRequired + ".",
      showRenewalReminder: false,
      renewalReminderText: null,
      showAddPayment: false,
      expiresAt: null,
    };
  }

  if (vs === "pending") {
    return {
      statusLabel: "Verification Pending",
      statusColor: "yellow",
      statusEmoji: "⏳",
      headline: "Verification in progress",
      description: "Your contractor license is being reviewed. You'll be notified once approved.",
      showRenewalReminder: false,
      renewalReminderText: null,
      showAddPayment: false,
      expiresAt: null,
    };
  }

  if (vs === "rejected") {
    return {
      statusLabel: "Verification Rejected",
      statusColor: "red",
      statusEmoji: "❌",
      headline: "Verification was not approved",
      description: "Please check your license number and resubmit. Contact support if you believe this is an error.",
      showRenewalReminder: false,
      renewalReminderText: null,
      showAddPayment: false,
      expiresAt: null,
    };
  }

  // verified
  if (pt === "verified_contractor_free_year" && days !== null && days > 0) {
    return {
      statusLabel: "Verified Contractor",
      statusColor: "green",
      statusEmoji: "✅",
      headline: `Free year active — ${days} day${days === 1 ? "" : "s"} remaining`,
      description: `${PRICING_COPY.afterFree}.`,
      showRenewalReminder: showReminder,
      renewalReminderText: showReminder && days !== null ? PRICING_COPY.renewalPrompt(days) : null,
      showAddPayment: showReminder && !user.paymentMethodOnFile,
      expiresAt: user.freeTrialEndAt ? new Date(user.freeTrialEndAt).toLocaleDateString() : null,
    };
  }

  if (pt === "verified_contractor_free_year" && (days === null || days <= 0)) {
    return {
      statusLabel: "Free Year Expired",
      statusColor: "red",
      statusEmoji: "⏱️",
      headline: "Your free membership has ended",
      description: `Continue using ClientCheck for ${ANNUAL_PRICE_DISPLAY}/year.`,
      showRenewalReminder: false,
      renewalReminderText: null,
      showAddPayment: true,
      expiresAt: user.freeTrialEndAt ? new Date(user.freeTrialEndAt).toLocaleDateString() : null,
    };
  }

  if (pt === "annual_paid") {
    return {
      statusLabel: "Annual Member",
      statusColor: "green",
      statusEmoji: "💎",
      headline: "Annual membership active",
      description: `Renews at ${ANNUAL_PRICE_DISPLAY}/year.`,
      showRenewalReminder: false,
      renewalReminderText: null,
      showAddPayment: false,
      expiresAt: null,
    };
  }

  // verified but no plan activated yet
  return {
    statusLabel: "Verified — Activate Free Year",
    statusColor: "green",
    statusEmoji: "🎉",
    headline: "You're verified! Activate your free 12 months",
    description: PRICING_COPY.freeOffer + ". " + PRICING_COPY.afterFree + ".",
    showRenewalReminder: false,
    renewalReminderText: null,
    showAddPayment: false,
    expiresAt: null,
  };
}

// ── Verification status display ─────────────────────────────────────────────

export function getVerificationBadge(status: VerificationStatus | string | null | undefined): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case "verified":
      return { label: "Verified", color: "#16a34a", bgColor: "#16a34a18" };
    case "pending":
      return { label: "Pending Review", color: "#ca8a04", bgColor: "#ca8a0418" };
    case "rejected":
      return { label: "Rejected", color: "#dc2626", bgColor: "#dc262618" };
    default:
      return { label: "Not Submitted", color: "#6b7280", bgColor: "#6b728018" };
  }
}
