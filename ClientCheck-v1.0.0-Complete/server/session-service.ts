import { and, eq, gt, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import type { Request } from "express";
import { sessions } from "../drizzle/schema";
import { COOKIE_NAME } from "../shared/const";
import { getDb } from "./db";

export type SessionRecord = {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastSeenAt: Date;
  createdAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenFingerprint(token: string | null | undefined): string | null {
  if (!token) return null;
  const hashed = hashToken(token);
  return `${hashed.slice(0, 10)}...${hashed.slice(-6)}`;
}

export function extractBearerOrCookieToken(req: Request): string | null {
  const authHeader = req.headers.authorization ?? req.headers.Authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    return token || null;
  }

  const cookieHeader = req.headers.cookie ?? "";
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const prefix = `${COOKIE_NAME}=`;
  for (const part of parts) {
    if (part.startsWith(prefix)) {
      const token = part.slice(prefix.length).trim();
      return token || null;
    }
  }
  return null;
}

export async function createOpaqueSession(input: {
  userId: number;
  ttlMs: number;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const token = randomBytes(48).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + input.ttlMs);

  try {
    await db.insert(sessions).values({
      userId: input.userId,
      tokenHash,
      expiresAt,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
    console.log("[AUTH STORE] write success", {
      userId: input.userId,
      keyFingerprint: tokenFingerprint(token),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AUTH STORE] write failure", {
      userId: input.userId,
      keyFingerprint: tokenFingerprint(token),
      error: message,
    });
    throw error;
  }

  return { token, expiresAt };
}

export async function findValidSessionByToken(token: string): Promise<SessionRecord | null> {
  const db = await getDb();
  if (!db) return null;

  const tokenHash = hashToken(token);
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const session = (rows[0] as SessionRecord | undefined) ?? null;
  console.log("[AUTH STORE] read", {
    keyFingerprint: tokenFingerprint(token),
    hit: Boolean(session),
    userId: session?.userId ?? null,
  });
  return session;
}

export async function touchSession(sessionId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, sessionId));
}

export async function revokeSessionByToken(token: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const tokenHash = hashToken(token);
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)));
}

export async function revokeAllUserSessions(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}
