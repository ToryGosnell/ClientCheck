/**
 * Customer Dispute Service
 * Implements Google-style dispute process for reviews
 */

export interface DisputeEvidence {
  type: "photo" | "document" | "text";
  url?: string;
  description?: string;
}

export interface CustomerDispute {
  id: number;
  reviewId: number;
  customerId: number;
  customerName: string;
  customerEmail: string;
  disputeReason:
    | "false_information"
    | "defamatory"
    | "privacy_violation"
    | "not_my_business"
    | "conflict_of_interest"
    | "spam_or_fake"
    | "off_topic"
    | "illegal_content"
    | "other";
  description: string;
  evidence: DisputeEvidence[];
  status: "submitted" | "under_review" | "approved" | "rejected" | "appealed";
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewerNotes?: string;
  appealCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Google's official reasons a review can be removed
 */
export const GOOGLE_REVIEW_REMOVAL_REASONS = [
  {
    id: "false_information",
    label: "Contains False Information",
    description:
      "The review contains factually inaccurate information about the business",
  },
  {
    id: "defamatory",
    label: "Defamatory or Harmful Content",
    description: "The review contains false statements that harm the business reputation",
  },
  {
    id: "privacy_violation",
    label: "Privacy Violation",
    description: "The review reveals private information without consent",
  },
  {
    id: "not_my_business",
    label: "Not About This Business",
    description: "The review is about a different business or service",
  },
  {
    id: "conflict_of_interest",
    label: "Conflict of Interest",
    description: "The reviewer has a personal or business relationship with the business",
  },
  {
    id: "spam_or_fake",
    label: "Spam or Fake Review",
    description: "The review appears to be spam or created for promotional purposes",
  },
  {
    id: "off_topic",
    label: "Off-Topic Content",
    description: "The review contains content unrelated to the business experience",
  },
  {
    id: "illegal_content",
    label: "Illegal Content",
    description: "The review contains illegal or harmful content",
  },
];

/**
 * Submit a dispute for a review (Google-style process)
 */
export async function submitDispute(
  reviewId: number,
  customerId: number,
  disputeData: {
    customerName: string;
    customerEmail: string;
    disputeReason: string;
    description: string;
    evidence: DisputeEvidence[];
  }
): Promise<CustomerDispute> {
  const dispute: CustomerDispute = {
    id: Math.random(),
    reviewId,
    customerId,
    customerName: disputeData.customerName,
    customerEmail: disputeData.customerEmail,
    disputeReason: disputeData.disputeReason as any,
    description: disputeData.description,
    evidence: disputeData.evidence,
    status: "submitted",
    submittedAt: new Date(),
    appealCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Send confirmation email to customer
  await sendDisputeConfirmationEmail(
    customerId,
    disputeData.customerEmail,
    dispute.id,
    disputeData.disputeReason
  );

  return dispute;
}

/**
 * Get dispute by ID
 */
export async function getDispute(disputeId: number): Promise<CustomerDispute | null> {
  // Mock implementation
  return null;
}

/**
 * Get all disputes for a review
 */
export async function getDisputesForReview(reviewId: number): Promise<CustomerDispute[]> {
  // Mock implementation
  return [];
}

/**
 * Review dispute (admin function)
 */
export async function reviewDispute(
  disputeId: number,
  approved: boolean,
  reviewerNotes?: string,
  customerEmail?: string
): Promise<CustomerDispute> {
  // If approved, remove the review
  // If rejected, notify customer

  const dispute: CustomerDispute = {
    id: disputeId,
    reviewId: 0,
    customerId: 0,
    customerName: "",
    customerEmail: customerEmail || "",
    disputeReason: "false_information",
    description: "",
    evidence: [],
    status: approved ? "approved" : "rejected",
    reviewedAt: new Date(),
    reviewerNotes,
    appealCount: 0,
    submittedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Send decision email
  if (customerEmail) {
    await sendDisputeDecisionEmail(0, customerEmail, disputeId, approved, reviewerNotes);
  }

  return dispute;
}

/**
 * Appeal a dispute decision
 */
export async function appealDispute(
  disputeId: number,
  appealReason: string,
  newEvidence?: DisputeEvidence[]
): Promise<CustomerDispute> {
  return {
    id: disputeId,
    reviewId: 0,
    customerId: 0,
    customerName: "",
    customerEmail: "",
    disputeReason: "false_information",
    description: "",
    evidence: newEvidence || [],
    status: "appealed",
    appealCount: 1,
    submittedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Get dispute status for customer
 */
export async function getDisputeStatus(
  disputeId: number
): Promise<{
  status: string;
  message: string;
  nextSteps: string;
}> {
  return {
    status: "under_review",
    message:
      "Your dispute is being reviewed by our team. We typically respond within 2-4 weeks.",
    nextSteps: "You will receive an email update when a decision is made.",
  };
}

/**
 * Send dispute confirmation email to customer (2-4 week timeline)
 */
export async function sendDisputeConfirmationEmail(
  customerId: number,
  customerEmail: string,
  disputeId: number,
  disputeReason: string
): Promise<void> {
  const reason = GOOGLE_REVIEW_REMOVAL_REASONS.find((r) => r.id === disputeReason);

  const emailBody = `
Dear Customer,

Thank you for submitting your dispute. We have received your submission and will review it carefully.

Dispute ID: ${disputeId}
Reason: ${reason?.label || disputeReason}
Submitted: ${new Date().toLocaleDateString()}

Our Review Process:
- Initial review: 2-4 weeks
- We will examine all evidence you provided
- You will receive an email with our decision
- If approved, the review will be removed within 24 hours
- If rejected, you can submit an appeal with additional evidence

IMPORTANT: Do not submit duplicate disputes. Each dispute is reviewed thoroughly.

We follow Google's official review removal guidelines:
${GOOGLE_REVIEW_REMOVAL_REASONS.map((r) => `- ${r.label}: ${r.description}`).join("\n")}

If you have questions, please reply to this email.

Best regards,
ClientCheck Support Team
  `;

  // Send email via SMTP service
  console.log(`Sending dispute confirmation email to ${customerEmail}`);
  // await emailService.send({
  //   to: customerEmail,
  //   subject: `Dispute Received - ID: ${disputeId}`,
  //   body: emailBody
  // });
}

/**
 * Send dispute decision email
 */
export async function sendDisputeDecisionEmail(
  customerId: number,
  customerEmail: string,
  disputeId: number,
  approved: boolean,
  reviewerNotes?: string
): Promise<void> {
  const decision = approved ? "APPROVED" : "REJECTED";
  const message = approved
    ? "Your dispute has been approved. The review will be removed from the platform within 24 hours."
    : "Your dispute has been reviewed and rejected. The review will remain on the platform. You can submit an appeal with additional evidence.";

  const emailBody = `
Dear Customer,

We have completed our review of your dispute (ID: ${disputeId}).

Decision: ${decision}

${message}

${reviewerNotes ? `Notes: ${reviewerNotes}\n` : ""}

Next Steps:
${
  approved
    ? "- The review will be removed within 24 hours\n- You will receive a confirmation email"
    : "- You can submit an appeal within 30 days\n- Include new evidence or clarification\n- Appeals are reviewed within 2-4 weeks"
}

If you have questions, please reply to this email.

Best regards,
ClientCheck Support Team
  `;

  // Send email via SMTP service
  console.log(`Sending dispute decision email to ${customerEmail}: ${decision}`);
  // await emailService.send({
  //   to: customerEmail,
  //   subject: `Dispute Decision - ${decision} (ID: ${disputeId})`,
  //   body: emailBody
  // });
}

/**
 * Send dispute filed notification to contractor
 */
export async function sendDisputeNotificationToContractor(
  contractorEmail: string,
  reviewId: number,
  customerName: string,
  disputeReason: string
): Promise<void> {
  const reason = GOOGLE_REVIEW_REMOVAL_REASONS.find((r) => r.id === disputeReason);

  const emailBody = `
Dear Contractor,

A customer has filed a dispute against one of your reviews.

Review ID: ${reviewId}
Dispute Reason: ${reason?.label || disputeReason}
Filed By: ${customerName}

Our team will review this dispute and make a decision within 2-4 weeks. You will be notified of the outcome.

If the dispute is approved, the review will be removed from the platform.

Best regards,
ClientCheck Support Team
  `;

  console.log(`Sending dispute notification to contractor ${contractorEmail}`);
}

/**
 * Send dispute filed notification to admin
 */
export async function sendDisputeNotificationToAdmin(
  adminEmail: string,
  disputeId: number,
  customerName: string,
  contractorName: string,
  disputeReason: string
): Promise<void> {
  const reason = GOOGLE_REVIEW_REMOVAL_REASONS.find((r) => r.id === disputeReason);

  const emailBody = `
New Dispute Filed - Requires Review

Dispute ID: ${disputeId}
Customer: ${customerName}
Contractor: ${contractorName}
Reason: ${reason?.label || disputeReason}

Please log in to the admin dashboard to review this dispute.

Disputes should be reviewed within 2-4 weeks.
  `;

  console.log(`Sending dispute notification to admin ${adminEmail}`);
}
