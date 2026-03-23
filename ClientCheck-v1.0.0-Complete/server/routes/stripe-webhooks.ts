import { Router, Request, Response } from "express";
import { verifyStripeWebhook, handleStripeWebhookEvent } from "@/server/stripe-webhook-handler";

/**
 * Stripe Webhook Handler
 * Listens for: successful payment, failed payment, subscription updates, refunds.
 * Keeps app accurate even if the user closes the app mid-payment (server-side source of truth).
 */

const router = Router();

/**
 * POST / (mounted at /api/webhooks/stripe)
 * Requires raw body for Stripe signature verification. Idempotent (duplicate events return 200).
 */
router.post("/", async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;
  if (!signature) {
    return res.status(400).json({ error: "Missing stripe-signature header" });
  }

  const rawBody: Buffer | string | undefined = (req as any).rawBody;
  if (!rawBody) {
    console.error("[Stripe webhook] rawBody is missing. req.body type:", typeof req.body,
      "isBuffer:", Buffer.isBuffer(req.body), "bodyLength:", req.body?.length ?? "n/a");
    return res.status(400).json({ error: "Raw body unavailable for signature verification" });
  }

  let event;
  try {
    event = verifyStripeWebhook(rawBody, signature);
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
});

export default router;

/**
 * TRPC Payment Procedures
 */

export const paymentProcedures = {
  /**
   * Create payment intent
   */
  createPaymentIntent: async (input: {
    amount: number;
    currency: string;
    description: string;
  }) => {
    // This would be called from a protected TRPC procedure
    // Implementation depends on your TRPC setup
  },

  /**
   * Create subscription
   */
  createSubscription: async (input: { priceId: string }) => {
    // Implementation depends on your TRPC setup
  },

  /**
   * Cancel subscription
   */
  cancelSubscription: async (input: { subscriptionId: string; reason?: string }) => {
    // Implementation depends on your TRPC setup
  },

  /**
   * Reactivate subscription
   */
  reactivateSubscription: async (input: { subscriptionId: string }) => {
    // Implementation depends on your TRPC setup
  },

  getSubscriptionDetails: async (_customerId: number) => {
    return null;
  },
  getPaymentHistory: async (_customerId: number) => {
    return [];
  },
  processRefund: async (_input: {
    paymentIntentId: string;
    amount?: number;
    reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  }) => {
    throw new Error("Use tRPC or Stripe Dashboard for refunds");
  },
  retryFailedPayment: async (_input: { paymentIntentId: string }) => {
    throw new Error("Not implemented");
  },
};
