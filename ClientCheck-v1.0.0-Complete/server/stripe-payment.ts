import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

let stripe: Stripe | null = null;

if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey);
} else {
  console.warn("[Stripe] Secret key not configured. Payments will not work.");
}

/**
 * Create a payment intent for subscription upgrade
 */
export async function createSubscriptionPaymentIntent(
  userId: number,
  userEmail: string,
  amountCents: number = 999 // $9.99 in cents
): Promise<{ clientSecret: string; publishableKey: string } | null> {
  if (!stripe) {
    console.warn("[Stripe] Stripe not configured");
    return null;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      payment_method_types: ["card"],
      description: `Contractor Black List Monthly Subscription - User ${userId}`,
      receipt_email: userEmail,
      metadata: {
        userId: String(userId),
        type: "subscription",
        period: "monthly",
      },
    });

    return {
      clientSecret: paymentIntent.client_secret || "",
      publishableKey: stripePublishableKey || "",
    };
  } catch (error) {
    console.error("[Stripe] Failed to create payment intent:", error);
    return null;
  }
}

/**
 * Confirm payment and create subscription
 */
export async function confirmSubscriptionPayment(
  paymentIntentId: string
): Promise<{ success: boolean; status: string }> {
  if (!stripe) {
    console.warn("[Stripe] Stripe not configured");
    return { success: false, status: "not_configured" };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      return { success: true, status: "succeeded" };
    } else if (paymentIntent.status === "processing") {
      return { success: false, status: "processing" };
    } else if (paymentIntent.status === "requires_payment_method") {
      return { success: false, status: "requires_payment_method" };
    } else {
      return { success: false, status: paymentIntent.status };
    }
  } catch (error) {
    console.error("[Stripe] Failed to confirm payment:", error);
    return { success: false, status: "error" };
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  if (!stripe) {
    console.warn("[Stripe] Stripe not configured");
    return false;
  }

  try {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return true;
  } catch (error) {
    console.error("[Stripe] Failed to cancel subscription:", error);
    return false;
  }
}

/**
 * Get payment method
 */
export async function getPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod | null> {
  if (!stripe) {
    console.warn("[Stripe] Stripe not configured");
    return null;
  }

  try {
    return await stripe.paymentMethods.retrieve(paymentMethodId);
  } catch (error) {
    console.error("[Stripe] Failed to retrieve payment method:", error);
    return null;
  }
}

/**
 * Create a customer in Stripe
 */
export async function createStripeCustomer(
  userId: number,
  email: string,
  name: string
): Promise<string | null> {
  if (!stripe) {
    console.warn("[Stripe] Stripe not configured");
    return null;
  }

  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId: String(userId),
      },
    });

    return customer.id;
  } catch (error) {
    console.error("[Stripe] Failed to create customer:", error);
    return null;
  }
}

/**
 * Get publishable key for frontend
 */
export function getStripePublishableKey(): string | null {
  return stripePublishableKey || null;
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!stripe && !!stripeSecretKey && !!stripePublishableKey;
}

/**
 * Create a Stripe customer for app-user (customer subscription flow).
 * Used by the mobile app via tRPC; keeps STRIPE_SECRET_KEY server-only.
 */
export async function createStripeCustomerForAppUser(data: {
  email: string;
  name: string;
  phone?: string;
}): Promise<{ customerId: string } | { error: string }> {
  if (!stripe) {
    return { error: "Stripe not configured" };
  }
  try {
    const customer = await stripe.customers.create({
      email: data.email,
      name: data.name,
      ...(data.phone && { phone: data.phone }),
    });
    return { customerId: customer.id };
  } catch (err) {
    console.error("[Stripe] createStripeCustomerForAppUser:", err);
    return { error: err instanceof Error ? err.message : "Failed to create customer" };
  }
}

/**
 * Create a payment intent for app customer subscription flow.
 */
export async function createCustomerPaymentIntentForApp(data: {
  stripeCustomerId: string;
  amountCents: number;
  plan: "monthly" | "yearly";
}): Promise<{ clientSecret: string } | { error: string }> {
  if (!stripe) {
    return { error: "Stripe not configured" };
  }
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: data.amountCents,
      currency: "usd",
      customer: data.stripeCustomerId,
      payment_method_types: ["card"],
      description: `ClientCheck ${data.plan} subscription`,
      metadata: { plan: data.plan },
    });
    const clientSecret = paymentIntent.client_secret;
    if (!clientSecret) return { error: "No client secret" };
    return { clientSecret, paymentIntentId: paymentIntent.id };
  } catch (err) {
    console.error("[Stripe] createCustomerPaymentIntentForApp:", err);
    return { error: err instanceof Error ? err.message : "Failed to create payment intent" };
  }
}

/**
 * Create a Stripe subscription for app customer (optional; may record in DB only).
 * Returns a placeholder subscription id if Stripe subscription creation is not set up.
 */
export async function createCustomerSubscriptionForApp(data: {
  stripeCustomerId: string;
  plan: "monthly" | "yearly";
  paymentMethodId?: string;
  paymentIntentId?: string;
}): Promise<{ subscriptionId: string } | { error: string }> {
  if (!stripe) {
    return { error: "Stripe not configured" };
  }
  let paymentMethodId = data.paymentMethodId;
  if (!paymentMethodId && data.paymentIntentId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(data.paymentIntentId);
      paymentMethodId = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id;
    } catch (e) {
      console.error("[Stripe] retrieve payment method from PaymentIntent:", e);
      return { error: "Could not get payment method from payment" };
    }
  }
  const priceId =
    process.env.STRIPE_PRICE_ID_MONTHLY && process.env.STRIPE_PRICE_ID_YEARLY
      ? data.plan === "monthly"
        ? process.env.STRIPE_PRICE_ID_MONTHLY
        : process.env.STRIPE_PRICE_ID_YEARLY
      : null;
  if (!priceId) {
    return { subscriptionId: `sub_${Date.now()}` };
  }
  try {
    const sub = await stripe.subscriptions.create({
      customer: data.stripeCustomerId,
      items: [{ price: priceId }],
      ...(paymentMethodId && { default_payment_method: paymentMethodId }),
      metadata: { plan: data.plan },
    });
    return { subscriptionId: sub.id };
  } catch (err) {
    console.error("[Stripe] createCustomerSubscriptionForApp:", err);
    return { subscriptionId: `sub_${Date.now()}` };
  }
}
