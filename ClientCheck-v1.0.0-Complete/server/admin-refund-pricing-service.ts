/**
 * Admin Refund & Pricing Adjustment Service
 * Allows admins to issue refunds and manually adjust monthly pricing
 */

import { sendEmail } from "./email-service";

export interface RefundRequest {
  id: string;
  userId: number;
  userEmail: string;
  userName: string;
  subscriptionId: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "completed";
  createdAt: Date;
  processedAt?: Date;
  processedBy?: string;
  notes?: string;
}

export interface PricingAdjustment {
  id: string;
  userId: number;
  originalPrice: number;
  newPrice: number;
  reason: string;
  validFrom: Date;
  validUntil?: Date;
  createdBy: string;
  createdAt: Date;
}

/**
 * Issue refund to contractor
 */
export async function issueRefund(
  userId: number,
  userEmail: string,
  userName: string,
  subscriptionId: string,
  amount: number,
  reason: string,
  adminId: string
): Promise<{ success: boolean; refundId: string }> {
  const refundId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const refund: RefundRequest = {
    id: refundId,
    userId,
    userEmail,
    userName,
    subscriptionId,
    amount,
    reason,
    status: "approved",
    createdAt: new Date(),
    processedAt: new Date(),
    processedBy: adminId,
  };

  // Process refund with Stripe
  await processStripeRefund(subscriptionId, amount);

  // Send refund confirmation to user
  await sendEmail({
    to: userEmail,
    subject: `✅ Refund Processed - $${amount.toFixed(2)}`,
    body: `
      <p>Hi ${userName},</p>
      <p>We've processed a refund of <strong>$${amount.toFixed(2)}</strong> to your account.</p>
      <p><strong>Refund ID:</strong> ${refundId}</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>The refund should appear in your account within 3-5 business days.</p>
      <p>If you have any questions, please contact us through our support form.</p>
      <p>Best regards,<br>ClientCheck Team</p>
    `,
  });

  // Store refund in database
  await storeRefund(refund);

  return {
    success: true,
    refundId,
  };
}

/**
 * Reject refund request
 */
export async function rejectRefund(
  refundId: string,
  reason: string,
  adminId: string
): Promise<void> {
  // Get refund details
  const refund = await getRefund(refundId);
  if (!refund) {
    throw new Error("Refund not found");
  }

  // Update status
  refund.status = "rejected";
  refund.processedAt = new Date();
  refund.processedBy = adminId;
  refund.notes = reason;

  // Notify user
  await sendEmail({
    to: refund.userEmail,
    subject: `❌ Refund Request Declined`,
    body: `
      <p>Hi ${refund.userName},</p>
      <p>We've reviewed your refund request (ID: ${refundId}) and unfortunately cannot approve it at this time.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>If you believe this decision was made in error, please contact us through our support form to discuss further options.</p>
      <p>Best regards,<br>ClientCheck Team</p>
    `,
  });

  // Store update
  await storeRefund(refund);
}

/**
 * Adjust monthly pricing for a specific user
 */
export async function adjustUserPricing(
  userId: number,
  newMonthlyPrice: number,
  reason: string,
  adminId: string,
  validUntil?: Date
): Promise<{ success: boolean; adjustmentId: string }> {
  const adjustmentId = `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Get current pricing
  const currentPrice = 9.99; // Mock - in production, fetch from database

  const adjustment: PricingAdjustment = {
    id: adjustmentId,
    userId,
    originalPrice: currentPrice,
    newPrice: newMonthlyPrice,
    reason,
    validFrom: new Date(),
    validUntil,
    createdBy: adminId,
    createdAt: new Date(),
  };

  // Get user email
  const userEmail = await getUserEmail(userId);

  // Notify user of price change
  const priceChange = newMonthlyPrice - currentPrice;
  const changeType = priceChange > 0 ? "increase" : "decrease";
  const changeAmount = Math.abs(priceChange).toFixed(2);

  await sendEmail({
    to: userEmail,
    subject: `💰 Your Subscription Price Has Been Adjusted`,
    body: `
      <p>Hi there,</p>
      <p>We've adjusted your monthly subscription price.</p>
      <p><strong>Previous Price:</strong> $${currentPrice.toFixed(2)}/month</p>
      <p><strong>New Price:</strong> $${newMonthlyPrice.toFixed(2)}/month</p>
      <p><strong>Change:</strong> ${changeType === "increase" ? "+" : "-"}$${changeAmount}</p>
      <p><strong>Reason:</strong> ${reason}</p>
      ${validUntil ? `<p><strong>Valid Until:</strong> ${validUntil.toLocaleDateString()}</p>` : ""}
      <p>This adjustment will take effect on your next billing cycle.</p>
      <p>If you have any questions, please contact us.</p>
      <p>Best regards,<br>ClientCheck Team</p>
    `,
  });

  // Store adjustment
  await storePricingAdjustment(adjustment);

  return {
    success: true,
    adjustmentId,
  };
}

/**
 * Get all refund requests (admin only)
 */
export async function getAllRefunds(
  isAdmin: boolean,
  filter?: {
    status?: string;
    limit?: number;
  }
): Promise<RefundRequest[]> {
  if (!isAdmin) {
    throw new Error("Unauthorized: Only admins can view refunds");
  }

  // Mock implementation
  return [];
}

/**
 * Get all pricing adjustments (admin only)
 */
export async function getAllPricingAdjustments(
  isAdmin: boolean,
  userId?: number
): Promise<PricingAdjustment[]> {
  if (!isAdmin) {
    throw new Error("Unauthorized: Only admins can view pricing adjustments");
  }

  // Mock implementation
  return [];
}

/**
 * Get current price for user (considering adjustments)
 */
export async function getUserCurrentPrice(userId: number): Promise<number> {
  // Check for active pricing adjustment
  const adjustments = await getAllPricingAdjustments(true, userId);

  if (adjustments.length > 0) {
    const activeAdjustment = adjustments.find((adj) => {
      const now = new Date();
      return adj.validFrom <= now && (!adj.validUntil || adj.validUntil > now);
    });

    if (activeAdjustment) {
      return activeAdjustment.newPrice;
    }
  }

  // Return default price
  return 9.99;
}

/**
 * Process refund with Stripe (internal)
 */
async function processStripeRefund(subscriptionId: string, amount: number): Promise<void> {
  // Mock implementation - in production, call Stripe API
  console.log(`Processing Stripe refund: ${subscriptionId} - $${amount}`);

  // In production:
  // const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  // await stripe.refunds.create({
  //   charge: subscriptionId,
  //   amount: Math.round(amount * 100), // Convert to cents
  // });
}

/**
 * Get refund by ID (admin only)
 */
async function getRefund(refundId: string): Promise<RefundRequest | null> {
  // Mock implementation
  return {
    id: refundId,
    userId: 1,
    userEmail: "user@example.com",
    userName: "John Contractor",
    subscriptionId: "sub_123",
    amount: 9.99,
    reason: "User requested",
    status: "pending",
    createdAt: new Date(),
  };
}

/**
 * Get user email (internal)
 */
async function getUserEmail(userId: number): Promise<string> {
  // Mock implementation - in production, query database
  return "user@example.com";
}

/**
 * Store refund in database
 */
async function storeRefund(refund: RefundRequest): Promise<void> {
  console.log("Refund stored:", refund.id);
}

/**
 * Store pricing adjustment in database
 */
async function storePricingAdjustment(adjustment: PricingAdjustment): Promise<void> {
  console.log("Pricing adjustment stored:", adjustment.id);
}

/**
 * Bulk issue refunds
 */
export async function bulkIssueRefunds(
  refunds: Array<{
    userId: number;
    userEmail: string;
    userName: string;
    subscriptionId: string;
    amount: number;
    reason: string;
  }>,
  adminId: string
): Promise<{ success: number; failed: number; refundIds: string[] }> {
  const refundIds: string[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const refund of refunds) {
    try {
      const result = await issueRefund(
        refund.userId,
        refund.userEmail,
        refund.userName,
        refund.subscriptionId,
        refund.amount,
        refund.reason,
        adminId
      );
      refundIds.push(result.refundId);
      successCount++;
    } catch (error) {
      failureCount++;
      console.error(`Failed to issue refund for user ${refund.userId}:`, error);
    }
  }

  return {
    success: successCount,
    failed: failureCount,
    refundIds,
  };
}
