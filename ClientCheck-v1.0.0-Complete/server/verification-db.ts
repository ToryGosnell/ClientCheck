import { drizzle } from "drizzle-orm/mysql2";
import { contractorProfiles } from "../drizzle/schema";
import { eq } from "drizzle-orm";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Submit verification documents
 */
export async function submitVerification(
  userId: number,
  idDocumentUrl?: string,
  licenseDocumentUrl?: string,
  insuranceDocumentUrl?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .update(contractorProfiles)
    .set({
      verificationStatus: "pending",
      idDocumentUrl: idDocumentUrl || null,
      licenseDocumentUrl: licenseDocumentUrl || null,
      insuranceDocumentUrl: insuranceDocumentUrl || null,
      verificationSubmittedAt: new Date(),
    })
    .where(eq(contractorProfiles.userId, userId));

  return { success: true };
}

/**
 * Approve verification
 */
export async function approveVerification(
  userId: number,
  idVerified: boolean,
  licenseVerified: boolean,
  insuranceVerified: boolean,
  notes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(contractorProfiles)
    .set({
      verificationStatus: "verified",
      idVerified,
      licenseVerified,
      insuranceVerified,
      verificationReviewedAt: new Date(),
      verificationNotes: notes || null,
    })
    .where(eq(contractorProfiles.userId, userId));

  return { success: true };
}

/**
 * Reject verification
 */
export async function rejectVerification(userId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(contractorProfiles)
    .set({
      verificationStatus: "rejected",
      verificationReviewedAt: new Date(),
      verificationNotes: reason,
    })
    .where(eq(contractorProfiles.userId, userId));

  return { success: true };
}

/**
 * Get verification status
 */
export async function getVerificationStatus(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const profile = await db
    .select()
    .from(contractorProfiles)
    .where(eq(contractorProfiles.userId, userId))
    .limit(1);

  if (profile.length === 0) return null;

  const p = profile[0];
  return {
    status: p.verificationStatus,
    idVerified: p.idVerified,
    licenseVerified: p.licenseVerified,
    insuranceVerified: p.insuranceVerified,
    submittedAt: p.verificationSubmittedAt,
    reviewedAt: p.verificationReviewedAt,
    notes: p.verificationNotes,
  };
}

/**
 * Get pending verifications for admin
 */
export async function getPendingVerifications(limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(contractorProfiles)
    .where(eq(contractorProfiles.verificationStatus, "pending"))
    .limit(limit);
}

/**
 * Get all verified contractors
 */
export async function getVerifiedContractors(limit = 100) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(contractorProfiles)
    .where(eq(contractorProfiles.verificationStatus, "verified"))
    .limit(limit);
}

/**
 * Check if contractor is verified
 */
export async function isContractorVerified(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const profile = await db
    .select()
    .from(contractorProfiles)
    .where(eq(contractorProfiles.userId, userId))
    .limit(1);

  return profile.length > 0 && profile[0].verificationStatus === "verified";
}
