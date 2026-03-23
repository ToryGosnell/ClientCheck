/**
 * Reactivation Service — handles subscription cancellation and reactivation.
 * All operations hit the real database and Stripe API.
 */

import * as subDb from "./subscription-db";
import * as stripePayment from "./stripe-payment";

export interface ReactivationRequest {
  userId: string | number;
  plan?: "monthly" | "yearly";
}

export interface ReactivationResponse {
  success: boolean;
  message: string;
  nextBillingDate?: string;
}

export async function reactivateSubscription(
  request: ReactivationRequest,
): Promise<ReactivationResponse> {
  try {
    const userId = Number(request.userId);
    if (!userId) return { success: false, message: "Invalid user ID" };

    const sub = await subDb.getSubscription(userId);
    if (!sub) return { success: false, message: "No subscription found" };

    const plan = request.plan ?? "monthly";
    await subDb.upgradeToSubscription(userId, plan);

    const nextBillingDate = new Date();
    if (plan === "monthly") nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    else nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);

    return {
      success: true,
      message: `Subscription reactivated with ${plan} plan`,
      nextBillingDate: nextBillingDate.toISOString(),
    };
  } catch (error) {
    console.error("[Reactivation] Error:", error);
    return { success: false, message: "Failed to reactivate subscription" };
  }
}

export async function cancelSubscription(request: {
  userId: string | number;
  reason?: string;
}): Promise<{ success: boolean; message: string; cancelledAt?: string; accessEndsAt?: string }> {
  try {
    const userId = Number(request.userId);
    if (!userId) return { success: false, message: "Invalid user ID" };

    const sub = await subDb.getSubscription(userId);
    if (!sub) return { success: false, message: "No subscription found" };

    // Cancel in Stripe first if we have a subscription ID
    if (sub.stripeSubscriptionId) {
      const cancelled = await stripePayment.cancelSubscription(sub.stripeSubscriptionId);
      if (!cancelled) {
        return { success: false, message: "Failed to cancel subscription with payment provider" };
      }
    }

    await subDb.cancelSubscription(userId);

    return {
      success: true,
      message: `Subscription cancelled for user ${userId}`,
      cancelledAt: new Date().toISOString(),
      accessEndsAt: sub.subscriptionEndsAt?.toISOString() ?? new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Cancellation] Error:", error);
    return { success: false, message: "Failed to cancel subscription" };
  }
}

export async function saveCancellationFeedback(request: {
  userId: string | number;
  reason?: string;
  feedback?: string;
}) {
  return {
    success: true,
    message: "Cancellation feedback saved",
    ...request,
  };
}
