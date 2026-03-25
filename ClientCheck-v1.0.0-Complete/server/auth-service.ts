import { eq } from "drizzle-orm";
import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { User } from "../drizzle/schema";
import { users } from "../drizzle/schema";
import * as emailVerification from "./email-verification-service";
import { createPasswordResetToken, consumePasswordResetToken } from "./password-reset-service";
import { queueNotification } from "./services/notification-delivery-service";
import { getDb } from "./db";
import { createOpaqueSession, revokeAllUserSessions } from "./session-service";

const scrypt = promisify(nodeScrypt);
const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type PublicAuthUser = {
  id: number | null;
  openId: string | null;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  emailVerifiedAt: string | null;
  lastSignedIn: string;
};

type SignupInput = {
  email: string;
  password: string;
  name?: string | null;
  accountType?: "contractor" | "customer";
  termsAcceptedAt?: Date | null;
  privacyAcceptedAt?: Date | null;
  legalAcceptanceVersion?: string | null;
};

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function makeSyntheticOpenId(): string {
  return `local_${randomBytes(12).toString("hex")}`;
}

export function toPublicAuthUser(user: User): PublicAuthUser {
  return {
    id: user.id ?? null,
    openId: user.openId ?? null,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    role: user.role ?? null,
    isVerified: user.isVerified ?? false,
    verifiedAt: user.verifiedAt ? user.verifiedAt.toISOString() : null,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    lastSignedIn: user.lastSignedIn ? user.lastSignedIn.toISOString() : new Date().toISOString(),
  };
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expectedHash = Buffer.from(hashHex, "hex");
  const derived = (await scrypt(password, salt, expectedHash.length)) as Buffer;
  if (derived.length !== expectedHash.length) return false;
  return timingSafeEqual(derived, expectedHash);
}

export async function getUserByEmailNormalized(emailNormalized: string): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.emailNormalized, emailNormalized)).limit(1);
  return rows[0] ?? null;
}

export async function createFirstPartyUser(
  input: SignupInput,
  meta: RequestMeta = {},
): Promise<{ user: User; sessionToken: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const emailNormalized = normalizeEmail(input.email);
  if (!emailNormalized || !emailNormalized.includes("@")) {
    throw new Error("Valid email is required");
  }
  if (!input.password || input.password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const existing = await getUserByEmailNormalized(emailNormalized);
  if (existing) {
    throw new Error("An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const role = input.accountType === "customer" ? "customer" : "contractor";
  const now = new Date();

  try {
    const result = await db.insert(users).values({
      openId: makeSyntheticOpenId(),
      name: input.name?.trim() || null,
      email: emailNormalized,
      emailNormalized,
      passwordHash,
      loginMethod: "password",
      role,
      termsAcceptedAt: input.termsAcceptedAt ?? now,
      privacyAcceptedAt: input.privacyAcceptedAt ?? now,
      legalAcceptanceVersion: input.legalAcceptanceVersion ?? null,
      lastSignedIn: now,
    });

    const userId = Number((result[0] as { insertId?: number })?.insertId ?? 0);
    if (!userId) throw new Error("Failed to create user");

    const createdRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = createdRows[0];
    if (!user) throw new Error("User creation did not persist");

    const ttlMs = Math.max(60_000, Number(process.env.AUTH_SESSION_TTL_MS ?? DEFAULT_SESSION_TTL_MS));
    const { token } = await createOpaqueSession({
      userId,
      ttlMs,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    });

    return { user, sessionToken: token };
  } catch (error) {
    const mysqlError = error as { code?: string };
    if (mysqlError?.code === "ER_DUP_ENTRY") {
      throw new Error("An account with this email already exists");
    }
    throw error;
  }
}

export async function loginFirstPartyUser(
  input: { email: string; password: string },
  meta: RequestMeta = {},
): Promise<{ user: User; sessionToken: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const emailNormalized = normalizeEmail(input.email);
  const user = await getUserByEmailNormalized(emailNormalized);
  if (!user || !user.passwordHash) {
    throw new Error("Invalid credentials");
  }

  const validPassword = await verifyPassword(input.password, user.passwordHash);
  if (!validPassword) {
    throw new Error("Invalid credentials");
  }

  const now = new Date();
  await db.update(users).set({ lastSignedIn: now }).where(eq(users.id, user.id));

  const ttlMs = Math.max(60_000, Number(process.env.AUTH_SESSION_TTL_MS ?? DEFAULT_SESSION_TTL_MS));
  const { token } = await createOpaqueSession({
    userId: user.id,
    ttlMs,
    ipAddress: meta.ipAddress ?? null,
    userAgent: meta.userAgent ?? null,
  });

  const refreshedRows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const refreshed = refreshedRows[0] ?? user;

  return { user: refreshed, sessionToken: token };
}

export async function requestPasswordReset(email: string, baseUrl: string): Promise<void> {
  const user = await getUserByEmailNormalized(normalizeEmail(email));
  if (!user) return;

  const token = await createPasswordResetToken(user.id);
  const resetLink = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

  await queueNotification({
    userId: user.id,
    channel: "email",
    templateKey: "password_reset",
    destination: user.email ?? email,
    payload: { resetLink },
  });
}

export async function resetPassword(input: { token: string; password: string }): Promise<boolean> {
  if (!input.password || input.password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  const consumed = await consumePasswordResetToken(input.token);
  if (!consumed) return false;

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const passwordHash = await hashPassword(input.password);
  await db
    .update(users)
    .set({
      passwordHash,
      loginMethod: "password",
      updatedAt: new Date(),
    })
    .where(eq(users.id, consumed.userId));

  await revokeAllUserSessions(consumed.userId);
  return true;
}

export async function verifyEmailTokenAndMarkUser(token: string): Promise<{
  success: boolean;
  reason?: string;
}> {
  const verificationResult = await emailVerification.verifyEmailToken(token);
  if (!verificationResult.success || !verificationResult.userId) {
    return { success: false, reason: verificationResult.reason || "Invalid token" };
  }

  const db = await getDb();
  if (!db) return { success: false, reason: "Database not available" };

  await db
    .update(users)
    .set({
      emailVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, verificationResult.userId));

  return { success: true };
}

export async function resendVerificationEmail(input: {
  userId: number;
  email: string;
  baseUrl: string;
}): Promise<boolean> {
  return emailVerification.resendVerificationEmail(input.userId, normalizeEmail(input.email), input.baseUrl);
}

/**
 * Seed first-party admin account from env vars on startup.
 * Safe-by-default behavior:
 * - no-op when env vars are missing
 * - no-op when email already exists
 * - never overwrites existing users/roles/passwords
 */
export async function seedAdminUserFromEnv(): Promise<
  | { status: "skipped_missing_env" }
  | { status: "skipped_exists"; email: string }
  | { status: "created"; email: string; userId: number }
> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rawEmail = process.env.ADMIN_SEED_EMAIL ?? "";
  const rawPassword = process.env.ADMIN_SEED_PASSWORD ?? "";
  const emailNormalized = normalizeEmail(rawEmail);
  const password = rawPassword.trim();

  if (!emailNormalized || !password) {
    return { status: "skipped_missing_env" };
  }

  if (!emailNormalized.includes("@")) {
    throw new Error("ADMIN_SEED_EMAIL must be a valid email");
  }

  if (password.length < 8) {
    throw new Error("ADMIN_SEED_PASSWORD must be at least 8 characters");
  }

  const existing = await getUserByEmailNormalized(emailNormalized);
  if (existing) {
    return { status: "skipped_exists", email: emailNormalized };
  }

  const now = new Date();
  const passwordHash = await hashPassword(password);
  const result = await db.insert(users).values({
    openId: makeSyntheticOpenId(),
    name: "Admin",
    email: emailNormalized,
    emailNormalized,
    passwordHash,
    loginMethod: "password",
    role: "admin",
    termsAcceptedAt: now,
    privacyAcceptedAt: now,
    lastSignedIn: now,
  });

  const userId = Number((result[0] as { insertId?: number })?.insertId ?? 0);
  if (!userId) throw new Error("Failed to seed admin user");

  return { status: "created", email: emailNormalized, userId };
}
