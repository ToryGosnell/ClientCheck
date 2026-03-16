/**
 * License Check Middleware
 * Ensures contractors have verified licenses before submitting reviews
 */

export interface LicenseCheckResult {
  hasVerifiedLicense: boolean;
  licenseStatus: "verified" | "pending" | "rejected" | "not_submitted";
  licenseType?: "contractor" | "professional" | "both";
  expiryDate?: Date;
  message: string;
  action?: "verify" | "resubmit" | "none";
}

/**
 * Check if contractor can submit a review
 */
export async function canSubmitReview(contractorId: number): Promise<LicenseCheckResult> {
  // Mock implementation - replace with actual DB query
  const hasVerifiedLicense = true;

  if (!hasVerifiedLicense) {
    return {
      hasVerifiedLicense: false,
      licenseStatus: "not_submitted",
      message:
        "You must verify your contractor or professional license before submitting reviews.",
      action: "verify",
    };
  }

  return {
    hasVerifiedLicense: true,
    licenseStatus: "verified",
    licenseType: "contractor",
    message: "Your license is verified. You can submit reviews.",
    action: "none",
  };
}

/**
 * Get license verification status for contractor
 */
export async function getLicenseStatus(
  contractorId: number
): Promise<LicenseCheckResult> {
  // Mock implementation
  return {
    hasVerifiedLicense: true,
    licenseStatus: "verified",
    message: "Your license is verified.",
    action: "none",
  };
}

/**
 * Format license check message for UI
 */
export function formatLicenseMessage(result: LicenseCheckResult): {
  title: string;
  description: string;
  buttonText?: string;
  buttonAction?: string;
} {
  if (result.hasVerifiedLicense) {
    return {
      title: "✓ License Verified",
      description: "Your license has been verified. You can submit reviews.",
    };
  }

  if (result.licenseStatus === "pending") {
    return {
      title: "⏳ License Under Review",
      description:
        "Your license submission is being reviewed. This typically takes 24 hours. You'll be notified when it's verified.",
    };
  }

  if (result.licenseStatus === "rejected") {
    return {
      title: "❌ License Verification Failed",
      description:
        "Your license submission was rejected. Please review the feedback and resubmit with correct information.",
      buttonText: "Resubmit License",
      buttonAction: "resubmit",
    };
  }

  return {
    title: "📋 License Required",
    description:
      "To maintain quality and trust, we require contractors to verify their license before submitting reviews. This takes just 2 minutes.",
    buttonText: "Verify License",
    buttonAction: "verify",
  };
}
