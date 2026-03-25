import { ADMIN_SIDEBAR_NAV, type AdminConsoleTab } from "./admin-sidebar-nav";

/** Which standalone admin screen is currently mounted (for no-op when clicking same area). */
export type AdminStandaloneScreen = "customers" | "verification";

type PushRouter = { push: (path: string) => void };

/**
 * Deep-link into the unified console tab from outside `/admin`.
 * Only tabs present on `ADMIN_SIDEBAR_NAV` are valid targets.
 */
export function buildAdminConsoleHref(tab: AdminConsoleTab): string {
  return `/admin?tab=${encodeURIComponent(tab)}`;
}

type ConsoleNavOpts = { context: "console"; setTab: (t: AdminConsoleTab) => void };
type StandaloneNavOpts = { context: "standalone"; current: AdminStandaloneScreen };

/**
 * Single sidebar click handler for admin surfaces.
 *
 * Destinations:
 * - **Customers** → `/admin-customers` (standalone directory).
 * - **Verification** from a standalone screen → `/admin-verification` (dedicated queue UI).
 * - **Verification** from `/admin` → in-shell tab (same data as standalone; no remount).
 * - **All other keys** with a `tab` → from standalone: `/admin?tab=…`; from console: `setTab`.
 *
 * Nothing falls through to a bare `/admin` except when the key is unknown (no-op).
 */
export function navigateAdminSidebarSelection(
  router: PushRouter,
  key: string,
  opts: ConsoleNavOpts | StandaloneNavOpts,
): void {
  const item = ADMIN_SIDEBAR_NAV.find((n) => n.key === key);
  if (!item) return;

  if (item.route === "customers") {
    if (opts.context === "standalone" && opts.current === "customers") return;
    router.push("/admin-customers");
    return;
  }

  if (item.key === "verification") {
    if (opts.context === "standalone" && opts.current === "verification") return;
    if (opts.context === "standalone") {
      router.push("/admin-verification");
      return;
    }
    opts.setTab("verification");
    return;
  }

  if (!item.tab) return;

  if (opts.context === "console") {
    opts.setTab(item.tab);
    return;
  }

  router.push(buildAdminConsoleHref(item.tab));
}

/** @deprecated Prefer `navigateAdminSidebarSelection` — kept for stable imports. */
export function navigateFromAdminStandalone(router: PushRouter, key: string, current: AdminStandaloneScreen) {
  navigateAdminSidebarSelection(router, key, { context: "standalone", current });
}
