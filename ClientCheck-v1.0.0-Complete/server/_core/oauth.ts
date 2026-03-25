import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import type { Express, Request, Response } from "express";
import type { MeUserJson } from "../../lib/_core/api";
import { getUserByOpenId, upsertUser } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

/** Where to send the browser after web OAuth cookie is set. Never default to localhost in production. */
function oauthWebSuccessRedirectUrl(): string {
  const trim = (s: string | undefined) => (s ?? "").trim().replace(/\/$/, "");
  const explicit =
    trim(process.env.OAUTH_WEB_REDIRECT_URL) ||
    trim(process.env.FRONTEND_URL) ||
    trim(process.env.APP_BASE_URL);
  if (explicit) return explicit;
  const preview = trim(process.env.EXPO_WEB_PREVIEW_URL) || trim(process.env.EXPO_PACKAGER_PROXY_URL);
  if (preview) return preview;
  if (process.env.NODE_ENV !== "production") return "http://localhost:8081";
  return trim(process.env.RAILWAY_PUBLIC_DOMAIN)
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : "https://clientcheck-production.up.railway.app";
}

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getOauthPortalEntryUrl(): URL | null {
  const trim = (s: string | undefined) => (s ?? "").trim().replace(/\/$/, "");
  const base = trim(process.env.OAUTH_PORTAL_URL) || trim(process.env.OAUTH_SERVER_URL);
  if (!base) return null;
  try {
    return new URL(`${base}/app-auth`);
  } catch {
    return null;
  }
}

async function syncUser(userInfo: {
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  platform?: string | null;
}): Promise<{ user: NonNullable<Awaited<ReturnType<typeof getUserByOpenId>>>; isNewUser: boolean }> {
  if (!userInfo.openId) {
    throw new Error("openId missing from user info");
  }

  const existing = await getUserByOpenId(userInfo.openId);
  const isNewUser = !existing;

  const lastSignedIn = new Date();
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn,
  });
  const saved = await getUserByOpenId(userInfo.openId);
  const user =
    saved ??
    ({
      openId: userInfo.openId,
      name: userInfo.name,
      email: userInfo.email,
      loginMethod: userInfo.loginMethod ?? null,
      lastSignedIn,
    } as NonNullable<Awaited<ReturnType<typeof getUserByOpenId>>>);
  return { user, isNewUser };
}

const OAUTH_NEW_USER_COOKIE = "cc_oauth_new_user";

function readCookieFlag(req: Request, name: string): boolean {
  const raw = req.headers.cookie;
  if (!raw) return false;
  const prefix = `${name}=`;
  const parts = raw.split(";").map((s) => s.trim());
  for (const p of parts) {
    if (p === name || p.startsWith(prefix)) {
      const v = p.startsWith(prefix) ? p.slice(prefix.length) : "";
      return v === "1" || v === "true";
    }
  }
  return false;
}

function buildUserResponse(
  user:
    | Awaited<ReturnType<typeof getUserByOpenId>>
    | {
        openId: string;
        name?: string | null;
        email?: string | null;
        loginMethod?: string | null;
        lastSignedIn?: Date | null;
      },
  extras?: { isNewUser?: boolean },
): MeUserJson {
  const row = user as Record<string, unknown>;
  const verifiedAt = row.verifiedAt;
  const base: MeUserJson = {
    id: (user as { id?: number }).id ?? null,
    openId: user?.openId ?? null,
    name: user?.name ?? null,
    email: user?.email ?? null,
    loginMethod: user?.loginMethod ?? null,
    role: (row.role as string | undefined) ?? null,
    isVerified: typeof row.isVerified === "boolean" ? row.isVerified : false,
    verifiedAt:
      verifiedAt instanceof Date
        ? verifiedAt.toISOString()
        : typeof verifiedAt === "string"
          ? verifiedAt
          : null,
    lastSignedIn: (user?.lastSignedIn ?? new Date()).toISOString(),
  };
  if (extras?.isNewUser) {
    return { ...base, isNewUser: true };
  }
  return base;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/start", async (req: Request, res: Response) => {
    const redirectUri = getQueryParam(req, "redirect_uri") ?? getQueryParam(req, "redirectUri");
    const state = getQueryParam(req, "state");
    const appId = getQueryParam(req, "appId") ?? process.env.VITE_APP_ID ?? "";
    const type = getQueryParam(req, "type") ?? "signIn";
    const accountType = getQueryParam(req, "account_type");

    if (!redirectUri || !state || !appId) {
      res.status(400).json({ error: "redirect_uri, state, and appId are required" });
      return;
    }

    const url = getOauthPortalEntryUrl();
    if (!url) {
      res.status(500).json({ error: "OAuth start route is misconfigured" });
      return;
    }

    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", type);
    if (accountType) {
      url.searchParams.set("account_type", accountType);
    }

    res.redirect(302, url.toString());
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const { isNewUser } = await syncUser(userInfo);
      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      if (isNewUser) {
        res.cookie(OAUTH_NEW_USER_COOKIE, "1", { ...cookieOptions, maxAge: 180_000 });
      }

      const frontendUrl = oauthWebSuccessRedirectUrl();
      res.redirect(302, frontendUrl);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  app.get("/api/oauth/mobile", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const { user, isNewUser } = await syncUser(userInfo);

      const sessionToken = await sdk.createSessionToken(userInfo.openId!, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({
        app_session_id: sessionToken,
        user: buildUserResponse(user, { isNewUser }),
      });
    } catch (error) {
      console.error("[OAuth] Mobile exchange failed", error);
      res.status(500).json({ error: "OAuth mobile exchange failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  /** Current user JSON — shared by `/api/auth/me` and `/api/user/me`. */
  async function respondWithCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const user = await sdk.authenticateRequest(req);
      const cookieOptions = getSessionCookieOptions(req);
      const freshSignup = readCookieFlag(req, OAUTH_NEW_USER_COOKIE);
      const payload = buildUserResponse(user, freshSignup ? { isNewUser: true } : undefined);
      if (freshSignup) {
        res.clearCookie(OAUTH_NEW_USER_COOKIE, { ...cookieOptions, maxAge: 0 });
      }
      res.json({ user: payload });
    } catch {
      // Expected when no session exists — not an error worth logging
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  }

  // Get current authenticated user - works with both cookie (web) and Bearer token (mobile)
  app.get("/api/auth/me", (req, res) => {
    void respondWithCurrentUser(req, res);
  });
  app.get("/api/user/me", (req, res) => {
    void respondWithCurrentUser(req, res);
  });

  // Establish session cookie from Bearer token
  // Used by iframe preview: frontend receives token via postMessage, then calls this endpoint
  // to get a proper Set-Cookie response from the backend (3000-xxx domain)
  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      // Authenticate using Bearer token from Authorization header
      const user = await sdk.authenticateRequest(req);

      // Get the token from the Authorization header to set as cookie
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        res.status(400).json({ error: "Bearer token required" });
        return;
      }
      const token = authHeader.slice("Bearer ".length).trim();

      // Set cookie for this domain (3000-xxx)
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[Auth] /api/auth/session failed:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  });
}
