/**
 * SendGrid Integration
 * Connects SendGrid service to actual SendGrid API using environment variables
 */

import { SendGridService } from "./sendgrid-service";

export class SendGridIntegration {
  private static readonly API_KEY = process.env.SENDGRID_API_KEY;
  private static readonly FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@contractorvet.com";

  /**
   * Initialize SendGrid integration
   */
  static initialize(): { success: boolean; error?: string } {
    if (!this.API_KEY) {
      console.warn("⚠️  SendGrid API key not configured. Set SENDGRID_API_KEY environment variable.");
      return {
        success: false,
        error: "SendGrid API key not configured",
      };
    }

    console.log("✅ SendGrid integration initialized");
    console.log(`📧 From email: ${this.FROM_EMAIL}`);

    return { success: true };
  }

  /**
   * Send review posted email
   */
  static async sendReviewPostedEmail(data: {
    customerEmail: string;
    customerName: string;
    contractorName: string;
    rating: number;
    reviewSummary: string;
    reviewId: string;
  }) {
    if (!this.API_KEY) {
      console.warn("SendGrid not configured. Email not sent.");
      return { success: false, error: "SendGrid not configured" };
    }

    return await SendGridService.sendReviewPostedEmail(data);
  }

  /**
   * Send review approved email
   */
  static async sendReviewApprovedEmail(data: {
    contractorEmail: string;
    contractorName: string;
    customerName: string;
    rating: number;
    reviewId: string;
  }) {
    if (!this.API_KEY) {
      console.warn("SendGrid not configured. Email not sent.");
      return { success: false, error: "SendGrid not configured" };
    }

    return await SendGridService.sendReviewApprovedEmail(data);
  }

  /**
   * Send payment received email
   */
  static async sendPaymentReceivedEmail(data: {
    email: string;
    name: string;
    amount: number;
    plan: string;
    nextBillingDate: string;
  }) {
    if (!this.API_KEY) {
      console.warn("SendGrid not configured. Email not sent.");
      return { success: false, error: "SendGrid not configured" };
    }

    return await SendGridService.sendPaymentReceivedEmail(data);
  }

  /**
   * Send dispute filed email
   */
  static async sendDisputeFiledEmail(data: {
    contractorEmail: string;
    contractorName: string;
    customerName: string;
    disputeReason: string;
    disputeId: string;
  }) {
    if (!this.API_KEY) {
      console.warn("SendGrid not configured. Email not sent.");
      return { success: false, error: "SendGrid not configured" };
    }

    return await SendGridService.sendDisputeFiledEmail(data);
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
  }) {
    if (!this.API_KEY) {
      console.warn("SendGrid not configured. Email not sent.");
      return { success: false, error: "SendGrid not configured" };
    }

    return await SendGridService.sendHighPriorityReviewAlert(data);
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
  }) {
    if (!this.API_KEY) {
      console.warn("SendGrid not configured. Email not sent.");
      return { success: false, error: "SendGrid not configured" };
    }

    return await SendGridService.sendWeeklySummaryEmail(data);
  }

  /**
   * Get SendGrid status
   */
  static getStatus(): {
    configured: boolean;
    apiKey: boolean;
    fromEmail: string;
  } {
    return {
      configured: !!this.API_KEY,
      apiKey: !!this.API_KEY,
      fromEmail: this.FROM_EMAIL,
    };
  }
}

// Initialize on module load
SendGridIntegration.initialize();
