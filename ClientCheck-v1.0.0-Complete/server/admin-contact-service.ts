/**
 * Admin Contact Service
 * Manages admin email privacy and contact form submissions
 * Users cannot see admin emails, but can contact admins through contact form
 */

import { sendEmail } from "./email-service";

export interface ContactSubmission {
  id: string;
  userId: number;
  userEmail: string;
  userName: string;
  subject: string;
  message: string;
  category: "support" | "dispute" | "refund" | "general" | "abuse";
  attachments?: string[];
  submittedAt: Date;
  status: "new" | "in_progress" | "resolved";
  adminResponse?: string;
}

/**
 * Submit contact form (user-facing)
 * Users never see admin email - form goes directly to admin inbox
 */
export async function submitContactForm(
  userId: number,
  userEmail: string,
  userName: string,
  subject: string,
  message: string,
  category: string,
  attachments?: string[]
): Promise<{ success: boolean; ticketId: string }> {
  const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const contactSubmission: ContactSubmission = {
    id: ticketId,
    userId,
    userEmail,
    userName,
    subject,
    message,
    category: (category as any) || "general",
    attachments,
    submittedAt: new Date(),
    status: "new",
  };

  // Send confirmation email to user (no admin email shown)
  await sendEmail({
    to: userEmail,
    subject: `✅ We Received Your Message - Ticket #${ticketId}`,
    body: `
      <p>Hi ${userName},</p>
      <p>Thank you for contacting ClientCheck. We've received your message and will review it shortly.</p>
      <p><strong>Ticket ID:</strong> ${ticketId}</p>
      <p><strong>Category:</strong> ${category}</p>
      <p><strong>Your Message:</strong></p>
      <blockquote>${message.replace(/\n/g, "<br>")}</blockquote>
      <p>Our team will respond within 24-48 hours. You can reference your ticket ID in any follow-up communications.</p>
      <p>Best regards,<br>ClientCheck Support Team</p>
    `,
  });

  // Send to admin inbox (admin email kept private)
  await notifyAdminOfNewContact(contactSubmission);

  // Store in database
  await storeContactSubmission(contactSubmission);

  return {
    success: true,
    ticketId,
  };
}

/**
 * Notify admins of new contact submission (internal only)
 * Admin email is never exposed to users
 */
async function notifyAdminOfNewContact(submission: ContactSubmission): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || "support@clientcheck.app";

  await sendEmail({
    to: adminEmail,
    subject: `[${submission.category.toUpperCase()}] ${submission.subject} - Ticket #${submission.id}`,
    body: `
      <p><strong>New Contact Submission</strong></p>
      <p><strong>Ticket ID:</strong> ${submission.id}</p>
      <p><strong>From:</strong> ${submission.userName} (${submission.userEmail})</p>
      <p><strong>User ID:</strong> ${submission.userId}</p>
      <p><strong>Category:</strong> ${submission.category}</p>
      <p><strong>Subject:</strong> ${submission.subject}</p>
      <p><strong>Message:</strong></p>
      <blockquote>${submission.message.replace(/\n/g, "<br>")}</blockquote>
      ${submission.attachments ? `<p><strong>Attachments:</strong> ${submission.attachments.join(", ")}</p>` : ""}
      <p><a href="https://admin.clientcheck.app/contacts/${submission.id}">View in Admin Panel</a></p>
    `,
  });
}

/**
 * Store contact submission in database
 */
async function storeContactSubmission(submission: ContactSubmission): Promise<void> {
  // Mock implementation - in production, save to database
  console.log("Contact submission stored:", submission.id);
}

/**
 * Get contact submission (admin only)
 */
export async function getContactSubmission(
  ticketId: string,
  isAdmin: boolean
): Promise<ContactSubmission | null> {
  if (!isAdmin) {
    throw new Error("Unauthorized: Only admins can view contact submissions");
  }

  // Mock implementation
  return {
    id: ticketId,
    userId: 1,
    userEmail: "user@example.com",
    userName: "John Contractor",
    subject: "Refund Request",
    message: "I need a refund for my subscription",
    category: "refund",
    submittedAt: new Date(),
    status: "new",
  };
}

/**
 * Respond to contact submission (admin only)
 */
export async function respondToContact(
  ticketId: string,
  adminResponse: string,
  isAdmin: boolean
): Promise<void> {
  if (!isAdmin) {
    throw new Error("Unauthorized: Only admins can respond to contacts");
  }

  // Get submission
  const submission = await getContactSubmission(ticketId, true);
  if (!submission) {
    throw new Error("Contact submission not found");
  }

  // Send response to user
  await sendEmail({
    to: submission.userEmail,
    subject: `📧 Response to Your Ticket #${ticketId}`,
    body: `
      <p>Hi ${submission.userName},</p>
      <p>Thank you for contacting us. Here's our response to your message:</p>
      <blockquote>${adminResponse.replace(/\n/g, "<br>")}</blockquote>
      <p>If you have any follow-up questions, please reply to this email with your ticket ID.</p>
      <p>Best regards,<br>ClientCheck Support Team</p>
    `,
  });

  // Update status in database
  console.log(`Contact ${ticketId} marked as resolved`);
}

/**
 * Get all contact submissions (admin only)
 */
export async function getAllContactSubmissions(
  isAdmin: boolean,
  filter?: {
    status?: string;
    category?: string;
    limit?: number;
  }
): Promise<ContactSubmission[]> {
  if (!isAdmin) {
    throw new Error("Unauthorized: Only admins can view all contacts");
  }

  // Mock implementation
  return [];
}

/**
 * Hide admin email from API responses
 * Sanitize any admin email that might be exposed
 */
export function sanitizeAdminEmail(data: any): any {
  if (!data) return data;

  if (typeof data === "string") {
    // Replace admin email pattern with placeholder
    return data.replace(/admin@clientcheck\.app/g, "[admin contact form]");
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeAdminEmail);
  }

  if (typeof data === "object") {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip admin email fields
      if (key.toLowerCase().includes("email") && typeof value === "string") {
        if ((value as string).includes("admin")) {
          sanitized[key] = "[admin contact form]";
          continue;
        }
      }
      sanitized[key] = sanitizeAdminEmail(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Create contact form link for users
 * Users click this link to contact admins without seeing email
 */
export function getContactFormLink(): string {
  return "https://clientcheck.app/contact";
}

/**
 * Get admin email (internal use only)
 * This function should NEVER be called from client-side code
 */
export function getAdminEmail(): string {
  const email = process.env.ADMIN_EMAIL || "support@clientcheck.app";
  if (!email) {
    throw new Error("ADMIN_EMAIL environment variable not set");
  }
  return email;
}
