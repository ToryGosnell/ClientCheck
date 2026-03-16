# Stripe quick reference

One-page map for the five main pieces.

---

## STRIPE_SECRET_KEY

| What | Server-only Stripe API key. Never in the app or client. |
|------|----------------------------------------------------------|
| Value | `sk_live_...` (production) or `sk_test_...` (testing) from [Stripe → API keys](https://dashboard.stripe.com/apikeys). |
| Where set | Backend env only: `.env`, Railway/Render/Fly secrets. |
| Where used | `server/stripe-payment.ts`, `server/stripe-service.ts`, `server/services/stripe-payment-service.ts`, `server/routes/stripe-webhooks.ts` — creating PaymentIntents, customers, subscriptions, and verifying webhooks. |

---

## EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY

| What | Publishable key safe to ship in the app bundle. |
|------|-------------------------------------------------|
| Value | `pk_live_...` or `pk_test_...` from Stripe Dashboard. |
| Where set | App build: EAS secrets and/or `.env` (only `EXPO_PUBLIC_*` is embedded in client). |
| Where used | `app/_layout.tsx` (StripeProvider), `lib/stripe-customer-service.ts` — initializing Stripe in the app so the Payment Sheet can run. |

---

## PaymentIntent

| What | Stripe object that represents a one-time payment; backend creates it, returns **client secret** to the app. |
|------|----------------------------------------------------------------------------------------------------------|
| Where created | Backend: `server/stripe-payment.ts` → `createCustomerPaymentIntentForApp()` (uses **STRIPE_SECRET_KEY**). |
| Where used in app | `app/customer-subscription.tsx`: tRPC `payments.createCustomerPaymentIntentForApp` → gets `clientSecret` + `paymentIntentId` → passed to Payment Sheet, then `paymentIntentId` sent back to backend to create subscription. |
| Flow | App → tRPC → Backend creates PaymentIntent → returns `clientSecret` → App uses it with Payment Sheet (never sends card to your server). |

---

## Payment Sheet

| What | Stripe’s native payment UI (card field, confirm) on iOS/Android. |
|------|-----------------------------------------------------------------|
| Where used | `app/customer-subscription.tsx`: `usePaymentSheet()` → `initPaymentSheet({ paymentIntentClientSecret, merchantDisplayName: "ClientCheck" })` → `presentPaymentSheet()`. |
| Requires | **EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY** in app; **client secret** from backend (PaymentIntent). |
| Platform | Used on **iOS/Android**; on web the screen shows “Complete payment in the app” (no Payment Sheet on web). |

---

## Webhook

| What | Stripe sends HTTP POST to your server when events happen (e.g. payment succeeded, subscription updated). |
|------|----------------------------------------------------------------------------------------------------------|
| Your URL | `https://<APP_BASE_URL>/api/webhooks/stripe` (e.g. `https://your-api.railway.app/api/webhooks/stripe`). |
| Where configured | Stripe Dashboard → Developers → Webhooks → Add endpoint → paste URL, select events → copy **Signing secret** (`whsec_...`). |
| Env | Set **STRIPE_WEBHOOK_SECRET** on the server to that signing secret. |
| Where implemented | `server/_core/index.ts` mounts raw-body route; `server/routes/stripe-webhooks.ts` → `StripePaymentService.verifyWebhookSignature()` and `handleWebhookEvent()`. |

---

## Checklist

- [ ] **STRIPE_SECRET_KEY** on server (sk_live_ or sk_test_).
- [ ] **EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY** in app (EAS secrets / .env at build).
- [ ] Stripe Dashboard: webhook endpoint = `https://<YOUR_API>/api/webhooks/stripe`.
- [ ] **STRIPE_WEBHOOK_SECRET** on server = webhook signing secret from Dashboard.

For full setup and subscription price IDs, see **PAYMENTS_SETUP.md** and **PRODUCTION_SETUP.md**.
