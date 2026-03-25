export type UserRole = "user" | "admin" | "contractor" | "customer";

/** Platform operators: full in-app preview; subscription checks bypass in API (see `checkSubscriptionStatus` / `getMembership`). */
export function isAdmin(user: { role?: string } | null | undefined): boolean {
  return user?.role === "admin";
}

export function isContractor(user: { role?: string } | null | undefined): boolean {
  return user?.role === "contractor" || user?.role === "user";
}

export function isCustomer(user: { role?: string } | null | undefined): boolean {
  return user?.role === "customer";
}

export function canAccessAdmin(user: { role?: string } | null | undefined): boolean {
  return isAdmin(user);
}

export const DISPUTE_REASONS = [
  { value: "incorrect_information", label: "Incorrect or misleading information" },
  { value: "wrong_individual", label: "Wrong individual" },
  { value: "harassment_abuse", label: "Harassment or abusive content" },
  { value: "privacy_concern", label: "Privacy concern" },
  { value: "outdated_information", label: "Outdated information" },
  { value: "other", label: "Other" },
] as const;

export type DisputeReason = typeof DISPUTE_REASONS[number]["value"];

export const DISPUTE_STATUSES = {
  pending: { label: "Pending", color: "#f59e0b" },
  under_review: { label: "Under Review", color: "#3b82f6" },
  awaiting_info: { label: "Awaiting Info", color: "#8b5cf6" },
  resolved: { label: "Resolved", color: "#10b981" },
  rejected: { label: "Rejected", color: "#ef4444" },
  open: { label: "Open", color: "#f59e0b" },
  responded: { label: "Responded", color: "#3b82f6" },
  dismissed: { label: "Dismissed", color: "#6b7280" },
} as const;

export const MODERATION_STATUSES = {
  active: { label: "Active", color: "#10b981" },
  hidden_flagged: { label: "Flagged", color: "#ef4444" },
  under_investigation: { label: "Investigating", color: "#f59e0b" },
  removed: { label: "Removed", color: "#6b7280" },
} as const;
