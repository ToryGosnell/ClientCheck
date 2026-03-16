/**
 * SendGrid Email Delivery Service
 * Handles actual email sending via SendGrid API
 */

export interface SendGridEmailPayload {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  categories?: string[];
}

export class SendGridService {
  private static readonly SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  private static readonly SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@contractorvet.com";
  private static readonly SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

  /**
   * Send email via SendGrid
   */
  static async sendEmail(payload: SendGridEmailPayload): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      if (!this.SENDGRID_API_KEY) {
        console.warn("SendGrid API key not configured. Email will not be sent.");
        return { success: false, error: "SendGrid API key not configured" };
      }

      const emailPayload = {
        personalizations: [
          {
            to: [{ email: payload.to }],
            subject: payload.subject,
          },
        ],
        from: { email: this.SENDGRID_FROM_EMAIL },
        content: [
          { type: "text/plain", value: payload.text },
          { type: "text/html", value: payload.html },
        ],
        replyTo: payload.replyTo ? { email: payload.replyTo } : undefined,
        categories: payload.categories || ["contractorvet"],
      };

      const response = await fetch(this.SENDGRID_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("SendGrid API error:", error);
        return { success: false, error: `SendGrid error: ${response.status}` };
      }

      // SendGrid returns 202 Accepted for successful requests
      const messageId = response.headers.get("x-message-id") || "unknown";

      console.log(`Email sent successfully to ${payload.to} (Message ID: ${messageId})`);

      return { success: true, messageId };
    } catch (error) {
      console.error("Failed to send email via SendGrid:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send review posted notification email
   */
  static async sendReviewPostedEmail(data: {
    customerEmail: string;
    customerName: string;
    contractorName: string;
    rating: number;
    reviewSummary: string;
    reviewId: string;
  }): Promise<{ success: boolean; error?: string }> {
    const htmlBody = this.generateReviewPostedHtml(data);
    const textBody = this.generateReviewPostedText(data);

    const result = await this.sendEmail({
      to: data.customerEmail,
      from: this.SENDGRID_FROM_EMAIL,
      subject: `New Review from ${data.contractorName}`,
      html: htmlBody,
      text: textBody,
      categories: ["review_posted"],
    });

    return { success: result.success, error: result.error };
  }

  /**
   * Send review approved notification email
   */
  static async sendReviewApprovedEmail(data: {
    contractorEmail: string;
    contractorName: string;
    customerName: string;
    rating: number;
    reviewId: string;
  }): Promise<{ success: boolean; error?: string }> {
    const htmlBody = this.generateReviewApprovedHtml(data);
    const textBody = this.generateReviewApprovedText(data);

    const result = await this.sendEmail({
      to: data.contractorEmail,
      from: this.SENDGRID_FROM_EMAIL,
      subject: "✅ Your Review Has Been Approved",
      html: htmlBody,
      text: textBody,
      categories: ["review_approved"],
    });

    return { success: result.success, error: result.error };
  }

  /**
   * Send payment received confirmation email
   */
  static async sendPaymentReceivedEmail(data: {
    email: string;
    name: string;
    amount: number;
    plan: string;
    nextBillingDate: string;
  }): Promise<{ success: boolean; error?: string }> {
    const htmlBody = this.generatePaymentReceivedHtml(data);
    const textBody = this.generatePaymentReceivedText(data);

    const result = await this.sendEmail({
      to: data.email,
      from: this.SENDGRID_FROM_EMAIL,
      subject: "✅ Payment Received - Subscription Confirmed",
      html: htmlBody,
      text: textBody,
      categories: ["payment_received"],
    });

    return { success: result.success, error: result.error };
  }

  /**
   * Send dispute filed notification email
   */
  static async sendDisputeFiledEmail(data: {
    contractorEmail: string;
    contractorName: string;
    customerName: string;
    disputeReason: string;
    disputeId: string;
  }): Promise<{ success: boolean; error?: string }> {
    const htmlBody = this.generateDisputeFiledHtml(data);
    const textBody = this.generateDisputeFiledText(data);

    const result = await this.sendEmail({
      to: data.contractorEmail,
      from: this.SENDGRID_FROM_EMAIL,
      subject: "⚠️ Dispute Filed Against Your Review",
      html: htmlBody,
      text: textBody,
      categories: ["dispute_filed"],
    });

    return { success: result.success, error: result.error };
  }

  /**
   * Send high priority review alert to admins
   */
  static async sendHighPriorityReviewAlert(data: {
    adminEmails: string[];
    contractorName: string;
    customerName: string;
    flags: string[];
    rating: number;
    reviewId: string;
  }): Promise<{ success: boolean; error?: string }> {
    const htmlBody = this.generateHighPriorityReviewHtml(data);
    const textBody = this.generateHighPriorityReviewText(data);

    // Send to all admin emails
    const results = await Promise.all(
      data.adminEmails.map((email) =>
        this.sendEmail({
          to: email,
          from: this.SENDGRID_FROM_EMAIL,
          subject: "🚨 High Priority Review Requires Moderation",
          html: htmlBody,
          text: textBody,
          categories: ["high_priority_review", "admin_alert"],
        })
      )
    );

    const allSuccessful = results.every((r) => r.success);
    const errors = results.filter((r) => r.error).map((r) => r.error);

    return {
      success: allSuccessful,
      error: errors.length > 0 ? errors.join("; ") : undefined,
    };
  }

  /**
   * Send weekly summary email
   */
  static async sendWeeklySummaryEmail(data: {
    contractorEmail: string;
    contractorName: string;
    newReviews: number;
    averageRating: number;
    totalRatings: number;
    topRating: number;
    lowestRating: number;
    disputes: number;
  }): Promise<{ success: boolean; error?: string }> {
    const htmlBody = this.generateWeeklySummaryHtml(data);
    const textBody = this.generateWeeklySummaryText(data);

    const result = await this.sendEmail({
      to: data.contractorEmail,
      from: this.SENDGRID_FROM_EMAIL,
      subject: "📊 Your Weekly Review Summary",
      html: htmlBody,
      text: textBody,
      categories: ["weekly_summary"],
    });

    return { success: result.success, error: result.error };
  }

  // HTML Template Generators

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
    return `New Review Posted

Hi ${data.customerName},

${data.contractorName} has left a review about your business.

Rating: ${data.rating}/5
Review: ${data.reviewSummary}

View Review: https://contractorvet.com/reviews/${data.reviewId}

© 2026 ClientCheck. All rights reserved.`;
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
    return `✅ Review Approved

Hi ${data.contractorName},

Your review about ${data.customerName} has been approved and is now live.

Rating: ${data.rating}/5

Your review is now visible to other contractors on the platform.

© 2026 ClientCheck. All rights reserved.`;
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
    return `✅ Payment Received

Hi ${data.name},

Thank you for your payment. Your subscription is now active.

Plan: ${data.plan}
Amount: $${data.amount.toFixed(2)}
Next Billing Date: ${data.nextBillingDate}

Go to Dashboard: https://contractorvet.com/dashboard

© 2026 ClientCheck. All rights reserved.`;
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
    return `⚠️ Dispute Filed

Hi ${data.contractorName},

${data.customerName} has filed a dispute against your review.

Dispute Reason:
${data.disputeReason}

Our moderation team will review this dispute and make a decision within 5-7 business days.

View Dispute: https://contractorvet.com/disputes/${data.disputeId}

© 2026 ClientCheck. All rights reserved.`;
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
    return `🚨 High Priority Review Requires Moderation

A review has been flagged for manual moderation.

From: ${data.contractorName}
About: ${data.customerName}
Rating: ${data.rating}/5

Flags:
${data.flags.map((f: string) => `- ${f}`).join("\n")}

Review Now: https://contractorvet.com/moderation/${data.reviewId}

© 2026 ClientCheck. All rights reserved.`;
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
    return `📊 Your Weekly Review Summary

Hi ${data.contractorName},

Here's your review activity for this week:

New Reviews: ${data.newReviews}
Current Average Rating: ${data.averageRating.toFixed(1)}/5
Total Ratings: ${data.totalRatings}
Highest Rating: ${data.topRating}/5
Lowest Rating: ${data.lowestRating}/5
Active Disputes: ${data.disputes}

View Full Dashboard: https://contractorvet.com/dashboard

© 2026 ClientCheck. All rights reserved.`;
  }
}
