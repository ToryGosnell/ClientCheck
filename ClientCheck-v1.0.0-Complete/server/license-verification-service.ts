// Database operations handled via service layer

export interface LicenseVerification {
  id: number;
  contractorId: number;
  licenseType: "contractor" | "professional" | "both";
  contractorLicenseNumber?: string;
  contractorLicenseState?: string;
  contractorLicenseExpiry?: Date;
  professionalLicenseNumber?: string;
  professionalLicenseType?: string;
  professionalLicenseExpiry?: Date;
  contractorLicenseImageUrl?: string;
  professionalLicenseImageUrl?: string;
  verificationStatus: "pending" | "verified" | "rejected" | "expired";
  rejectionReason?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Submit contractor license for verification
 */
export async function submitLicenseVerification(
  contractorId: number,
  licenseData: {
    licenseType: "contractor" | "professional" | "both";
    contractorLicenseNumber?: string;
    contractorLicenseState?: string;
    contractorLicenseExpiry?: string;
    professionalLicenseNumber?: string;
    professionalLicenseType?: string;
    professionalLicenseExpiry?: string;
    contractorLicenseImageUrl?: string;
    professionalLicenseImageUrl?: string;
  }
): Promise<LicenseVerification> {
  const verification: LicenseVerification = {
    id: Math.random(),
    contractorId,
    licenseType: licenseData.licenseType,
    contractorLicenseNumber: licenseData.contractorLicenseNumber,
    contractorLicenseState: licenseData.contractorLicenseState,
    contractorLicenseExpiry: licenseData.contractorLicenseExpiry
      ? new Date(licenseData.contractorLicenseExpiry)
      : undefined,
    professionalLicenseNumber: licenseData.professionalLicenseNumber,
    professionalLicenseType: licenseData.professionalLicenseType,
    professionalLicenseExpiry: licenseData.professionalLicenseExpiry
      ? new Date(licenseData.professionalLicenseExpiry)
      : undefined,
    contractorLicenseImageUrl: licenseData.contractorLicenseImageUrl,
    professionalLicenseImageUrl: licenseData.professionalLicenseImageUrl,
    verificationStatus: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return verification;
}

/**
 * Get contractor's license verification status
 */
export async function getLicenseVerification(
  contractorId: number
): Promise<LicenseVerification | null> {
  // Mock implementation - replace with actual DB query
  return null;
}

/**
 * Check if contractor can submit reviews (must have verified license)
 */
export async function canSubmitReviews(contractorId: number): Promise<boolean> {
  const verification = await getLicenseVerification(contractorId);
  return verification?.verificationStatus === "verified";
}

/**
 * Verify license (admin function)
 */
export async function verifyLicense(
  verificationId: number,
  approved: boolean,
  rejectionReason?: string
): Promise<LicenseVerification> {
  // Mock implementation
  return {
    id: verificationId,
    contractorId: 0,
    licenseType: "contractor",
    verificationStatus: approved ? "verified" : "rejected",
    rejectionReason,
    verifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Check if license is expired
 */
export function isLicenseExpired(expiryDate?: Date): boolean {
  if (!expiryDate) return false;
  return new Date() > expiryDate;
}
