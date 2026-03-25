import { Router } from "express";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";
import { attachSessionAuth, persistentRateLimit, type AuthenticatedRequest } from "../services/authz";
import { STRIPE_PRICE_ID_CUSTOMER_IDENTITY_CHECKOUT } from "@/shared/billing-config";

const router = Router();
router.use(attachSessionAuth);

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  // Library types target the latest Stripe API; pin version in Dashboard if you need 2023-10-16 semantics.
  return new Stripe(key);
}

/** First origin when FRONTEND_URL is a comma-separated allowlist. */
function primaryFrontendBase(): string {
  const first = process.env.FRONTEND_URL?.split(",")[0]?.trim();
  if (first) return first.replace(/\/$/, "");
  return "http://localhost:8081";
}

/**
 * POST /api/billing/identity-checkout
 * Stripe Checkout (mode=payment) for optional customer identity verification add-on.
 * Auth: session cookie / Bearer (same as other /api routes).
 */
router.post(
  "/identity-checkout",
  persistentRateLimit("billing_identity_checkout", 20, 60),
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.auth;
      if (!user?.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (user.role !== "customer") {
        return res.status(403).json({ error: "Only customers allowed" });
      }

      const db = await getDb();
      if (!db) {
        return res.status(503).json({ error: "Database not available" });
      }

      const [row] = await db
        .select({ email: users.email, isVerified: users.isVerified })
        .from(users)
        .where(eq(users.id, user.userId))
        .limit(1);

      if (!row) {
        return res.status(404).json({ error: "User not found" });
      }
      if (row.isVerified) {
        return res.status(400).json({ error: "Already verified" });
      }

      const customerEmail = row.email ?? undefined;

      const stripe = getStripe();
      if (!stripe) {
        return res.status(503).json({ error: "Payment service not configured" });
      }

      const priceId = STRIPE_PRICE_ID_CUSTOMER_IDENTITY_CHECKOUT?.trim();
      if (!priceId) {
        return res.status(503).json({
          error: "Identity verification price is not configured (set STRIPE_IDENTITY_PRICE_ID or STRIPE_PRICE_ID_MONTHLY)",
        });
      }

      const base = primaryFrontendBase();
      const successPath = process.env.STRIPE_IDENTITY_CHECKOUT_SUCCESS_PATH?.trim() || "/verified-success";
      const cancelPath = process.env.STRIPE_IDENTITY_CHECKOUT_CANCEL_PATH?.trim() || "/verified-cancel";
      const successUrl = `${base}${successPath.startsWith("/") ? successPath : `/${successPath}`}`;
      const cancelUrl = `${base}${cancelPath.startsWith("/") ? cancelPath : `/${cancelPath}`}`;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${successUrl}${successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        ...(customerEmail ? { customer_email: customerEmail } : {}),
        metadata: {
          userId: String(user.userId),
          type: "identity_verification",
        },
      });

      if (!session.url) {
        return res.status(500).json({ error: "Checkout session did not return a URL" });
      }

      return res.json({ url: session.url });
    } catch (err) {
      console.error("[POST /api/billing/identity-checkout]", err);
      return res.status(500).json({ error: "Failed to create checkout session" });
    }
  },
);

export default router;
