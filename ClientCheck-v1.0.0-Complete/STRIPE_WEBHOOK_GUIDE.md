# ClientCheck Stripe Webhook Testing Guide

Complete guide for testing Stripe payment integration and webhook delivery.

---

## Prerequisites

- [ ] Stripe account created (https://stripe.com)
- [ ] Stripe CLI installed locally
- [ ] Backend server running on localhost:3000
- [ ] Stripe test API keys configured

---

## Part 1: Stripe Account Setup

### 1.1 Create Stripe Account
1. Go to https://stripe.com
2. Click "Sign up"
3. Enter email and password
4. Verify email address
5. Complete business information

### 1.2 Get API Keys
1. Log in to Stripe Dashboard
2. Click "Developers" in left sidebar
3. Click "API keys"
4. Copy **Publishable Key** (pk_test_...)
5. Copy **Secret Key** (sk_test_...)

### 1.3 Configure Environment Variables
```bash
export STRIPE_PUBLISHABLE_KEY="pk_test_..."
export STRIPE_SECRET_KEY="sk_test_..."
```

Verify configuration:
```bash
curl -u sk_test_...: https://api.stripe.com/v1/account
```

---

## Part 2: Payment Testing

### 2.1 Test Cards
Use these test card numbers in development:

| Card Type | Number | Expiry | CVC | Result |
|-----------|--------|--------|-----|--------|
| Visa (Success) | 4242 4242 4242 4242 | 12/25 | 123 | Succeeds |
| Visa (Decline) | 4000 0000 0000 0002 | 12/25 | 123 | Declines |
| Visa (3D Secure) | 4000 0025 0000 3155 | 12/25 | 123 | Requires auth |
| Mastercard (Success) | 5555 5555 5555 4444 | 12/25 | 123 | Succeeds |
| Amex (Success) | 3782 822463 10005 | 12/25 | 1234 | Succeeds |

### 2.2 Test Payment Flow (Web)
1. Open app in browser: http://localhost:8081
2. Navigate to Subscription screen
3. Click "Upgrade Now"
4. Enter test card: 4242 4242 4242 4242
5. Expiry: 12/25
6. CVC: 123
7. Click "Pay"

**Expected Results:**
- [ ] Payment succeeds
- [ ] Confirmation message shown
- [ ] Subscription activated
- [ ] Confirmation email sent
- [ ] Database updated with subscription

### 2.3 Test Payment Decline
1. Open app in browser
2. Navigate to Subscription screen
3. Click "Upgrade Now"
4. Enter test card: 4000 0000 0000 0002
5. Complete payment form
6. Click "Pay"

**Expected Results:**
- [ ] Payment declines
- [ ] Error message shown
- [ ] Subscription NOT activated
- [ ] User can retry

### 2.4 Test 3D Secure
1. Open app in browser
2. Navigate to Subscription screen
3. Click "Upgrade Now"
4. Enter test card: 4000 0025 0000 3155
5. Complete payment form
6. Click "Pay"

**Expected Results:**
- [ ] 3D Secure authentication required
- [ ] Authentication page appears
- [ ] User completes authentication
- [ ] Payment succeeds
- [ ] Subscription activated

---

## Part 3: Webhook Testing

### 3.1 Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
curl https://files.stripe.com/stripe-cli/releases/latest/linux/x86_64/stripe_linux_x86_64.tar.gz -o stripe.tar.gz
tar -xzf stripe.tar.gz
sudo mv stripe /usr/local/bin

# Windows
choco install stripe
```

Verify installation:
```bash
stripe --version
```

### 3.2 Configure Webhook Endpoint
1. Log in to Stripe Dashboard
2. Click "Developers" → "Webhooks"
3. Click "Add endpoint"
4. Enter endpoint URL: `http://localhost:3000/api/webhooks/stripe`
5. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `charge.refunded`
6. Click "Add endpoint"
7. Copy webhook signing secret

### 3.3 Configure Signing Secret
```bash
export STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 3.4 Test Webhook Delivery Locally

#### Option A: Using Stripe CLI (Recommended)
```bash
# Terminal 1: Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# This will output:
# > Ready! Your webhook signing secret is whsec_...
# > Forwarding events to http://localhost:3000/api/webhooks/stripe
```

#### Option B: Using ngrok
```bash
# Terminal 1: Start ngrok tunnel
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)

# Terminal 2: Update webhook endpoint in Stripe Dashboard
# https://abc123.ngrok.io/api/webhooks/stripe
```

### 3.5 Trigger Test Events

#### Test payment_intent.succeeded
```bash
stripe trigger payment_intent.succeeded
```

**Expected Results:**
- [ ] Webhook received in terminal
- [ ] Event logged in database
- [ ] No errors in server logs
- [ ] Idempotent processing (run twice, only process once)

#### Test payment_intent.payment_failed
```bash
stripe trigger payment_intent.payment_failed
```

**Expected Results:**
- [ ] Webhook received
- [ ] Failure logged
- [ ] User notified (email)
- [ ] Subscription NOT activated

#### Test customer.subscription.created
```bash
stripe trigger customer.subscription.created
```

**Expected Results:**
- [ ] Webhook received
- [ ] Subscription created in database
- [ ] Subscription status set to "active"
- [ ] Confirmation email sent

#### Test customer.subscription.updated
```bash
stripe trigger customer.subscription.updated
```

**Expected Results:**
- [ ] Webhook received
- [ ] Subscription updated in database
- [ ] Changes reflected in app

#### Test customer.subscription.deleted
```bash
stripe trigger customer.subscription.deleted
```

**Expected Results:**
- [ ] Webhook received
- [ ] Subscription marked as "canceled"
- [ ] User notified
- [ ] Access revoked

#### Test charge.refunded
```bash
stripe trigger charge.refunded
```

**Expected Results:**
- [ ] Webhook received
- [ ] Refund logged
- [ ] User notified
- [ ] Subscription canceled

### 3.6 Verify Webhook Signature
The webhook endpoint should verify the signature:

```typescript
// Expected code in server
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    // Handle event
    handleStripeEvent(event);
    res.json({received: true});
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
```

---

## Part 4: Subscription Lifecycle Testing

### 4.1 Create Subscription
```bash
curl -X POST https://api.stripe.com/v1/customers \
  -u sk_test_...: \
  -d email="test@example.com"

# Copy customer ID (cus_...)

curl -X POST https://api.stripe.com/v1/subscriptions \
  -u sk_test_...: \
  -d customer="cus_..." \
  -d items[0][price]="price_monthly" \
  -d payment_method="pm_card_visa" \
  -d default_payment_method="pm_card_visa"
```

**Expected Results:**
- [ ] Subscription created with status "active"
- [ ] Webhook received: `customer.subscription.created`
- [ ] Subscription saved in database
- [ ] User notified

### 4.2 Update Subscription
```bash
curl -X POST https://api.stripe.com/v1/subscriptions/sub_... \
  -u sk_test_...: \
  -d items[0][id]="si_..." \
  -d items[0][price]="price_annual"
```

**Expected Results:**
- [ ] Subscription updated
- [ ] Webhook received: `customer.subscription.updated`
- [ ] Database updated
- [ ] User notified of plan change

### 4.3 Cancel Subscription
```bash
curl -X DELETE https://api.stripe.com/v1/subscriptions/sub_... \
  -u sk_test_...:
```

**Expected Results:**
- [ ] Subscription canceled
- [ ] Webhook received: `customer.subscription.deleted`
- [ ] Database updated with cancellation
- [ ] User notified
- [ ] Access revoked

### 4.4 Refund Payment
```bash
curl -X POST https://api.stripe.com/v1/refunds \
  -u sk_test_...: \
  -d charge="ch_..."
```

**Expected Results:**
- [ ] Refund processed
- [ ] Webhook received: `charge.refunded`
- [ ] Refund logged in database
- [ ] User notified
- [ ] Subscription canceled

---

## Part 5: Error Handling Testing

### 5.1 Invalid Webhook Signature
```bash
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: invalid_signature" \
  -d '{"type": "payment_intent.succeeded"}'
```

**Expected Results:**
- [ ] Request rejected (401 Unauthorized)
- [ ] Error logged
- [ ] No processing occurs

### 5.2 Duplicate Webhook
Send the same webhook twice:

```bash
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.succeeded  # Same event
```

**Expected Results:**
- [ ] Both webhooks received
- [ ] Event processed only once (idempotent)
- [ ] No duplicate records in database

### 5.3 Webhook Timeout
```bash
# Simulate slow processing
# Add delay in webhook handler
setTimeout(() => {
  // Process event
}, 5000);
```

**Expected Results:**
- [ ] Webhook processed within timeout (30 seconds)
- [ ] No timeout errors
- [ ] Event logged

### 5.4 Database Connection Error
```bash
# Stop MySQL
sudo service mysql stop

# Trigger webhook
stripe trigger payment_intent.succeeded

# Start MySQL
sudo service mysql start
```

**Expected Results:**
- [ ] Webhook received
- [ ] Database error caught
- [ ] Error logged
- [ ] Webhook can be replayed

---

## Part 6: Production Webhook Setup

### 6.1 Configure Production Endpoint
1. Log in to Stripe Dashboard (production mode)
2. Click "Developers" → "Webhooks"
3. Click "Add endpoint"
4. Enter production URL: `https://your-domain.com/api/webhooks/stripe`
5. Select same events as development
6. Copy webhook signing secret
7. Update environment variable: `STRIPE_WEBHOOK_SECRET`

### 6.2 Test Production Webhooks
```bash
# Use Stripe CLI with production keys
stripe login
stripe listen --forward-to https://your-domain.com/api/webhooks/stripe
stripe trigger payment_intent.succeeded
```

### 6.3 Monitor Webhook Delivery
In Stripe Dashboard:
1. Click "Developers" → "Webhooks"
2. Click on your endpoint
3. View recent deliveries
4. Check delivery status (success/failure)
5. View request/response details

---

## Part 7: Monitoring & Alerts

### 7.1 Setup Webhook Monitoring
Monitor these metrics:
- [ ] Webhook delivery success rate (target: > 99%)
- [ ] Webhook processing time (target: < 1 second)
- [ ] Failed webhook count (alert if > 5 in 1 hour)
- [ ] Duplicate webhook detection (should be 0)

### 7.2 Configure Alerts
Create alerts for:
- [ ] Webhook delivery failures
- [ ] High processing time (> 5 seconds)
- [ ] Signature verification failures
- [ ] Database errors during webhook processing

### 7.3 Setup Logging
Log all webhooks:
```typescript
app.post('/api/webhooks/stripe', (req, res) => {
  const event = req.body;
  
  // Log webhook
  console.log(`[WEBHOOK] ${event.type} - ${event.id}`);
  console.log(`[WEBHOOK] Timestamp: ${new Date(event.created * 1000)}`);
  
  // Process webhook
  handleStripeEvent(event);
});
```

---

## Part 8: Troubleshooting

### Webhook Not Received
1. Check endpoint URL is correct
2. Verify webhook is enabled in Stripe Dashboard
3. Check server is running and accessible
4. Check firewall allows incoming connections
5. Review Stripe webhook logs for errors

### Webhook Signature Invalid
1. Verify `STRIPE_WEBHOOK_SECRET` is correct
2. Check secret matches endpoint in Stripe Dashboard
3. Verify request body is not modified
4. Check timestamp is recent (< 5 minutes)

### Payment Not Processing
1. Check test card is valid
2. Verify API keys are correct
3. Check payment method is attached to customer
4. Review Stripe Dashboard for error details

### Subscription Not Activating
1. Check webhook is received
2. Verify database is updated
3. Check subscription status in Stripe Dashboard
4. Review server logs for errors

---

## Checklist

Before going to production:

- [ ] Stripe account created and verified
- [ ] API keys configured
- [ ] Test payments working
- [ ] Webhook endpoint configured
- [ ] Webhook signature verification working
- [ ] All webhook events tested
- [ ] Subscription lifecycle tested
- [ ] Error handling tested
- [ ] Duplicate detection working
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Production endpoint configured
- [ ] Production webhooks tested
- [ ] Documentation complete

---

## Support

For Stripe issues:
- **API Documentation:** https://stripe.com/docs/api
- **Webhook Documentation:** https://stripe.com/docs/webhooks
- **Test Cards:** https://stripe.com/docs/testing
- **Support:** https://support.stripe.com

Good luck! 🚀
