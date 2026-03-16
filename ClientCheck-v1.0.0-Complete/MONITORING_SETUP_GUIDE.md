# ClientCheck Production Monitoring & Alerting Setup Guide

Complete guide for setting up monitoring, logging, and alerting for production deployment.

---

## Overview

Production monitoring ensures:
- **Availability:** API is responding
- **Performance:** Response times are acceptable
- **Reliability:** Error rates are low
- **Security:** Suspicious activity detected
- **Compliance:** Audit logs maintained

---

## Part 1: Application Performance Monitoring (APM)

### Option A: Datadog

#### 1.1 Create Datadog Account
1. Go to https://www.datadoghq.com
2. Click "Sign Up"
3. Complete registration
4. Verify email
5. Create organization

#### 1.2 Install Datadog Agent
```bash
# Install Node.js APM library
npm install --save dd-trace

# Install system agent
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=your_api_key \
  bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_mac_os.sh)"
```

#### 1.3 Configure Datadog
```bash
export DD_API_KEY="your_api_key"
export DD_APP_KEY="your_app_key"
export DD_SITE="datadoghq.com"
export DD_SERVICE="clientcheck-api"
export DD_ENV="production"
export DD_VERSION="1.0.0"
```

#### 1.4 Initialize Datadog in App
```typescript
// server/_core/index.ts
import tracer from 'dd-trace';

// Initialize tracer FIRST, before importing other modules
tracer.init({
  service: 'clientcheck-api',
  env: 'production',
  version: '1.0.0',
  logInjection: true,
  analytics: true
});

// Now import other modules
import express from 'express';
import { logger } from './logger';

const app = express();

// Datadog middleware
app.use(tracer.middleware.express());
```

#### 1.5 Create Datadog Dashboard
1. Log in to Datadog
2. Click "Dashboards" → "New Dashboard"
3. Add widgets:
   - API Response Time (p50, p95, p99)
   - Request Rate
   - Error Rate
   - Database Query Time
   - Memory Usage
   - CPU Usage
   - Stripe Webhook Success Rate
   - Email Delivery Rate

#### 1.6 Setup Datadog Monitors
Create monitors for:
- [ ] API health (down for 3 minutes)
- [ ] Error rate > 5%
- [ ] Response time p95 > 1 second
- [ ] Database connection failures
- [ ] Memory usage > 80%
- [ ] CPU usage > 80%

### Option B: New Relic

#### 1.1 Create New Relic Account
1. Go to https://newrelic.com
2. Click "Sign Up"
3. Complete registration
4. Verify email

#### 1.2 Install New Relic Agent
```bash
npm install --save newrelic

# Create newrelic.js config file
npx newrelic create-config
```

#### 1.3 Configure New Relic
```javascript
// newrelic.js
exports.config = {
  app_name: ['ClientCheck'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: 'info'
  },
  transaction_tracer: {
    enabled: true,
    record_sql: 'obfuscated'
  }
};
```

#### 1.4 Initialize New Relic
```typescript
// server/_core/index.ts - MUST be first line
require('newrelic');

import express from 'express';
```

#### 1.5 Create New Relic Dashboard
1. Log in to New Relic
2. Click "Dashboards" → "Create Dashboard"
3. Add charts for key metrics

#### 1.6 Setup New Relic Alerts
Create alert policies for:
- [ ] Apdex score < 0.95
- [ ] Error rate > 5%
- [ ] Response time > 1 second
- [ ] Database connection failures

### Option C: CloudWatch (AWS)

#### 1.1 Create CloudWatch Metrics
```typescript
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatch({
  region: 'us-east-1'
});

// Log custom metric
await cloudwatch.putMetricData({
  Namespace: 'ClientCheck',
  MetricData: [
    {
      MetricName: 'ReviewSubmissionTime',
      Value: responseTime,
      Unit: 'Milliseconds',
      Timestamp: new Date()
    }
  ]
});
```

#### 1.2 Create CloudWatch Alarms
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "ClientCheck-HighErrorRate" \
  --alarm-description "Alert when error rate > 5%" \
  --metric-name ErrorRate \
  --namespace ClientCheck \
  --statistic Average \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

---

## Part 2: Logging

### 2.1 Structured Logging
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log with context
logger.info('Review submitted', {
  reviewId: review.id,
  customerId: review.customerId,
  contractorId: review.contractorId,
  timestamp: new Date(),
  duration: responseTime
});

logger.error('Review submission failed', {
  error: err.message,
  customerId: review.customerId,
  stack: err.stack,
  timestamp: new Date()
});
```

### 2.2 Log Aggregation
Send logs to:
- **Datadog:** `npm install --save @datadog/browser-logs`
- **New Relic:** Built-in
- **CloudWatch:** `npm install --save aws-sdk`
- **ELK Stack:** `npm install --save winston-elasticsearch`

### 2.3 Log Retention
- Development: 7 days
- Staging: 30 days
- Production: 90 days (compliance requirement)

### 2.4 Sensitive Data Masking
```typescript
function maskSensitiveData(data) {
  return {
    ...data,
    email: data.email?.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
    phone: data.phone?.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$3'),
    creditCard: '****-****-****-' + data.creditCard?.slice(-4)
  };
}
```

---

## Part 3: Distributed Tracing

### 3.1 Setup Trace Collection
```typescript
import tracer from 'dd-trace';

// Trace database queries
const mysql = require('mysql2/promise');
tracer.use('mysql2/promise', {
  service: 'clientcheck-db'
});

// Trace HTTP calls
tracer.use('http', {
  service: 'clientcheck-api'
});

// Trace Stripe calls
tracer.use('stripe', {
  service: 'stripe-api'
});
```

### 3.2 Custom Spans
```typescript
const span = tracer.startSpan('review.calculation', {
  resource: 'calculateRiskScore',
  type: 'web'
});

try {
  const riskScore = calculateRiskScore(customer);
  span.setTag('risk_score', riskScore);
} finally {
  span.finish();
}
```

### 3.3 Trace Context Propagation
```typescript
// Automatically propagate trace context across services
const traceId = tracer.extract('http_headers', headers);
const span = tracer.startSpan('downstream.call', {
  childOf: traceId
});
```

---

## Part 4: Alerting

### 4.1 Alert Channels
Configure notification channels:

#### Email
```bash
# Datadog
POST https://api.datadoghq.com/api/v1/integration/pagerduty/configuration/user
{
  "user_service_key": "your_key",
  "emails": ["alerts@clientcheck.app"]
}
```

#### Slack
```bash
# Datadog
POST https://api.datadoghq.com/api/v1/integration/slack-channel
{
  "channel_name": "#alerts",
  "account_name": "your_account"
}
```

#### PagerDuty
```bash
# For on-call escalation
POST https://api.datadoghq.com/api/v1/integration/pagerduty
{
  "service_key": "your_service_key"
}
```

### 4.2 Alert Rules

#### API Health
```yaml
name: "API Health Check Failed"
condition: "api_health.status != 'ok' for 3 minutes"
severity: "critical"
notify: ["slack:#alerts", "pagerduty"]
```

#### Error Rate
```yaml
name: "High Error Rate"
condition: "error_rate > 5% for 5 minutes"
severity: "high"
notify: ["slack:#alerts"]
```

#### Response Time
```yaml
name: "Slow Response Time"
condition: "response_time.p95 > 1000ms for 10 minutes"
severity: "medium"
notify: ["slack:#alerts"]
```

#### Database
```yaml
name: "Database Connection Failed"
condition: "db_connection.status != 'connected' for 1 minute"
severity: "critical"
notify: ["slack:#alerts", "pagerduty"]
```

#### Stripe Webhooks
```yaml
name: "Stripe Webhook Failures"
condition: "stripe_webhook.failure_rate > 5% for 15 minutes"
severity: "high"
notify: ["slack:#alerts"]
```

#### Email Delivery
```yaml
name: "Email Delivery Failures"
condition: "email.failure_rate > 5% for 15 minutes"
severity: "medium"
notify: ["slack:#alerts"]
```

### 4.3 Alert Escalation
```
Level 1 (Warning): Slack notification
  ↓ (no response in 15 minutes)
Level 2 (Critical): PagerDuty on-call engineer
  ↓ (no response in 30 minutes)
Level 3 (Emergency): Page entire team
```

---

## Part 5: Synthetic Monitoring

### 5.1 Uptime Checks
```bash
# Datadog Synthetics
POST https://api.datadoghq.com/api/v1/synthetics
{
  "type": "api",
  "name": "ClientCheck API Health",
  "request": {
    "method": "GET",
    "url": "https://api.clientcheck.app/health"
  },
  "assertions": [
    {
      "type": "statusCode",
      "operator": "is",
      "target": 200
    }
  ],
  "locations": ["aws:us-east-1", "aws:eu-west-1"],
  "frequency": 300
}
```

### 5.2 Transaction Monitoring
Test critical user flows:
```bash
# Test review submission
1. Login
2. Search customer
3. Submit review
4. Verify in database
```

### 5.3 API Endpoint Monitoring
Monitor all critical endpoints:
- [ ] GET /health
- [ ] POST /api/reviews
- [ ] GET /api/customers/{id}/risk-score
- [ ] POST /api/auth/login
- [ ] POST /api/webhooks/stripe

---

## Part 6: Security Monitoring

### 6.1 Audit Logging
```typescript
async function logAuditEvent(event: AuditEvent) {
  await db.auditLogs.create({
    userId: event.userId,
    action: event.action,
    resource: event.resource,
    resourceId: event.resourceId,
    changes: event.changes,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    timestamp: new Date(),
    status: event.status
  });
}

// Log all sensitive actions
logAuditEvent({
  userId: contractor.id,
  action: 'review_submitted',
  resource: 'review',
  resourceId: review.id,
  changes: { rating: 4, comment: '...' },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  status: 'success'
});
```

### 6.2 Anomaly Detection
Monitor for:
- [ ] Unusual login patterns
- [ ] Bulk review submissions
- [ ] Suspicious payment patterns
- [ ] Rate limit violations
- [ ] SQL injection attempts

### 6.3 Security Alerts
```yaml
name: "Multiple Failed Logins"
condition: "login.failures > 5 in 5 minutes from same IP"
severity: "high"
notify: ["slack:#security"]

name: "Bulk Review Submission"
condition: "reviews.submitted > 10 in 1 minute from same user"
severity: "high"
notify: ["slack:#security"]

name: "Suspicious Payment"
condition: "payment.amount > 10000 from new user"
severity: "medium"
notify: ["slack:#security"]
```

---

## Part 7: Business Metrics

### 7.1 Key Metrics to Track
- [ ] Daily active users
- [ ] Reviews submitted per day
- [ ] Average risk score
- [ ] Subscription conversion rate
- [ ] Payment success rate
- [ ] Customer retention rate
- [ ] Integration sync success rate
- [ ] Support ticket volume

### 7.2 Business Dashboard
```
ClientCheck Business Metrics
├── Users
│   ├── Total Users: 1,234
│   ├── Active Today: 456
│   ├── New This Week: 78
│   └── Churn Rate: 2.3%
├── Reviews
│   ├── Total: 5,678
│   ├── Today: 123
│   ├── Avg Rating: 3.8/5
│   └── Flagged: 45
├── Payments
│   ├── MRR: $12,345
│   ├── Success Rate: 99.2%
│   ├── Failed: 3
│   └── Refunds: 1
└── Integrations
    ├── ServiceTitan: Connected (234 customers)
    ├── Jobber: Connected (156 customers)
    └── Housecall Pro: Connected (89 customers)
```

---

## Part 8: Compliance & Audit

### 8.1 Compliance Monitoring
Monitor for:
- [ ] PCI DSS compliance (payment data)
- [ ] GDPR compliance (data retention)
- [ ] CCPA compliance (user data)
- [ ] SOC 2 compliance (security)

### 8.2 Audit Trail
Maintain audit logs for:
- [ ] User access
- [ ] Data changes
- [ ] Payment transactions
- [ ] Admin actions
- [ ] API access
- [ ] Webhook deliveries

### 8.3 Data Retention
```
Data Type          Retention Period
─────────────────────────────────
User Logs          90 days
API Logs           30 days
Payment Logs       7 years (PCI)
Audit Logs         1 year
Backups            30 days (incremental)
                   1 year (full)
```

---

## Part 9: Disaster Recovery

### 9.1 Backup Monitoring
```bash
# Verify daily backups
0 2 * * * mysqldump -u clientcheck -pclientcheck clientcheck > /backups/clientcheck_$(date +%Y%m%d).sql

# Verify backup integrity
0 3 * * * mysql -u clientcheck -pclientcheck < /backups/clientcheck_$(date +%Y%m%d).sql --dry-run
```

### 9.2 Restore Testing
- [ ] Test restore from backup monthly
- [ ] Document restore time
- [ ] Verify data integrity
- [ ] Test failover procedure

### 9.3 RTO/RPO Targets
- **RTO (Recovery Time Objective):** < 1 hour
- **RPO (Recovery Point Objective):** < 15 minutes

---

## Part 10: Runbook

### 10.1 High Error Rate
```
1. Check error logs for patterns
2. Identify affected endpoints
3. Check database connection
4. Check external API status (Stripe, etc.)
5. Scale up if needed
6. Rollback if necessary
```

### 10.2 High Response Time
```
1. Check database query performance
2. Check external API latency
3. Check server CPU/memory
4. Check network latency
5. Scale up if needed
6. Optimize queries if needed
```

### 10.3 Database Connection Failures
```
1. Verify database is running
2. Check network connectivity
3. Check database user permissions
4. Check connection pool settings
5. Restart database if needed
6. Failover to replica if available
```

### 10.4 Stripe Webhook Failures
```
1. Verify webhook endpoint is accessible
2. Check Stripe API status
3. Verify webhook signature secret
4. Check server logs for errors
5. Replay failed webhooks from Stripe Dashboard
```

---

## Checklist

Before production:

- [ ] APM tool installed and configured
- [ ] Logging setup and aggregated
- [ ] Distributed tracing enabled
- [ ] Alert channels configured
- [ ] Alert rules created
- [ ] Synthetic monitoring setup
- [ ] Security monitoring enabled
- [ ] Business metrics dashboard created
- [ ] Audit logging enabled
- [ ] Backup strategy implemented
- [ ] Disaster recovery tested
- [ ] Runbooks documented

---

## Support

For monitoring issues:
- **Datadog:** https://docs.datadoghq.com
- **New Relic:** https://docs.newrelic.com
- **CloudWatch:** https://docs.aws.amazon.com/cloudwatch

Good luck! 🚀
