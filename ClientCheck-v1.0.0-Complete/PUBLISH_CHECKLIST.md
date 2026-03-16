# ClientCheck — Path to Publish

Use this checklist to move from current state to a published app (stores + backend).

---

## 1. Production environment (backend)

- [ ] **Database**
  - Provision production MySQL (e.g. PlanetScale, AWS RDS, Railway).
  - Set `DATABASE_URL` to the production connection string.
  - Run migrations: `npm run db:migrate` (or `db:push` if you prefer generate+migrate).

- [ ] **Secrets (from `.env.example`)**
  - `SESSION_SECRET`, `JWT_SECRET`, `JWT_REFRESH_SECRET` — strong random values.
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` — live keys.
  - `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` — for email.
  - `TWILIO_*` — for SMS (if used).
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME` — for uploads.
  - `APP_BASE_URL` — your API base URL (e.g. `https://api.clientcheck.example.com`).
  - `ADMIN_EMAIL` — support contact.

- [ ] **App / client config (only `EXPO_PUBLIC_*` are safe in the app)**
  - `EXPO_PUBLIC_API_BASE_URL` — same base URL the app will call.
  - `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key (e.g. `pk_live_*`).
  - Optional: `EXPO_PUBLIC_OAUTH_*`, `EXPO_PUBLIC_APP_ID`, `EXPO_PUBLIC_OWNER_*` if you use them.

---

## 2. Backend deploy

- [ ] **Build**
  - `npm run build` — produces `dist/index.js`.

- [ ] **Host**
  - Deploy `dist/` and run `npm start` (or `node dist/index.js`) on a Node host (Railway, Render, Fly.io, VPS, etc.).
  - Set all env vars on the host (no `.env` file in production if possible; use platform secrets).

- [ ] **Stripe webhooks**
  - Point Stripe webhook endpoint to `https://<APP_BASE_URL>/api/webhooks/stripe`.
  - Set `STRIPE_WEBHOOK_SECRET` from Stripe Dashboard (signing secret).

- [ ] **Health**
  - Confirm `GET /api/health` returns 200.

---

## 3. App config for production

- [ ] **`app.config.ts`**
  - Bundle ID is already `com.torygosnell.clientcheck`. Change if you need a different app identity.
  - EAS project ID is set; keep it for EAS Build.

- [ ] **EAS / Expo**
  - Install EAS CLI if needed: `npm i -g eas-cli`.
  - Log in: `eas login`.
  - Configure secrets for builds: `eas secret:create` for any value the app needs at build time (e.g. `EXPO_PUBLIC_API_BASE_URL`).

---

## 4. Build and test before submit

- [ ] **Typecheck**
  - `npm run check` (tsc --noEmit).

- [ ] **Lint**
  - `npm run lint`.

- [ ] **Tests**
  - `npm run test` — fix any failures in `tests/`.

- [ ] **Local production-like run**
  - Set production env (or a staging `.env`), run `npm run build` then `npm start`.
  - In another terminal run Metro with production API URL and smoke-test the app.

---

## 5. Store builds (EAS)

- [ ] **Android (Play Store)**
  - `eas build --platform android --profile production` (uses `eas.json` production → app-bundle).
  - Upload the AAB to Google Play Console; fill store listing and submit for review.
  - Bump `versionCode` in `app.config.ts` for each new upload.

- [ ] **iOS (App Store)**
  - Add an `ios` profile in `eas.json` if you want a dedicated iOS production profile.
  - `eas build --platform ios --profile production`.
  - Submit with `eas submit` or via App Store Connect.

- [ ] **Web (optional)**
  - Export: `npx expo export --platform web` (output is static).
  - Deploy the export folder to a host (Vercel, Netlify, or your own server).

---

## 6. After publish

- [ ] **Monitoring**
  - Optional: set `SENTRY_DSN` for error tracking.
  - Use `/api/health` (or your monitoring) for uptime checks.

- [ ] **Backups**
  - If you use `BACKUP_LOCATION` or a backup script, run it on a schedule.

- [ ] **Store**
  - Respond to review feedback; plan updates and version bumps.

---

## Quick command reference

| Goal              | Command |
|-------------------|--------|
| Typecheck         | `npm run check` |
| Lint              | `npm run lint` |
| Tests             | `npm run test` |
| DB migrations     | `npm run db:push` or `db:generate` + `db:migrate` |
| Server build      | `npm run build` |
| Server run        | `npm start` |
| Dev (server+app)  | `npm run dev` |
| Android build     | `eas build --platform android --profile production` |
| iOS build         | `eas build --platform ios --profile production` |
| Web export       | `npx expo export --platform web` |

Start with **§1 (env + DB)** and **§2 (backend deploy)**, then **§4 (checks)** and **§5 (store builds)**.
