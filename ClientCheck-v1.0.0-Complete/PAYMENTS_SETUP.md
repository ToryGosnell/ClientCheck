# Payments setup (Stripe) – take and receive payments

Your app is **code-ready** for Stripe (payment intents, subscriptions, webhooks). To actually take and receive payments you need to configure keys and the Stripe Dashboard.

---

## Flow (how it works)

Your project already follows Stripe’s recommended flow:

1. **App** asks your **backend** to create a payment (via tRPC: `payments.createPaymentIntent`, `payments.createCustomerPaymentIntentForApp`).
2. **Backend** creates a **PaymentIntent** in Stripe (using `STRIPE_SECRET_KEY`) and returns the **client secret**.
3. **App** receives the client secret and uses **EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY** to open Stripe’s payment UI (e.g. card form).
4. **Stripe** confirms the payment; your backend can react via webhooks and/or the tRPC `confirmPayment` flow.

The app does **not** charge cards by itself; the backend is the only place that uses the secret key and creates intents.

---

## Keys – where they go

| Key | Where | Used for |
|-----|--------|----------|
| **EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY** | App `.env` and EAS secrets | Initializing Stripe in the app; showing payment UI. Safe in client bundle. |
| **STRIPE_SECRET_KEY** | Backend `.env` and server env (e.g. Railway) | Creating PaymentIntents, customers, subscriptions. **Never** in the app or client code. |

---

## 1. Environment variables

Set these **on your server** (Railway, etc.) and **locally** in `.env` as needed.

| Variable | Where | Purpose |
|----------|--------|---------|
| **STRIPE_SECRET_KEY** | Server only | Server-side API (create intents, subscriptions). Use `sk_live_...` for production. |
| **STRIPE_WEBHOOK_SECRET** | Server only | Verify webhook requests. From Stripe Dashboard → Developers → Webhooks. |
| **STRIPE_PUBLISHABLE_KEY** | Server (optional) | Can mirror publishable for server-side checks. |
| **EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY** | Server + app build | Used by the app to initialize Stripe. Use `pk_live_...` for production. **Must** be set for EAS/build if the app shows payment UI. |

Optional (for subscription products):

| Variable | Purpose |
|----------|---------|
| **STRIPE_PRICE_ID_MONTHLY** | Stripe Price ID for monthly plan (e.g. `price_xxx`). |
| **STRIPE_PRICE_ID_YEARLY** | Stripe Price ID for yearly plan. |

Set any missing values from [Stripe Dashboard → API keys](https://dashboard.stripe.com/apikeys).

---

## 2. Stripe Dashboard – webhook

So the server can **receive** payment events (success, failure, subscription updates):

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks).
2. **Add endpoint**.
3. **Endpoint URL:**  
   `https://YOUR_API_BASE_URL/api/webhooks/stripe`  
   (e.g. `https://your-app.railway.app/api/webhooks/stripe`).
4. **Events to send** (recommended so the app stays accurate even if the user closes mid-payment):
   - `payment_intent.succeeded` — successful payment
   - `payment_intent.payment_failed` — failed payment
   - `customer.subscription.created` — new subscription
   - `customer.subscription.updated` — plan or status change
   - `customer.subscription.deleted` — subscription canceled
   - `invoice.payment_succeeded` — recurring invoice paid
   - `invoice.payment_failed` — recurring invoice failed
   - `charge.refunded` — refund issued
5. After creating, open the endpoint and **Reveal** the **Signing secret** (`whsec_...`).
6. Set **STRIPE_WEBHOOK_SECRET** to that value on your server.

The backend listens at **POST /api/webhooks/stripe**, verifies the signature with **STRIPE_WEBHOOK_SECRET**, and handles events as follows (idempotent; duplicate events return 200):

| Event | What the backend does |
|-------|------------------------|
| **payment_intent.succeeded** | Records or updates payment as `succeeded` in `stripe_payments`. |
| **payment_intent.payment_failed** | Records or updates payment as `failed` (with reason). |
| **charge.refunded** | Updates the related payment to `refunded`. |
| **customer.subscription.created / updated** | Updates `subscriptions` (status, period dates) when the row has `stripeSubscriptionId` set. |
| **customer.subscription.deleted** | Sets subscription status to `cancelled`. |
| **invoice.payment_succeeded / invoice.payment_failed** | Updates linked subscription status. |

This keeps your app’s state in sync with Stripe even if the user closes the app before the in-app flow finishes.

---

## 3. App (client) – publishable key

- In **EAS** (or your build env): add secret **EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY** = `pk_live_...` (or `pk_test_...` for testing).
- In **.env** for local dev: set **EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY** so the app can load Stripe and show payment UI.

The app uses this in `lib/stripe-customer-service.ts` and payment flows; without it, payment screens may not work correctly.

---

## 4. Optional – subscription products

If you use **recurring** (monthly/yearly) plans:

1. In Stripe: [Products](https://dashboard.stripe.com/products) → create products and prices.
2. Copy the **Price IDs** (`price_...`).
3. Set **STRIPE_PRICE_ID_MONTHLY** and **STRIPE_PRICE_ID_YEARLY** on the server.

If these are not set, the code can still create one-off payment intents; subscription creation may fall back to a placeholder.

---

## 5. Quick checklist

- [ ] **STRIPE_SECRET_KEY** set on server (live or test).
- [ ] **STRIPE_WEBHOOK_SECRET** set on server (from Webhooks signing secret).
- [ ] **EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY** set for the app (EAS secrets and/or .env).
- [ ] Webhook endpoint added in Stripe: `https://YOUR_API_BASE_URL/api/webhooks/stripe`.
- [ ] (Optional) **STRIPE_PRICE_ID_MONTHLY** / **STRIPE_PRICE_ID_YEARLY** for subscriptions.

After this, the app and server are set up to **take** (create payment intents, subscriptions) and **receive** (webhooks updating subscription state and payment status).

---

## 6. Stripe in the app (Android / iOS)

The app uses Stripe’s **mobile integration** so the device never sees your secret key:

- **Installed:** `@stripe/stripe-react-native` (Expo-compatible).
- **Expo config:** The `@stripe/stripe-react-native` plugin is added in `app.config.ts` so native builds include the Stripe Android/iOS SDK.
- **StripeProvider:** The root layout wraps the app with `StripeProvider` and `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` so Stripe is initialized with the publishable key only.
- **Payment flow on device:**
  1. App asks backend to create a payment → backend creates a **PaymentIntent** and returns **client secret** (+ `paymentIntentId`).
  2. App calls `initPaymentSheet({ paymentIntentClientSecret, merchantDisplayName: "ClientCheck" })` then `presentPaymentSheet()` from `@stripe/stripe-react-native`.
  3. User enters card in Stripe’s native Payment Sheet (Stripe Android/iOS SDK).
  4. After success, app sends `paymentIntentId` to the backend to create the subscription; backend resolves the payment method from the PaymentIntent.

**Web:** The subscription screen shows an alert asking users to complete payment in the mobile app. You can add a Stripe.js/Element flow later for web if needed.
