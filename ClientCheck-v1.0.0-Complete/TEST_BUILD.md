# Test the production build

Run these steps to confirm the app builds and works before publishing.

---

## 1. Build the Android App Bundle

From the project root (with Node/npm or pnpm available):

```bash
npm install
npx expo install --fix
eas build -p android --profile production
```

Or with pnpm:

```bash
pnpm install
npx expo install --fix
eas build -p android --profile production
```

- If prompted, log in: `eas login`.
- Wait for the build to finish on EAS (link appears in the terminal).
- Download the **AAB** from the build page when it’s done.

---

## 2. Install and run on a device

**Option A – Internal testing (recommended first)**  
- In Play Console: **Release** → **Testing** → **Internal testing** → create a release and upload the AAB.  
- Add testers by email.  
- Install from the internal testing link on a real Android device.

**Option B – Local install**  
- Build an APK for testing: in `eas.json` you can add a `preview` profile with `"buildType": "apk"`, then run `eas build -p android --profile preview`, and install the APK on a device.

---

## 3. What to test on the device

- [ ] **Login / sign-up** – Auth and session work.
- [ ] **Search** – Customer search loads and shows results (app can reach API; `EXPO_PUBLIC_API_BASE_URL` is set).
- [ ] **Add review** – Submit a review (with or without photos).
- [ ] **Subscription** – Open subscription screen; payment flow (test card if Stripe test mode).
- [ ] **Pre-job risk check** – Open the risk-check flow and confirm it loads.
- [ ] **Permissions** – Deny photo/camera when asked; app doesn’t crash and degrades gracefully.

---

## 4. If the build fails

- Run `npm run check` (or `pnpm check`) and fix TypeScript errors.
- Run `npx expo install --fix` to align Expo package versions.
- Confirm **EAS Production** env has at least `EXPO_PUBLIC_API_BASE_URL` set.
- Check the build logs on the EAS build page for the exact error.

---

## 5. When everything passes

- Use the same AAB (or a new production build with a higher `versionCode`) for **Production** in Play Console.
- Complete **Play Console setup** (see `play-store/PLAY_CONSOLE_SETUP.md`).
- Submit the release for review.
