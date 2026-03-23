/**
 * Phase 6 — trust layer (optional / phased).
 * Central copy + lightweight eligibility hooks only; no standalone verification engine.
 */

export const TRUST_LABEL = {
  VERIFIED_CONTRACTOR: "Verified Contractor",
  VERIFIED_REPORT: "Verified Report",
  UNDER_REVIEW: "Under Review",
  CUSTOMER_RESPONSE: "Customer Response",
  DISPUTE_SUBMITTED: "Dispute Submitted",
} as const;

/** Contractor profile verification enum from DB (`contractor_profiles.verificationStatus`). */
export function isContractorVerificationBadge(status: string | null | undefined): boolean {
  return status === "verified";
}

type VerifiedReportFields = {
  jobType?: string | null;
  jobDate?: string | null;
  jobAmount?: string | null;
  reviewText?: string | null;
};

/**
 * “Verified report” eligibility — extend criteria here as the product matures.
 * Today: full job evidence (type + date + amount) OR substantive written review (length hook).
 */
export function meetsVerifiedReportCriteria(review: VerifiedReportFields): boolean {
  const jt = (review.jobType ?? "").trim();
  const jd = (review.jobDate ?? "").trim();
  const ja = (review.jobAmount ?? "").trim();
  const hasJobEvidence = !!(jt && jd && ja);
  const substantiveText = (review.reviewText ?? "").trim().length >= 120;
  return hasJobEvidence || substantiveText;
}
