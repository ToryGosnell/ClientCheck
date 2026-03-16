# Production environment setup

Set these in **two places**: your **backend server** (e.g. Railway, Render, VPS) and **EAS Production** (Expo dashboard → your project → Environment variables → Production).

---

## 1. Backend (server / host)

Set these where your Node server runs (e.g. `.env` on the server or host’s env UI). Use **real values**; do not leave `replace-me` or placeholders.

| Variable | Example / notes |
|----------|------------------|
| `DATABASE_URL` | `mysql://user:password@host:3306/clientcheck` — your production MySQL URL |
| `PORT` | `3000` (or your host’s port) |
| `SESSION_SECRET` | Long random string (e.g. `openssl rand -base64 32`) |
| `JWT_SECRET` | Long random string (different from SESSION_SECRET) |
| `STRIPE_SECRET_KEY` | `sk_live_...` from Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from Stripe webhook |
| `SENDGRID_API_KEY` | From SendGrid → API Keys |
| `TWILIO_ACCOUNT_SID` | From Twilio Console |
| `TWILIO_AUTH_TOKEN` | From Twilio Console |
| `TWILIO_PHONE_NUMBER` | e.g. `+1234567890` |
| `AWS_ACCESS_KEY_ID` | IAM user with S3 access |
| `AWS_SECRET_ACCESS_KEY` | Same IAM user |
| `AWS_REGION` | e.g. `us-east-1` |
| `AWS_S3_BUCKET_NAME` or `S3_BUCKET` | Your S3 bucket name (e.g. `clientcheck-prod`) |

Optional: `SENTRY_DSN`, `REDIS_URL` if you use them.

---

## 2. EAS Production (built app)

In [expo.dev](https://expo.dev) → your project → **Environment variables** → **Production**, add:

| Variable | Purpose |
|----------|--------|
| `EXPO_PUBLIC_API_BASE_URL` | **Required.** Base URL of your API (e.g. `https://api.yourdomain.com`). The app uses this to call your backend. No trailing slash. |

If you use OAuth / Manus login, also set:

| Variable | Purpose |
|----------|--------|
| `EXPO_PUBLIC_OAUTH_PORTAL_URL` | OAuth portal URL |
| `EXPO_PUBLIC_OAUTH_SERVER_URL` | OAuth server URL |
| `EXPO_PUBLIC_APP_ID` | App ID |
| `EXPO_PUBLIC_OWNER_OPEN_ID` | Owner Open ID |
| `EXPO_PUBLIC_OWNER_NAME` | Owner name |

---

## 3. Quick check

- Backend: env vars set on the host; server starts and can reach DB and Stripe.
- EAS: Production env has at least `EXPO_PUBLIC_API_BASE_URL`.
- After changing EAS env, run a **new** production build so the app bundle includes the new values.
