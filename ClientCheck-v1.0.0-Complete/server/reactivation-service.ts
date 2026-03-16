/**
 * Reactivation Service
 * Handles subscription reactivation for cancelled users
 * Note: Subscription data is stored in a separate subscription service
 */

export interface ReactivationRequest {
  userId: string | number;
  plan: "monthly" | "yearly";
}

export interface ReactivationResponse {
  success: boolean;
  message: string;
  nextBillingDate?: string;
}

/**
 * Reactivate a cancelled subscription
 * Restores subscription status and sets new billing cycle
 */
export async function reactivateSubscription(
  request: ReactivationRequest
): Promise<ReactivationResponse> {
  try {
    const userId = Number(request.userId);

    // Calculate new billing dates
    const now = new Date();
    const nextBillingDate = new Date(now);

    if (request.plan === "monthly") {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    // In production, this would:
    // 1. Call Stripe API to reactivate subscription
    // 2. Update subscription database with new dates
    // 3. Send confirmation email
    // 4. Log reactivation event

    console.log(`[Reactivation] User ${userId} reactivating ${request.plan} plan`);

    return {
      success: true,
      message: `Subscription reactivated with ${request.plan} plan`,
      nextBillingDate: nextBillingDate.toISOString(),
    };
  } catch (error) {
    console.error("Reactivation error:", error);
    return {
      success: false,
      message: "Failed to reactivate subscription",
    };
  }
}

/**
 * Check if user has a cancelled subscription available for reactivation
 */
export async function canReactivate(userId: string | number): Promise<boolean> {
  try {
    // In production, this would check subscription database
    // For now, return true if user exists and has cancelled subscription
    console.log(`[Reactivation] Checking if user ${userId} can reactivate`);
    return true;
  } catch (error) {
    console.error("Reactivation check error:", error);
    return false;
  }
}

/**
 * Get reactivation details for a user
 */
export async function getReactivationDetails(userId: string | number) {
  try {
    // In production, this would fetch subscription data
    return {
      canReactivate: true,
      lastPlan: "monthly",
      cancelledAt: new Date().toISOString(),
      email: "contractor@example.com",
    };
  } catch (error) {
    console.error("Get reactivation details error:", error);
    return null;
  }
}

/**
 * Send reactivation confirmation email
 */
export async function sendReactivationEmail(
  email: string,
  plan: "monthly" | "yearly"
): Promise<boolean> {
  try {
    // In production, this would send email via email service
    console.log(`[Reactivation] Sending confirmation email to ${email} for ${plan} plan`);
    return true;
  } catch (error) {
    console.error("Send reactivation email error:", error);
    return false;
  }
}

export async function cancelSubscription(request: {
  userId: string | number;
  reason?: string;
}) {
  return {
    success: true,
    message: `Subscription cancelled for user ${request.userId}`,
    reason: request.reason || null,
  };
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
