/**
 * Routes that require user.role === "admin". Used after OAuth and for guards.
 * Excludes /admin-login (public explainer only).
 *
 * Legacy standalone screens (no longer linked; redirect to `/admin` for admins only):
 * `/admin-refunds-pricing`, `/admin-dispute-management`, `/admin-dispute-analytics`,
 * `/admin-account-suspension`, `/admin-dashboard`, `/admin-disputes`, `/admin-moderation`.
 */
export function isAdminOnlyDestination(path: string): boolean {
  const p = path.split("?")[0]?.trim() ?? "";
  if (!p) return false;
  if (p === "/admin") return true;
  return p.startsWith("/admin-");
}
