# Pre-launch summary

## Latest: trial reminder cron (no framework change)

- **`server/trial-reminder-cron.ts`** – Trial reminder cron now uses real DB queries:
  - **getUsersNeedingReminders()** uses Drizzle to load users on trial whose `trialEndsAt` is in the next 3 days (expiring) or whose trial ended today (expired).
  - Sending a “trial expiring” email calls **markReminderSent(userId)** from subscription-db.
  - Removed placeholder “TODO” comments; cron is ready for production once env and DB are set.

---

## What was completed (no framework change)

### 1. Config / env
- **`.env.example`** – Documented all vars: backend (DB, Stripe, SendGrid, Twilio, AWS S3), plus app vars (`EXPO_PUBLIC_API_BASE_URL`, OAuth). Use for local and as a reference for EAS Production env.
- **S3 bucket** – Backend uses `AWS_S3_BUCKET_NAME` with fallback to `S3_BUCKET`. Set either in production.

### 2. Review and dispute photo uploads
- **Server**
  - `server/s3-service.ts`: Presigned URLs now return `{ presignedUrl, publicUrl }`; added `generatePresignedDisputeUploadUrl`; bucket from `AWS_S3_BUCKET_NAME` or `S3_BUCKET`.
  - `server/db.ts`: `addReviewPhotos(reviewId, photoUrls)`, `addDisputePhotos(disputeId, photoUrls)`.
  - `server/routers.ts`: `photos.getPresignedUrl` returns both URLs; added `photos.getPresignedDisputeUrl`; `reviews.addPhotos`; `disputes.respondToDispute` accepts optional `photoUrls` and saves dispute photos.
- **App**
  - `app/add-review.tsx`: After creating a review, uploads each selected photo to S3 via presigned URL and calls `reviews.addPhotos`. Image picker re-enabled with `expo-image-picker`.
  - `app/dispute-response.tsx`: Same flow for dispute photos; submits `photoUrls` with the response.
- **Dependency**: `expo-image-picker` added for photo selection.

### 3. Android / Play
- **`app.config.ts`**: Comment added to bump `android.versionCode` for each Play upload; `READ_PHONE_STATE` added for call detection.
- **`play-store/PLAY_CHECKLIST.md`**: Expanded with env, icons, store listing, and pre-launch steps.

## What you still do manually

1. **Production env** – Set real values using **`ENV_SETUP.md`** (backend host + EAS Production). At minimum: backend DB/secrets/Stripe/SendGrid/AWS S3, and **`EXPO_PUBLIC_API_BASE_URL`** in EAS so the app talks to your API.
2. **App icons** – `assets/images/` now has generated icon, adaptive icons, splash, and favicon. Replace with your own branding if you prefer.
3. **Play Console** – Follow **`play-store/PLAY_CONSOLE_SETUP.md`**: create app, privacy policy URL, data safety, content rating, store listing (screenshots, descriptions from `play-store/STORE_DESCRIPTION.txt`).
4. **Test the build** – Follow **`TEST_BUILD.md`**: run `eas build -p android --profile production`, install on a device, test login/search/review/subscription.
5. **Each new release** – In `app.config.ts`, increase `android.versionCode` (e.g. 2, 3, …).
6. **Optional** – Run `npm run check` (or `pnpm check`) and `npx expo install --fix` before building.

## Build and submit

```bash
npm install
npx expo install --fix
eas build -p android --profile production
eas submit -p android --profile production
```
