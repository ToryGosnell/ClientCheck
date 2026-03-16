import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";

export const stripe = new Stripe(stripeSecretKey);

/**
 * Create a payment intent for subscription upgrade
 * Returns the client secret to be used by the mobile app
 */
export async function createPaymentIntent(
  userId: number,
  amountInCents: number, // $9.99 = 999
  description: string
) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.");
  }
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      description: description,
      metadata: {
        userId: userId.toString(),
        type: "subscription_upgrade",
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error("Stripe payment intent creation failed:", error);
    throw new Error("Failed to create payment intent");
  }
}

/**
 * Confirm payment and update subscription
 */
export async function confirmPayment(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      };
    } else if (paymentIntent.status === "processing") {
      return {
        success: false,
        status: "processing",
        message: "Payment is being processed",
      };
    } else {
      return {
        success: false,
        status: paymentIntent.status,
        message: "Payment failed or was cancelled",
      };
    }
  } catch (error) {
    console.error("Stripe payment confirmation failed:", error);
    throw new Error("Failed to confirm payment");
  }
}

/**
 * Create a customer in Stripe for future payments
 */
export async function createStripeCustomer(
  userId: number,
  email: string,
  name: string
) {
  try {
    const customer = await stripe.customers.create({
      email: email,
      name: name,
      metadata: {
        userId: userId.toString(),
      },
    });

    return {
      stripeCustomerId: customer.id,
    };
  } catch (error) {
    console.error("Stripe customer creation failed:", error);
    throw new Error("Failed to create Stripe customer");
  }
}

/**
 * Create a subscription for recurring monthly billing
 */
export async function createSubscription(
  stripeCustomerId: string,
  priceId: string, // Stripe price ID for $9.99/month
  userId: number
) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [
        {
          price: priceId,
        },
      ],
      metadata: {
        userId: userId.toString(),
      },
    });

    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    };
  } catch (error) {
    console.error("Stripe subscription creation failed:", error);
    throw new Error("Failed to create subscription");
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);

    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      canceledAt: new Date((subscription as any).canceled_at! * 1000),
    };
  } catch (error) {
    console.error("Stripe subscription cancellation failed:", error);
    throw new Error("Failed to cancel subscription");
  }
}
