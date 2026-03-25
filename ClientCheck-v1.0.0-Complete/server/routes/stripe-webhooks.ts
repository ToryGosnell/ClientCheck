import { Router, type Request, type Response } from "express";
import { handleStripeWebhookHttp } from "@/server/stripe-webhook-handler";

/**
 * Optional Express router for Stripe webhooks.
 *
 * Production uses `POST /api/webhooks/stripe` in `server/_core/index.ts` with `express.raw()` + `handleStripeWebhookHttp`.
 * If you mount this router, you MUST apply `express.raw({ type: [...] })` on the same path so `req.body` is a Buffer.
 */

const router = Router();

router.post("/", (req: Request, res: Response, next) => {
  void handleStripeWebhookHttp(req, res).catch(next);
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
