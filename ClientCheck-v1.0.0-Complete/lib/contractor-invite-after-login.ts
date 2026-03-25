import { track } from "@/lib/analytics";
import * as Api from "@/lib/_core/api";
import { clearPendingContractorInviteReferrer, getPendingContractorInviteReferrer } from "@/lib/contractor-invite-pending";

type RecordInviteResponse = { ok: boolean; duplicate?: boolean; reason?: string };

/**
 * Applies pending `/invite?ref=` after OAuth (contractor signup). Runs before share-link referral.
 * Skips (and keeps storage) if the signed-in user is not a contractor-class account.
 */
export async function tryApplyPendingContractorInviteReferral(): Promise<void> {
  const referrerId = await getPendingContractorInviteReferrer();
  if (referrerId == null) return;

  try {
    const me = await Api.getMe();
    if (!me?.id) return;
    const role = me.role ?? "";
    if (role !== "contractor" && role !== "user") return;

    const result = await Api.apiCall<RecordInviteResponse>("/api/growth/record-contractor-invite-referral", {
      method: "POST",
      body: JSON.stringify({ referrerId }),
    });
    if (result.ok && !result.duplicate) {
      track("referral_signup", { referrer_user_id: referrerId });
      track("referral_signup_completed", { referrer_user_id: referrerId, source: "contractor_invite" });
    }
  } catch {
    /* non-blocking */
  } finally {
    await clearPendingContractorInviteReferrer();
  }
}
