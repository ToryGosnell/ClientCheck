# Phase 3: End-to-End Mobile-to-Backend Wiring - TODO

## 3.1 Search & Risk Check Flow
- [ ] Update `app/search.tsx` to call `risk.searchCustomers()` API
- [ ] Replace placeholder customer data with API results
- [ ] Add loading/error states
- [ ] Wire risk score display to real data
- [ ] Add pre-job risk check flow
- [ ] Test end-to-end: search → risk check → display

## 3.2 Add Review Flow
- [ ] Update `app/add-review.tsx` to call `reviews.createReview()` API
- [ ] Wire fraud detection signals to `fraud.recordSignal()` API
- [ ] Add review submission loading state
- [ ] Add success/error handling
- [ ] Test end-to-end: form → API → database

## 3.3 Referral Flow
- [ ] Update `app/referrals.tsx` to call `referrals.sendInvitation()` API
- [ ] Wire referral status to `referrals.getReferralStatus()` API
- [ ] Display referral rewards from `referrals.getReferralRewards()` API
- [ ] Add invitation email sending
- [ ] Test end-to-end: invite → email → tracking

## 3.4 Notifications Flow
- [ ] Update `app/notifications.tsx` to call `notifications.getHistory()` API
- [ ] Replace placeholder notifications with real data
- [ ] Add notification history pagination
- [ ] Add mark-as-read functionality
- [ ] Test end-to-end: notification → display → read

## 3.5 Integration Imports Flow
- [ ] Update `app/software-integrations.tsx` to call `integrations.createImportJob()` API
- [ ] Wire import history to `integrations.getImportHistory()` API
- [ ] Display import stats from `integrations.getImportStats()` API
- [ ] Add retry failed imports button
- [ ] Test end-to-end: import → tracking → display

## 3.6 Admin Moderation Flow
- [ ] Create/update `app/admin/moderation.tsx` screen
- [ ] Wire to `fraud.getFlaggedForModeration()` API
- [ ] Add review action buttons (approve/reject/escalate)
- [ ] Wire to `fraud.markReviewed()` API
- [ ] Add moderation history display
- [ ] Test end-to-end: flagged review → moderation → action

## 3.7 Customer Profile Flow
- [ ] Update `app/customer-profile.tsx` to call `customers.getProfile()` API
- [ ] Wire fraud stats to `fraud.getCustomerStats()` API
- [ ] Display fraud history from `fraud.getCustomerFraudHistory()` API
- [ ] Add customer identity merge functionality
- [ ] Test end-to-end: profile → stats → history

## 3.8 Contractor Profile Flow
- [ ] Update `app/contractor-profile.tsx` to call `contractors.getProfile()` API
- [ ] Wire fraud stats to `fraud.getContractorFraudHistory()` API
- [ ] Display referral information
- [ ] Add verification status display
- [ ] Test end-to-end: profile → verification → stats

## 3.9 API Client Hooks
- [ ] Create `hooks/useSearch.ts` - Search and risk check
- [ ] Create `hooks/useReviews.ts` - Review submission
- [ ] Create `hooks/useReferrals.ts` - Referral management
- [ ] Create `hooks/useNotifications.ts` - Notification history
- [ ] Create `hooks/useIntegrations.ts` - Integration imports
- [ ] Create `hooks/useFraud.ts` - Fraud signals
- [ ] Create `hooks/useModeration.ts` - Admin moderation

## 3.10 Error Handling & Loading States
- [ ] Add error boundaries to all screens
- [ ] Add loading skeletons for all data
- [ ] Add retry buttons on failures
- [ ] Add offline detection
- [ ] Add timeout handling
- [ ] Add rate limit handling

## 3.11 Data Validation
- [ ] Validate API responses match expected schema
- [ ] Add TypeScript types for all API responses
- [ ] Add runtime validation with Zod
- [ ] Handle missing/null fields gracefully
- [ ] Add fallback values for missing data

## 3.12 Testing & Validation
- [ ] Create end-to-end test for search flow
- [ ] Create end-to-end test for review flow
- [ ] Create end-to-end test for referral flow
- [ ] Create end-to-end test for notification flow
- [ ] Create end-to-end test for integration flow
- [ ] Create end-to-end test for moderation flow
- [ ] Run all tests and verify passing

## Summary
- Total tasks: 60+
- Completed: 0
- In progress: 0
- Blocked: 0
