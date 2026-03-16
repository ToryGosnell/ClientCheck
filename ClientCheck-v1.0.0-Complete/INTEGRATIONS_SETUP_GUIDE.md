# ClientCheck Third-Party Integrations Setup Guide

Complete guide for setting up and testing integrations with ServiceTitan, Jobber, and Housecall Pro.

---

## Overview

ClientCheck integrates with three major field service management platforms:
1. **ServiceTitan** - CRM for home services
2. **Jobber** - Job management platform
3. **Housecall Pro** - Field service software

These integrations allow contractors to:
- Sync customer data from their existing platform
- Automatically create reviews based on job completion
- Track job history and performance
- Receive alerts about high-risk customers

---

## Part 1: ServiceTitan Integration

### 1.1 Create ServiceTitan Developer Account
1. Go to https://developer.servicetitan.com
2. Click "Sign Up"
3. Complete registration
4. Verify email address
5. Create organization

### 1.2 Register OAuth Application
1. Log in to ServiceTitan Developer Portal
2. Click "Applications" → "Create Application"
3. Fill in application details:
   - **Name:** ClientCheck
   - **Description:** Customer risk intelligence platform
   - **Redirect URI:** `https://your-domain.com/api/oauth/servicetitan/callback`
4. Click "Create"
5. Copy **Client ID**
6. Copy **Client Secret**

### 1.3 Configure Environment Variables
```bash
export SERVICETITAN_CLIENT_ID="your_client_id"
export SERVICETITAN_CLIENT_SECRET="your_client_secret"
export SERVICETITAN_REDIRECT_URI="https://your-domain.com/api/oauth/servicetitan/callback"
```

### 1.4 Test OAuth Flow
1. Open app in browser
2. Navigate to Integrations section
3. Click "Connect ServiceTitan"
4. Authorize OAuth request
5. Verify connection saved

**Expected Results:**
- [ ] OAuth flow completes
- [ ] User redirected back to app
- [ ] Connection saved in database
- [ ] Access token stored securely

### 1.5 Test Data Sync
```bash
curl -X POST http://localhost:3000/api/integrations/servicetitan/sync \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Expected Results:**
- [ ] Sync starts
- [ ] Customers imported from ServiceTitan
- [ ] Customer data saved in database
- [ ] Sync status logged

### 1.6 Verify Synced Data
```bash
mysql -u clientcheck -pclientcheck clientcheck -e "
SELECT COUNT(*) as customer_count FROM customers WHERE source = 'servicetitan';
SELECT * FROM customers WHERE source = 'servicetitan' LIMIT 5;
"
```

### 1.7 Test Webhook Integration
1. In ServiceTitan, create a new customer
2. Complete a job for that customer
3. Mark job as complete
4. Verify webhook received in ClientCheck

**Expected Results:**
- [ ] Webhook received
- [ ] Job data synced
- [ ] Customer risk score updated
- [ ] Notification sent to contractor

---

## Part 2: Jobber Integration

### 2.1 Create Jobber Developer Account
1. Go to https://developer.getjobber.com
2. Click "Sign Up"
3. Complete registration
4. Verify email address
5. Create developer account

### 2.2 Create API Application
1. Log in to Jobber Developer Portal
2. Click "Applications" → "Create Application"
3. Fill in application details:
   - **Name:** ClientCheck
   - **Description:** Customer risk intelligence platform
   - **Webhook URL:** `https://your-domain.com/api/webhooks/jobber`
4. Click "Create"
5. Copy **API Key**
6. Copy **API Secret**

### 2.3 Configure Environment Variables
```bash
export JOBBER_API_KEY="your_api_key"
export JOBBER_API_SECRET="your_api_secret"
export JOBBER_WEBHOOK_URL="https://your-domain.com/api/webhooks/jobber"
```

### 2.4 Test API Connection
```bash
curl -X GET https://api.getjobber.com/api/graphql \
  -H "Authorization: Bearer $JOBBER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ account { id name } }"}'
```

**Expected Results:**
- [ ] API request succeeds
- [ ] Account data returned
- [ ] Connection working

### 2.5 Test Data Sync
1. Open app in browser
2. Navigate to Integrations section
3. Click "Connect Jobber"
4. Enter API key
5. Click "Sync"

**Expected Results:**
- [ ] Sync starts
- [ ] Customers imported from Jobber
- [ ] Customer data saved in database
- [ ] Sync status logged

### 2.6 Verify Synced Data
```bash
mysql -u clientcheck -pclientcheck clientcheck -e "
SELECT COUNT(*) as customer_count FROM customers WHERE source = 'jobber';
SELECT * FROM customers WHERE source = 'jobber' LIMIT 5;
"
```

### 2.7 Test Webhook Delivery
1. In Jobber, create a new customer
2. Complete a job for that customer
3. Mark job as complete
4. Verify webhook received in ClientCheck

**Expected Results:**
- [ ] Webhook received
- [ ] Signature verified
- [ ] Job data synced
- [ ] Customer risk score updated

### 2.8 Test Webhook Signature
```bash
# Verify webhook signature in code
const crypto = require('crypto');

function verifyJobberSignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return hash === signature;
}
```

---

## Part 3: Housecall Pro Integration

### 3.1 Create Housecall Pro Developer Account
1. Go to https://developer.housecallpro.com
2. Click "Sign Up"
3. Complete registration
4. Verify email address
5. Create developer account

### 3.2 Create API Application
1. Log in to Housecall Pro Developer Portal
2. Click "Applications" → "Create Application"
3. Fill in application details:
   - **Name:** ClientCheck
   - **Description:** Customer risk intelligence platform
   - **Webhook URL:** `https://your-domain.com/api/webhooks/housecall`
4. Click "Create"
5. Copy **API Key**
6. Copy **API Secret**

### 3.3 Configure Environment Variables
```bash
export HOUSECALL_API_KEY="your_api_key"
export HOUSECALL_API_SECRET="your_api_secret"
export HOUSECALL_WEBHOOK_URL="https://your-domain.com/api/webhooks/housecall"
```

### 3.4 Test API Connection
```bash
curl -X GET https://api.housecallpro.com/v2/customers \
  -H "Authorization: Bearer $HOUSECALL_API_KEY" \
  -H "Content-Type: application/json"
```

**Expected Results:**
- [ ] API request succeeds
- [ ] Customer list returned
- [ ] Connection working

### 3.5 Test Data Sync
1. Open app in browser
2. Navigate to Integrations section
3. Click "Connect Housecall Pro"
4. Enter API key
5. Click "Sync"

**Expected Results:**
- [ ] Sync starts
- [ ] Customers imported from Housecall Pro
- [ ] Customer data saved in database
- [ ] Sync status logged

### 3.6 Verify Synced Data
```bash
mysql -u clientcheck -pclientcheck clientcheck -e "
SELECT COUNT(*) as customer_count FROM customers WHERE source = 'housecall';
SELECT * FROM customers WHERE source = 'housecall' LIMIT 5;
"
```

### 3.7 Test Webhook Delivery
1. In Housecall Pro, create a new customer
2. Complete a job for that customer
3. Mark job as complete
4. Verify webhook received in ClientCheck

**Expected Results:**
- [ ] Webhook received
- [ ] Signature verified
- [ ] Job data synced
- [ ] Customer risk score updated

---

## Part 4: Integration Testing

### 4.1 Test Data Sync Across All Platforms
```bash
# Sync all integrations
curl -X POST http://localhost:3000/api/integrations/sync-all \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Expected Results:**
- [ ] All three integrations sync
- [ ] No errors
- [ ] All customers imported
- [ ] Sync logs created

### 4.2 Test Duplicate Detection
1. Create customer in ServiceTitan
2. Create same customer in Jobber
3. Run sync
4. Verify duplicate detection works

**Expected Results:**
- [ ] Duplicate detected
- [ ] Customers merged
- [ ] Single record in database
- [ ] Risk score consolidated

### 4.3 Test Webhook Deduplication
1. Trigger same webhook twice
2. Verify only processed once

**Expected Results:**
- [ ] Webhook received twice
- [ ] Event processed once (idempotent)
- [ ] No duplicate records

### 4.4 Test Error Handling
1. Disconnect API key
2. Trigger sync
3. Verify error handling

**Expected Results:**
- [ ] Error caught
- [ ] Error logged
- [ ] User notified
- [ ] Sync can be retried

### 4.5 Test Rate Limiting
1. Trigger multiple syncs rapidly
2. Verify rate limiting works

**Expected Results:**
- [ ] Rate limit enforced
- [ ] Error returned
- [ ] User can retry after delay

---

## Part 5: Integration Monitoring

### 5.1 Setup Integration Monitoring
Monitor these metrics for each integration:
- [ ] Sync success rate (target: > 99%)
- [ ] Sync frequency (daily minimum)
- [ ] Data freshness (< 24 hours old)
- [ ] Webhook delivery success rate
- [ ] API error rate (target: < 1%)

### 5.2 Configure Alerts
Create alerts for:
- [ ] Sync failures (> 3 in 1 hour)
- [ ] Webhook delivery failures
- [ ] API connection errors
- [ ] Rate limit exceeded
- [ ] Data sync stalled (> 24 hours)

### 5.3 Setup Logging
Log all integration events:
```typescript
logger.info('Integration sync started', {
  integration: 'servicetitan',
  timestamp: new Date(),
  customerId: contractor.id
});

logger.error('Integration sync failed', {
  integration: 'servicetitan',
  error: err.message,
  timestamp: new Date()
});
```

### 5.4 Create Integration Dashboard
Track:
- [ ] Total customers synced per integration
- [ ] Sync success rate per integration
- [ ] Last sync time per integration
- [ ] Pending syncs
- [ ] Failed syncs
- [ ] Webhook delivery status

---

## Part 6: Production Deployment

### 6.1 Pre-Deployment Checklist
- [ ] All integrations tested locally
- [ ] API credentials configured
- [ ] Webhook endpoints configured
- [ ] Error handling tested
- [ ] Rate limiting configured
- [ ] Monitoring setup
- [ ] Alerts configured
- [ ] Documentation complete

### 6.2 Deploy Integration Services
```bash
# Build
npm run build

# Deploy to production
# (Using your deployment tool)

# Verify
curl https://your-domain.com/api/integrations/health
```

### 6.3 Test Production Integrations
1. Test OAuth flow with production credentials
2. Test data sync with production data
3. Test webhook delivery
4. Verify monitoring is collecting data

### 6.4 Monitor First 24 Hours
- [ ] Check sync success rate
- [ ] Monitor webhook delivery
- [ ] Check for errors
- [ ] Verify data accuracy
- [ ] Monitor API usage

---

## Part 7: Troubleshooting

### ServiceTitan Issues
```bash
# Test OAuth
curl -X POST https://api.servicetitan.com/oauth/token \
  -d "grant_type=client_credentials" \
  -d "client_id=$SERVICETITAN_CLIENT_ID" \
  -d "client_secret=$SERVICETITAN_CLIENT_SECRET"

# Test API
curl -X GET https://api.servicetitan.com/v2/customers \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Jobber Issues
```bash
# Test API
curl -X GET https://api.getjobber.com/api/graphql \
  -H "Authorization: Bearer $JOBBER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ customers(first: 10) { edges { node { id name } } } }"}'
```

### Housecall Pro Issues
```bash
# Test API
curl -X GET https://api.housecallpro.com/v2/customers \
  -H "Authorization: Bearer $HOUSECALL_API_KEY"
```

---

## Checklist

Before going to production:

- [ ] ServiceTitan integration tested
- [ ] Jobber integration tested
- [ ] Housecall Pro integration tested
- [ ] OAuth flows working
- [ ] Data sync working
- [ ] Webhook delivery working
- [ ] Duplicate detection working
- [ ] Error handling tested
- [ ] Rate limiting configured
- [ ] Monitoring setup
- [ ] Alerts configured
- [ ] Production credentials configured
- [ ] Documentation complete

---

## Support

For integration issues:
- **ServiceTitan API:** https://developer.servicetitan.com/docs
- **Jobber API:** https://developer.getjobber.com/docs
- **Housecall Pro API:** https://developer.housecallpro.com/docs

Good luck! 🚀
