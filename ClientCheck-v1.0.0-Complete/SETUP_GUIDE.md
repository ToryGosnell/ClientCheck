# ClientCheck Setup Guide

Complete step-by-step instructions to configure Stripe payments, email service, and voice recording.

---

## Part 1: Stripe Payment Integration (15-20 minutes)

### Step 1.1: Create Stripe Account
1. Go to [stripe.com](https://stripe.com)
2. Click "Sign up" in the top right
3. Enter your email, password, and business details
4. Verify your email address
5. Complete your business profile (you'll need business name, address, phone)

### Step 1.2: Get Stripe API Keys
1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click "Developers" in the left sidebar
3. Click "API keys" under the Developers menu
4. You'll see two keys:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)
5. Copy both keys (you'll need them in the next step)

### Step 1.3: Add Stripe Keys to Environment Variables
1. Open the Management UI in your browser (click the Settings icon)
2. Go to **Secrets** panel
3. Click "Add Secret" or find the existing Stripe fields
4. Add these two secrets:

| Secret Name | Value | Example |
|---|---|---|
| `STRIPE_SECRET_KEY` | Paste your Secret key from Step 1.2 | `sk_test_...` (from Stripe Dashboard) |
| `STRIPE_PUBLISHABLE_KEY` | Paste your Publishable key from Step 1.2 | `pk_test_...` (from Stripe Dashboard) |

5. Click "Save" for each secret

### Step 1.4: Verify Stripe Integration
1. In the Management UI, go to **Preview** to see the app
2. Navigate to the Subscription screen
3. You should see pricing: Monthly ($9.99) and Annual ($100)
4. The "Upgrade Now" button should now be functional (test with Stripe test card)

### Step 1.5: Test Stripe Payments (Optional)
Use Stripe's test card numbers to verify payments work:

| Card Type | Card Number | Expiry | CVC |
|---|---|---|---|
| Visa (Success) | `4242 4242 4242 4242` | `12/25` | `123` |
| Visa (Decline) | `4000 0000 0000 0002` | `12/25` | `123` |
| Mastercard (Success) | `5555 5555 5555 4444` | `12/25` | `123` |

**Note:** Only use these test cards in development. They won't charge real money.

---

## Part 2: Email Service Setup (20-30 minutes)

### Step 2.1: Choose Email Provider

You have two options:

**Option A: Gmail (Free, Easy)**
- Best for: Testing and small-scale use
- Setup time: 5 minutes

**Option B: SendGrid/Mailgun (Recommended for Production)**
- Best for: Production, high volume, better deliverability
- Setup time: 15-20 minutes

### Step 2.2A: Gmail Setup (Easy Option)

1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable "2-Step Verification" (if not already enabled)
3. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
4. Select "Mail" and "Windows Computer" (or your device)
5. Google will generate a 16-character password - **copy this**
6. Add these environment variables to your Management UI Secrets:

| Secret Name | Value | Example |
|---|---|---|
| `SMTP_HOST` | `smtp.gmail.com` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` | `587` |
| `SMTP_USER` | Your Gmail address | `yourname@gmail.com` |
| `SMTP_PASSWORD` | The 16-char password from Google | `abcd efgh ijkl mnop` |
| `EMAIL_FROM` | Your Gmail address | `yourname@gmail.com` |

### Step 2.2B: SendGrid Setup (Production Option)

1. Go to [sendgrid.com](https://sendgrid.com) and sign up
2. Verify your email and complete account setup
3. Go to [app.sendgrid.com/settings/api_keys](https://app.sendgrid.com/settings/api_keys)
4. Click "Create API Key"
5. Name it "ClientCheck" and select "Full Access"
6. Copy the API key
7. Add these environment variables:

| Secret Name | Value | Example |
|---|---|---|
| `SMTP_HOST` | `smtp.sendgrid.net` | `smtp.sendgrid.net` |
| `SMTP_PORT` | `587` | `587` |
| `SMTP_USER` | `apikey` | `apikey` |
| `SMTP_PASSWORD` | Your SendGrid API key | `SG.1234567890abcdefghijk...` |
| `EMAIL_FROM` | Your sender email | `noreply@clientcheck.app` |

### Step 2.3: Add Email Variables to Management UI

1. Open Management UI → **Secrets** panel
2. Add each environment variable from your chosen provider (Step 2.2A or 2.2B)
3. Click "Save" for each one

### Step 2.4: Test Email Service

1. Go to the Subscription screen in the app preview
2. The app will automatically check if email is configured
3. If configured correctly, you'll see: ✅ "Email service ready"
4. If not configured: ⚠️ "Email service not configured"

### Step 2.5: Verify Trial Reminders Work

Trial reminder emails will be sent automatically:
- **Day 87 of trial**: Card prompt email sent
- **Day 3 before expiration**: Trial expiring reminder email sent
- **On expiration**: Trial expired notification email sent

Check your email inbox for test emails (they'll come from the `EMAIL_FROM` address).

---

## Part 3: Voice Recording Setup (10-15 minutes)

### Step 3.1: Install Voice Packages

1. Open a terminal in your project directory:
   ```bash
   cd /home/ubuntu/clientcheck
   ```

2. Install the required packages:
   ```bash
   pnpm add expo-speech react-native-voice
   ```

3. Wait for installation to complete (2-3 minutes)

### Step 3.2: Update app.config.ts (Already Done ✅)

The microphone permissions are already configured in `app.config.ts`:
- iOS: `NSMicrophoneUsageDescription` ✅
- Android: `RECORD_AUDIO` permission ✅

No additional changes needed!

### Step 3.3: Test Voice Recording

1. In the Management UI, go to **Preview**
2. Navigate to "Add Review" screen
3. Look for the 🎤 **Microphone icon** button
4. Tap it to start recording (3-second mock recording)
5. After 3 seconds, you'll see a mock transcript like:
   - "This customer was great to work with. Paid on time..."
   - "Had some issues with scope creep..."
   - "Terrible experience. Customer was rude..."

### Step 3.4: Enable Real Speech-to-Text (Optional)

For production, to use actual voice recognition instead of mock transcripts:

1. Update `lib/voice-service.ts`:
   ```typescript
   // Replace the mock implementation with:
   import * as Speech from "expo-speech";
   import Voice from "react-native-voice";
   
   // Then implement actual recording using Voice API
   ```

2. Test on a real device with microphone permission granted

### Step 3.5: Verify Permissions on Devices

**iOS:**
- First time user taps microphone: iOS will ask "Allow ClientCheck to access your microphone?"
- User must tap "Allow"

**Android:**
- First time user taps microphone: Android will ask for RECORD_AUDIO permission
- User must tap "Allow"

---

## Part 4: Verify Everything Works (5-10 minutes)

### Checklist

Go through each item and verify:

- [ ] **Stripe**: 
  - [ ] `STRIPE_SECRET_KEY` is set
  - [ ] `STRIPE_PUBLISHABLE_KEY` is set
  - [ ] Subscription screen shows pricing
  - [ ] "Upgrade Now" button is clickable

- [ ] **Email Service**:
  - [ ] `SMTP_HOST` is set
  - [ ] `SMTP_USER` is set
  - [ ] `SMTP_PASSWORD` is set
  - [ ] `EMAIL_FROM` is set
  - [ ] Check email inbox for test emails

- [ ] **Voice Recording**:
  - [ ] `expo-speech` package installed
  - [ ] `react-native-voice` package installed
  - [ ] Microphone button appears in Add Review screen
  - [ ] Tapping microphone shows mock transcript

### Troubleshooting

| Issue | Solution |
|---|---|
| Stripe keys not working | Verify you copied the entire key (no spaces at start/end) |
| Email not sending | Check SMTP credentials are correct, try Gmail first |
| Voice button not appearing | Restart dev server: `pnpm dev` |
| Permissions not showing | Rebuild app: Clear cache and restart |

---

## Part 5: Production Checklist

Before publishing to App Stores:

- [ ] All 3 parts (Stripe, Email, Voice) are configured
- [ ] Test payment with Stripe test card works
- [ ] Test email delivery (check inbox)
- [ ] Test voice recording on real iOS device
- [ ] Test voice recording on real Android device
- [ ] Trial reminder emails send on day 87
- [ ] Trial expired email sends on expiration day
- [ ] All permissions are granted on first app launch
- [ ] Privacy Policy and Terms are up to date
- [ ] DMCA process is tested

---

## Estimated Time to Complete

| Task | Time |
|---|---|
| Part 1: Stripe Setup | 15-20 min |
| Part 2: Email Setup | 20-30 min |
| Part 3: Voice Setup | 10-15 min |
| Part 4: Verification | 5-10 min |
| **Total** | **50-75 minutes** |

---

## Need Help?

- **Stripe Issues**: [Stripe Documentation](https://stripe.com/docs)
- **Email Issues**: [Gmail App Passwords](https://support.google.com/accounts/answer/185833) or [SendGrid Setup](https://docs.sendgrid.com/for-developers/sending-email/quickstart-nodejs)
- **Voice Issues**: [Expo Speech Docs](https://docs.expo.dev/versions/latest/sdk/speech/) or [React Native Voice Docs](https://github.com/react-native-voice/react-native-voice)
- **General**: Contact support@clientcheck.app

---

## Next Steps After Setup

1. **Test on Real Devices**: Scan QR code with Expo Go on iOS and Android
2. **Verify Call Detection**: Make a test call to verify incoming call overlay works
3. **Test Payment Flow**: Complete a test payment with Stripe test card
4. **Monitor Emails**: Check that trial reminders send on schedule
5. **Publish to App Stores**: Once all testing is complete

Good luck! 🚀
