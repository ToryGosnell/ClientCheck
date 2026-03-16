/**
 * Email Verification Service backed by MySQL/Drizzle.
 */

import crypto from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { emailVerificationTokens } from "../drizzle/schema";
import { getDb } from "./db";
import { queueNotification } from "./services/notification-delivery-service";
import { writeAuditLog } from "./services/audit-log-service";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function generateVerificationToken(userId: number, email: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.insert(emailVerificationTokens).values({
    userId,
    email,
    tokenHash,
    expiresAt,
    status: "pending",
  });
  await writeAuditLog({ actorUserId: userId, action: "email_verification.token_created", entityType: "email_verification", entityId: userId, metadata: { email } });
  return token;
}

export async function verifyEmailToken(token: string): Promise<{ success: boolean; userId?: number; email?: string; reason?: string }> {
  const db = await getDb();
  if (!db) return { success: false, reason: "Database not available" };
  const tokenHash = hashToken(token);
  const rows = await db
    .select()
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.tokenHash, tokenHash))
    .limit(1);
  const record = rows[0];
  if (!record) return { success: false, reason: "Token not found" };
  if (record.status !== "pending") return { success: false, reason: `Token already ${record.status}` };
  if (new Date() > new Date(record.expiresAt)) {
    await db.update(emailVerificationTokens).set({ status: "expired" }).where(eq(emailVerificationTokens.id, record.id));
    return { success: false, reason: "Token expired" };
  }
  await db.update(emailVerificationTokens).set({ status: "verified", verifiedAt: new Date() }).where(eq(emailVerificationTokens.id, record.id));
  await writeAuditLog({ actorUserId: record.userId, action: "email_verification.verified", entityType: "email_verification", entityId: record.id, metadata: { email: record.email } });
  return { success: true, userId: record.userId, email: record.email };
}

export async function getVerificationStatus(userId: number): Promise<{ verified: boolean; email?: string; pending?: boolean }> {
  const db = await getDb();
  if (!db) return { verified: false };
  const rows = await db
    .select()
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, userId))
    .orderBy(desc(emailVerificationTokens.createdAt));
  const verified = rows.find((row) => row.status === "verified");
  if (verified) return { verified: true, email: verified.email };
  const pending = rows.find((row) => row.status === "pending" && new Date(row.expiresAt) > new Date());
  return { verified: false, pending: !!pending, email: pending?.email ?? undefined };
}

export async function sendVerificationEmail(email: string, verificationLink: string, userId?: number): Promise<boolean> {
  try {
    const notificationId = await queueNotification({
      userId,
      channel: "email",
      templateKey: "email_verification",
      destination: email,
      payload: { verificationLink },
    });
    console.log(`[Email Verification] Queued verification email to ${email}`, { notificationId, verificationLink });
    return true;
  } catch (error) {
    console.error("Send verification email error:", error);
    return false;
  }
}

export async function resendVerificationEmail(userId: number, email: string, baseUrl: string): Promise<boolean> {
  try {
    const token = await generateVerificationToken(userId, email);
    const verificationLink = `${baseUrl}/verify-email?token=${token}`;
    const sent = await sendVerificationEmail(email, verificationLink, userId);
    if (sent) {
      const db = await getDb();
      if (db) {
        const rows = await db.select().from(emailVerificationTokens).where(and(eq(emailVerificationTokens.userId, userId), eq(emailVerificationTokens.email, email))).orderBy(desc(emailVerificationTokens.id)).limit(1);
        if (rows[0]) {
          await db.update(emailVerificationTokens).set({ sendAttempts: (rows[0].sendAttempts || 0) + 1, lastSentAt: new Date() }).where(eq(emailVerificationTokens.id, rows[0].id));
        }
      }
    }
    return sent;
  } catch (error) {
    console.error("Resend verification email error:", error);
    return false;
  }
}

export async function isEmailVerified(userId: number): Promise<boolean> {
  const status = await getVerificationStatus(userId);
  return status.verified;
}
