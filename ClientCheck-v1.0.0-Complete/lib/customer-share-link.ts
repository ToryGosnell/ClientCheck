/**
 * Public share URLs for customer profiles (`/c/:id?ref=:userId`).
 */

export function getPublicAppBaseUrl(): string {
  const env = process.env.EXPO_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (env) return env;
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return "https://clientcheck.com";
}

export function generateShareLink(customerId: number, userId: number): string {
  const base = getPublicAppBaseUrl();
  const cid = Math.floor(customerId);
  const uid = Math.floor(userId);
  return `${base}/c/${cid}?ref=${uid}`;
}

export function buildCustomerShareDeepLink(customerId: number, referrerUserId?: number): string {
  const cid = Math.floor(customerId);
  const ref = referrerUserId != null && Number.isFinite(referrerUserId) ? Math.floor(referrerUserId) : null;
  const q = ref != null && ref > 0 ? `?ref=${ref}` : "";
  return `clientcheck://c/${cid}${q}`;
}
