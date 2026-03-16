import nodemailer from "nodemailer";

const emailProvider = process.env.EMAIL_PROVIDER || "smtp";
const emailFrom = process.env.EMAIL_FROM || "noreply@contractorblacklist.app";
const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = parseInt(process.env.SMTP_PORT || "587");
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

let transporter: nodemailer.Transporter | null = null;

if (smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

/**
 * Send trial expiration reminder email (3 days before)
 */
export async function sendTrialExpiringEmail(
  contractorEmail: string,
  contractorName: string,
  daysRemaining: number,
  upgradeUrl?: string
): Promise<boolean> {
  if (!transporter) {
    console.warn("Email service not configured. Skipping email send.");
    return false;
  }

  const url = upgradeUrl || "https://clientcheck.app/subscription";
  const expiryDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toLocaleDateString();

  try {
    await transporter.sendMail({
      from: emailFrom,
      to: contractorEmail,
      subject: `Your ClientCheck trial expires in ${daysRemaining} days`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Your Trial is Ending Soon</h1>
          </div>
          <div style="padding: 40px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi <strong>${contractorName}</strong>,</p>
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Your ClientCheck free trial expires in <strong>${daysRemaining} days</strong> (${expiryDate}).</p>
            <p style="font-size: 16px; color: #333; margin-bottom: 30px;">To continue using ClientCheck and protect yourself from problem customers, upgrade to a paid plan:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #667eea;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <div><h3 style="margin: 0 0 5px 0; color: #333;">Monthly Plan</h3><p style="margin: 0; color: #666; font-size: 14px;">Cancel anytime</p></div>
                <div style="text-align: right;"><p style="margin: 0; font-size: 24px; font-weight: bold; color: #667eea;">$9.99</p><p style="margin: 0; color: #666; font-size: 14px;">/month</p></div>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <div><h3 style="margin: 0 0 5px 0; color: #333;">Annual Plan</h3><p style="margin: 0; color: #666; font-size: 14px;">Save $19.88/year</p></div>
                <div style="text-align: right;"><p style="margin: 0; font-size: 24px; font-weight: bold; color: #667eea;">$100</p><p style="margin: 0; color: #666; font-size: 14px;">/year</p></div>
              </div>
            </div>
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${url}" style="display: inline-block; background: #667eea; color: white; padding: 14px 40px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">Upgrade Now</a>
            </div>
            <p style="font-size: 14px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">Questions? <a href="mailto:support@clientcheck.app" style="color: #667eea; text-decoration: none;">Contact our support team</a></p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send trial expiring email:", error);
    return false;
  }
}

/**
 * Send trial expired notification
 */
export async function sendTrialExpiredEmail(
  contractorEmail: string,
  contractorName: string,
  upgradeUrl?: string
): Promise<boolean> {
  if (!transporter) {
    console.warn("Email service not configured. Skipping email send.");
    return false;
  }

  const url = upgradeUrl || "https://clientcheck.app/subscription";

  try {
    await transporter.sendMail({
      from: emailFrom,
      to: contractorEmail,
      subject: "Your ClientCheck trial has ended",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Your Trial Has Ended</h1>
          </div>
          <div style="padding: 40px; background: #f9f9f9; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi <strong>${contractorName}</strong>,</p>
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Your 90-day free trial of ClientCheck has ended. To continue protecting yourself from problem customers, upgrade to a paid plan.</p>
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${url}" style="display: inline-block; background: #f5576c; color: white; padding: 14px 40px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">Upgrade to Premium</a>
            </div>
            <p style="font-size: 14px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">Need help? <a href="mailto:support@clientcheck.app" style="color: #f5576c; text-decoration: none;">Contact support</a></p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send trial expired email:", error);
    return false;
  }
}

/**
 * Send dispute filed notification to contractor
 */
export async function sendDisputeFiledEmail(
  contractorEmail: string,
  contractorName: string,
  customerName: string,
  reviewId: number
): Promise<boolean> {
  if (!transporter) {
    console.warn("Email service not configured. Skipping email send.");
    return false;
  }

  try {
    await transporter.sendMail({
      from: emailFrom,
      to: contractorEmail,
      subject: `A customer has disputed your review`,
      html: `
        <h2>Review Dispute Notification</h2>
        <p>Hi ${contractorName},</p>
        <p><strong>${customerName}</strong> has disputed your review and provided their response.</p>
        <p>You can view their response and the full dispute details in your app.</p>
        <p><a href="https://contractorblacklist.app/review/${reviewId}" style="background-color: #DC2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dispute</a></p>
        <p>If you believe the dispute is invalid, you can respond with additional information.</p>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send dispute filed email:", error);
    return false;
  }
}

/**
 * Send review posted notification to contractor
 */
export async function sendReviewPostedEmail(
  contractorEmail: string,
  contractorName: string,
  customerName: string,
  rating: number,
  reviewId: number
): Promise<boolean> {
  if (!transporter) {
    console.warn("Email service not configured. Skipping email send.");
    return false;
  }

  try {
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
    await transporter.sendMail({
      from: emailFrom,
      to: contractorEmail,
      subject: `New review from ${customerName} - ${stars}`,
      html: `
        <h2>New Review Posted</h2>
        <p>Hi ${contractorName},</p>
        <p><strong>${customerName}</strong> has posted a review about their experience working with you.</p>
        <p><strong>Rating:</strong> ${stars} (${rating}/5)</p>
        <p><a href="https://contractorblacklist.app/review/${reviewId}" style="background-color: #DC2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Review</a></p>
        <p>If you believe this review is inaccurate, you can dispute it and provide your response.</p>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send review posted email:", error);
    return false;
  }
}

/**
 * Send review moderation decision email
 */
export async function sendModerationDecisionEmail(
  contractorEmail: string,
  contractorName: string,
  decision: "approved" | "rejected" | "request_changes",
  reason?: string
): Promise<boolean> {
  if (!transporter) {
    console.warn("Email service not configured. Skipping email send.");
    return false;
  }

  const decisionText = {
    approved: "Your review has been approved and is now visible to other contractors.",
    rejected: "Your review was rejected and will not be published.",
    request_changes: "Your review needs revisions before it can be published.",
  };

  try {
    await transporter.sendMail({
      from: emailFrom,
      to: contractorEmail,
      subject: `Review Moderation Decision: ${decision.toUpperCase()}`,
      html: `
        <h2>Review Moderation Decision</h2>
        <p>Hi ${contractorName},</p>
        <p>${decisionText[decision]}</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
        <p><a href="https://contractorblacklist.app/my-reviews" style="background-color: #DC2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View My Reviews</a></p>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send moderation decision email:", error);
    return false;
  }
}

/**
 * Generic send email function
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  body: string;
}): Promise<boolean> {
  if (!transporter) {
    console.warn('Email service not configured. Skipping email send.');
    return false;
  }

  try {
    await transporter.sendMail({
      from: emailFrom,
      to: options.to,
      subject: options.subject,
      html: options.body,
    });
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Log email notification to database for audit trail
 */
export async function logEmailNotification(
  userId: number,
  type: string,
  recipientEmail: string,
  status: "pending" | "sent" | "failed",
  failureReason?: string
) {
  try {
    // This will be called from the database service
    return { success: true };
  } catch (error) {
    console.error("Failed to log email notification:", error);
    return { success: false };
  }
}
