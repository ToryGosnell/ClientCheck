/**
 * Real-Time Dispute Notifications Service
 * Sends push notifications and emails to all parties when disputes are filed/decided
 */

import { sendEmail } from "./email-service";

export interface DisputeNotification {
  id: string;
  type: "dispute_filed" | "dispute_approved" | "dispute_rejected" | "appeal_filed";
  recipientId: number;
  recipientType: "contractor" | "customer" | "admin";
  disputeId: number;
  reviewId: number;
  title: string;
  body: string;
  sentAt: Date;
  read: boolean;
}

/**
 * Send notification when customer files a dispute
 */
export async function notifyDisputeFiled(
  disputeId: number,
  reviewId: number,
  contractorId: number,
  contractorEmail: string,
  customerName: string,
  reason: string,
  adminEmail: string
): Promise<void> {
  // Notify contractor
  await sendPushNotification(
    contractorId,
    "contractor",
    "⚠️ Dispute Filed Against Your Review",
    `${customerName} has filed a dispute against one of your reviews. Reason: ${reason}. We'll notify you of the outcome within 2-4 weeks.`,
    disputeId
  );

  await sendEmail({
    to: contractorEmail,
    subject: "⚠️ Dispute Filed Against Your Review",
    body: `
      <p>A customer has filed a dispute against one of your reviews.</p>
      <p><strong>Customer:</strong> ${customerName}</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p><strong>Dispute ID:</strong> ${disputeId}</p>
      <p>We will review this dispute and notify you of the outcome within 2-4 weeks.</p>
      <p>You can view the dispute details in your account.</p>
    `,
  });

  // Notify admins
  await sendPushNotification(
    0,
    "admin",
    "📋 New Dispute Submitted",
    `New dispute filed (ID: ${disputeId}). Reason: ${reason}. Review and take action.`,
    disputeId
  );

  await sendEmail({
    to: adminEmail,
    subject: "📋 New Dispute Submitted - Action Required",
    body: `
      <p>A new dispute has been submitted and requires review.</p>
      <p><strong>Dispute ID:</strong> ${disputeId}</p>
      <p><strong>Review ID:</strong> ${reviewId}</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p><strong>Customer:</strong> ${customerName}</p>
      <p>Please log in to the admin panel to review the evidence and make a decision.</p>
    `,
  });
}

/**
 * Send notification when dispute is approved
 */
export async function notifyDisputeApproved(
  disputeId: number,
  customerId: number,
  customerEmail: string,
  contractorId: number,
  contractorEmail: string,
  reason: string
): Promise<void> {
  // Notify customer
  await sendPushNotification(
    customerId,
    "customer",
    "✅ Your Dispute Was Approved",
    "The review against you has been removed. The disputed review will no longer appear on your profile.",
    disputeId
  );

  await sendEmail({
    to: customerEmail,
    subject: "✅ Your Dispute Was Approved",
    body: `
      <p>Your dispute has been approved and the review has been removed.</p>
      <p><strong>Dispute ID:</strong> ${disputeId}</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>The disputed review will no longer appear on your profile.</p>
      <p>If you have any questions, please contact our support team.</p>
    `,
  });

  // Notify contractor
  await sendPushNotification(
    contractorId,
    "contractor",
    "ℹ️ Your Review Was Removed",
    "A review you submitted has been removed due to an approved dispute. Please review our guidelines.",
    disputeId
  );

  await sendEmail({
    to: contractorEmail,
    subject: "ℹ️ Your Review Was Removed",
    body: `
      <p>One of your reviews has been removed due to an approved dispute.</p>
      <p><strong>Dispute ID:</strong> ${disputeId}</p>
      <p><strong>Removal Reason:</strong> ${reason}</p>
      <p>Please review our review guidelines to ensure future reviews comply with our policies.</p>
      <p>If you believe this decision was made in error, you can appeal within 30 days.</p>
    `,
  });
}

/**
 * Send notification when dispute is rejected
 */
export async function notifyDisputeRejected(
  disputeId: number,
  customerId: number,
  customerEmail: string,
  contractorId: number,
  reason: string
): Promise<void> {
  // Notify customer
  await sendPushNotification(
    customerId,
    "customer",
    "❌ Your Dispute Was Rejected",
    "Your dispute has been reviewed and rejected. The review will remain on your profile. You can file an appeal within 30 days.",
    disputeId
  );

  await sendEmail({
    to: customerEmail,
    subject: "❌ Your Dispute Was Rejected",
    body: `
      <p>Your dispute has been reviewed and rejected.</p>
      <p><strong>Dispute ID:</strong> ${disputeId}</p>
      <p>The review will remain on your profile. You have the right to file an appeal within 30 days if you believe the decision was incorrect.</p>
      <p>To appeal, please log in to your account and submit additional evidence.</p>
    `,
  });

  // Notify contractor
  await sendPushNotification(
    contractorId,
    "contractor",
    "✅ Dispute Rejected - Your Review Stands",
    "The dispute against your review has been rejected. Your review remains on the customer's profile.",
    disputeId
  );
}

/**
 * Send notification when appeal is filed
 */
export async function notifyAppealFiled(
  appealId: string,
  disputeId: number,
  customerId: number,
  customerEmail: string,
  adminEmail: string
): Promise<void> {
  // Notify customer
  await sendPushNotification(
    customerId,
    "customer",
    "📤 Appeal Submitted",
    "Your appeal has been received and will be reviewed within 2-4 weeks.",
    disputeId
  );

  await sendEmail({
    to: customerEmail,
    subject: "📤 Appeal Submitted",
    body: `
      <p>Your appeal has been received and will be reviewed.</p>
      <p><strong>Appeal ID:</strong> ${appealId}</p>
      <p><strong>Original Dispute ID:</strong> ${disputeId}</p>
      <p>We will review your additional evidence and notify you of the outcome within 2-4 weeks.</p>
    `,
  });

  // Notify admins
  await sendPushNotification(
    0,
    "admin",
    "📤 New Appeal Submitted",
    `New appeal filed (Appeal ID: ${appealId}). Review and take action.`,
    disputeId
  );

  await sendEmail({
    to: adminEmail,
    subject: "📤 New Appeal Submitted - Action Required",
    body: `
      <p>A new appeal has been submitted and requires review.</p>
      <p><strong>Appeal ID:</strong> ${appealId}</p>
      <p><strong>Original Dispute ID:</strong> ${disputeId}</p>
      <p>Please log in to the admin panel to review the additional evidence.</p>
    `,
  });
}

/**
 * Send push notification to user
 * In production, this would integrate with Firebase Cloud Messaging or similar
 */
async function sendPushNotification(
  userId: number,
  userType: "contractor" | "customer" | "admin",
  title: string,
  body: string,
  disputeId: number
): Promise<void> {
  const notification: DisputeNotification = {
    id: `notif_${Date.now()}`,
    type: "dispute_filed",
    recipientId: userId,
    recipientType: userType,
    disputeId,
    reviewId: 0,
    title,
    body,
    sentAt: new Date(),
    read: false,
  };

  // Log notification
  console.log("Push notification sent:", {
    userId,
    userType,
    title,
    body,
    timestamp: new Date(),
  });

  // In production:
  // await firebase.messaging().send({
  //   notification: { title, body },
  //   data: { disputeId: disputeId.toString(), userType },
  //   token: userFcmToken,
  // });
}

/**
 * Get all notifications for a user
 */
export async function getUserNotifications(
  userId: number,
  userType: "contractor" | "customer" | "admin",
  limit: number = 50
): Promise<DisputeNotification[]> {
  // Mock implementation
  return [];
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  console.log(`Notification ${notificationId} marked as read`);
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  console.log(`Notification ${notificationId} deleted`);
}

/**
 * Get unread notification count for user
 */
export async function getUnreadNotificationCount(
  userId: number,
  userType: "contractor" | "customer" | "admin"
): Promise<number> {
  // Mock implementation
  return 0;
}
