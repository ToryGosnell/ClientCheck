/**
 * Contractor invite referrals: /invite?ref= → signup → verified contractor → milestones of 5 → free month credit.
 */

import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { contractorInviteReferrals, contractorProfiles, users } from "../drizzle/schema";
import { getDb } from "./db";
import * as subDb from "./subscription-db";
import { capturePostHogServer } from "./posthog-server-capture";

function addMonths(d: Date, months: number): Date {
  const x = new Date(d.getTime());
  const day = x.getDate();
  x.setMonth(x.getMonth() + months);
  if (x.getDate() < day) x.setDate(0);
  return x;
}

/** Referrer must be a contractor-class account (not customer/admin). */
export function canEarnContractorInviteRewards(role: string | null | undefined): boolean {
  return role === "contractor" || role === "user";
}

function isContractorClassUser(role: string | null | undefined): boolean {
  return role === "contractor" || role === "user";
}

export type RecordInviteSignupResult =
  | { ok: true; duplicate?: boolean }
  | { ok: false; reason: "invalid" | "self" | "referrer_not_found" | "referrer_not_contractor" | "not_contractor" | "no_db" };

/**
 * Called after OAuth when the new user signed up as a contractor with ?ref= stored client-side.
 */
export async function recordContractorInviteSignup(params: {
  referredUserId: number;
  referrerId: number;
}): Promise<RecordInviteSignupResult> {
  const referredUserId = Math.floor(Number(params.referredUserId));
  const referrerId = Math.floor(Number(params.referrerId));
  if (!Number.isFinite(referredUserId) || referredUserId < 1 || !Number.isFinite(referrerId) || referrerId < 1) {
    return { ok: false, reason: "invalid" };
  }
  if (referredUserId === referrerId) {
    return { ok: false, reason: "self" };
  }

  const db = await getDb();
  if (!db) return { ok: false, reason: "no_db" };

  const [referred] = await db.select().from(users).where(eq(users.id, referredUserId)).limit(1);
  if (!referred || !isContractorClassUser(referred.role)) {
    return { ok: false, reason: "not_contractor" };
  }

  const [referrer] = await db.select().from(users).where(eq(users.id, referrerId)).limit(1);
  if (!referrer) return { ok: false, reason: "referrer_not_found" };
  if (!canEarnContractorInviteRewards(referrer.role)) {
    return { ok: false, reason: "referrer_not_contractor" };
  }

  const [existing] = await db
    .select({ id: contractorInviteReferrals.id })
    .from(contractorInviteReferrals)
    .where(eq(contractorInviteReferrals.referredUserId, referredUserId))
    .limit(1);
  if (existing) {
    return { ok: true, duplicate: true };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(contractorInviteReferrals).values({
        referrerId,
        referredUserId,
        isVerified: false,
      });
      await tx
        .update(users)
        .set({ referralCount: sql`${users.referralCount} + 1` })
        .where(eq(users.id, referrerId));
      await tx
        .update(users)
        .set({ referredByUserId: referrerId })
        .where(and(eq(users.id, referredUserId), sql`${users.referredByUserId} IS NULL`));
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Duplicate") || msg.includes("duplicate")) {
      return { ok: true, duplicate: true };
    }
    console.error("[recordContractorInviteSignup]", e);
    return { ok: false, reason: "no_db" };
  }
}

export type ReferralVerificationResult = {
  verified: boolean;
  rewardGranted: boolean;
  newVerifiedCount?: number;
};

/**
 * When a contractor profile becomes fully verified, count toward referrer milestones.
 */
export async function processContractorInviteReferralOnVerified(referredUserId: number): Promise<ReferralVerificationResult> {
  const uid = Math.floor(Number(referredUserId));
  if (!Number.isFinite(uid) || uid < 1) return { verified: false, rewardGranted: false };

  const db = await getDb();
  if (!db) return { verified: false, rewardGranted: false };

  const [profile] = await db
    .select({ verificationStatus: contractorProfiles.verificationStatus })
    .from(contractorProfiles)
    .where(eq(contractorProfiles.userId, uid))
    .limit(1);
  if (!profile || profile.verificationStatus !== "verified") {
    return { verified: false, rewardGranted: false };
  }

  const [row] = await db
    .select()
    .from(contractorInviteReferrals)
    .where(eq(contractorInviteReferrals.referredUserId, uid))
    .limit(1);
  if (!row || row.isVerified) {
    return { verified: false, rewardGranted: false };
  }

  let rewardGranted = false;
  let newVerifiedCount: number | undefined;
  let extendReferrerId: number | null = null;
  let extendNewEnd: Date | null = null;
  let didVerifyReferral = false;

  await db.transaction(async (tx) => {
    const [fresh] = await tx
      .select()
      .from(contractorInviteReferrals)
      .where(eq(contractorInviteReferrals.referredUserId, uid))
      .limit(1);
    if (!fresh || fresh.isVerified) return;
    didVerifyReferral = true;

    await tx
      .update(contractorInviteReferrals)
      .set({ isVerified: true })
      .where(eq(contractorInviteReferrals.id, fresh.id));

    await tx
      .update(users)
      .set({ verifiedReferralCount: sql`${users.verifiedReferralCount} + 1` })
      .where(eq(users.id, fresh.referrerId));

    const [referrerAfter] = await tx.select().from(users).where(eq(users.id, fresh.referrerId)).limit(1);
    if (!referrerAfter) return;
    const vCount = referrerAfter.verifiedReferralCount ?? 0;
    newVerifiedCount = vCount;

    if (vCount > 0 && vCount % 5 === 0 && canEarnContractorInviteRewards(referrerAfter.role)) {
      rewardGranted = true;
      const now = new Date();
      let anchor: Date | null = referrerAfter.subscriptionExtendedUntil ?? null;
      if (!anchor || anchor < now) {
        const sub = await subDb.getSubscription(fresh.referrerId);
        if (sub?.subscriptionEndsAt && sub.subscriptionEndsAt > now) anchor = sub.subscriptionEndsAt;
        else if (sub?.trialEndsAt && sub.trialEndsAt > now) anchor = sub.trialEndsAt;
        else anchor = now;
      }
      const newEnd = addMonths(anchor, 1);
      await tx
        .update(users)
        .set({
          subscriptionExtendedUntil: newEnd,
          freeMonthsEarned: sql`${users.freeMonthsEarned} + 1`,
          referralRewardUnseen: true,
        })
        .where(eq(users.id, fresh.referrerId));
      extendReferrerId = fresh.referrerId;
      extendNewEnd = newEnd;
    }
  });

  if (extendReferrerId != null && extendNewEnd != null) {
    await subDb.extendSubscriptionEndDate(extendReferrerId, extendNewEnd);
  }

  if (!didVerifyReferral) {
    return { verified: false, rewardGranted: false };
  }

  const referrerId = row.referrerId;
  capturePostHogServer("referral_verified", String(referrerId), {
    referrer_user_id: referrerId,
    referred_user_id: uid,
  });
  if (rewardGranted) {
    capturePostHogServer("reward_earned", String(referrerId), {
      free_months: 1,
      source: "contractor_invite",
    });
  }

  return { verified: true, rewardGranted, newVerifiedCount };
}

export async function getContractorReferralDashboard(userId: number): Promise<{
  referralCount: number;
  verifiedReferralCount: number;
  freeMonthsEarned: number;
  subscriptionExtendedUntil: Date | null;
  nextReferralsUntilReward: number;
  referralRewardUnseen: boolean;
} | null> {
  const db = await getDb();
  if (!db) return null;
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return null;
  const verified = u.verifiedReferralCount ?? 0;
  const mod = verified % 5;
  const nextReferralsUntilReward = mod === 0 && verified > 0 ? 5 : 5 - mod;
  return {
    referralCount: u.referralCount ?? 0,
    verifiedReferralCount: verified,
    freeMonthsEarned: u.freeMonthsEarned ?? 0,
    subscriptionExtendedUntil: u.subscriptionExtendedUntil ?? null,
    nextReferralsUntilReward,
    referralRewardUnseen: u.referralRewardUnseen ?? false,
  };
}

export async function clearReferralRewardUnseen(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ referralRewardUnseen: false }).where(eq(users.id, userId));
}

function leaderboardDisplayName(company: string | null | undefined, name: string | null | undefined): string {
  const c = typeof company === "string" ? company.trim() : "";
  if (c.length > 0) return c;
  const n = typeof name === "string" ? name.trim() : "";
  if (n.length > 0) return n;
  return "Contractor";
}

/** Top contractors by verified referral count (active accounts only). For profile teaser; not a full leaderboard product. */
export async function getContractorReferralLeaderboardPreview(limit: number): Promise<
  { userId: number; displayName: string; verifiedReferralCount: number }[]
> {
  const cap = Math.min(Math.max(Math.floor(limit), 1), 10);
  const db = await getDb();
  if (!db) return [];

  const fetchLimit = Math.min(cap * 6, 24);
  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      company: contractorProfiles.company,
      verifiedReferralCount: users.verifiedReferralCount,
    })
    .from(users)
    .leftJoin(contractorProfiles, eq(contractorProfiles.userId, users.id))
    .where(
      and(
        inArray(users.role, ["contractor", "user"]),
        eq(users.accountStatus, "active"),
        isNull(users.deletedAt),
        gt(users.verifiedReferralCount, 0),
      ),
    )
    .orderBy(desc(users.verifiedReferralCount))
    .limit(fetchLimit);

  const seen = new Set<number>();
  const unique: typeof rows = [];
  for (const r of rows) {
    if (seen.has(r.userId)) continue;
    seen.add(r.userId);
    unique.push(r);
    if (unique.length >= cap) break;
  }

  return unique.map((r) => ({
    userId: r.userId,
    displayName: leaderboardDisplayName(r.company, r.name),
    verifiedReferralCount: r.verifiedReferralCount ?? 0,
  }));
}
