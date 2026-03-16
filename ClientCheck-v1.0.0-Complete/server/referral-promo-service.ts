/**
 * Referral Promo Auto-Calculation Service
 * Automatically calculates and applies referral promotions
 * Zero charges during promotional periods
 */

import { sendEmail } from "./email-service";

export interface ReferralPromo {
  id: string;
  referrerId: number;
  referralCount: number;
  promoLevel: "bronze" | "silver" | "gold";
  freeMonths: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  appliedAt?: Date;
}

export interface ReferralTracking {
  id: string;
  referrerId: number;
  referredUserId: number;
  referredEmail: string;
  referredName: string;
  status: "pending" | "completed" | "expired";
  completedAt?: Date;
  createdAt: Date;
}

// Referral tiers
const REFERRAL_TIERS = {
  bronze: { referrals: 1, freeMonths: 1, description: "1 friend" },
  silver: { referrals: 3, freeMonths: 1, description: "3 friends" },
  gold: { referrals: 5, freeMonths: 2, description: "5 friends" },
};

/**
 * Track a new referral
 */
export async function trackReferral(
  referrerId: number,
  referredEmail: string,
  referredName: string
): Promise<{ success: boolean; referralId: string }> {
  const referralId = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const tracking: ReferralTracking = {
    id: referralId,
    referrerId,
    referredUserId: 0, // Will be updated when referred user signs up
    referredEmail,
    referredName,
    status: "pending",
    createdAt: new Date(),
  };

  // Store referral
  await storeReferralTracking(tracking);

  // Send referral link to referred user
  const referralLink = `https://clientcheck.app/signup?ref=${referrerId}`;
  await sendEmail({
    to: referredEmail,
    subject: `🎉 ${referredName} invited you to join ClientCheck`,
    body: `
      <p>Hi there,</p>
      <p>${referredName} thinks you should check out ClientCheck - the contractor's tool to vet customers before accepting jobs.</p>
      <p><a href="${referralLink}">Join ClientCheck</a></p>
      <p>When you sign up using their referral link, they'll unlock free premium features!</p>
      <p>Best regards,<br>ClientCheck Team</p>
    `,
  });

  return {
    success: true,
    referralId,
  };
}

/**
 * Complete a referral when referred user signs up
 */
export async function completeReferral(
  referralId: string,
  referredUserId: number
): Promise<void> {
  // Update referral status
  await updateReferralStatus(referralId, "completed", referredUserId);

  // Check if referrer has unlocked any promos
  await checkAndApplyReferralPromos(referralId);
}

/**
 * Check and apply referral promotions
 * Auto-calculates based on referral count
 */
export async function checkAndApplyReferralPromos(referralId: string): Promise<void> {
  // Get referral
  const referral = await getReferralTracking(referralId);
  if (!referral) return;

  // Count completed referrals for this referrer
  const completedCount = await countCompletedReferrals(referral.referrerId);

  // Determine promo level
  let promoLevel: "bronze" | "silver" | "gold" | null = null;
  let freeMonths = 0;

  if (completedCount >= REFERRAL_TIERS.gold.referrals) {
    promoLevel = "gold";
    freeMonths = REFERRAL_TIERS.gold.freeMonths;
  } else if (completedCount >= REFERRAL_TIERS.silver.referrals) {
    promoLevel = "silver";
    freeMonths = REFERRAL_TIERS.silver.freeMonths;
  } else if (completedCount >= REFERRAL_TIERS.bronze.referrals) {
    promoLevel = "bronze";
    freeMonths = REFERRAL_TIERS.bronze.freeMonths;
  }

  if (promoLevel) {
    // Create or update promo
    const promo: ReferralPromo = {
      id: `promo_${referral.referrerId}_${Date.now()}`,
      referrerId: referral.referrerId,
      referralCount: completedCount,
      promoLevel,
      freeMonths,
      startDate: new Date(),
      endDate: new Date(Date.now() + freeMonths * 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      appliedAt: new Date(),
    };

    // Store promo
    await storeReferralPromo(promo);

    // Skip charges during promo period
    await skipChargesDuringPromo(referral.referrerId, promo.startDate, promo.endDate);

    // Notify referrer
    const referrerEmail = await getUserEmail(referral.referrerId);
    await sendEmail({
      to: referrerEmail,
      subject: `🎉 You Unlocked ${freeMonths} Free Month${freeMonths > 1 ? "s" : ""}!`,
      body: `
        <p>Congratulations!</p>
        <p>Your referral of ${referral.referredName} has been completed. You've unlocked <strong>${freeMonths} free month${freeMonths > 1 ? "s" : ""}</strong> of premium features!</p>
        <p><strong>Promo Level:</strong> ${promoLevel.toUpperCase()}</p>
        <p><strong>Valid Until:</strong> ${promo.endDate.toLocaleDateString()}</p>
        <p>Your subscription will not be charged during this promotional period.</p>
        <p>Keep referring to unlock more rewards!</p>
        <p>Best regards,<br>ClientCheck Team</p>
      `,
    });

    // Notify referred user
    await sendEmail({
      to: referral.referredEmail,
      subject: `✅ Welcome to ClientCheck! Your Referrer Unlocked a Reward`,
      body: `
        <p>Hi ${referral.referredName},</p>
        <p>Thanks for joining ClientCheck! Your referrer has unlocked ${freeMonths} free month${freeMonths > 1 ? "s" : ""} of premium features because of your signup.</p>
        <p>Start vetting customers and protecting your business today!</p>
        <p>Best regards,<br>ClientCheck Team</p>
      `,
    });
  }
}

/**
 * Skip charges during promotional period
 * Zero charges for referral promo duration
 */
export async function skipChargesDuringPromo(
  userId: number,
  startDate: Date,
  endDate: Date
): Promise<void> {
  // Get user's subscription
  const subscription = await getUserSubscription(userId);
  if (!subscription) return;

  // Mark subscription as having active promo
  await updateSubscriptionPromo(subscription.id, {
    promoActive: true,
    promoStartDate: startDate,
    promoEndDate: endDate,
    skipCharges: true,
  });

  // Cancel any pending charges during promo period
  await cancelChargesDuringPeriod(subscription.id, startDate, endDate);
}

/**
 * Calculate next billing date considering promos
 */
export async function getNextBillingDate(userId: number): Promise<Date | null> {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return null;

  // Check if user has active promo
  const promo = await getActivePromo(userId);
  if (promo && promo.isActive) {
    // If promo is still active, no charge
    if (new Date() < promo.endDate) {
      return promo.endDate; // Next charge after promo ends
    }
  }

  // Return normal next billing date
  return subscription.nextBillingDate;
}

/**
 * Get active promo for user
 */
export async function getActivePromo(userId: number): Promise<ReferralPromo | null> {
  // Mock implementation - in production, query database
  return null;
}

/**
 * Get referral stats for user
 */
export async function getReferralStats(userId: number): Promise<{
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  currentPromo: ReferralPromo | null;
  nextMilestone: { referrals: number; freeMonths: number } | null;
}> {
  const completed = await countCompletedReferrals(userId);
  const pending = await countPendingReferrals(userId);
  const promo = await getActivePromo(userId);

  // Determine next milestone
  let nextMilestone = null;
  if (completed < REFERRAL_TIERS.bronze.referrals) {
    nextMilestone = REFERRAL_TIERS.bronze;
  } else if (completed < REFERRAL_TIERS.silver.referrals) {
    nextMilestone = REFERRAL_TIERS.silver;
  } else if (completed < REFERRAL_TIERS.gold.referrals) {
    nextMilestone = REFERRAL_TIERS.gold;
  }

  return {
    totalReferrals: completed + pending,
    completedReferrals: completed,
    pendingReferrals: pending,
    currentPromo: promo,
    nextMilestone,
  };
}

/**
 * Get referral link for user
 */
export function getReferralLink(userId: number): string {
  return `https://clientcheck.app/signup?ref=${userId}`;
}

// ===== INTERNAL FUNCTIONS =====

async function countCompletedReferrals(userId: number): Promise<number> {
  // Mock implementation
  return 0;
}

async function countPendingReferrals(userId: number): Promise<number> {
  // Mock implementation
  return 0;
}

async function getReferralTracking(referralId: string): Promise<ReferralTracking | null> {
  // Mock implementation
  return null;
}

async function updateReferralStatus(
  referralId: string,
  status: string,
  referredUserId: number
): Promise<void> {
  console.log(`Referral ${referralId} marked as ${status}`);
}

async function storeReferralTracking(tracking: ReferralTracking): Promise<void> {
  console.log("Referral tracking stored:", tracking.id);
}

async function storeReferralPromo(promo: ReferralPromo): Promise<void> {
  console.log("Referral promo stored:", promo.id);
}

async function getUserEmail(userId: number): Promise<string> {
  // Mock implementation
  return "user@example.com";
}

async function getUserSubscription(userId: number): Promise<any> {
  // Mock implementation
  return null;
}

async function updateSubscriptionPromo(subscriptionId: string, promo: any): Promise<void> {
  console.log("Subscription promo updated:", subscriptionId);
}

async function cancelChargesDuringPeriod(
  subscriptionId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  console.log(`Charges cancelled for ${subscriptionId} from ${startDate} to ${endDate}`);
}
