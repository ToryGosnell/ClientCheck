import type { NextFunction, Request, Response } from "express";
import { and, desc, eq, gte } from "drizzle-orm";
import { partnerApiKeyScopes, partnerApiKeys, rateLimitEvents } from "../../drizzle/schema";
import { getDb } from "../db";
import { createHash } from "crypto";
import { writeAuditLog } from "./audit-log-service";

export type AppRole = "contractor" | "customer" | "admin" | "enterprise";

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId?: number;
    role?: AppRole;
    partnerApiKeyId?: number;
    partnerName?: string;
    mode?: "sandbox" | "production";
  };
}

/**
 * Authenticate via session cookie / Bearer token.
 * Falls through without setting req.auth if no valid session exists.
 */
export async function attachSessionAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const { authenticateRequest } = await import("../_core/auth");
    const user = await authenticateRequest(req);
    if (user) {
      req.auth = {
        ...(req.auth || {}),
        userId: user.id,
        role: (user as any).role || "contractor",
      };
    }
  } catch {
    // No valid session — continue without auth
  }
  next();
}

/** @deprecated Use attachSessionAuth instead */
export const attachMockAuth = attachSessionAuth;

export function requireRole(roles: AppRole[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const role = req.auth?.role;
    if (!role || !roles.includes(role)) {
      await writeAuditLog({
        actorUserId: req.auth?.userId,
        actorRole: role,
        action: "authz.denied",
        entityType: "route",
        entityId: req.path,
        outcome: "denied",
        ipAddress: req.ip,
        userAgent: req.header("user-agent") || null,
      });
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

export function requireUser() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth?.userId) return res.status(401).json({ error: "Authentication required" });
    next();
  };
}

export function persistentRateLimit(bucket: string, limit: number, windowMinutes: number) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const db = await getDb();
    if (!db) return next();
    const actorKey = req.auth?.userId ? `user:${req.auth.userId}` : `ip:${req.ip}`;
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
    const recent = await db.select().from(rateLimitEvents).where(and(
      eq(rateLimitEvents.actorKey, actorKey),
      eq(rateLimitEvents.bucket, bucket),
      gte(rateLimitEvents.createdAt, cutoff),
    ));
    if (recent.length >= limit) {
      await writeAuditLog({
        actorUserId: req.auth?.userId,
        actorRole: req.auth?.role,
        action: "rate_limit.blocked",
        entityType: bucket,
        entityId: req.path,
        outcome: "denied",
        metadata: { actorKey, limit, windowMinutes },
        ipAddress: req.ip,
        userAgent: req.header("user-agent") || null,
      });
      return res.status(429).json({ error: "Too many requests" });
    }
    await db.insert(rateLimitEvents).values({ actorKey, bucket, routeKey: req.path });
    next();
  };
}

export async function authenticatePartnerApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const presented = req.header("x-api-key");
  if (!presented) return res.status(401).json({ error: "x-api-key required" });
  const db = await getDb();
  if (!db) return res.status(503).json({ error: "Database not available" });
  const hash = createHash("sha256").update(presented).digest("hex");
  const records = await db.select().from(partnerApiKeys).where(eq(partnerApiKeys.apiKeyHash, hash)).limit(1);
  const record = records[0];
  if (!record || record.status !== "active") {
    return res.status(401).json({ error: "Invalid API key" });
  }
  req.auth = {
    ...(req.auth || {}),
    partnerApiKeyId: record.id,
    partnerName: record.partnerName,
    mode: (req.header("x-clientcheck-mode") as "sandbox" | "production") || "sandbox",
  };
  next();
}

export function requirePartnerScope(scope: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const partnerApiKeyId = req.auth?.partnerApiKeyId;
    if (!partnerApiKeyId) return res.status(401).json({ error: "Partner authentication required" });
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database not available" });
    const scopes = await db.select().from(partnerApiKeyScopes).where(eq(partnerApiKeyScopes.partnerApiKeyId, partnerApiKeyId));
    if (!scopes.some((row) => row.scope === scope || row.scope === "*")) {
      return res.status(403).json({ error: "Missing required scope" });
    }
    next();
  };
}
