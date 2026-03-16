# ClientCheck Production Finalization Checklist

Complete this checklist before deploying to Google Play Store and App Store. This document provides step-by-step instructions for validating the entire platform against real infrastructure.

---

## Phase 1: Database Migrations & Schema Validation

### 1.1 Local MySQL Setup
- [ ] Install MySQL 8.0+ locally
- [ ] Create database: `mysql -u root -e "CREATE DATABASE clientcheck;"`
- [ ] Create user with credentials:
  ```sql
  CREATE USER 'clientcheck'@'localhost' IDENTIFIED BY 'clientcheck';
  GRANT ALL PRIVILEGES ON clientcheck.* TO 'clientcheck'@'localhost';
  FLUSH PRIVILEGES;
  ```

### 1.2 Run Database Migrations
```bash
cd /path/to/clientcheck-finalization
export DATABASE_URL="mysql://clientcheck:clientcheck@localhost:3306/clientcheck"
npm run db:generate  # Generate migration files from schema
npm run db:migrate   # Apply migrations to database
```

**Expected Output:**
```
✓ Generated migration: drizzle/0001_initial_schema.sql
✓ Applied migration: 0001_initial_schema.sql
✓ Database schema up to date
```

### 1.3 Validate Schema Tables
Verify all 40+ tables were created:

```bash
mysql -u clientcheck -pclientcheck clientcheck -e "SHOW TABLES;"
```

**Expected Tables (minimum):**
- `contractors` - Contractor profiles
- `customers` - Customer profiles
- `reviews` - Customer reviews
- `disputes` - Dispute records
- `risk_scores` - Customer risk calculations
- `contractor_industries` - Industry specialization
- `verification_tokens` - Email verification
- `audit_logs` - Audit trail
- `rate_limits` - Rate limiting
- `notifications` - Notification history
- `stripe_events` - Webhook events
- `integrations` - Third-party connections
- `customer_identities` - Duplicate detection
- `fraud_signals` - Fraud detection flags
- `subscription_events` - Subscription tracking

### 1.4 Validate Schema Integrity
```bash
mysql -u clientcheck -pclientcheck clientcheck -e "
SELECT TABLE_NAME, COLUMN_COUNT, INDEX_COUNT 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'clientcheck' 
ORDER BY TABLE_NAME;"
```

### 1.5 Test Data Insertion
Insert sample test data to validate constraints:

```bash
mysql -u clientcheck -pclientcheck clientcheck << 'EOF'
-- Test contractor
INSERT INTO contractors (id, name, email, phone, trade, location_city, location_state, verified, reputation_score)
VALUES (1, 'Test Contractor', 'test@example.com', '5125550001', 'electrician', 'Austin', 'TX', true, 95);

-- Test customer
INSERT INTO customers (id, name, phone, location_city, location_state, risk_score, verified)
VALUES (1, 'Test Customer', '5125550002', 'Austin', 'TX', 45, false);

-- Verify insertion
SELECT * FROM contractors;
SELECT * FROM customers;
EOF
```

### 1.6 Backup Database Schema
```bash
mysqldump -u clientcheck -pclientcheck clientcheck > clientcheck_schema_backup.sql
```

---

## Phase 2: Backend API Validation

### 2.1 Start Backend Server
```bash
cd /path/to/clientcheck-finalization
export DATABASE_URL="mysql://clientcheck:clientcheck@localhost:3306/clientcheck"
export NODE_ENV=development
export JWT_SECRET=$(openssl rand -base64 32)
npm run dev:server
```

**Expected Output:**
```
[api] server listening on port 3000
[api] Connected to database
[api] Ready for requests
```

### 2.2 Test Health Endpoint
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-03-14T..."
}
```

### 2.3 Test Core API Endpoints

#### Review Creation
```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "customerId": 1,
    "contractorId": 1,
    "paymentReliability": 4,
    "communication": 5,
    "scopeManagement": 3,
    "propertyRespect": 4,
    "comment": "Great work, paid on time"
  }'
```

**Expected Response:** `201 Created` with review ID

#### Risk Score Calculation
```bash
curl http://localhost:3000/api/customers/1/risk-score
```

**Expected Response:**
```json
{
  "customerId": 1,
  "riskScore": 45,
  "riskLevel": "MEDIUM",
  "factors": {
    "missedPayments": -15,
    "chargebacks": 0,
    "noShows": -10,
    "latePayments": -5,
    "verifiedJobs": 9
  }
}
```

#### Pre-Job Risk Check
```bash
curl "http://localhost:3000/api/customers/search?name=Test%20Customer&phone=5125550002"
```

**Expected Response:**
```json
{
  "customers": [{
    "id": 1,
    "name": "Test Customer",
    "phone": "5125550002",
    "riskScore": 45,
    "riskLevel": "MEDIUM",
    "reviewCount": 5,
    "location": "Austin, TX"
  }]
}
```

### 2.4 Test Authentication
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "contractor@example.com",
    "password": "TestPassword123!",
    "name": "Test Contractor"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "contractor@example.com",
    "password": "TestPassword123!"
  }'
```

### 2.5 Test Error Handling
```bash
# Invalid request
curl -X POST http://localhost:3000/api/reviews \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'

# Expected: 400 Bad Request with error details
```

---

## Phase 3: Mobile App End-to-End Testing

### 3.1 Setup Test Environment
```bash
cd /path/to/clientcheck-finalization
export DATABASE_URL="mysql://clientcheck:clientcheck@localhost:3306/clientcheck"
npm run dev
```

### 3.2 Test on Web Preview
1. Open browser to http://localhost:8081
2. Test each screen:
   - [ ] Home screen loads
   - [ ] Search tab works
   - [ ] Add review flow completes
   - [ ] Risk scores display correctly
   - [ ] Profile tab shows contractor info

### 3.3 Test on Physical Devices (Expo Go)
1. Install Expo Go on iOS and Android devices
2. Run: `npm run qr` to generate QR code
3. Scan QR code in Expo Go app
4. Test on each device:

#### iOS Testing
- [ ] App loads without crashes
- [ ] All tabs navigate correctly
- [ ] Review submission works
- [ ] Photos can be selected from camera roll
- [ ] Permissions prompts appear (microphone, camera)
- [ ] Dark mode toggle works
- [ ] Notifications display correctly

#### Android Testing
- [ ] App loads without crashes
- [ ] All tabs navigate correctly
- [ ] Review submission works
- [ ] Photos can be selected from gallery
- [ ] Call detection overlay appears on incoming call
- [ ] Permissions prompts appear (RECORD_AUDIO, READ_PHONE_STATE)
- [ ] Dark mode toggle works
- [ ] Notifications display correctly

### 3.4 Test Core User Flows

#### Flow 1: Complete Review Submission
1. Open app
2. Tap "Add Review" button
3. Search for customer (use "Test Customer")
4. Select "Detailed Mode"
5. Rate all 6 categories (1-5 stars)
6. Select 2-3 red flags
7. Add optional comment
8. Add optional photo
9. Tap "Submit Review"
10. Verify review appears in "My Reviews" tab
11. Verify risk score updated

**Expected Result:** Review saved, risk score recalculated, notification sent

#### Flow 2: Pre-Job Risk Check
1. Open app
2. Tap "Search" tab
3. Enter customer name or phone
4. View risk score and details
5. Tap customer to view full profile
6. Review all customer reviews
7. Check red flags and payment history

**Expected Result:** Customer details load, all reviews visible, risk score accurate

#### Flow 3: Dispute/Appeal Process
1. Open app
2. Find a review you want to dispute
3. Tap "Dispute" button
4. Fill out dispute form
5. Submit with payment (test Stripe card)
6. Verify dispute appears in moderation queue

**Expected Result:** Dispute created, payment processed, moderation notification sent

#### Flow 4: Contractor Verification
1. Open app
2. Tap "Profile" tab
3. Scroll to "Verification"
4. Upload ID document
5. Upload license document
6. Upload insurance certificate
7. Submit for verification
8. Verify submission appears in admin dashboard

**Expected Result:** Documents uploaded, verification status pending, admin notified

### 3.5 Test Performance Metrics
Measure and record:
- [ ] App startup time: < 3 seconds
- [ ] Search results: < 1 second
- [ ] Review submission: < 2 seconds
- [ ] Risk score calculation: < 500ms
- [ ] List scrolling: Smooth (60 FPS)
- [ ] Memory usage: < 150MB
- [ ] Battery drain: < 5% per hour of active use

---

## Phase 4: Stripe Payment Integration

### 4.1 Create Stripe Test Account
1. Go to https://stripe.com
2. Sign up for account
3. Complete business verification
4. Navigate to Developers → API Keys
5. Copy **Publishable Key** (pk_test_...)
6. Copy **Secret Key** (sk_test_...)

### 4.2 Configure Environment Variables
```bash
export STRIPE_PUBLISHABLE_KEY="pk_test_..."
export STRIPE_SECRET_KEY="sk_test_..."
```

### 4.3 Test Payment Flow (Web)
1. Open app in browser
2. Navigate to Subscription screen
3. Tap "Upgrade Now" button
4. Enter Stripe test card: `4242 4242 4242 4242`
5. Expiry: `12/25`
6. CVC: `123`
7. Tap "Pay"

**Expected Result:** Payment succeeds, subscription activated, confirmation email sent

### 4.4 Test Payment Failures
Test with failure card: `4000 0000 0000 0002`

**Expected Result:** Payment declined, error message shown, subscription not activated

### 4.5 Setup Stripe Webhook Endpoint
1. In Stripe Dashboard, go to Developers → Webhooks
2. Click "Add endpoint"
3. Enter endpoint URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click "Add endpoint"
6. Copy webhook signing secret

### 4.6 Test Webhook Delivery
```bash
# Use Stripe CLI to forward webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger test event
stripe trigger payment_intent.succeeded
```

**Expected Result:**
- Webhook received and logged
- Database updated with event
- Idempotent processing (no duplicates)
- Subscription status synced

### 4.7 Test Subscription Lifecycle
- [ ] Create subscription (monthly)
- [ ] Verify subscription in database
- [ ] Update subscription (to annual)
- [ ] Verify update in database
- [ ] Cancel subscription
- [ ] Verify cancellation in database
- [ ] Verify trial reminder emails sent

---

## Phase 5: Third-Party Integrations

### 5.1 ServiceTitan Integration

#### Setup
1. Create ServiceTitan developer account
2. Register OAuth application
3. Get Client ID and Client Secret
4. Configure redirect URI: `https://your-domain.com/api/oauth/servicetitan/callback`

#### Configuration
```bash
export SERVICETITAN_CLIENT_ID="..."
export SERVICETITAN_CLIENT_SECRET="..."
export SERVICETITAN_REDIRECT_URI="https://your-domain.com/api/oauth/servicetitan/callback"
```

#### Test Flow
1. In app, tap "Connect ServiceTitan"
2. Authorize OAuth flow
3. Verify connection saved in database
4. Test data sync:
   ```bash
   curl http://localhost:3000/api/integrations/servicetitan/sync \
     -H "Authorization: Bearer <JWT_TOKEN>"
   ```
5. Verify customers imported from ServiceTitan

### 5.2 Jobber Integration

#### Setup
1. Create Jobber developer account
2. Register API application
3. Get API Key
4. Configure webhook URL: `https://your-domain.com/api/webhooks/jobber`

#### Configuration
```bash
export JOBBER_API_KEY="..."
export JOBBER_WEBHOOK_URL="https://your-domain.com/api/webhooks/jobber"
```

#### Test Flow
1. In app, tap "Connect Jobber"
2. Enter API key
3. Verify connection saved
4. Test webhook delivery:
   - Create job in Jobber
   - Verify webhook received
   - Verify job synced to ClientCheck

### 5.3 Housecall Pro Integration

#### Setup
1. Create Housecall Pro developer account
2. Register API application
3. Get API Key
4. Configure webhook URL: `https://your-domain.com/api/webhooks/housecall`

#### Configuration
```bash
export HOUSECALL_API_KEY="..."
export HOUSECALL_WEBHOOK_URL="https://your-domain.com/api/webhooks/housecall"
```

#### Test Flow
1. In app, tap "Connect Housecall Pro"
2. Enter API key
3. Verify connection saved
4. Test webhook delivery:
   - Create job in Housecall Pro
   - Verify webhook received
   - Verify job synced to ClientCheck

### 5.4 Integration Webhook Testing
```bash
# Test webhook signature verification
curl -X POST http://localhost:3000/api/webhooks/servicetitan \
  -H "Content-Type: application/json" \
  -H "X-ServiceTitan-Signature: <signature>" \
  -d '{"event": "customer.created", "data": {...}}'

# Expected: 200 OK with event logged
```

---

## Phase 6: Email Notifications

### 6.1 Configure Email Service
Choose one option:

#### Option A: Gmail (Development)
```bash
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="your-email@gmail.com"
export SMTP_PASSWORD="<16-char-app-password>"
export EMAIL_FROM="your-email@gmail.com"
```

#### Option B: SendGrid (Production)
```bash
export SMTP_HOST="smtp.sendgrid.net"
export SMTP_PORT="587"
export SMTP_USER="apikey"
export SMTP_PASSWORD="SG.<api-key>"
export EMAIL_FROM="noreply@clientcheck.app"
```

### 6.2 Test Email Delivery
```bash
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"to": "your-email@example.com", "subject": "Test", "body": "Test email"}'
```

**Expected Result:** Email received within 30 seconds

### 6.3 Test Notification Flows
- [ ] Review submitted → Notification email sent
- [ ] Dispute filed → Moderation email sent
- [ ] Verification approved → Approval email sent
- [ ] Trial expiring → Reminder email sent
- [ ] Payment failed → Alert email sent

### 6.4 Verify Email Templates
Check that all emails include:
- [ ] Proper branding (logo, colors)
- [ ] Clear call-to-action buttons
- [ ] Unsubscribe link
- [ ] Contact information
- [ ] Professional formatting

---

## Phase 7: Monitoring & Alerting

### 7.1 Setup Application Monitoring

#### Option A: Datadog
```bash
export DD_API_KEY="..."
export DD_APP_KEY="..."
export DD_SITE="datadoghq.com"
```

Install Datadog agent:
```bash
npm install --save dd-trace
```

Configure in server startup:
```typescript
import tracer from 'dd-trace';
tracer.init();
```

#### Option B: New Relic
```bash
export NEW_RELIC_LICENSE_KEY="..."
export NEW_RELIC_APP_NAME="ClientCheck"
```

Install New Relic agent:
```bash
npm install --save newrelic
```

### 7.2 Configure Key Metrics
Monitor these metrics:
- [ ] API response time (p50, p95, p99)
- [ ] Database query time
- [ ] Error rate (5xx responses)
- [ ] Stripe webhook success rate
- [ ] Email delivery success rate
- [ ] Integration sync success rate
- [ ] Database connection pool usage
- [ ] Memory usage
- [ ] CPU usage

### 7.3 Setup Alerts
Create alerts for:
- [ ] API health endpoint failing (3 consecutive failures)
- [ ] Error rate > 5% over 5 minutes
- [ ] Response time p95 > 1 second
- [ ] Database connection failures
- [ ] Stripe webhook failures
- [ ] Email delivery failures > 5%
- [ ] Integration sync failures
- [ ] Memory usage > 80%
- [ ] Disk usage > 90%

### 7.4 Configure Alert Destinations
- [ ] Slack channel for warnings
- [ ] Email for critical alerts
- [ ] PagerDuty for on-call escalation

---

## Phase 8: Automated Testing

### 8.1 Run Full Test Suite
```bash
cd /path/to/clientcheck-finalization
npm test
```

**Expected Output:**
```
PASS  tests/auth.test.ts
PASS  tests/reviews.test.ts
PASS  tests/risk-scores.test.ts
PASS  tests/disputes.test.ts
PASS  tests/integrations.test.ts

Test Suites: 5 passed, 5 total
Tests:       164 passed, 164 total
Coverage:    > 80%
```

### 8.2 Run Linting
```bash
npm run lint
```

**Expected Output:**
```
✓ 0 errors
✓ 7 warnings (acceptable)
```

### 8.3 Type Checking
```bash
npm run check
```

**Expected Output:**
```
✓ 0 errors
✓ 0 warnings
```

### 8.4 Build Verification
```bash
npm run build
```

**Expected Output:**
```
✓ Build successful
✓ Output: dist/index.js
✓ Size: < 5MB
```

---

## Phase 9: Security Validation

### 9.1 Dependency Audit
```bash
npm audit
```

**Expected Result:** No critical vulnerabilities

### 9.2 Environment Variables Audit
Verify all secrets are:
- [ ] Not committed to git
- [ ] Not logged in console
- [ ] Properly scoped (dev/staging/production)
- [ ] Rotated regularly

### 9.3 Database Security
- [ ] User has minimal required privileges
- [ ] Connections use TLS/SSL
- [ ] Backups encrypted
- [ ] Access logs enabled

### 9.4 API Security
- [ ] All endpoints require authentication
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified

### 9.5 Mobile App Security
- [ ] No sensitive data in logs
- [ ] API keys not hardcoded
- [ ] Secure storage for tokens
- [ ] Certificate pinning configured
- [ ] No debug builds in production

---

## Phase 10: Production Deployment

### 10.1 Pre-Deployment Checklist
- [ ] All tests passing (164/164)
- [ ] 0 TypeScript errors
- [ ] 0 critical vulnerabilities
- [ ] Database migrations tested
- [ ] All API endpoints validated
- [ ] Mobile flows tested on real devices
- [ ] Stripe integration tested
- [ ] Third-party integrations tested
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Backups configured
- [ ] Rollback plan documented

### 10.2 Database Backup
```bash
mysqldump -u clientcheck -pclientcheck clientcheck > clientcheck_production_backup.sql
```

### 10.3 Deploy Backend
```bash
# Build
npm run build

# Deploy to production server
# (Using your deployment tool: Heroku, AWS, DigitalOcean, etc.)

# Verify health
curl https://your-domain.com/health
```

### 10.4 Deploy Mobile App

#### iOS
1. Build: `eas build --platform ios --profile production`
2. Submit: `eas submit --platform ios --latest`
3. Wait for App Store review (1-3 days)
4. Release to App Store

#### Android
1. Build: `eas build --platform android --profile production`
2. Submit: `eas submit --platform android --latest`
3. Wait for Google Play review (1-2 hours)
4. Release to Google Play

### 10.5 Post-Deployment Validation
- [ ] Backend health check passes
- [ ] Database connected
- [ ] All API endpoints responding
- [ ] Stripe webhooks delivering
- [ ] Emails sending
- [ ] Integrations syncing
- [ ] Monitoring collecting data
- [ ] Alerts firing correctly
- [ ] Mobile app loads in stores
- [ ] Users can download and install

---

## Phase 11: Post-Launch Monitoring

### 11.1 First 24 Hours
- [ ] Monitor error rate (should be < 1%)
- [ ] Monitor API response times
- [ ] Monitor database performance
- [ ] Check for any critical issues
- [ ] Monitor user feedback/reviews
- [ ] Verify all integrations working

### 11.2 First Week
- [ ] Monitor crash reports
- [ ] Analyze user behavior
- [ ] Check payment processing
- [ ] Verify email delivery
- [ ] Monitor third-party integrations
- [ ] Review security logs

### 11.3 Ongoing
- [ ] Daily monitoring of key metrics
- [ ] Weekly review of logs
- [ ] Monthly security audit
- [ ] Quarterly performance review
- [ ] Regular backup verification
- [ ] Dependency updates

---

## Troubleshooting Guide

### Database Connection Issues
```bash
# Test connection
mysql -u clientcheck -pclientcheck -h localhost clientcheck -e "SELECT 1;"

# Check MySQL logs
sudo tail -f /var/log/mysql/error.log

# Restart MySQL
sudo service mysql restart
```

### API Server Issues
```bash
# Check if server is running
curl http://localhost:3000/health

# Check logs
tail -f /var/log/clientcheck/server.log

# Restart server
npm run dev:server
```

### Mobile App Issues
```bash
# Clear cache
rm -rf node_modules/.cache

# Restart dev server
npm run dev

# Clear Expo cache
expo start --clear
```

### Stripe Integration Issues
```bash
# Verify webhook endpoint
curl https://api.stripe.com/v1/webhook_endpoints \
  -u sk_test_...:

# Test webhook signature
stripe trigger payment_intent.succeeded
```

### Email Delivery Issues
```bash
# Test SMTP connection
telnet smtp.gmail.com 587

# Check email logs
tail -f /var/log/mail.log

# Verify credentials
echo "test" | mail -s "Test" your-email@example.com
```

---

## Sign-Off Checklist

Before considering the app production-ready, verify:

- [ ] **Database**: Schema migrated, data validated, backups working
- [ ] **Backend**: All endpoints tested, health checks passing, monitoring active
- [ ] **Mobile**: All flows tested on iOS and Android, performance acceptable
- [ ] **Payments**: Stripe integration tested, webhooks delivering, subscriptions working
- [ ] **Integrations**: ServiceTitan, Jobber, Housecall Pro connected and syncing
- [ ] **Email**: Notifications sending, templates correct, delivery verified
- [ ] **Security**: No vulnerabilities, secrets secured, audit logs enabled
- [ ] **Monitoring**: Metrics collecting, alerts configured, dashboards ready
- [ ] **Testing**: 164 tests passing, 0 TypeScript errors, coverage > 80%
- [ ] **Documentation**: Setup guide, API docs, deployment guide complete

---

## Contact & Support

For issues during finalization:
- **Database**: Check MySQL logs, verify credentials
- **Backend**: Check server logs, verify environment variables
- **Mobile**: Check Expo logs, verify permissions
- **Payments**: Check Stripe dashboard, verify webhook endpoint
- **Integrations**: Check API credentials, verify webhook signatures
- **Email**: Check SMTP credentials, verify sender reputation

Good luck with your production launch! 🚀
