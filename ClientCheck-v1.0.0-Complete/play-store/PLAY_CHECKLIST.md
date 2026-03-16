# Google Play release checklist

## Before building
- [ ] Set production env vars (see project `.env.example` and EAS Production env):
  - Backend: `DATABASE_URL`, `SESSION_SECRET`, `JWT_SECRET`, Stripe, SendGrid, AWS S3 (`AWS_S3_BUCKET_NAME` or `S3_BUCKET`)
  - App: `EXPO_PUBLIC_API_BASE_URL` (so the built app calls your API), and OAuth vars if used
- [ ] Replace placeholder app icons in `assets/images/` with real icon, adaptive icons, splash, favicon
- [ ] In `app.config.ts`, bump `android.versionCode` for each new upload (e.g. 2, 3, …)

## Play Console
- [ ] Verify your Play Console developer account
- [ ] Upload a privacy policy URL in Play Console
- [ ] Complete Data safety and App content forms
- [ ] Confirm target SDK is 35 or higher
- [ ] Upload screenshots, app icon, and feature graphic
- [ ] Use short/full description from `play-store/STORE_DESCRIPTION.txt` (or customize)
- [ ] Start with Internal testing, then Closed testing, then Production

## Build
```bash
npm install
npx expo install --fix
eas login
eas build -p android --profile production
```

## Submit
```bash
eas submit -p android --profile production
```

## Pre-launch checks
- [ ] No hardcoded API keys or secrets (use env only)
- [ ] Test core flows on a real Android device: login, search, add review, subscription, risk check
- [ ] Test permission denial (camera/photo library) so the app doesn’t crash
- [ ] Run `npm run check` (or `pnpm check`) and fix any TypeScript errors
