# ClientCheck Testing Guide

Welcome! This guide will help you test all the features of ClientCheck before publishing. You can test the app in multiple ways depending on your device and preferences.

## Quick Start

### Option 1: Web Preview (Instant, No Setup)
1. Click the **Preview** button in the Management UI (right panel)
2. The app will load in your browser
3. **Limitation**: Call detection won't work on web, but all other features are testable

### Option 2: Expo Go on Physical Device (Recommended)
1. **Download Expo Go**:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Scan QR Code**:
   - Open Expo Go app
   - Tap the QR scanner icon (camera icon)
   - Scan the QR code from the Management UI
   - App will load on your device

3. **Test Call Detection** (Android):
   - Make a test call to your device
   - The call detection overlay should appear
   - ✅ Works on Android with READ_PHONE_STATE permission
   - ⚠️ Limited on iOS (CallKit restrictions)

---

## Feature Testing Checklist

### 1. Core Navigation
- [ ] **Home Screen**: Displays feed, flagged customers, recent reviews
- [ ] **Search Screen**: Can search by name, phone, city
- [ ] **My Reviews Tab**: Shows your submitted reviews
- [ ] **Alerts Tab**: Displays community high-risk list
- [ ] **Profile Tab**: Shows contractor details
- [ ] **Tab Bar**: All 5 tabs navigate correctly

### 2. Customer Profiles & Reviews
- [ ] **Search for Customer**: Find a customer by name or phone
- [ ] **View Customer Profile**: See customer details, ratings, reviews
- [ ] **Add Review**: Submit a new review with ratings and red flags
- [ ] **Quick Review Mode**: Fast 3-question review (4 steps)
- [ ] **Detailed Mode**: Full review form with all categories
- [ ] **Photo Upload**: Add photos to review (if camera available)
- [ ] **Red Flag Selection**: Choose from predefined red flags

### 3. Call Detection (Android Only)
- [ ] **Incoming Call**: When a call arrives, overlay should appear
- [ ] **Customer Lookup**: Shows customer name, phone, score
- [ ] **Client Score**: Color-coded badge (Black/Red/Yellow/Green)
- [ ] **Red Flags**: Displays top 3 red flags from reviews
- [ ] **Payment Reliability**: Shows payment history percentage
- [ ] **Accept/Decline**: Can accept or decline the call
- [ ] **Quick Review**: Can submit review directly from call overlay
- [ ] **Block Number**: Option to block caller
- [ ] **Mark as Spam**: Option to report spam

### 4. Gamification Features
- [ ] **Achievements Screen**: Navigate to achievements tab
- [ ] **Unlock Badges**: Submit reviews to unlock achievement badges
  - 10 reviews → "First 10 Reviews"
  - 50 reviews → "Prolific Vetter"
  - 100 reviews → "Master Vetter"
- [ ] **Streak Counter**: Shows current day streak
- [ ] **Progress Bars**: Locked achievements show progress
- [ ] **Referral Section**: Can see referral code and invite option

### 5. Contractor Network
- [ ] **Contractor Directory**: View list of verified contractors
- [ ] **Search Contractors**: Filter by name or trade
- [ ] **Trade Filter**: Filter contractors by trade (Electrician, Plumber, etc.)
- [ ] **Sort Options**: Sort by reputation, rating, or review count
- [ ] **Contractor Cards**: Shows name, trade, location, rating, verification status
- [ ] **Reputation Score**: Displays contractor reputation score (0-100)

### 6. Customer Intelligence Dashboard
- [ ] **Risk Timeline**: View customer's risk events over time
- [ ] **Payment Patterns**: See average payment time and delays
- [ ] **Scope Creep Risk**: Shows risk level and average additional costs
- [ ] **Custom Alerts**: Can enable/disable alerts for this customer
- [ ] **Multiple Tabs**: Timeline, Patterns, and Alerts tabs work

### 7. Subscription & Licensing
- [ ] **Trial Status**: Shows 90-day free trial countdown
- [ ] **Subscription Screen**: Can view subscription options
- [ ] **Licenses Screen**: Shows all 18 available libraries
- [ ] **Payment Flow**: Can initiate payment (test mode)

### 8. Verification & Compliance
- [ ] **Verification Screen**: Can submit ID, license, insurance documents
- [ ] **Privacy Policy**: Full privacy policy accessible
- [ ] **Terms of Service**: Full terms accessible
- [ ] **DMCA Takedown**: Can file DMCA complaint

---

## Sample Data for Testing

### Test Customer #1: Problem Customer
- **Name**: John Doe
- **Phone**: (512) 555-0001
- **Client Score**: 35 (High Risk - Black)
- **Red Flags**: Payment Issues, Scope Creep, Disputes
- **Payment Reliability**: 40%
- **Reviews**: 8 negative reviews

### Test Customer #2: Average Customer
- **Name**: Jane Smith
- **Phone**: (512) 555-0002
- **Client Score**: 65 (Caution - Yellow)
- **Red Flags**: Occasional scope creep
- **Payment Reliability**: 75%
- **Reviews**: 5 mixed reviews

### Test Customer #3: Good Customer
- **Name**: Bob Johnson
- **Phone**: (512) 555-0003
- **Client Score**: 88 (Safe - Green)
- **Red Flags**: None
- **Payment Reliability**: 95%
- **Reviews**: 12 positive reviews

### Test Contractor #1: Top Vetter
- **Name**: Sarah Williams
- **Trade**: Electrician
- **Location**: Austin, TX
- **Rating**: 4.9/5
- **Reviews**: 42
- **Verified**: ✓
- **Reputation Score**: 95

---

## Step-by-Step Test Scenarios

### Scenario 1: Complete a Full Review
1. Open the app
2. Go to **Home** tab
3. Tap **+ Add Review** button
4. Search for a customer (or create new)
5. Choose **Detailed Mode**
6. Rate all 6 categories (1-5 stars each)
7. Select 2-3 red flags
8. Add a comment (optional)
9. Add a photo (optional)
10. Tap **Submit Review**
11. Verify review appears in **My Reviews** tab

### Scenario 2: Test Call Detection (Android)
1. Open the app on Android device
2. Have someone call your number (or use another device)
3. When call arrives, overlay should appear
4. Verify customer details display correctly
5. Tap **Quick Review** button
6. Rate the customer (1-5 stars)
7. Select red flags
8. Tap **Submit Review**
9. Verify review was submitted

### Scenario 3: Search & Filter
1. Go to **Search** tab
2. Type a customer name
3. Apply risk level filter (High/Medium/Low)
4. Apply verification filter
5. Verify results update correctly
6. Tap a customer to view full profile

### Scenario 4: View Achievements
1. Go to **Profile** tab
2. Scroll down and tap **Achievements**
3. Verify unlocked badges display
4. Verify progress bars show for locked badges
5. Verify referral section shows

### Scenario 5: Explore Contractor Network
1. Go to **Profile** tab
2. Scroll down and tap **Contractors**
3. Use search to find contractors
4. Filter by trade
5. Sort by reputation/rating/reviews
6. Verify contractor cards display correctly

---

## Troubleshooting

### Call Detection Not Working
- **Android**: Check that `READ_PHONE_STATE` permission is granted
  - Settings → Apps → ClientCheck → Permissions → Phone
- **iOS**: Limited by Apple's CallKit restrictions (expected behavior)
- **Web**: Call detection not available on web (expected)

### Reviews Not Saving
- Check internet connection
- Verify you're logged in
- Check browser console for errors (web only)
- Try restarting the app

### Photos Not Uploading
- Check camera/gallery permissions
- Verify file size is under 5MB
- Check internet connection
- Try a different photo

### App Crashes on Startup
- Clear app cache: Settings → Apps → ClientCheck → Storage → Clear Cache
- Restart the app
- Reinstall from Expo Go

### Performance Issues
- Close other apps to free up memory
- Restart your device
- Update Expo Go to latest version

---

## Performance Metrics to Check

- **App Startup Time**: Should load in < 3 seconds
- **Search Performance**: Results should appear in < 1 second
- **Review Submission**: Should complete in < 2 seconds
- **Call Detection Latency**: Overlay should appear within 1 second of incoming call

---

## Known Limitations

1. **iOS Call Detection**: Apple's CallKit restrictions prevent full call detection on iOS. Overlay may not appear for all incoming calls.

2. **Web Platform**: Call detection, camera, and some native features don't work on web.

3. **Database Migrations**: Some new tables (achievements, streaks, etc.) are in schema but not yet migrated. Mock data is used for testing.

4. **Payment Processing**: Stripe integration is in test mode. Use test card: `4242 4242 4242 4242`

5. **Photo Storage**: Photos are stored locally for now. S3 integration needed for production.

---

## Reporting Issues

When testing, note:
- **What you were doing** when the issue occurred
- **What you expected to happen**
- **What actually happened**
- **Device & OS** (iPhone 14 iOS 17, Pixel 7 Android 14, etc.)
- **App version** (visible in Profile tab)
- **Screenshots or videos** if helpful

---

## Next Steps After Testing

1. ✅ Test all features on your device
2. ✅ Note any bugs or UX issues
3. ✅ Share feedback on viral features
4. ✅ Request any additional features
5. ✅ When ready, click **Publish** in Management UI to generate APK/IPA

---

## Questions?

If you encounter any issues or have questions during testing, let me know and I'll help troubleshoot!

**Happy testing! 🚀**
