import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import riskScoresRouter from "../routes/risk-scores";
import disputeModerationRouter from "../routes/dispute-moderation";
import platformRouter from "../routes/platform";
import { verifyStripeWebhook, handleStripeWebhookEvent } from "../stripe-webhook-handler";
import { globalLimiter } from "../middleware/rate-limit";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // CORS: echo request Origin so credentialed browser requests work (Expo web on localhost:* → Railway API).
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.append("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id, x-user-role, x-api-key, x-clientcheck-mode, x-request-id, trpc-accept",
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "86400");

    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now(), platform: "ClientCheck", status: "operational" });
  });

  // Stripe webhook — express.raw gives us the untouched Buffer as req.body.
  // Registered BEFORE express.json() so the body stream is not consumed.
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const signature = req.headers["stripe-signature"] as string;
      if (!signature) {
        return res.status(400).json({ error: "Missing stripe-signature header" });
      }
      if (!req.body || !Buffer.isBuffer(req.body) || req.body.length === 0) {
        console.error("[Stripe webhook] Empty or non-Buffer body. type:", typeof req.body,
          "isBuffer:", Buffer.isBuffer(req.body), "length:", req.body?.length ?? 0);
        return res.status(400).json({ error: "Empty request body" });
      }
      let event;
      try {
        event = verifyStripeWebhook(req.body, signature);
      } catch (err) {
        console.error("[Stripe webhook] Signature verification failed:", (err as Error).message);
        return res.status(400).json({ error: "Webhook signature verification failed", detail: (err as Error).message });
      }
      try {
        const result = await handleStripeWebhookEvent(event);
        return res.json({ success: true, eventId: event.id, alreadyProcessed: result.alreadyProcessed ?? false });
      } catch (err) {
        console.error("[Stripe webhook] Event processing failed:", err);
        return res.status(500).json({ error: "Webhook event processing failed", eventId: event.id });
      }
    },
  );

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Global rate limiting — protects all routes from abuse
  app.use((req, res, next) => {
    const key = req.ip || "unknown";
    if (!globalLimiter.isAllowed(key)) {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }
    next();
  });

  // Public customer search (homepage) — GET /api/customers?search=
  app.get("/api/customers", async (req, res) => {
    try {
      const search = String(req.query.search ?? "").trim();
      if (search.length < 2) {
        return res.json({ results: [] });
      }
      const { searchCustomersApi } = await import("../db");
      const rows = await searchCustomersApi(search, 500);
      return res.json({ results: rows });
    } catch (err) {
      console.error("[GET /api/customers]", err);
      return res.status(500).json({ error: "Customer search failed", results: [] });
    }
  });

  app.use("/api/risk-scores", riskScoresRouter);
  app.use("/api/disputes/moderation", disputeModerationRouter);
  app.use("/api", platformRouter);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
