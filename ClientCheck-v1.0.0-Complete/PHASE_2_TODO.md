# Phase 2: Replace Demo/In-Memory Logic - TODO

## 2.1 Referral Rewards System
- [ ] Review existing `referral_rewards` table schema
- [ ] Review existing `referral_claims` table schema
- [ ] Implement `generateReferralCode(userId)` - save to DB
- [ ] Implement `trackReferral(referrerCode, newUserId)` - save to DB
- [ ] Implement `claimReward(referralId)` - update DB
- [ ] Implement `getReferralHistory(userId)` - query DB
- [ ] Implement `getReferralStats(userId)` - query DB
- [ ] Create API endpoints in routers.ts
- [ ] Add unit tests for referral service
- [ ] Add integration tests for referral flow

## 2.2 Integration Import Jobs
- [ ] Review `integrationWebhookReceipts` table schema
- [ ] Implement `createImportJob(integrationId, jobData)` - save to DB
- [ ] Implement `updateImportStatus(jobId, status)` - update DB
- [ ] Implement `getImportHistory(userId)` - query DB
- [ ] Implement `getImportJobDetails(jobId)` - query DB
- [ ] Create API endpoints in routers.ts
- [ ] Add unit tests for import service
- [ ] Add integration tests for import flow

## 2.3 Fraud Signals
- [ ] Review `fraudSignals` table schema
- [ ] Implement `recordFraudSignal(reviewId, signals, score)` - save to DB
- [ ] Implement `getFraudSignals(reviewId)` - query DB
- [ ] Implement `getFraudHistory(customerId)` - query DB
- [ ] Implement `getFraudStats(customerId)` - query DB
- [ ] Create API endpoints in routers.ts
- [ ] Add unit tests for fraud signals service
- [ ] Add integration tests for fraud signals flow

## 2.4 Notification History
- [ ] Review `notificationDeliveries` table schema (already persistent ✅)
- [ ] Implement `listNotificationHistory(userId, limit)` - query DB
- [ ] Implement `markNotificationRead(notificationId)` - update DB
- [ ] Implement `getNotificationStats(userId)` - query DB
- [ ] Create API endpoints in routers.ts
- [ ] Add unit tests for notification history
- [ ] Add integration tests for notification flow

## 2.5 Referral Promo Service
- [ ] Review `growthCampaigns` table schema
- [ ] Implement `createPromo(data)` - save to DB
- [ ] Implement `getPromo(promoId)` - query DB
- [ ] Implement `listPromos(userId)` - query DB
- [ ] Implement `trackPromoUsage(promoId, userId)` - save to DB
- [ ] Create API endpoints in routers.ts
- [ ] Add unit tests for promo service
- [ ] Add integration tests for promo flow

## 2.6 Verification & Email Tokens
- [ ] Review `emailVerificationTokens` table (already persistent ✅)
- [ ] Review `verificationDocuments` table (already persistent ✅)
- [ ] Verify email verification flow is working
- [ ] Verify contractor verification flow is working
- [ ] Add integration tests if missing

## 2.7 Audit Logging
- [ ] Review `auditLogs` table (already persistent ✅)
- [ ] Verify audit logging is called on all actions
- [ ] Add audit logging to new endpoints
- [ ] Add integration tests for audit logging

## 2.8 Testing & Validation
- [ ] Run all existing tests
- [ ] Add new unit tests for all services
- [ ] Add integration tests for all flows
- [ ] Verify database persistence
- [ ] Check for any remaining in-memory state

## Summary
- Total tasks: 48
- Completed: 0
- In progress: 0
- Blocked: 0
