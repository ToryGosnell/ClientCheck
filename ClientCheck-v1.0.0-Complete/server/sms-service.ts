/**
 * SMS Notification Service
 * Sends SMS alerts for critical events using Twilio
 */

export interface SMSMessage {
  to: string;
  message: string;
  type: "dispute" | "suspension" | "trial_expiring" | "referral" | "payment";
}

export class SMSService {
  private static accountSid = process.env.TWILIO_ACCOUNT_SID;
  private static authToken = process.env.TWILIO_AUTH_TOKEN;
  private static fromNumber = process.env.TWILIO_PHONE_NUMBER;

  static async sendSMS(smsMessage: SMSMessage): Promise<boolean> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      console.warn("Twilio credentials not configured. SMS not sent.");
      return false;
    }

    try {
      // Twilio API call would go here
      // For now, we'll log the message
      console.log(`[SMS] To: ${smsMessage.to}, Message: ${smsMessage.message}`);
      return true;
    } catch (error) {
      console.error("Failed to send SMS:", error);
      return false;
    }
  }

  static async sendDisputeFiled(phoneNumber: string, customerName: string): Promise<boolean> {
    const message = `A dispute has been filed on your review for ${customerName}. We'll review it within 2-4 weeks. Check your email for details.`;
    return this.sendSMS({
      to: phoneNumber,
      message,
      type: "dispute",
    });
  }

  static async sendAccountSuspended(phoneNumber: string, reason: string): Promise<boolean> {
    const message = `Your ClientCheck account has been suspended due to: ${reason}. Contact support for more information.`;
    return this.sendSMS({
      to: phoneNumber,
      message,
      type: "suspension",
    });
  }

  static async sendTrialExpiring(phoneNumber: string, daysLeft: number): Promise<boolean> {
    const message = `Your ClientCheck trial expires in ${daysLeft} days. Add a payment method to continue using the app.`;
    return this.sendSMS({
      to: phoneNumber,
      message,
      type: "trial_expiring",
    });
  }

  static async sendReferralSuccess(phoneNumber: string, referralCount: number): Promise<boolean> {
    let bonus = "";
    if (referralCount === 1) bonus = "1 month free premium";
    else if (referralCount === 3) bonus = "2 months free premium";
    else if (referralCount === 5) bonus = "3 months free premium";

    const message = `Great! You've referred ${referralCount} contractors. You've unlocked ${bonus}!`;
    return this.sendSMS({
      to: phoneNumber,
      message,
      type: "referral",
    });
  }

  static async sendPaymentSuccess(phoneNumber: string, amount: number, plan: string): Promise<boolean> {
    const message = `Payment received! Your ${plan} subscription is now active. Thank you for using ClientCheck.`;
    return this.sendSMS({
      to: phoneNumber,
      message,
      type: "payment",
    });
  }

  static async sendPaymentFailed(phoneNumber: string): Promise<boolean> {
    const message = `Your payment failed. Please update your payment method to keep your subscription active.`;
    return this.sendSMS({
      to: phoneNumber,
      message,
      type: "payment",
    });
  }

  static async sendDisputeDecision(phoneNumber: string, decision: "approved" | "rejected"): Promise<boolean> {
    const message =
      decision === "approved"
        ? "Your dispute has been approved. The review has been removed."
        : "Your dispute has been rejected. The review remains on the profile.";
    return this.sendSMS({
      to: phoneNumber,
      message,
      type: "dispute",
    });
  }
}
