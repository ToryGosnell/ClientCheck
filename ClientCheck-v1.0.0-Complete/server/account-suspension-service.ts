/**
 * Account Suspension Service
 * Manages account suspension/unsuspension with automatic payment control
 */

export interface SuspensionRecord {
  id: number;
  userId: number;
  suspendedAt: Date;
  unsuspendedAt?: Date;
  reason: string;
  suspendedBy: string; // admin email
  notes?: string;
  paymentsStopped: boolean;
  paymentsResumedAt?: Date;
}

export const SUSPENSION_REASONS = [
  "Violation of Terms of Service",
  "Multiple Disputes Filed",
  "Payment Issues",
  "Fraudulent Activity",
  "Abusive Behavior",
  "License Verification Failed",
  "Repeated Policy Violations",
  "Manual Admin Action",
  "Other",
];

/**
 * Suspend a user account
 * Automatically stops subscription payments
 */
export async function suspendAccount(
  userId: number,
  reason: string,
  adminEmail: string,
  notes?: string
): Promise<SuspensionRecord> {
  if (!SUSPENSION_REASONS.includes(reason)) {
    throw new Error("Invalid suspension reason");
  }

  const suspension: SuspensionRecord = {
    id: Math.random(),
    userId,
    suspendedAt: new Date(),
    reason,
    suspendedBy: adminEmail,
    notes,
    paymentsStopped: true,
  };

  // Stop all active subscriptions for this user
  try {
    await stopUserPayments(userId);
  } catch (error) {
    console.error("Failed to stop payments:", error);
    throw new Error("Failed to suspend account - could not stop payments");
  }

  // Log suspension event
  await logSuspensionEvent(suspension);

  // Send notification emails
  await sendSuspensionNotifications(userId, reason);

  return suspension;
}

/**
 * Unsuspend a user account
 * Automatically resumes subscription payments
 */
export async function unsuspendAccount(
  userId: number,
  adminEmail: string,
  notes?: string
): Promise<SuspensionRecord> {
  // Find active suspension
  const suspension = await getActiveSuspension(userId);

  if (!suspension) {
    throw new Error("No active suspension found for this user");
  }

  // Update suspension record
  suspension.unsuspendedAt = new Date();
  suspension.paymentsResumedAt = new Date();

  // Resume subscription payments
  try {
    await resumeUserPayments(userId);
  } catch (error) {
    console.error("Failed to resume payments:", error);
    throw new Error("Failed to unsuspend account - could not resume payments");
  }

  // Log unsuspension event
  await logUnsuspensionEvent(suspension);

  // Send notification emails
  await sendUnsuspensionNotifications(userId);

  return suspension;
}

/**
 * Get active suspension for user
 */
export async function getActiveSuspension(userId: number): Promise<SuspensionRecord | null> {
  // Mock implementation
  return null;
}

/**
 * Get suspension history for user
 */
export async function getSuspensionHistory(userId: number): Promise<SuspensionRecord[]> {
  // Mock implementation
  return [];
}

/**
 * Check if user is currently suspended
 */
export async function isUserSuspended(userId: number): Promise<boolean> {
  const suspension = await getActiveSuspension(userId);
  return suspension !== null && !suspension.unsuspendedAt;
}

/**
 * Stop all payments for a user
 * Called automatically when account is suspended
 */
async function stopUserPayments(userId: number): Promise<void> {
  // This would integrate with Stripe to:
  // 1. Cancel active subscriptions
  // 2. Pause recurring billing
  // 3. Refund any pending charges (if applicable)

  // Mock implementation
  console.log(`Stopping payments for user ${userId}`);

  // In production:
  // const subscriptions = await stripe.subscriptions.list({ customer: userId });
  // for (const sub of subscriptions.data) {
  //   await stripe.subscriptions.update(sub.id, { pause_collection: { resumes_at: null } });
  // }
}

/**
 * Resume payments for a user
 * Called automatically when account is unsuspended
 */
async function resumeUserPayments(userId: number): Promise<void> {
  // This would integrate with Stripe to:
  // 1. Resume paused subscriptions
  // 2. Restart recurring billing
  // 3. Charge for any missed periods (if applicable)

  // Mock implementation
  console.log(`Resuming payments for user ${userId}`);

  // In production:
  // const subscriptions = await stripe.subscriptions.list({ customer: userId });
  // for (const sub of subscriptions.data) {
  //   if (sub.pause_collection) {
  //     await stripe.subscriptions.update(sub.id, { pause_collection: null });
  //   }
  // }
}

/**
 * Log suspension event for audit trail
 */
async function logSuspensionEvent(suspension: SuspensionRecord): Promise<void> {
  console.log("Suspension event logged:", {
    userId: suspension.userId,
    reason: suspension.reason,
    suspendedBy: suspension.suspendedBy,
    timestamp: suspension.suspendedAt,
  });
}

/**
 * Log unsuspension event for audit trail
 */
async function logUnsuspensionEvent(suspension: SuspensionRecord): Promise<void> {
  console.log("Unsuspension event logged:", {
    userId: suspension.userId,
    unsuspendedAt: suspension.unsuspendedAt,
    timestamp: new Date(),
  });
}

/**
 * Send suspension notification emails
 */
async function sendSuspensionNotifications(userId: number, reason: string): Promise<void> {
  // Send email to user explaining suspension
  console.log(`Suspension email sent to user ${userId} for reason: ${reason}`);

  // Email content would include:
  // - Reason for suspension
  // - What happens to their account
  // - How to appeal (if applicable)
  // - Contact information for support
}

/**
 * Send unsuspension notification emails
 */
async function sendUnsuspensionNotifications(userId: number): Promise<void> {
  // Send email to user confirming account is active again
  console.log(`Unsuspension email sent to user ${userId}`);

  // Email content would include:
  // - Account is now active
  // - Subscription is resumed
  // - Next billing date
}

/**
 * Get suspension statistics
 */
export async function getSuspensionStats(): Promise<{
  totalSuspensions: number;
  activeSuspensions: number;
  suspensionsByReason: Record<string, number>;
  averageSuspensionDays: number;
}> {
  return {
    totalSuspensions: 0,
    activeSuspensions: 0,
    suspensionsByReason: {},
    averageSuspensionDays: 0,
  };
}

/**
 * Format suspension reason for display
 */
export function formatSuspensionReason(reason: string): string {
  const reasonMap: Record<string, string> = {
    "Violation of Terms of Service": "Violated Terms of Service",
    "Multiple Disputes Filed": "Multiple Disputes",
    "Payment Issues": "Payment Problems",
    "Fraudulent Activity": "Suspected Fraud",
    "Abusive Behavior": "Abusive Conduct",
    "License Verification Failed": "License Verification Failed",
    "Repeated Policy Violations": "Repeated Violations",
    "Manual Admin Action": "Admin Action",
    "Other": "Other Reason",
  };

  return reasonMap[reason] || reason;
}
