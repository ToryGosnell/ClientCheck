/**
 * Email Notification Service
 * Handles all email notifications for contractors, customers, and admins
 */

export interface EmailNotification {
  id: string;
  recipientEmail: string;
  recipientName: string;
  recipientType: "contractor" | "customer" | "admin";
  type:
    | "review_posted"
    | "review_approved"
    | "review_rejected"
    | "dispute_filed"
    | "dispute_resolved"
    | "high_priority_review"
    | "weekly_summary"
    | "payment_received"
    | "subscription_expiring";
  subject: string;
  htmlBody: string;
  textBody: string;
  data: Record<string, any>;
  sentAt?: number;
  status: "pending" | "sent" | "failed";
  error?: string;
  createdAt: number;
}

export class EmailNotificationService {
  /**
   * Send review posted notification to customer
   */
  static async notifyReviewPosted(data: {
    customerEmail: string;
    customerName: string;
    contractorName: string;
    rating: number;
    reviewSummary: string;
    reviewId: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = `New Review from ${data.contractorName}`;
      const htmlBody = this.generateReviewPostedHtml(data);
      const textBody = this.generateReviewPostedText(data);

      // In production, use SendGrid, AWS SES, or similar
      console.log(`Sending review posted notification to ${data.customerEmail}`);

      return { success: true };
    } catch (error) {
      console.error("Failed to send review posted notification:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send review approved notification to contractor
   */
  static async notifyReviewApproved(data: {
    contractorEmail: string;
    contractorName: string;
    customerName: string;
    rating: number;
    reviewId: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = `Your Review Has Been Approved`;
      const htmlBody = this.generateReviewApprovedHtml(data);
      const textBody = this.generateReviewApprovedText(data);

      console.log(`Sending review approved notification to ${data.contractorEmail}`);

      return { success: true };
    } catch (error) {
      console.error("Failed to send review approved notification:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send review rejected notification to contractor
   */
  static async notifyReviewRejected(data: {
    contractorEmail: string;
    contractorName: string;
    reason: string;
    reviewId: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = `Review Rejected - Please Review`;
      const htmlBody = this.generateReviewRejectedHtml(data);
      const textBody = this.generateReviewRejectedText(data);

      console.log(`Sending review rejected notification to ${data.contractorEmail}`);

      return { success: true };
    } catch (error) {
      console.error("Failed to send review rejected notification:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send dispute filed notification to contractor
   */
  static async notifyDisputeFiled(data: {
    contractorEmail: string;
    contractorName: string;
    customerName: string;
    disputeReason: string;
    disputeId: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = `Dispute Filed Against Your Review`;
      const htmlBody = this.generateDisputeFiledHtml(data);
      const textBody = this.generateDisputeFiledText(data);

      console.log(`Sending dispute filed notification to ${data.contractorEmail}`);

      return { success: true };
    } catch (error) {
      console.error("Failed to send dispute filed notification:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send dispute resolved notification to customer
   */
  static async notifyDisputeResolved(data: {
    customerEmail: string;
    customerName: string;
    resolution: "upheld" | "overturned" | "partial";
    details: string;
    disputeId: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = `Your Dispute Has Been Resolved`;
      const htmlBody = this.generateDisputeResolvedHtml(data);
      const textBody = this.generateDisputeResolvedText(data);

      console.log(`Sending dispute resolved notification to ${data.customerEmail}`);

      return { success: true };
    } catch (error) {
      console.error("Failed to send dispute resolved notification:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send high priority review alert to admins
   */
  static async notifyHighPriorityReview(data: {
    adminEmails: string[];
    contractorName: string;
    customerName: string;
    flags: string[];
    rating: number;
    reviewId: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = `🚨 High Priority Review Requires Moderation`;
      const htmlBody = this.generateHighPriorityReviewHtml(data);
      const textBody = this.generateHighPriorityReviewText(data);

      console.log(`Sending high priority review alert to ${data.adminEmails.length} admins`);

      // Send to all admin emails
      for (const email of data.adminEmails) {
        console.log(`  → ${email}`);
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to send high priority review alert:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send weekly summary to contractor
   */
  static async sendWeeklySummary(data: {
    contractorEmail: string;
    contractorName: string;
    newReviews: number;
    averageRating: number;
    totalRatings: number;
    topRating: number;
    lowestRating: number;
    disputes: number;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = `Your Weekly Review Summary`;
      const htmlBody = this.generateWeeklySummaryHtml(data);
      const textBody = this.generateWeeklySummaryText(data);

      console.log(`Sending weekly summary to ${data.contractorEmail}`);

      return { success: true };
    } catch (error) {
      console.error("Failed to send weekly summary:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send subscription expiring notification
   */
  static async notifySubscriptionExpiring(data: {
    email: string;
    name: string;
    userType: "contractor" | "customer";
    expirationDate: string;
    daysRemaining: number;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = `Your ${data.userType === "contractor" ? "Contractor" : "Customer"} Subscription Expires Soon`;
      const htmlBody = this.generateSubscriptionExpiringHtml(data);
      const textBody = this.generateSubscriptionExpiringText(data);

      console.log(`Sending subscription expiring notification to ${data.email}`);

      return { success: true };
    } catch (error) {
      console.error("Failed to send subscription expiring notification:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send payment received notification
   */
  static async notifyPaymentReceived(data: {
    email: string;
    name: string;
    amount: number;
    plan: string;
    nextBillingDate: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const subject = `Payment Received - Subscription Confirmed`;
      const htmlBody = this.generatePaymentReceivedHtml(data);
      const textBody = this.generatePaymentReceivedText(data);

      console.log(`Sending payment received notification to ${data.email}`);

      return { success: true };
    } catch (error) {
      console.error("Failed to send payment received notification:", error);
      return { success: false, error: String(error) };
    }
  }

  // HTML Email Templates

  private static generateReviewPostedHtml(data: any): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>New Review Posted</h2>
            <p>Hi ${data.customerName},</p>
            <p><strong>${data.contractorName}</strong> has left a review about your business.</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Rating:</strong> ${"⭐".repeat(data.rating)}</p>
              <p><strong>Review:</strong></p>
              <p>${data.reviewSummary}</p>
            </div>
            
            <p>You can respond to this review or file a dispute if you believe it's inaccurate.</p>
            <a href="https://contractorvet.com/reviews/${data.reviewId}" style="background: #0a7ea4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Review</a>
            
            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              © 2026 ClientCheck. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private static generateReviewPostedText(data: any): string {
    return `
New Review Posted

Hi ${data.customerName},

${data.contractorName} has left a review about your business.

Rating: ${data.rating}/5
Review: ${data.reviewSummary}

You can respond to this review or file a dispute if you believe it's inaccurate.

View Review: https://contractorvet.com/reviews/${data.reviewId}

© 2026 ClientCheck. All rights reserved.
    `;
  }

  private static generateReviewApprovedHtml(data: any): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>✅ Review Approved</h2>
            <p>Hi ${data.contractorName},</p>
            <p>Your review about <strong>${data.customerName}</strong> has been approved and is now live.</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Rating:</strong> ${"⭐".repeat(data.rating)}</p>
              <p>Your review is now visible to other contractors on the platform.</p>
            </div>
            
            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              © 2026 ClientCheck. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private static generateReviewApprovedText(data: any): string {
    return `
✅ Review Approved

Hi ${data.contractorName},

Your review about ${data.customerName} has been approved and is now live.

Rating: ${data.rating}/5

Your review is now visible to other contractors on the platform.

© 2026 ClientCheck. All rights reserved.
    `;
  }

  private static generateReviewRejectedHtml(data: any): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>❌ Review Rejected</h2>
            <p>Hi ${data.contractorName},</p>
            <p>Your review was not approved for the following reason:</p>
            
            <div style="background: #ffe0e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <p><strong>${data.reason}</strong></p>
            </div>
            
            <p>Please review our guidelines and feel free to resubmit a revised review.</p>
            <a href="https://contractorvet.com/guidelines" style="background: #0a7ea4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Guidelines</a>
            
            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              © 2026 ClientCheck. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private static generateReviewRejectedText(data: any): string {
    return `
❌ Review Rejected

Hi ${data.contractorName},

Your review was not approved for the following reason:

${data.reason}

Please review our guidelines and feel free to resubmit a revised review.

View Guidelines: https://contractorvet.com/guidelines

© 2026 ClientCheck. All rights reserved.
    `;
  }

  private static generateDisputeFiledHtml(data: any): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>⚠️ Dispute Filed</h2>
            <p>Hi ${data.contractorName},</p>
            <p><strong>${data.customerName}</strong> has filed a dispute against your review.</p>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p><strong>Dispute Reason:</strong></p>
              <p>${data.disputeReason}</p>
            </div>
            
            <p>Our moderation team will review this dispute and make a decision within 5-7 business days.</p>
            <a href="https://contractorvet.com/disputes/${data.disputeId}" style="background: #0a7ea4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dispute</a>
            
            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              © 2026 ClientCheck. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private static generateDisputeFiledText(data: any): string {
    return `
⚠️ Dispute Filed

Hi ${data.contractorName},

${data.customerName} has filed a dispute against your review.

Dispute Reason:
${data.disputeReason}

Our moderation team will review this dispute and make a decision within 5-7 business days.

View Dispute: https://contractorvet.com/disputes/${data.disputeId}

© 2026 ClientCheck. All rights reserved.
    `;
  }

  private static generateDisputeResolvedHtml(data: any): string {
    const resolutionText =
      data.resolution === "upheld"
        ? "Your dispute was upheld and the review has been removed."
        : data.resolution === "overturned"
          ? "The review was found to be inaccurate and has been removed."
          : "The review has been modified based on your dispute.";

    return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>✅ Dispute Resolved</h2>
            <p>Hi ${data.customerName},</p>
            <p>Your dispute has been reviewed and resolved.</p>
            
            <div style="background: #e0f2f1; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #00897b;">
              <p><strong>Resolution:</strong> ${resolutionText}</p>
              <p><strong>Details:</strong></p>
              <p>${data.details}</p>
            </div>
            
            <p>Thank you for helping us maintain a fair and accurate review platform.</p>
            
            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              © 2026 ClientCheck. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private static generateDisputeResolvedText(data: any): string {
    const resolutionText =
      data.resolution === "upheld"
        ? "Your dispute was upheld and the review has been removed."
        : data.resolution === "overturned"
          ? "The review was found to be inaccurate and has been removed."
          : "The review has been modified based on your dispute.";

    return `
✅ Dispute Resolved

Hi ${data.customerName},

Your dispute has been reviewed and resolved.

Resolution: ${resolutionText}

Details:
${data.details}

Thank you for helping us maintain a fair and accurate review platform.

© 2026 ClientCheck. All rights reserved.
    `;
  }

  private static generateHighPriorityReviewHtml(data: any): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>🚨 High Priority Review Requires Moderation</h2>
            <p>A review has been flagged for manual moderation.</p>
            
            <div style="background: #ffe0e0; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <p><strong>From:</strong> ${data.contractorName}</p>
              <p><strong>About:</strong> ${data.customerName}</p>
              <p><strong>Rating:</strong> ${data.rating}/5</p>
              <p><strong>Flags:</strong></p>
              <ul>
                ${data.flags.map((flag: string) => `<li>${flag}</li>`).join("")}
              </ul>
            </div>
            
            <a href="https://contractorvet.com/moderation/${data.reviewId}" style="background: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Now</a>
            
            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              © 2026 ClientCheck. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private static generateHighPriorityReviewText(data: any): string {
    return `
🚨 High Priority Review Requires Moderation

A review has been flagged for manual moderation.

From: ${data.contractorName}
About: ${data.customerName}
Rating: ${data.rating}/5

Flags:
${data.flags.map((f: string) => `- ${f}`).join("\n")}

Review Now: https://contractorvet.com/moderation/${data.reviewId}

© 2026 ClientCheck. All rights reserved.
    `;
  }

  private static generateWeeklySummaryHtml(data: any): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>📊 Your Weekly Review Summary</h2>
            <p>Hi ${data.contractorName},</p>
            <p>Here's your review activity for this week:</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>New Reviews:</strong> ${data.newReviews}</p>
              <p><strong>Current Average Rating:</strong> ${data.averageRating.toFixed(1)}/5</p>
              <p><strong>Total Ratings:</strong> ${data.totalRatings}</p>
              <p><strong>Highest Rating:</strong> ${data.topRating}/5</p>
              <p><strong>Lowest Rating:</strong> ${data.lowestRating}/5</p>
              <p><strong>Active Disputes:</strong> ${data.disputes}</p>
            </div>
            
            <a href="https://contractorvet.com/dashboard" style="background: #0a7ea4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Full Dashboard</a>
            
            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              © 2026 ClientCheck. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private static generateWeeklySummaryText(data: any): string {
    return `
📊 Your Weekly Review Summary

Hi ${data.contractorName},

Here's your review activity for this week:

New Reviews: ${data.newReviews}
Current Average Rating: ${data.averageRating.toFixed(1)}/5
Total Ratings: ${data.totalRatings}
Highest Rating: ${data.topRating}/5
Lowest Rating: ${data.lowestRating}/5
Active Disputes: ${data.disputes}

View Full Dashboard: https://contractorvet.com/dashboard

© 2026 ClientCheck. All rights reserved.
    `;
  }

  private static generateSubscriptionExpiringHtml(data: any): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>⏰ Your Subscription Expires Soon</h2>
            <p>Hi ${data.name},</p>
            <p>Your ${data.userType === "contractor" ? "Contractor" : "Customer"} subscription will expire in <strong>${data.daysRemaining} days</strong> (${data.expirationDate}).</p>
            
            <p>To keep your account active and continue using ClientCheck, please renew your subscription.</p>
            
            <a href="https://contractorvet.com/subscription/renew" style="background: #0a7ea4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Renew Subscription</a>
            
            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              © 2026 ClientCheck. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private static generateSubscriptionExpiringText(data: any): string {
    return `
⏰ Your Subscription Expires Soon

Hi ${data.name},

Your ${data.userType === "contractor" ? "Contractor" : "Customer"} subscription will expire in ${data.daysRemaining} days (${data.expirationDate}).

To keep your account active and continue using ClientCheck, please renew your subscription.

Renew Subscription: https://contractorvet.com/subscription/renew

© 2026 ClientCheck. All rights reserved.
    `;
  }

  private static generatePaymentReceivedHtml(data: any): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>✅ Payment Received</h2>
            <p>Hi ${data.name},</p>
            <p>Thank you for your payment. Your subscription is now active.</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Plan:</strong> ${data.plan}</p>
              <p><strong>Amount:</strong> $${data.amount.toFixed(2)}</p>
              <p><strong>Next Billing Date:</strong> ${data.nextBillingDate}</p>
            </div>
            
            <p>You can now access all features of ClientCheck.</p>
            
            <a href="https://contractorvet.com/dashboard" style="background: #0a7ea4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Dashboard</a>
            
            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              © 2026 ClientCheck. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private static generatePaymentReceivedText(data: any): string {
    return `
✅ Payment Received

Hi ${data.name},

Thank you for your payment. Your subscription is now active.

Plan: ${data.plan}
Amount: $${data.amount.toFixed(2)}
Next Billing Date: ${data.nextBillingDate}

You can now access all features of ClientCheck.

Go to Dashboard: https://contractorvet.com/dashboard

© 2026 ClientCheck. All rights reserved.
    `;
  }

  /**
   * Get notification type display name
   */
  static getNotificationTypeName(type: string): string {
    const names: Record<string, string> = {
      review_posted: "Review Posted",
      review_approved: "Review Approved",
      review_rejected: "Review Rejected",
      dispute_filed: "Dispute Filed",
      dispute_resolved: "Dispute Resolved",
      high_priority_review: "High Priority Review",
      weekly_summary: "Weekly Summary",
      payment_received: "Payment Received",
      subscription_expiring: "Subscription Expiring",
    };
    return names[type] || type;
  }

  /**
   * Get notification icon
   */
  static getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      review_posted: "📝",
      review_approved: "✅",
      review_rejected: "❌",
      dispute_filed: "⚠️",
      dispute_resolved: "✅",
      high_priority_review: "🚨",
      weekly_summary: "📊",
      payment_received: "💳",
      subscription_expiring: "⏰",
    };
    return icons[type] || "📧";
  }
}
