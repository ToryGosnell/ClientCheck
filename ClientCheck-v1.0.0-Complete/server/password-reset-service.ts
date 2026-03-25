import { and, eq, gt, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { passwordResetTokens } from "../drizzle/schema";
import { getDb } from "./db";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: number, ttlMs = 60 * 60 * 1000): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + ttlMs);

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return token;
}

export async function consumePasswordResetToken(token: string): Promise<{ userId: number } | null> {
  const db = await getDb();
  if (!db) return null;

  const tokenHash = hashToken(token);
  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.id, row.id), isNull(passwordResetTokens.usedAt)));

  return { userId: row.userId };
}
