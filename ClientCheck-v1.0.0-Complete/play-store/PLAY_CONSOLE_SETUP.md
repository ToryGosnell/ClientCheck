# Play Console setup (step-by-step)

Do these in [Google Play Console](https://play.google.com/console) so the app is ready for publishing.

---

## Rejection-risk checklist (all covered if you follow this doc)

| Risk | Status in this project | What you do |
|------|------------------------|-------------|
| **Missing privacy policy URL** | ✅ Policy written in `play-store/PRIVACY_POLICY.md`. | Host it (e.g. your website or GitHub Pages), then in Play Console → **App content** → **Privacy policy** paste that URL. |
| **Incomplete or wrong Data safety** | ✅ Section 3 below lists what to declare (email, name, phone, payment, photos, etc.) and matches the app. | In Play Console → **Data safety** fill the form using the table in section 3; say Yes to encryption in transit and user deletion. |
| **App crashes / “something went wrong”** | ✅ `ENV_SETUP.md` and `TEST_BUILD.md` in the repo. | Set production env (especially `EXPO_PUBLIC_API_BASE_URL`), run `eas build`, install on a device, test login/search/review/subscription. Fix any crashes before submit. |
| **Misleading store listing** | ✅ `play-store/STORE_DESCRIPTION.txt` describes real features (risk checks, reviews, disputes, moderation, verification). No fake promises. | In **Main store listing** use that short + full description; use real screenshots of the app. |
| **Sensitive permissions** | ✅ Declared in `app.config.ts`: `INTERNET`, `POST_NOTIFICATIONS`, `READ_PHONE_STATE`. Photo access is used by expo-image-picker for reviews/disputes. | In **Data safety** declare: Device or other IDs (optional if you use them), Photos (Yes – for review/dispute evidence), and any other types you collect. No extra permission declared in app.config that you don’t use. |

---

## 1. Create the app (if needed)

- Open Play Console → **All apps** → **Create app**.
- **App name:** ClientCheck  
- **Default language:** English (United States)  
- **App or game:** App  
- **Free or paid:** Free (or your choice)

---

## 2. Set the privacy policy URL

- In the app’s left menu: **Policy** → **App content** (or **Policy and programs** → **App content**).
- Find **Privacy policy** → **Start** (or **Manage**).
- Enter the **URL** to your privacy policy (e.g. `https://yourdomain.com/privacy` or where you host `play-store/PRIVACY_POLICY.md`).
- Save.

---

## 3. Data safety form

- **App content** → **Data safety** → **Start** (or **Manage**).
- **Does your app collect or share user data?** → Yes.

Then declare the following (adjust if your app differs):

| Data type | Collected? | Shared? | Purpose |
|-----------|------------|--------|---------|
| Email address | Yes | No | Account, support |
| Name | Yes | No | Account, profile |
| Phone number | Yes | No | Account, customer search |
| User IDs | Yes | No | Account, reviews |
| Payment info | Yes (processed by Stripe) | No | Subscriptions |
| Photos (review/dispute) | Yes | No | Evidence, moderation |
| App interactions | Optional | No | Analytics (if you use them) |

- **Is data encrypted in transit?** → Yes.  
- **Can users request deletion?** → Yes (per your privacy policy).  
- Save and submit.

---

## 4. Content rating

- **App content** → **Content rating** → **Start** (or **Manage**).
- Choose **Questionnaire**.
- **Category:** Productivity or Business (or closest match).
- Answer the questionnaire (no violence, no sexual content, no gambling; in-app purchases if you have subscriptions).
- Submit to get a rating (e.g. Everyone or similar).

---

## 5. Store listing

- **Grow** → **Store presence** → **Main store listing** (or **Store settings** → **Main store listing**).

Fill in:

| Field | What to use |
|-------|-------------|
| **Short description** (max 80 chars) | `ClientCheck helps contractors spot risky customers before taking the job.` |
| **Full description** (max 4000 chars) | Use the “Full description” block from `play-store/STORE_DESCRIPTION.txt` in this repo. |
| **App icon** | 512×512 PNG (no transparency). Use your final icon. |
| **Feature graphic** | 1024×500 PNG or JPEG. |
| **Screenshots** | At least 2 phone screenshots (e.g. 1080×1920 or 1440×2560). Add 7-inch and 10-inch if you support tablets. |

---

## 6. App content (other)

- **App content** → complete any other required items, e.g.:
  - **Ads:** No (or Yes if you use ads).
  - **Target audience:** e.g. 18+ or as appropriate.
  - **News app:** No.
  - **COVID-19 contact tracing:** No.
  - **Data safety:** Already done in step 3.

---

## 7. Release

- **Release** → **Production** (or **Testing** first).
- Create a new release, upload the **AAB** from EAS (`eas build -p android --profile production`).
- Set **Release name** (e.g. `1.0.0 (1)`).
- Add **Release notes** (e.g. “Initial release.”).
- Review and roll out.

---

## Quick checklist

- [ ] App created in Play Console  
- [ ] Privacy policy URL set  
- [ ] Data safety form submitted  
- [ ] Content rating questionnaire completed  
- [ ] Main store listing: short + full description, icon, feature graphic, screenshots  
- [ ] Other app content items completed  
- [ ] Production release created with AAB and rolled out  
