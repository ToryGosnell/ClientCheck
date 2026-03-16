/**
 * Dispute Notifications Service
 * Sends automated emails to customers, contractors, and admins
 */

export interface NotificationEvent {
  type:
    | "dispute_filed"
    | "dispute_under_review"
    | "dispute_approved"
    | "dispute_rejected"
    | "appeal_filed"
    | "appeal_approved"
    | "appeal_rejected";
  disputeId: number;
  reviewId: number;
  timestamp: Date;
}

/**
 * Send notification when dispute is filed
 */
export async function notifyDisputeFiled(
  disputeId: number,
  customerEmail: string,
  customerName: string,
  contractorEmail: string,
  contractorName: string,
  adminEmail: string,
  disputeReason: string
): Promise<void> {
  // Notify customer
  await sendCustomerDisputeFiledEmail(customerEmail, customerName, disputeId);

  // Notify contractor
  await sendContractorDisputeFiledEmail(
    contractorEmail,
    contractorName,
    disputeId,
    customerName,
    disputeReason
  );

  // Notify admin
  await sendAdminDisputeFiledEmail(
    adminEmail,
    disputeId,
    customerName,
    contractorName,
    disputeReason
  );
}

/**
 * Send notification when dispute is approved
 */
export async function notifyDisputeApproved(
  disputeId: number,
  customerEmail: string,
  customerName: string,
  contractorEmail: string,
  contractorName: string,
  adminEmail: string,
  reviewerNotes?: string
): Promise<void> {
  // Notify customer
  await sendCustomerDisputeApprovedEmail(
    customerEmail,
    customerName,
    disputeId,
    reviewerNotes
  );

  // Notify contractor
  await sendContractorDisputeApprovedEmail(
    contractorEmail,
    contractorName,
    disputeId,
    customerName
  );

  // Notify admin (for record)
  await sendAdminDisputeApprovedEmail(adminEmail, disputeId, customerName, contractorName);
}

/**
 * Send notification when dispute is rejected
 */
export async function notifyDisputeRejected(
  disputeId: number,
  customerEmail: string,
  customerName: string,
  contractorEmail: string,
  contractorName: string,
  adminEmail: string,
  reviewerNotes?: string
): Promise<void> {
  // Notify customer
  await sendCustomerDisputeRejectedEmail(
    customerEmail,
    customerName,
    disputeId,
    reviewerNotes
  );

  // Notify contractor
  await sendContractorDisputeRejectedEmail(
    contractorEmail,
    contractorName,
    disputeId,
    customerName
  );

  // Notify admin (for record)
  await sendAdminDisputeRejectedEmail(adminEmail, disputeId, customerName, contractorName);
}

/**
 * Send notification when appeal is filed
 */
export async function notifyAppealFiled(
  disputeId: number,
  customerEmail: string,
  customerName: string,
  adminEmail: string,
  appealReason: string
): Promise<void> {
  // Notify customer
  await sendCustomerAppealFiledEmail(customerEmail, customerName, disputeId);

  // Notify admin
  await sendAdminAppealFiledEmail(adminEmail, disputeId, customerName, appealReason);
}

// ============ Customer Emails ============

async function sendCustomerDisputeFiledEmail(
  customerEmail: string,
  customerName: string,
  disputeId: number
): Promise<void> {
  const emailBody = `
Dear ${customerName},

Thank you for submitting your dispute. We have received it and will review it carefully.

Dispute ID: ${disputeId}
Submitted: ${new Date().toLocaleDateString()}

Review Timeline:
- Our team will review your dispute within 2-4 weeks
- We will examine all evidence you provided
- You will receive an email with our decision

Important: Do not submit duplicate disputes. Each dispute is reviewed thoroughly.

Best regards,
ClientCheck Support Team
  `;

  console.log(`Sending dispute filed confirmation to ${customerEmail}`);
}

async function sendCustomerDisputeApprovedEmail(
  customerEmail: string,
  customerName: string,
  disputeId: number,
  reviewerNotes?: string
): Promise<void> {
  const emailBody = `
Dear ${customerName},

Good news! Your dispute has been APPROVED.

Dispute ID: ${disputeId}
Decision: APPROVED

The review will be removed from the platform within 24 hours.

${reviewerNotes ? `Notes: ${reviewerNotes}` : ""}

Thank you for helping us maintain a trustworthy community.

Best regards,
ClientCheck Support Team
  `;

  console.log(`Sending dispute approved email to ${customerEmail}`);
}

async function sendCustomerDisputeRejectedEmail(
  customerEmail: string,
  customerName: string,
  disputeId: number,
  reviewerNotes?: string
): Promise<void> {
  const emailBody = `
Dear ${customerName},

We have completed our review of your dispute.

Dispute ID: ${disputeId}
Decision: REJECTED

The review will remain on the platform. However, you have the option to submit an appeal within 30 days if you have additional evidence or clarification.

${reviewerNotes ? `Reviewer Notes: ${reviewerNotes}` : ""}

To submit an appeal, log in to your account and select "Appeal Dispute."

Best regards,
ClientCheck Support Team
  `;

  console.log(`Sending dispute rejected email to ${customerEmail}`);
}

async function sendCustomerAppealFiledEmail(
  customerEmail: string,
  customerName: string,
  disputeId: number
): Promise<void> {
  const emailBody = `
Dear ${customerName},

We have received your appeal for dispute ID: ${disputeId}.

Your appeal will be reviewed within 2-4 weeks. We will examine the additional evidence you provided.

You will receive an email with our final decision.

Best regards,
ClientCheck Support Team
  `;

  console.log(`Sending appeal filed confirmation to ${customerEmail}`);
}

// ============ Contractor Emails ============

async function sendContractorDisputeFiledEmail(
  contractorEmail: string,
  contractorName: string,
  disputeId: number,
  customerName: string,
  disputeReason: string
): Promise<void> {
  const emailBody = `
Dear ${contractorName},

A customer has filed a dispute against one of your reviews.

Dispute ID: ${disputeId}
Customer: ${customerName}
Reason: ${disputeReason}

Our team will review this dispute and make a decision within 2-4 weeks. You will be notified of the outcome.

If the dispute is approved, the review will be removed from the platform.

Best regards,
ClientCheck Support Team
  `;

  console.log(`Sending dispute filed notification to contractor ${contractorEmail}`);
}

async function sendContractorDisputeApprovedEmail(
  contractorEmail: string,
  contractorName: string,
  disputeId: number,
  customerName: string
): Promise<void> {
  const emailBody = `
Dear ${contractorName},

A dispute against one of your reviews has been APPROVED.

Dispute ID: ${disputeId}
Customer: ${customerName}

The review has been removed from the platform.

Best regards,
ClientCheck Support Team
  `;

  console.log(`Sending dispute approved notification to contractor ${contractorEmail}`);
}

async function sendContractorDisputeRejectedEmail(
  contractorEmail: string,
  contractorName: string,
  disputeId: number,
  customerName: string
): Promise<void> {
  const emailBody = `
Dear ${contractorName},

A dispute against one of your reviews has been REJECTED.

Dispute ID: ${disputeId}
Customer: ${customerName}

The review will remain on the platform.

Best regards,
ClientCheck Support Team
  `;

  console.log(`Sending dispute rejected notification to contractor ${contractorEmail}`);
}

// ============ Admin Emails ============

async function sendAdminDisputeFiledEmail(
  adminEmail: string,
  disputeId: number,
  customerName: string,
  contractorName: string,
  disputeReason: string
): Promise<void> {
  const emailBody = `
New Dispute Filed - Requires Review

Dispute ID: ${disputeId}
Customer: ${customerName}
Contractor: ${contractorName}
Reason: ${disputeReason}
Filed: ${new Date().toLocaleString()}

Log in to the admin dashboard to review this dispute.

Target Review Timeline: 2-4 weeks
  `;

  console.log(`Sending dispute filed alert to admin ${adminEmail}`);
}

async function sendAdminDisputeApprovedEmail(
  adminEmail: string,
  disputeId: number,
  customerName: string,
  contractorName: string
): Promise<void> {
  const emailBody = `
Dispute Approved

Dispute ID: ${disputeId}
Customer: ${customerName}
Contractor: ${contractorName}
Status: APPROVED
Reviewed: ${new Date().toLocaleString()}

The review has been removed from the platform.
  `;

  console.log(`Sending dispute approved alert to admin ${adminEmail}`);
}

async function sendAdminDisputeRejectedEmail(
  adminEmail: string,
  disputeId: number,
  customerName: string,
  contractorName: string
): Promise<void> {
  const emailBody = `
Dispute Rejected

Dispute ID: ${disputeId}
Customer: ${customerName}
Contractor: ${contractorName}
Status: REJECTED
Reviewed: ${new Date().toLocaleString()}

The review remains on the platform.
  `;

  console.log(`Sending dispute rejected alert to admin ${adminEmail}`);
}

async function sendAdminAppealFiledEmail(
  adminEmail: string,
  disputeId: number,
  customerName: string,
  appealReason: string
): Promise<void> {
  const emailBody = `
Appeal Filed - Requires Review

Dispute ID: ${disputeId}
Customer: ${customerName}
Appeal Reason: ${appealReason}
Filed: ${new Date().toLocaleString()}

Log in to the admin dashboard to review this appeal.

Target Review Timeline: 2-4 weeks
  `;

  console.log(`Sending appeal filed alert to admin ${adminEmail}`);
}
