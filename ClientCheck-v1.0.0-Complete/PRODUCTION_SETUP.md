# Production setup — step-by-step

Do these in order. All required env vars are in `.env.example`.

---

## 1. Production database

1. **Provision MySQL** (Railway, PlanetScale, AWS RDS, etc.).
2. **Set `DATABASE_URL`** to the production connection string, e.g.  
   `mysql://USER:PASSWORD@HOST:PORT/DATABASE`
3. **Run migrations** (from project root):
   ```bash
   npm run db:push
   ```
   Or: `npm run db:generate` then `npm run db:migrate`.

---

## 2. Secrets (backend)

Generate strong random values (e.g. `openssl rand -base64 32`). Set in your host’s env (Railway, Render, etc.), not in a committed file.

| Variable | Required | Notes |
|----------|----------|--------|
| `SESSION_SECRET` | Yes | Cookie/session signing |
| `JWT_SECRET` | Yes | Min 32 chars; access token signing |
| `JWT_REFRESH_SECRET` | Yes | Min 32 chars; refresh token signing |
| `STRIPE_SECRET_KEY` | Yes | Live key `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Yes | From Stripe Dashboard after adding webhook (see §3) |
| `STRIPE_PUBLISHABLE_KEY` | Optional | Server may use for display; app uses `EXPO_PUBLIC_*` |
| `APP_BASE_URL` | Yes in prod | e.g. `https://api.clientcheck.example.com` |
| `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL` | If email | For signup/notifications |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME` | If uploads | For S3 photo uploads |
| `SENTRY_DSN` | Optional | Server error monitoring (logging middleware sends errors when set). |
| `EXPO_PUBLIC_SENTRY_DSN` | Optional | App error monitoring (set in EAS secrets or build env; Sentry React Native in `_layout.tsx`). |
| `ADMIN_EMAIL` | Optional | Support contact |

---

## 3. Stripe webhook + subscription price IDs

### Webhook

1. In **Stripe Dashboard** → Developers → Webhooks → Add endpoint.
2. **Endpoint URL:** `https://<APP_BASE_URL>/api/webhooks/stripe`  
   Example: `https://api.clientcheck.example.com/api/webhooks/stripe`
3. **Events to send:** at least `payment_intent.succeeded`, `customer.subscription.*`, `invoice.*` (or “Select all” for payments).
4. After creating, copy the **Signing secret** (`whsec_...`).
5. Set **`STRIPE_WEBHOOK_SECRET`** in your server env to that value.

### Subscription price IDs

1. In Stripe Dashboard → Products → create a product (e.g. “ClientCheck Monthly”).
2. Add a **recurring price** (e.g. $9.99/month) and copy the **Price ID** (`price_...`).
3. Repeat for yearly if needed.
4. Set in server env:
   - **`STRIPE_PRICE_ID_MONTHLY`** = monthly price ID  
   - **`STRIPE_PRICE_ID_YEARLY`** = yearly price ID  

Without these, subscription creation in the app may no-op or fail.

---

## 4. Deploy backend

- **Build:** `npm run build` → `dist/index.js`
- **Run:** `NODE_ENV=production node dist/index.js` (or `npm start`).
- **Host:** Deploy `dist/` and set all env vars on the host (see DEPLOY.md for Railway/Render).
- **Verify:** `GET https://<APP_BASE_URL>/api/health` returns 200.

---

## 5. Point app at live API

Set these so the **built app** talks to your production API (use EAS secrets for app builds, or build-time env):

| Variable | Where | Example |
|----------|--------|---------|
| `EXPO_PUBLIC_API_BASE_URL` | EAS secrets or `.env` at build | `https://api.clientcheck.example.com` |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | EAS secrets or `.env` at build | `pk_live_...` |

**EAS (recommended):** Set secrets so production URLs/keys are not in the repo:
```bash
eas secret:create --name EXPO_PUBLIC_API_BASE_URL --value "https://api.clientcheck.example.com" --scope project
eas secret:create --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value "pk_live_..." --scope project
```
Alternatively, set `env` in the production profile in `eas.json` (do not commit real keys; use CI secrets or local override). Rebuild the app after changing these.

---

## 6. Store listing + legal

- **Store:** Use `STORE_LISTING.md` for short/long description and screenshot checklist.
- **Legal:** App has Privacy Policy and Terms screens; ensure `play-store/PRIVACY_POLICY.md` and in-app copy are final and linked in store listing.

---

## 7. Smoke-test

Follow `SMOKE_TEST.md`: sign up, add customer, add review, subscription (on device), dispute flow; confirm webhook and emails if configured.

---

## Quick checklist

- [ ] Production `DATABASE_URL` set, migrations run
- [ ] `SESSION_SECRET`, `JWT_SECRET`, `JWT_REFRESH_SECRET` set (strong, unique)
- [ ] Stripe: webhook endpoint `https://<APP_BASE_URL>/api/webhooks/stripe`, `STRIPE_WEBHOOK_SECRET` set
- [ ] Stripe: `STRIPE_PRICE_ID_MONTHLY` and `STRIPE_PRICE_ID_YEARLY` set
- [ ] Backend deployed, `GET /api/health` returns 200
- [ ] App build has `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] Store listing and legal pages updated
- [ ] Smoke-test passed
