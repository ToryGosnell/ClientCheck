/**
 * UI copy for review moderation statuses (matches drizzle moderationStatus enum).
 * Presentation only — does not change moderation rules.
 */

export type ModerationStatusKey = "active" | "hidden_flagged" | "under_investigation" | "removed";

export const REVIEW_MODERATION_UI: Record<
  ModerationStatusKey,
  { label: string; sublabel: string; accent: string; bg: string }
> = {
  active: {
    label: "Active",
    sublabel: "Visible to contractors",
    accent: "#10b981",
    bg: "#10b98118",
  },
  hidden_flagged: {
    label: "Under Review",
    sublabel: "Hidden while flagged content is evaluated",
    accent: "#f59e0b",
    bg: "#f59e0b18",
  },
  under_investigation: {
    label: "Under Review",
    sublabel: "Moderation in progress",
    accent: "#f97316",
    bg: "#f9731618",
  },
  removed: {
    label: "Removed",
    sublabel: "No longer shown publicly",
    accent: "#ef4444",
    bg: "#ef444418",
  },
};

export function getModerationUi(status: string | undefined | null) {
  const key = (status ?? "active") as ModerationStatusKey;
  return REVIEW_MODERATION_UI[key] ?? REVIEW_MODERATION_UI.active;
}
