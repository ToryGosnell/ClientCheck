# ClientCheck Mobile Testing Guide

Complete end-to-end testing procedures for iOS and Android devices using Expo Go.

---

## Prerequisites

- [ ] Expo Go installed on iOS device (from App Store)
- [ ] Expo Go installed on Android device (from Google Play)
- [ ] Backend server running: `npm run dev:server`
- [ ] Metro bundler running: `npm run dev:metro`
- [ ] Test data loaded in database

---

## Test Environment Setup

### 1. Generate QR Code
```bash
cd /path/to/clientcheck-finalization
npm run qr
```

This generates a QR code that you can scan with Expo Go.

### 2. Connect Devices
1. Open Expo Go on iOS or Android
2. Tap the QR scanner icon (camera)
3. Scan the QR code from your terminal
4. App will load on device

---

## Test Data Setup

Before testing, load sample data:

```bash
mysql -u clientcheck -pclientcheck clientcheck << 'EOF'
-- Test Contractors
INSERT INTO contractors (id, name, email, phone, trade, location_city, location_state, verified, reputation_score) VALUES
(1, 'Sarah Williams', 'sarah@example.com', '5125550001', 'electrician', 'Austin', 'TX', true, 95),
(2, 'Mike Johnson', 'mike@example.com', '5125550002', 'plumber', 'Austin', 'TX', true, 88),
(3, 'Lisa Chen', 'lisa@example.com', '5125550003', 'hvac', 'Austin', 'TX', false, 75);

-- Test Customers
INSERT INTO customers (id, name, phone, location_city, location_state, risk_score, verified) VALUES
(1, 'John Doe', '5125550101', 'Austin', 'TX', 35, false),
(2, 'Jane Smith', '5125550102', 'Austin', 'TX', 65, false),
(3, 'Bob Johnson', '5125550103', 'Austin', 'TX', 88, true);

-- Test Reviews
INSERT INTO reviews (id, contractor_id, customer_id, payment_reliability, communication, scope_management, property_respect, comment, created_at) VALUES
(1, 1, 1, 4, 5, 3, 4, 'Great work, paid on time', NOW()),
(2, 2, 2, 3, 3, 2, 3, 'Some scope creep issues', NOW()),
(3, 3, 3, 5, 5, 5, 5, 'Excellent contractor', NOW());
EOF
```

---

## Test Scenarios

### Scenario 1: App Launch & Navigation

**Steps:**
1. Open Expo Go
2. Scan QR code
3. Wait for app to load

**Expected Results:**
- [ ] App loads within 3 seconds
- [ ] No crash on startup
- [ ] All tabs visible in tab bar
- [ ] Home tab is active by default

**Devices to Test:**
- [ ] iPhone 12 or newer (iOS 15+)
- [ ] iPhone 8 (iOS 15+)
- [ ] Pixel 6 or newer (Android 12+)
- [ ] Pixel 4 (Android 12+)

---

### Scenario 2: Home Screen

**Steps:**
1. Tap Home tab
2. Scroll through feed
3. Observe customer cards

**Expected Results:**
- [ ] Feed loads with customer cards
- [ ] Each card shows: name, location, risk score, review count
- [ ] Risk score color-coded (red/yellow/green)
- [ ] Scrolling is smooth (60 FPS)
- [ ] No layout shifts

**Devices to Test:**
- [ ] iOS (portrait)
- [ ] Android (portrait)

---

### Scenario 3: Search Tab

**Steps:**
1. Tap Search tab
2. Enter customer name: "John Doe"
3. Observe results
4. Tap on customer card
5. View customer profile

**Expected Results:**
- [ ] Search results appear within 1 second
- [ ] Results filtered correctly
- [ ] Customer profile loads
- [ ] All reviews visible
- [ ] Risk score displayed
- [ ] Red flags listed

**Test Cases:**
- [ ] Search by name: "John Doe"
- [ ] Search by phone: "5125550101"
- [ ] Search by city: "Austin"
- [ ] Search with no results
- [ ] Search with special characters

---

### Scenario 4: Add Review Flow

**Steps:**
1. Tap "Add Review" button
2. Search for customer: "Jane Smith"
3. Select "Detailed Mode"
4. Rate all 6 categories (1-5 stars)
5. Select 2-3 red flags
6. Add comment: "Good communication"
7. Tap "Submit Review"

**Expected Results:**
- [ ] Customer search works
- [ ] Rating interface responsive
- [ ] All 6 categories ratable
- [ ] Red flags selectable
- [ ] Comment input works
- [ ] Submit button enabled
- [ ] Review saved to database
- [ ] Success message shown
- [ ] Risk score recalculated

**Test Cases:**
- [ ] All 5-star review
- [ ] All 1-star review
- [ ] Mixed ratings
- [ ] No comment
- [ ] Long comment (500+ chars)
- [ ] Special characters in comment

---

### Scenario 5: Quick Review Mode

**Steps:**
1. Tap "Add Review" button
2. Search for customer
3. Select "Quick Mode"
4. Rate 3 quick questions
5. Tap "Submit Review"

**Expected Results:**
- [ ] Quick mode loads
- [ ] 3 questions displayed
- [ ] Each question has 1-5 star rating
- [ ] Submit works
- [ ] Review saved
- [ ] Risk score updated

---

### Scenario 6: Photo Upload

**Steps:**
1. In Add Review, tap "Add Photo" button
2. Select "Camera" or "Gallery"
3. Take/select photo
4. Confirm selection
5. Submit review

**Expected Results:**
- [ ] Camera permission requested (iOS/Android)
- [ ] Photo picker opens
- [ ] Selected photo displays
- [ ] Photo uploads with review
- [ ] Photo appears in review details

**Test Cases:**
- [ ] Camera capture
- [ ] Gallery selection
- [ ] Large photo (5MB+)
- [ ] Multiple photos
- [ ] Cancel photo selection

---

### Scenario 7: Risk Score Display

**Steps:**
1. View customer profile
2. Observe risk score
3. Check risk level badge
4. View risk factors breakdown

**Expected Results:**
- [ ] Risk score displays (0-100)
- [ ] Color-coded correctly:
  - [ ] 0-39: Red (HIGH RISK)
  - [ ] 40-69: Yellow (MEDIUM RISK)
  - [ ] 70-100: Green (LOW RISK)
- [ ] Risk factors breakdown visible
- [ ] Payment reliability percentage shown
- [ ] Dispute count shown
- [ ] No-show count shown

---

### Scenario 8: My Reviews Tab

**Steps:**
1. Tap "My Reviews" tab
2. Observe your submitted reviews
3. Tap on a review
4. View review details

**Expected Results:**
- [ ] All submitted reviews listed
- [ ] Each review shows: customer, rating, date
- [ ] Reviews sorted by date (newest first)
- [ ] Tap opens review details
- [ ] Can edit review (if allowed)
- [ ] Can delete review (if allowed)

---

### Scenario 9: Profile Tab

**Steps:**
1. Tap "Profile" tab
2. View contractor information
3. Scroll down to see sections
4. Tap "Achievements"
5. Tap "Contractors"
6. Tap "Settings"

**Expected Results:**
- [ ] Profile loads with contractor info
- [ ] Name, trade, location displayed
- [ ] Verification badge shown (if verified)
- [ ] Review count shown
- [ ] Rating shown
- [ ] Achievements section accessible
- [ ] Contractors directory accessible
- [ ] Settings accessible

---

### Scenario 10: Call Detection (Android Only)

**Steps:**
1. Open app on Android device
2. Have someone call your number
3. When call arrives, observe overlay
4. Verify customer details shown
5. Tap "Quick Review" button
6. Submit review
7. Tap "Accept" or "Decline"

**Expected Results:**
- [ ] Call detection overlay appears within 1 second
- [ ] Customer name displayed
- [ ] Risk score displayed with color
- [ ] Top 3 red flags shown
- [ ] Payment reliability percentage shown
- [ ] Quick review button works
- [ ] Accept/Decline buttons work
- [ ] Block number option available
- [ ] Mark as spam option available

**Note:** iOS has limited call detection due to Apple's CallKit restrictions.

---

### Scenario 11: Dispute/Appeal Flow

**Steps:**
1. Find a review you want to dispute
2. Tap "Dispute" button
3. Select dispute reason
4. Add explanation
5. Tap "Submit Dispute"
6. Complete payment with test card: 4242 4242 4242 4242

**Expected Results:**
- [ ] Dispute form loads
- [ ] Reason dropdown works
- [ ] Explanation text input works
- [ ] Payment form appears
- [ ] Stripe payment processes
- [ ] Dispute saved to database
- [ ] Confirmation message shown
- [ ] Admin notified

---

### Scenario 12: Verification Workflow

**Steps:**
1. Tap "Profile" tab
2. Scroll to "Verification"
3. Tap "Start Verification"
4. Upload ID document
5. Upload license document
6. Upload insurance certificate
7. Tap "Submit for Verification"

**Expected Results:**
- [ ] Verification form loads
- [ ] Document picker works
- [ ] Photos can be taken or selected
- [ ] All 3 documents uploadable
- [ ] Submit button enabled when all docs provided
- [ ] Submission succeeds
- [ ] Status shows "Pending Review"
- [ ] Admin notified

---

### Scenario 13: Dark Mode

**Steps:**
1. Tap "Profile" tab
2. Scroll to "Settings"
3. Toggle "Dark Mode"
4. Observe UI changes
5. Navigate to other tabs
6. Return to Profile

**Expected Results:**
- [ ] Dark mode toggle works
- [ ] Colors change appropriately
- [ ] Text remains readable
- [ ] All screens support dark mode
- [ ] Toggle persists after app restart

---

### Scenario 14: Notifications

**Steps:**
1. Submit a review
2. Wait for notification
3. Tap notification
4. Verify it opens correct screen

**Expected Results:**
- [ ] Notification appears after review submission
- [ ] Notification includes review details
- [ ] Tapping notification opens review details
- [ ] Notification sound plays (if enabled)
- [ ] Notification badge shows count

---

### Scenario 15: Offline Behavior

**Steps:**
1. Open app
2. Turn off WiFi and cellular
3. Try to submit review
4. Observe error handling
5. Turn WiFi back on
6. Retry submission

**Expected Results:**
- [ ] App detects offline status
- [ ] Error message shown
- [ ] Retry button available
- [ ] Submission succeeds when online
- [ ] No data loss

---

### Scenario 16: Performance Testing

**Steps:**
1. Open app and measure startup time
2. Perform search and measure response time
3. Submit review and measure processing time
4. Scroll through long lists
5. Monitor memory usage

**Expected Results:**
- [ ] Startup time: < 3 seconds
- [ ] Search response: < 1 second
- [ ] Review submission: < 2 seconds
- [ ] List scrolling: Smooth (60 FPS)
- [ ] Memory usage: < 150MB
- [ ] No memory leaks after 10 minutes of use

**Tools:**
- iOS: Xcode Instruments (Memory, CPU, Energy)
- Android: Android Studio Profiler (Memory, CPU, Battery)

---

### Scenario 17: Permissions

**Steps:**
1. First app launch
2. Observe permission prompts
3. Deny each permission
4. Re-grant permissions
5. Verify functionality

**Expected Results:**
- [ ] Camera permission prompt appears when needed
- [ ] Microphone permission prompt appears when needed
- [ ] Phone state permission prompt appears (Android)
- [ ] Notifications permission prompt appears
- [ ] Denying permissions shows graceful fallback
- [ ] Re-granting permissions restores functionality

**iOS Permissions:**
- [ ] Camera
- [ ] Microphone
- [ ] Notifications

**Android Permissions:**
- [ ] CAMERA
- [ ] RECORD_AUDIO
- [ ] READ_PHONE_STATE
- [ ] POST_NOTIFICATIONS

---

### Scenario 18: Orientation Changes

**Steps:**
1. Open app in portrait
2. Rotate device to landscape
3. Verify layout adjusts
4. Rotate back to portrait
5. Test on all major screens

**Expected Results:**
- [ ] Layout adjusts correctly
- [ ] No content cut off
- [ ] Text remains readable
- [ ] Buttons remain accessible
- [ ] Scroll position maintained

---

### Scenario 19: Memory & Battery

**Steps:**
1. Open app
2. Monitor for 30 minutes of active use
3. Check memory usage
4. Check battery drain
5. Check for memory leaks

**Expected Results:**
- [ ] Memory usage stable (< 150MB)
- [ ] No memory leaks
- [ ] Battery drain < 5% per hour
- [ ] No excessive CPU usage
- [ ] Smooth animations (60 FPS)

---

### Scenario 20: Error Handling

**Steps:**
1. Simulate network error
2. Simulate database error
3. Simulate API timeout
4. Observe error messages
5. Verify recovery

**Expected Results:**
- [ ] Error messages are clear
- [ ] Retry buttons available
- [ ] No app crashes
- [ ] Graceful degradation
- [ ] User can recover

---

## Bug Report Template

When you find a bug, document it with:

```
**Title:** [Brief description]

**Device:** [iPhone 12 iOS 16 / Pixel 6 Android 13]

**Steps to Reproduce:**
1. [First step]
2. [Second step]
3. [Third step]

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshots/Video:**
[Attach if possible]

**Severity:** [Critical / High / Medium / Low]

**Additional Notes:**
[Any other relevant information]
```

---

## Performance Benchmarks

Target metrics for production:

| Metric | Target | Acceptable | Needs Work |
|--------|--------|-----------|-----------|
| Startup Time | < 2s | < 3s | > 3s |
| Search Response | < 500ms | < 1s | > 1s |
| Review Submit | < 1s | < 2s | > 2s |
| List Scroll FPS | 60 | 55+ | < 55 |
| Memory Usage | < 100MB | < 150MB | > 150MB |
| Battery Drain | < 3%/hr | < 5%/hr | > 5%/hr |

---

## Sign-Off

When all scenarios pass, sign off:

- [ ] iOS testing complete (all scenarios passed)
- [ ] Android testing complete (all scenarios passed)
- [ ] No critical bugs found
- [ ] Performance meets targets
- [ ] All permissions working
- [ ] Dark mode working
- [ ] Offline handling working
- [ ] Notifications working
- [ ] Ready for production

**Tested By:** _______________
**Date:** _______________
**Notes:** _______________

---

## Next Steps

1. Fix any bugs found
2. Re-test fixed scenarios
3. Get sign-off from QA team
4. Deploy to production
5. Monitor crash reports
6. Collect user feedback
