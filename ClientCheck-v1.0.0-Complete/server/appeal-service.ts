/**
 * Appeal Service
 * Manages dispute appeals and re-review process
 */

export interface DisputeAppeal {
  id: number;
  disputeId: number;
  customerId: number;
  appealReason: string;
  additionalEvidence: string;
  evidenceFiles?: string[];
  status: "submitted" | "under_review" | "approved" | "rejected";
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewerNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Appeal guidelines and constraints
 */
export const APPEAL_GUIDELINES = {
  maxAppealsDays: 30, // 30 days from rejection date
  maxAppealsPerDispute: 1, // Only one appeal allowed
  reviewTimelineWeeks: "2-4",
  maxAppealReasonLength: 500,
  maxEvidenceLength: 1000,
  maxFileUploads: 5,
  maxFileSize: 10 * 1024 * 1024, // 10MB
};

/**
 * Check if customer can appeal a dispute
 */
export async function canAppealDispute(
  disputeId: number,
  rejectionDate: Date
): Promise<{
  canAppeal: boolean;
  reason?: string;
  daysRemaining?: number;
}> {
  const now = new Date();
  const daysSinceRejection = Math.floor(
    (now.getTime() - rejectionDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceRejection > APPEAL_GUIDELINES.maxAppealsDays) {
    return {
      canAppeal: false,
      reason: `Appeal period has expired. You had 30 days from the rejection date.`,
    };
  }

  return {
    canAppeal: true,
    daysRemaining: APPEAL_GUIDELINES.maxAppealsDays - daysSinceRejection,
  };
}

/**
 * Submit an appeal for a rejected dispute
 */
export async function submitAppeal(
  disputeId: number,
  customerId: number,
  appealData: {
    appealReason: string;
    additionalEvidence: string;
    evidenceFiles?: string[];
  }
): Promise<DisputeAppeal> {
  // Validate appeal data
  if (!appealData.appealReason.trim()) {
    throw new Error("Appeal reason is required");
  }

  if (!appealData.additionalEvidence.trim()) {
    throw new Error("Additional evidence or clarification is required");
  }

  if (appealData.appealReason.length > APPEAL_GUIDELINES.maxAppealReasonLength) {
    throw new Error(
      `Appeal reason cannot exceed ${APPEAL_GUIDELINES.maxAppealReasonLength} characters`
    );
  }

  if (appealData.additionalEvidence.length > APPEAL_GUIDELINES.maxEvidenceLength) {
    throw new Error(
      `Evidence cannot exceed ${APPEAL_GUIDELINES.maxEvidenceLength} characters`
    );
  }

  const appeal: DisputeAppeal = {
    id: Math.random(),
    disputeId,
    customerId,
    appealReason: appealData.appealReason,
    additionalEvidence: appealData.additionalEvidence,
    evidenceFiles: appealData.evidenceFiles,
    status: "submitted",
    submittedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Send notification emails
  // await notifyAppealSubmitted(appeal);

  return appeal;
}

/**
 * Get appeal by ID
 */
export async function getAppeal(appealId: number): Promise<DisputeAppeal | null> {
  // Mock implementation
  return null;
}

/**
 * Get appeal for dispute
 */
export async function getAppealForDispute(disputeId: number): Promise<DisputeAppeal | null> {
  // Mock implementation
  return null;
}

/**
 * Review appeal (admin function)
 */
export async function reviewAppeal(
  appealId: number,
  approved: boolean,
  reviewerNotes?: string
): Promise<DisputeAppeal> {
  const appeal: DisputeAppeal = {
    id: appealId,
    disputeId: 0,
    customerId: 0,
    appealReason: "",
    additionalEvidence: "",
    status: approved ? "approved" : "rejected",
    reviewedAt: new Date(),
    reviewedBy: "admin",
    reviewerNotes,
    submittedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return appeal;
}

/**
 * Format appeal guidelines for display
 */
export function formatAppealGuidelines(): string {
  return `
Appeal Guidelines:

• You have ${APPEAL_GUIDELINES.maxAppealsDays} days from the rejection date to appeal
• You can submit one appeal per dispute
• Provide new evidence or clarification not included in the original dispute
• Appeals are reviewed within ${APPEAL_GUIDELINES.reviewTimelineWeeks} weeks
• Our decision on appeal is final

Requirements:
• Appeal reason: up to ${APPEAL_GUIDELINES.maxAppealReasonLength} characters
• Additional evidence: up to ${APPEAL_GUIDELINES.maxEvidenceLength} characters
• File uploads: up to ${APPEAL_GUIDELINES.maxFileUploads} files (${APPEAL_GUIDELINES.maxFileSize / (1024 * 1024)}MB each)

Tips for a successful appeal:
• Be specific about why the decision was incorrect
• Provide new evidence that wasn't in the original dispute
• Explain how this evidence changes the outcome
• Be professional and factual
• Avoid repeating the same arguments
  `;
}

/**
 * Get appeal status
 */
export async function getAppealStatus(
  appealId: number
): Promise<{
  status: string;
  message: string;
  nextSteps: string;
}> {
  return {
    status: "under_review",
    message: "Your appeal is being reviewed by our team.",
    nextSteps: "You will receive an email update within 2-4 weeks.",
  };
}

/**
 * Check if appeal is valid (substantive vs duplicate)
 */
export function isAppealSubstantive(
  originalDisputeReason: string,
  appealReason: string,
  additionalEvidence: string
): {
  isSubstantive: boolean;
  feedback?: string;
} {
  // Check if appeal contains new information
  if (appealReason.length < 20) {
    return {
      isSubstantive: false,
      feedback: "Appeal reason is too brief. Please provide more detail.",
    };
  }

  if (additionalEvidence.length < 20) {
    return {
      isSubstantive: false,
      feedback: "Please provide substantial new evidence or clarification.",
    };
  }

  // Check for duplicate submission
  if (appealReason.toLowerCase() === originalDisputeReason.toLowerCase()) {
    return {
      isSubstantive: false,
      feedback: "Your appeal appears to be a duplicate of the original dispute.",
    };
  }

  return {
    isSubstantive: true,
  };
}
