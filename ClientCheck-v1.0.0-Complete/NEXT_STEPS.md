# Your next steps (in order)

Do these in order. Each step has clear instructions.

---

## Step 1: Set your production environment

**Why:** The app and backend need real URLs and keys (no placeholder values).

**Where to set:**

- **Backend** (where your Node server runs: Railway, Render, VPS, etc.): add the variables there (host’s “Environment” or “Env vars”).
- **Expo/EAS**: [expo.dev](https://expo.dev) → your project → **Environment variables** → **Production** → Add variables.

**What to set:**

| Variable | Where | Example / notes |
|----------|--------|------------------|
| `DATABASE_URL` | Backend | Your production MySQL URL, e.g. `mysql://user:pass@host:3306/clientcheck` |
| `SESSION_SECRET` | Backend | Long random string (e.g. run `openssl rand -base64 32` and paste) |
| `JWT_SECRET` | Backend | Another long random string |
| `STRIPE_SECRET_KEY` | Backend | From Stripe Dashboard: `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Backend | From Stripe: create a webhook, copy `whsec_...` |
| `SENDGRID_API_KEY` | Backend | From SendGrid → API Keys |
| `AWS_ACCESS_KEY_ID` | Backend | IAM user with S3 access |
| `AWS_SECRET_ACCESS_KEY` | Backend | Same IAM user |
| `AWS_S3_BUCKET_NAME` or `S3_BUCKET` | Backend | Your bucket name, e.g. `clientcheck-prod` |
| **`EXPO_PUBLIC_API_BASE_URL`** | **EAS Production** | **Required.** Your API base URL, e.g. `https://api.yourdomain.com` (no trailing slash) |

Optional (if you use them): Twilio vars, OAuth vars. Full list is in **`ENV_SETUP.md`**.

**Done when:** Backend starts without errors and EAS Production has at least `EXPO_PUBLIC_API_BASE_URL` set.

---

## Step 2: Host your privacy policy and get the URL

**Why:** Google Play requires a working privacy policy URL.

**What to do:**

1. Open **`play-store/PRIVACY_POLICY.md`** in this repo (it’s already written).
2. Put it on the web in one of these ways:
   - **Option A:** Create a page on your website (e.g. `https://yourdomain.com/privacy`) and paste the content (as HTML or markdown rendered to HTML).
   - **Option B:** Use [GitHub Pages](https://pages.github.com): push the repo, enable Pages for the repo, then the policy might be at `https://yourusername.github.io/ClientCheck-v1.0.0-Complete/play-store/PRIVACY_POLICY` (or add a simple `privacy.html` that shows the policy).
3. Copy the **full URL** (e.g. `https://yourdomain.com/privacy`). You’ll use it in Step 5.

**Done when:** Opening that URL in a browser shows your privacy policy.

---

## Step 3: Build the Android app (AAB)

**Why:** You need the file that you’ll upload to Play Console.

**What to do:**

1. Open a terminal in the project folder:  
   `G:\My Drive\Client check app\ClientCheck-v1.0.0-Complete`
2. Install dependencies and fix Expo versions:
   ```bash
   npm install
   npx expo install --fix
   ```
3. Log in to EAS (if needed):
   ```bash
   npx eas-cli@latest login
   ```
4. Start the production build:
   ```bash
   npx eas-cli@latest build --platform android --profile production
   ```
5. Wait for the build to finish (link appears in the terminal; you can open it in the browser).
6. When it’s done, **download the AAB** from that build page (e.g. “Download” or “Build artifact”).

**Done when:** You have the `.aab` file on your computer.

---

## Step 4: Test the app on a real Android device

**Why:** So you can fix crashes or “something went wrong” before Google reviews it.

**What to do:**

1. **Option A – Internal testing (recommended)**  
   - In Play Console (Step 5) create an **Internal testing** release and upload the same AAB.  
   - Add your email as a tester.  
   - Open the internal testing link on your Android phone and install the app.  

2. **Option B – APK on your phone**  
   - Add a `preview` profile in **`eas.json`** with `"buildType": "apk"`, run  
     `npx eas-cli@latest build --platform android --profile preview`,  
     then install the downloaded APK on your phone.

3. On the device, test:
   - Open the app and log in (or sign up).
   - Do a customer search.
   - Add a review (with or without a photo).
   - Open the subscription screen.
   - If something crashes or shows an error, fix it (often env or API URL), rebuild (Step 3), and test again.

**Done when:** You can use the app on your phone without crashes for these main flows.

---

## Step 5: Create the app in Play Console and complete required forms

**Why:** Google won’t publish until the app and all required sections exist.

**What to do:**

1. Go to [Google Play Console](https://play.google.com/console) and sign in.
2. **Create the app** (if you haven’t):  
   **All apps** → **Create app** → App name: **ClientCheck** → Default language: English (US) → App → Free or paid → Create.

3. In the left menu, open **Policy** → **App content** (or **Policy and programs** → **App content**).
   - **Privacy policy:** Start/Manage → enter the URL from Step 2 → Save.

4. **Data safety:**  
   Start/Manage → “Does your app collect or share user data?” → **Yes** → fill the form using the table in **`play-store/PLAY_CONSOLE_SETUP.md`** (section 3: email, name, phone, payment, photos, etc.) → Encryption in transit: **Yes** → User can request deletion: **Yes** → Save / Submit.

5. **Content rating:**  
   App content → **Content rating** → Start → Questionnaire → choose **Productivity** or **Business** → answer (no violence, no gambling, etc.; in-app purchases if you have subscriptions) → Submit to get a rating.

6. **Store listing:**  
   **Grow** → **Store presence** → **Main store listing** (or **Store settings** → **Main store listing**):
   - **Short description (80 chars):**  
     `ClientCheck helps contractors spot risky customers before taking the job.`
   - **Full description:** Copy the “Full description” from **`play-store/STORE_DESCRIPTION.txt`** in this repo.
   - **App icon:** 512×512 PNG (you can use or resize from `assets/images/icon.png`).
   - **Feature graphic:** 1024×500 PNG or JPEG.
   - **Screenshots:** At least 2 phone screenshots (e.g. 1080×1920). Take them from the app you tested in Step 4.

7. Complete any other **App content** items that show as required (e.g. Ads: No, Target audience, etc.).

**Done when:** Privacy policy URL is set, Data safety and Content rating are submitted, and Main store listing is filled with description, icon, graphic, and screenshots.

---

## Step 6: Upload the AAB and send the app for review

**Why:** This is the actual release that Google will review.

**What to do:**

1. In Play Console, go to **Release** → **Production** (or **Testing** → **Internal testing** first if you prefer).
2. **Create new release** → upload the **AAB** you downloaded in Step 3.
3. **Release name:** e.g. `1.0.0 (1)`.
4. **Release notes:** e.g. `Initial release.`
5. Save → **Review release** → fix any errors shown → **Start rollout to Production** (or to your chosen track).

**Done when:** The release is submitted and shows as “In review” or “Pending publication.”

---

## Quick checklist

- [ ] **Step 1:** Backend and EAS Production env set (including `EXPO_PUBLIC_API_BASE_URL`).
- [ ] **Step 2:** Privacy policy hosted and URL copied.
- [ ] **Step 3:** Production AAB built and downloaded.
- [ ] **Step 4:** App tested on device; no crashes on login, search, review, subscription.
- [ ] **Step 5:** Play Console app created; privacy policy URL, Data safety, Content rating, and store listing (description, icon, graphic, screenshots) completed.
- [ ] **Step 6:** AAB uploaded and release sent for review.

---

## If something goes wrong

- **Build fails:** Run `npm run check` and fix TypeScript errors; run `npx expo install --fix`; check the build logs on the EAS build page.
- **App won’t load / “something went wrong”:** Confirm `EXPO_PUBLIC_API_BASE_URL` is set in EAS Production and that you did a **new** build after setting it.
- **Play Console errors:** Use **`play-store/PLAY_CONSOLE_SETUP.md`** and **`play-store/PLAY_CHECKLIST.md`** for more detail on each section.
