import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { COOKIE_NAME } from "../../shared/const";
import { users, type User } from "../../drizzle/schema";
import { getDb } from "../db";
import {
  createFirstPartyUser,
  loginFirstPartyUser,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  toPublicAuthUser,
  verifyEmailTokenAndMarkUser,
} from "../auth-service";
import { extractBearerOrCookieToken, findValidSessionByToken, revokeSessionByToken, touchSession } from "../session-service";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

async function authenticateFirstPartyRequest(req: Request): Promise<User | null> {
  const token = extractBearerOrCookieToken(req);
  if (!token) return null;
  const session = await findValidSessionByToken(token);
  if (!session) return null;

  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  const user = rows[0] ?? null;
  if (!user) return null;

  await touchSession(session.id);
  return user;
}

/**
 * Unified authentication for transition period:
 * 1) First-party DB-backed sessions
 * 2) Fallback to existing Manus session flow
 */
export async function authenticateRequest(req: Request): Promise<User> {
  const firstPartyUser = await authenticateFirstPartyRequest(req);
  if (firstPartyUser) return firstPartyUser;
  return sdk.authenticateRequest(req);
}

function getBaseUrl(req: Request): string {
  const frontendUrl = (process.env.FRONTEND_URL ?? "").trim();
  if (frontendUrl) return frontendUrl.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

function getSessionTtlMs(): number {
  const parsed = Number(process.env.AUTH_SESSION_TTL_MS ?? DEFAULT_SESSION_TTL_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SESSION_TTL_MS;
}

function clearSessionCookie(req: Request, res: Response): void {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: getSessionTtlMs(),
  });
}

export function registerFirstPartyAuthRoutes(app: Express): void {
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const { email, password, name, accountType, termsAcceptedAt, privacyAcceptedAt, legalAcceptanceVersion } =
        (req.body as {
          email?: string;
          password?: string;
          name?: string;
          accountType?: "contractor" | "customer";
          termsAcceptedAt?: string;
          privacyAcceptedAt?: string;
          legalAcceptanceVersion?: string;
        }) ?? {};

      if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
      }
      const normalizedAccountType: "contractor" | "customer" =
        accountType === "customer" ? "customer" : "contractor";

      const { user, sessionToken } = await createFirstPartyUser(
        {
          email,
          password,
          name: name ?? null,
          accountType: normalizedAccountType,
          termsAcceptedAt: termsAcceptedAt ? new Date(termsAcceptedAt) : null,
          privacyAcceptedAt: privacyAcceptedAt ? new Date(privacyAcceptedAt) : null,
          legalAcceptanceVersion: legalAcceptanceVersion ?? null,
        },
        {
          ipAddress: req.ip ?? null,
          userAgent: req.header("user-agent") ?? null,
        },
      );

      setSessionCookie(req, res, sessionToken);
      return res.status(201).json({
        user: toPublicAuthUser(user),
        sessionToken,
        app_session_id: sessionToken,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Signup failed";
      return res.status(400).json({ error: message });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = (req.body as { email?: string; password?: string }) ?? {};
      if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
      }

      const { user, sessionToken } = await loginFirstPartyUser(
        { email, password },
        { ipAddress: req.ip ?? null, userAgent: req.header("user-agent") ?? null },
      );

      setSessionCookie(req, res, sessionToken);
      return res.status(200).json({
        user: toPublicAuthUser(user),
        sessionToken,
        app_session_id: sessionToken,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      return res.status(401).json({ error: message });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    const token = extractBearerOrCookieToken(req);
    if (token) {
      await revokeSessionByToken(token);
    }
    clearSessionCookie(req, res);
    res.status(200).json({ success: true });
  });

  const handleMe = async (req: Request, res: Response) => {
    try {
      const user = await authenticateRequest(req);
      return res.status(200).json({ user: toPublicAuthUser(user) });
    } catch {
      return res.status(401).json({ error: "Not authenticated", user: null });
    }
  };
  app.get("/api/auth/me", (req: Request, res: Response) => {
    void handleMe(req, res);
  });
  app.get("/api/user/me", (req: Request, res: Response) => {
    void handleMe(req, res);
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    const { email } = (req.body as { email?: string }) ?? {};
    if (!email) return res.status(400).json({ error: "email is required" });
    try {
      await requestPasswordReset(email, getBaseUrl(req));
      return res.status(200).json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to request password reset";
      return res.status(500).json({ error: message });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    const { token, password } = (req.body as { token?: string; password?: string }) ?? {};
    if (!token || !password) {
      return res.status(400).json({ error: "token and password are required" });
    }
    try {
      const ok = await resetPassword({ token, password });
      if (!ok) return res.status(400).json({ error: "Invalid or expired token" });
      return res.status(200).json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reset password";
      return res.status(400).json({ error: message });
    }
  });

  app.post("/api/auth/verify-email", async (req: Request, res: Response) => {
    const { token } = (req.body as { token?: string }) ?? {};
    if (!token) return res.status(400).json({ error: "token is required" });
    const result = await verifyEmailTokenAndMarkUser(token);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.reason ?? "Verification failed" });
    }
    return res.status(200).json({ success: true });
  });

  app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
    try {
      const user = await authenticateRequest(req);
      const body = (req.body as { email?: string }) ?? {};
      const email = body.email ?? user.email ?? "";
      if (!email) return res.status(400).json({ error: "email is required" });
      const success = await resendVerificationEmail({
        userId: user.id,
        email,
        baseUrl: getBaseUrl(req),
      });
      return res.status(success ? 200 : 500).json({ success });
    } catch {
      return res.status(401).json({ error: "Authentication required" });
    }
  });
}
