# Closed beta deployment (5–15 contractors)

## Environment

1. Copy `.env.example` → server env (Railway/host) and Expo/EAS secrets.
2. Set **staging** vs **production** values consistently (`EXPO_PUBLIC_API_BASE_URL`, `APP_BASE_URL`, Stripe keys).
3. **Web OAuth:** set `OAUTH_WEB_REDIRECT_URL` or ensure `APP_BASE_URL` (or `FRONTEND_URL`) is your real web app origin so `/api/oauth/callback` does not send users to `localhost` in production.

### EAS secrets (staging invite build)

Before `eas build`, set secrets for the profile you use (Expo dashboard → Project → Environment variables, or `eas env:create` / project secrets UI). Confirm:

- No `localhost` in `EXPO_PUBLIC_API_BASE_URL`.
- `EXPO_PUBLIC_DEMO_MODE` is unset or exactly `false`.
- Staging Stripe publishable key, Algolia client vars, and OAuth `EXPO_PUBLIC_*` values match your staging backend and portal.

## Web (static export — staging)

Use a **staging** `.env` (or EAS env for web export) so `EXPO_PUBLIC_*` points at the staging API.

```bash
npm run build:web
```

Upload the exported static output to your staging static host. `EXPO_PUBLIC_API_BASE_URL` must be the **staging** API origin (HTTPS, no trailing slash).

## API server

```bash
npm run build
npm start
```

Ensure `DATABASE_URL`, Stripe, Algolia admin, OAuth server vars, and webhooks are set on the host.

## iOS (TestFlight)

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

Configure Apple IDs in `eas.json` submit section. Set all required `EXPO_PUBLIC_*` in EAS for the **same** profile you build with. After install, testers can confirm **version / build** under **Settings** in the app.

## Android (internal testing)

```bash
eas build --platform android --profile preview
# or production profile for Play bundle
eas submit --platform android --profile production
```

Use `preview` for internal APK distribution; ensure `google-services.json` / Play credentials paths match your project.

## Smoke checklist (manual)

Use **`docs/STAGING_SMOKE_CHECKLIST.md`** — includes infra (OAuth, Stripe webhooks, Algolia, EAS) plus contractor flows.
