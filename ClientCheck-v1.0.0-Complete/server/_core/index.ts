import "dotenv/config";
import express from "express";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { seedAdminUserFromEnv } from "../auth-service";
import { registerFirstPartyAuthRoutes } from "./auth";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import riskScoresRouter from "../routes/risk-scores";
import disputeModerationRouter from "../routes/dispute-moderation";
import platformRouter from "../routes/platform";
import billingRouter from "../routes/billing";
import { handleStripeWebhookHttp } from "../stripe-webhook-handler";
import { globalLimiter } from "../middleware/rate-limit";

async function startServer() {
  try {
    const sentryDsn = process.env.SENTRY_DSN ?? "";
    if (sentryDsn) {
      Sentry.init({
        dsn: sentryDsn,
        sendDefaultPii: true,
        integrations: [Sentry.expressIntegration(), nodeProfilingIntegration()],
        tracesSampleRate: 1.0,
        profileSessionSampleRate: 1.0,
        profileLifecycle: "trace",
        enableLogs: true,
      });
    }

    const app = express();
    console.log("[Cookie] session policy", {
      cookieName: "app_session_id",
      hostOnlyByDefault: !(process.env.COOKIE_DOMAIN ?? "").trim(),
      configuredCookieDomain: (process.env.COOKIE_DOMAIN ?? "").trim() || null,
      path: "/",
      httpOnly: true,
      secureInProduction: true,
      sameSiteWhenSecure: "none",
      sameSiteWhenNotSecure: "lax",
    });

    try {
      const seeded = await seedAdminUserFromEnv();
      if (seeded.status === "created") {
        console.log(`[Auth Seed] Created admin user: ${seeded.email} (id=${seeded.userId})`);
      } else if (seeded.status === "skipped_exists") {
        console.log(`[Auth Seed] Admin seed email already exists: ${seeded.email}`);
      } else {
        console.log("[Auth Seed] Skipped (ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set)");
      }
    } catch (seedErr) {
      console.error("[Auth Seed] Failed to seed admin user:", seedErr);
    }

    // Critical: before other routes — liveness for Railway / monitors
    app.get("/api/health", (_req, res) => {
      res.status(200).json({ status: "ok" });
    });

    const exactAllowedOrigins = new Set([
      "https://dist-web-alpha.vercel.app",
      "http://localhost:8081",
      "http://localhost:19006",
      "http://localhost:3000",
    ]);

    function isAllowedVercelPreview(origin: string) {
      try {
        const url = new URL(origin);
        const isAnyVercelHost = /^([a-zA-Z0-9-]+\.)?vercel\.app$/.test(url.hostname);
        return (
          isAnyVercelHost ||
          /^https:\/\/dist-[a-zA-Z0-9-]+\.vercel\.app$/.test(origin) ||
          /^https:\/\/dist-web-[a-zA-Z0-9-]+\.vercel\.app$/.test(origin) ||
          /^https:\/\/dist-[a-zA-Z0-9-]+-tmtaom-6429s-projects\.vercel\.app$/.test(origin)
        );
      } catch {
        return false;
      }
    }

    const corsOptions = {
      origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        if (!origin) {
          console.log("[CORS] No origin header -> allow");
          return callback(null, true);
        }

        const allowed = exactAllowedOrigins.has(origin) || isAllowedVercelPreview(origin);
        console.log("[CORS] Origin:", origin, "Allowed:", allowed);

        if (allowed) return callback(null, true);
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Origin",
        "X-Requested-With",
        "Content-Type",
        "Accept",
        "Authorization",
        "x-user-id",
        "x-user-role",
        "x-api-key",
        "x-clientcheck-mode",
        "x-request-id",
        "trpc-accept",
      ],
    };

    app.use((req, res, next) => {
      const requestOrigin = req.headers.origin;
      corsOptions.origin(requestOrigin, (err, allow) => {
        if (err || !allow) {
          if (req.method === "OPTIONS") {
            res.status(403).json({ error: err?.message ?? "CORS blocked" });
            return;
          }
          next(err ?? new Error("CORS blocked"));
          return;
        }

        if (requestOrigin) {
          res.setHeader("Access-Control-Allow-Origin", requestOrigin);
          res.append("Vary", "Origin");
        }
        res.setHeader("Access-Control-Allow-Methods", corsOptions.methods.join(", "));
        res.setHeader("Access-Control-Allow-Headers", corsOptions.allowedHeaders.join(", "));
        if (corsOptions.credentials) {
          res.setHeader("Access-Control-Allow-Credentials", "true");
        }
        res.setHeader("Access-Control-Max-Age", "86400");

        if (req.method === "OPTIONS") {
          res.sendStatus(204);
          return;
        }
        next();
      });
    });

    // Stripe webhooks: MUST use raw body only — never attach express.json() (or any JSON body parser)
    // to these paths; signature verification requires the exact bytes Stripe sent.
    // Registered strictly BEFORE app.use(express.json()) below.
    const stripeWebhookRaw = express.raw({ type: "application/json", limit: "1mb" });
    const stripeWebhook = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      void handleStripeWebhookHttp(req, res).catch(next);
    };
    app.post("/api/stripe/webhook", stripeWebhookRaw, stripeWebhook);
    app.post("/api/webhooks/stripe", stripeWebhookRaw, stripeWebhook);

    app.use(express.json({ limit: "50mb" }));
    app.use(express.urlencoded({ limit: "50mb", extended: true }));

    // First-party auth routes require parsed JSON bodies.
    // Keep them before legacy OAuth route registration for /api/auth/* precedence.
    registerFirstPartyAuthRoutes(app);
    registerOAuthRoutes(app);

    // Global rate limiting — protects all routes from abuse
    app.use((req, res, next) => {
      const key = req.ip || "unknown";
      if (!globalLimiter.isAllowed(key)) {
        return res.status(429).json({ error: "Too many requests. Please try again later." });
      }
      next();
    });

    app.use("/api/risk-scores", riskScoresRouter);
    app.use("/api/disputes/moderation", disputeModerationRouter);
    app.use("/api/billing", billingRouter);
    app.use("/api", platformRouter);

    // Railway healthcheckPath: plain GET (no tRPC batch query string) — must bypass tRPC HTTP parsing
    app.get("/api/trpc/system.healthcheck", (_req, res) => {
      res.status(200).json({ result: { data: { status: "ok" } } });
    });

    app.use(
      "/api/trpc",
      createExpressMiddleware({
        router: appRouter,
        createContext,
      }),
    );

    if (sentryDsn) {
      // Register after controllers so Express errors are captured before any custom error middleware.
      Sentry.setupExpressErrorHandler(app);
    }

    const port = process.env.PORT ? Number(process.env.PORT) : 3000;

    console.log("ENV PORT:", process.env.PORT);
    console.log("Using PORT:", port);

    try {
      app.listen(port, () => {
        console.log(`[api] server listening on port ${port}`);
      });
    } catch (listenErr) {
      console.error("Startup error:", listenErr);
    }
  } catch (err) {
    console.error("Startup error:", err);
    process.exitCode = 1;
  }
}

startServer().catch((err) => {
  console.error("Startup error:", err);
  process.exitCode = 1;
});
