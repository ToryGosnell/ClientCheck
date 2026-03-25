import { Ionicons } from "@expo/vector-icons";

export type AdminNavIcon = keyof typeof Ionicons.glyphMap;

/** Tabs rendered inside `app/admin.tsx` (unified console). */
export type AdminConsoleTab =
  | "overview"
  | "moderation"
  | "users"
  | "reviews"
  | "disputes"
  | "verification"
  | "payments"
  | "subscriptions"
  | "activity"
  | "betaFunnel"
  | "analytics";

/**
 * Single source of truth for AdminShell sidebar labels/order.
 * `tab` = in-console tab; omit when navigating to a separate route only.
 */
export type AdminSidebarNavItem = {
  key: string;
  label: string;
  groupLabel: string;
  icon: AdminNavIcon;
  tab?: AdminConsoleTab;
  /** Separate Expo route (not a tab inside /admin). */
  route?: "customers";
};

export const ADMIN_SIDEBAR_NAV: AdminSidebarNavItem[] = [
  { key: "overview", label: "Dashboard", tab: "overview", groupLabel: "Command", icon: "speedometer-outline" },
  { key: "users", label: "Users", tab: "users", groupLabel: "Operations", icon: "people-outline" },
  { key: "reviews", label: "Reviews", tab: "reviews", groupLabel: "Operations", icon: "document-text-outline" },
  { key: "disputes", label: "Disputes", tab: "disputes", groupLabel: "Operations", icon: "alert-circle-outline" },
  { key: "verification", label: "Verification", tab: "verification", groupLabel: "Operations", icon: "shield-checkmark-outline" },
  { key: "customers", label: "Customers", route: "customers", groupLabel: "Operations", icon: "business-outline" },
  { key: "analytics", label: "Analytics", tab: "analytics", groupLabel: "Operations", icon: "bar-chart-outline" },
  { key: "moderation", label: "Moderation", tab: "moderation", groupLabel: "Queues", icon: "flag-outline" },
  { key: "betaFunnel", label: "Beta funnel", tab: "betaFunnel", groupLabel: "Insights", icon: "pulse-outline" },
  { key: "payments", label: "Payments", tab: "payments", groupLabel: "Finance", icon: "card-outline" },
  { key: "subscriptions", label: "Subscriptions", tab: "subscriptions", groupLabel: "Finance", icon: "repeat-outline" },
  { key: "activity", label: "Activity log", tab: "activity", groupLabel: "Audit", icon: "list-outline" },
];

export function adminShellNavItems() {
  return ADMIN_SIDEBAR_NAV.map(({ key, label, groupLabel, icon }) => ({ key, label, groupLabel, icon }));
}

/** Sidebar highlight for the unified `/admin` console (matches `AdminShell` `activeNavKey`). */
export function adminShellActiveNavKeyForTab(tab: AdminConsoleTab): string {
  return ADMIN_SIDEBAR_NAV.find((n) => n.tab === tab)?.key ?? "overview";
}

/**
 * Validates `?tab=` on `/admin` against configured nav (no arbitrary strings).
 * Accepts a string or first element when Expo passes an array.
 */
export function parseAdminConsoleTabQueryParam(raw: unknown): AdminConsoleTab | null {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (typeof s !== "string" || s.length === 0) return null;
  const row = ADMIN_SIDEBAR_NAV.find((n) => n.tab === s);
  return row?.tab ?? null;
}
