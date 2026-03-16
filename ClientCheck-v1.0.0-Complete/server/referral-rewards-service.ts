/**
 * Referral rewards service backed by Drizzle/MySQL.
 */

import crypto from "crypto";
import { and, count, desc, eq } from "drizzle-orm";
import { growthEvents, referrals } from "../drizzle/schema";
import { getDb } from "./db";
import { queueNotification } from "./services/notification-delivery-service";
import { writeAuditLog } from "./services/audit-log-service";

export function generateReferralCode(userId: number): string {
  return `CC${userId}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export function createReferralLink(userId: number, baseUrl: string, code?: string): string {
  return `${baseUrl}?ref=${code || generateReferralCode(userId)}`;
}

export async function trackReferral(referrerId: number, email: string) {
  try {
    const db = await getDb();
    if (!db) return { success: false, referralCode: "", message: "Database not available" };
    const referralCode = generateReferralCode(referrerId);
    await db.insert(referrals).values({
      referrerId,
      referralCode,
      referralEmail: email,
      status: "pending",
      rewardUnlocked: false,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await db.insert(growthEvents).values({
      userId: referrerId,
      eventType: "invite_sent",
      metadata: JSON.stringify({ email, referralCode }),
    });
    await writeAuditLog({ actorUserId: referrerId, action: "referral.invited", entityType: "referral", entityId: referralCode, metadata: { email } });
    return { success: true, referralCode, message: "Referral tracked. Your friend will receive a special signup link." };
  } catch (error) {
    console.error("Track referral error:", error);
    return { success: false, referralCode: "", message: "Failed to track referral" };
  }
}

export async function completeReferral(referralCode: string, referredUserId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select().from(referrals).where(eq(referrals.referralCode, referralCode)).limit(1);
  const referral = rows[0];
  if (!referral) return false;
  await db.update(referrals).set({ status: "completed", referredUserId, completedAt: new Date() }).where(eq(referrals.id, referral.id));
  await db.insert(growthEvents).values({ userId: referral.referrerId, eventType: "signup_completed", metadata: JSON.stringify({ referralCode, referredUserId }) });
  await writeAuditLog({ actorUserId: referredUserId, action: "referral.completed", entityType: "referral", entityId: referral.id, metadata: { referralCode } });
  return true;
}

export async function activateReferral(referralCode: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select().from(referrals).where(eq(referrals.referralCode, referralCode)).limit(1);
  const referral = rows[0];
  if (!referral) return false;
  await db.update(referrals).set({ rewardUnlocked: true }).where(eq(referrals.id, referral.id));
  await db.insert(growthEvents).values({ userId: referral.referrerId, eventType: "subscription_started", metadata: JSON.stringify({ referralCode }) });
  await queueNotification({ userId: referral.referrerId, channel: "email", templateKey: "referral_reward_unlocked", payload: { referralCode } });
  return true;
}

async function getReferralSummary(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(referrals).where(eq(referrals.referrerId, userId)).orderBy(desc(referrals.createdAt));
  const completedReferrals = rows.filter((r) => r.status === "completed").length;
  const premiumMonthsEarned = rows.filter((r) => r.rewardUnlocked).length;
  return {
    totalReferrals: rows.length,
    completedReferrals,
    premiumMonthsEarned,
    referrals: rows.map((row) => ({
      id: String(row.id),
      referrerId: row.referrerId,
      referredUserId: row.referredUserId ?? undefined,
      referralCode: row.referralCode,
      email: row.referralEmail || "",
      status: row.rewardUnlocked ? "active" : row.status === "completed" ? "signed_up" : "pending",
      createdAt: row.createdAt,
      completedAt: row.completedAt ?? undefined,
    })),
  };
}

export async function getReferralRewards(userId: number) {
  return getReferralSummary(userId);
}

export async function getReferralStatus(userId: number) {
  const summary = await getReferralSummary(userId);
  if (!summary) {
    return { totalReferrals: 0, completedReferrals: 0, premiumMonthsEarned: 0, nextRewardAt: 3, referralsNeeded: 3, unlocked: false };
  }
  return {
    totalReferrals: summary.totalReferrals,
    completedReferrals: summary.completedReferrals,
    premiumMonthsEarned: summary.premiumMonthsEarned,
    nextRewardAt: Math.max(0, 3 - summary.completedReferrals),
    referralsNeeded: Math.max(0, 3 - summary.completedReferrals),
    unlocked: summary.completedReferrals >= 3,
  };
}

export async function getUserReferralLink(userId: number, baseUrl: string): Promise<string> {
  const db = await getDb();
  if (!db) return createReferralLink(userId, baseUrl);
  const rows = await db.select().from(referrals).where(eq(referrals.referrerId, userId)).orderBy(desc(referrals.createdAt)).limit(1);
  return createReferralLink(userId, baseUrl, rows[0]?.referralCode);
}

export async function getUserReferrals(userId: number) {
  const summary = await getReferralSummary(userId);
  return summary?.referrals || [];
}

export async function sendReferralInvitation(referrerName: string, referrerEmail: string, referredEmail: string, referralLink: string): Promise<boolean> {
  try {
    await queueNotification({ channel: "email", templateKey: "referral_invite", destination: referredEmail, payload: { referrerName, referrerEmail, referralLink } });
    return true;
  } catch (error) {
    console.error("Send referral invitation error:", error);
    return false;
  }
}
