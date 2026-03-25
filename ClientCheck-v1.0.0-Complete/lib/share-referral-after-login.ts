import { track } from "@/lib/analytics";
import * as Api from "@/lib/_core/api";
import { clearPendingShareReferrer, getPendingShareReferrer } from "@/lib/share-referral-pending";

type RecordShareReferralResponse = { ok: boolean; reason?: string };

/**
 * Applies pending `?ref=` referrer id to the signed-in user (once). Safe to call after OAuth completes.
 */
export async function tryApplyPendingShareReferral(): Promise<void> {
  const referrerUserId = await getPendingShareReferrer();
  if (referrerUserId == null) return;

  try {
    const result = await Api.apiCall<RecordShareReferralResponse>("/api/growth/record-share-referral", {
      method: "POST",
      body: JSON.stringify({ referrerUserId }),
    });
    if (result.ok) {
      track("user_signed_up_from_referral", { referrer_user_id: referrerUserId });
      track("referral_signup_completed", { referrer_user_id: referrerUserId, source: "share_link" });
    }
  } catch {
    // Non-blocking; user still lands in the app
  } finally {
    await clearPendingShareReferrer();
  }
}
