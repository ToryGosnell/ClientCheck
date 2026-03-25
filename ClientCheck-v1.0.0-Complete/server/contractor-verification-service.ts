/**
 * Contractor verification service with persistent storage.
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import { contractorProfiles, verificationDocuments } from "../drizzle/schema";
import { getDb } from "./db";
import { queueNotification } from "./services/notification-delivery-service";
import { writeAuditLog } from "./services/audit-log-service";
import { processContractorInviteReferralOnVerified } from "./contractor-invite-referral-service";

export interface VerificationDocumentInput {
  type: "id" | "license" | "insurance" | "identity" | "business_registration" | "tax_document";
  url: string;
}

function normalizeType(type: VerificationDocumentInput["type"]) {
  if (type === "id") return "identity" as const;
  return type as "license" | "insurance" | "identity" | "business_registration" | "tax_document";
}

export async function submitVerificationDocuments(userId: number, documents: VerificationDocumentInput[]) {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };
  if (!documents.length) return { success: false, message: "No documents provided" };

  await db.insert(verificationDocuments).values(
    documents.map((doc) => ({
      contractorUserId: userId,
      documentType: normalizeType(doc.type),
      documentUrl: doc.url,
      status: "pending" as const,
    })),
  );

  await db.update(contractorProfiles).set({
    verificationStatus: "pending",
    verificationSubmittedAt: new Date(),
  }).where(eq(contractorProfiles.userId, userId));

  await writeAuditLog({ actorUserId: userId, action: "verification.submitted", entityType: "contractor_profile", entityId: userId, metadata: { documents: documents.map((d) => d.type) } });
  await queueNotification({ userId, channel: "email", templateKey: "verification_submitted", payload: { userId } });

  return {
    success: true,
    message: "Documents submitted for verification. Review typically takes 24-48 hours.",
  };
}

export async function getVerificationStatus(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [profile] = await db.select().from(contractorProfiles).where(eq(contractorProfiles.userId, userId)).limit(1);
  const docs = await db.select().from(verificationDocuments).where(eq(verificationDocuments.contractorUserId, userId)).orderBy(desc(verificationDocuments.createdAt));
  if (!profile && docs.length === 0) return null;
  return {
    userId,
    idVerified: profile?.idVerified || false,
    licenseVerified: profile?.licenseVerified || false,
    insuranceVerified: profile?.insuranceVerified || false,
    verificationBadge: profile?.verificationStatus === "verified",
    documents: docs.map((doc) => ({
      type: doc.documentType,
      url: doc.documentUrl,
      uploadedAt: doc.createdAt,
      status: doc.status,
      notes: doc.notes ?? undefined,
    })),
    submittedAt: profile?.verificationSubmittedAt ?? docs[docs.length - 1]?.createdAt,
    approvedAt: profile?.verificationReviewedAt ?? undefined,
    rejectionReason: profile?.verificationStatus === "rejected" ? profile?.verificationNotes ?? undefined : undefined,
    verificationStatus: profile?.verificationStatus ?? (docs.length ? "pending" : "unverified"),
  };
}

export async function hasVerificationBadge(userId: number): Promise<boolean> {
  const status = await getVerificationStatus(userId);
  return !!status?.verificationBadge;
}

export async function approveVerification(userId: number, reviewedByUserId?: number, notes?: string) {
  const db = await getDb();
  if (!db) return false;
  const docs = await db.select().from(verificationDocuments).where(eq(verificationDocuments.contractorUserId, userId));
  if (!docs.length) return false;
  await db.update(verificationDocuments).set({ status: "approved", reviewedByUserId: reviewedByUserId ?? null, reviewedAt: new Date(), notes: notes ?? null }).where(eq(verificationDocuments.contractorUserId, userId));
  await db.update(contractorProfiles).set({
    idVerified: docs.some((d) => d.documentType === "identity"),
    licenseVerified: docs.some((d) => d.documentType === "license"),
    insuranceVerified: docs.some((d) => d.documentType === "insurance"),
    verificationStatus: "verified",
    verificationReviewedAt: new Date(),
    verificationNotes: notes ?? null,
  }).where(eq(contractorProfiles.userId, userId));
  await writeAuditLog({ actorUserId: reviewedByUserId ?? null, actorRole: reviewedByUserId ? "admin" : null, action: "verification.approved", entityType: "contractor_profile", entityId: userId, metadata: { notes } });
  await queueNotification({ userId, channel: "email", templateKey: "verification_approved", payload: { userId } });
  void processContractorInviteReferralOnVerified(userId).catch((e) =>
    console.warn("[approveVerification] contractor invite referral hook:", e),
  );
  return true;
}

export async function rejectVerification(userId: number, reason: string, reviewedByUserId?: number) {
  const db = await getDb();
  if (!db) return false;
  await db.update(verificationDocuments).set({ status: "rejected", reviewedByUserId: reviewedByUserId ?? null, reviewedAt: new Date(), notes: reason }).where(eq(verificationDocuments.contractorUserId, userId));
  await db.update(contractorProfiles).set({ verificationStatus: "rejected", verificationReviewedAt: new Date(), verificationNotes: reason }).where(eq(contractorProfiles.userId, userId));
  await writeAuditLog({ actorUserId: reviewedByUserId ?? null, actorRole: reviewedByUserId ? "admin" : null, action: "verification.rejected", entityType: "contractor_profile", entityId: userId, metadata: { reason } });
  await queueNotification({ userId, channel: "email", templateKey: "verification_rejected", payload: { userId, reason } });
  return true;
}

export async function getVerificationBadgeInfo(userId: number) {
  const status = await getVerificationStatus(userId);
  if (!status || !status.verificationBadge) return null;
  return {
    verified: true,
    badge: "🔐 Verified Contractor",
    approvedAt: status.approvedAt,
    documents: status.documents.filter((d) => d.status === "approved"),
  };
}

export async function getPendingVerifications() {
  const db = await getDb();
  if (!db) return [];
  const docs = await db.select().from(verificationDocuments).where(eq(verificationDocuments.status, "pending"));
  const userIds = [...new Set(docs.map((d) => d.contractorUserId))];
  const profiles = userIds.length
    ? await db.select().from(contractorProfiles).where(inArray(contractorProfiles.userId, userIds))
    : [];
  return userIds.map((userId) => {
    const profile = profiles.find((p) => p.userId === userId);
    const userDocs = docs.filter((d) => d.contractorUserId === userId);
    return {
      userId,
      idVerified: profile?.idVerified || false,
      licenseVerified: profile?.licenseVerified || false,
      insuranceVerified: profile?.insuranceVerified || false,
      verificationBadge: false,
      documents: userDocs.map((doc) => ({
        type: doc.documentType,
        url: doc.documentUrl,
        uploadedAt: doc.createdAt,
        status: doc.status,
        notes: doc.notes ?? undefined,
      })),
      submittedAt: profile?.verificationSubmittedAt ?? userDocs[0]?.createdAt,
    };
  });
}
