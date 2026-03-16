# Phase 3: Screen Migration Guide

Complete guide for wiring all mobile screens to the new API hooks.

## Overview

All mobile screens need to be updated to:
1. Import the appropriate hook (`useSearch`, `useReviews`, etc.)
2. Replace direct `trpc` calls with hook methods
3. Add proper error handling and loading states
4. Handle API responses and display real data

## Screen-by-Screen Migration

### 1. Search Screen (`app/(tabs)/search.tsx`)

**Current State:** Uses direct `trpc.customers.search.useQuery()` calls

**Required Changes:**

```typescript
// Before
const { data: results, isLoading } = trpc.customers.search.useQuery(
  { query },
  { enabled: isAuthenticated && query.length >= 2 }
);

// After
const { search, getFlaggedCustomers, getTopRatedCustomers, isSearching, searchError } = useSearch();
const [results, setResults] = useState<Customer[]>([]);

const handleSearch = async (text: string) => {
  setQuery(text);
  if (text.length >= 2) {
    try {
      const { data } = await search(text);
      setResults((data as Customer[]) || []);
    } catch (error) {
      Alert.alert("Search Error", "Failed to search customers");
    }
  }
};
```

**Effort:** 2-3 hours

---

### 2. Add Review Screen (`app/add-review.tsx`)

**Current State:** Placeholder review submission

**Required Changes:**

```typescript
// Import hook
import { useReviews } from "@/hooks/useReviews";

// Use hook
const { submitReview, recordFraudSignal, isSubmitting, submitError } = useReviews();

// Handle submission
const handleSubmitReview = async () => {
  try {
    const result = await submitReview({
      customerId: selectedCustomerId,
      contractorUserId: ctx.user.id,
      overallRating,
      categoryRatings,
      reviewText,
      redFlags,
      tradeType,
      jobAmount,
    });

    if (result.success) {
      // Record fraud signals if detected
      if (detectedSignals.length > 0) {
        await recordFraudSignal({
          reviewId: result.reviewId,
          customerId: selectedCustomerId,
          contractorUserId: ctx.user.id,
          signals: detectedSignals,
          riskScore: fraudScore,
          flaggedForModeration: fraudScore > 70,
        });
      }
      
      Alert.alert("Success", "Review submitted");
      router.back();
    }
  } catch (error) {
    Alert.alert("Error", "Failed to submit review");
  }
};
```

**Effort:** 3-4 hours

---

### 3. Referrals Screen (`app/referrals.tsx`)

**Current State:** Placeholder referral display

**Required Changes:**

```typescript
// Import hook
import { useReferrals } from "@/hooks/useReferrals";

// Use hook
const { 
  status, 
  rewards, 
  referrals, 
  sendInvitation, 
  isLoadingStatus,
  isSendingInvitation 
} = useReferrals();

// Load data on mount
useEffect(() => {
  getStatus();
  getRewards();
  getReferrals();
}, []);

// Handle invitation
const handleSendInvitation = async (email: string) => {
  try {
    const result = await sendInvitation(email);
    if (result.success) {
      Alert.alert("Success", "Invitation sent");
      setEmail("");
    }
  } catch (error) {
    Alert.alert("Error", "Failed to send invitation");
  }
};
```

**Effort:** 2-3 hours

---

### 4. Notifications Screen (`app/(tabs)/alerts.tsx`)

**Current State:** Placeholder notifications

**Required Changes:**

```typescript
// Import hook
import { useNotifications } from "@/hooks/useNotifications";

// Use hook
const { notifications, getHistory, isLoading } = useNotifications();

// Load on mount
useEffect(() => {
  getHistory(50);
}, []);

// Render notifications
<FlatList
  data={notifications}
  renderItem={({ item }) => (
    <NotificationItem
      title={item.templateKey}
      message={item.payload?.message}
      timestamp={item.createdAt}
      read={item.sentAt !== null}
    />
  )}
/>
```

**Effort:** 1-2 hours

---

### 5. Integrations Screen (`app/software-integrations.tsx`)

**Current State:** Placeholder integration display

**Required Changes:**

```typescript
// Import hook
import { useIntegrations } from "@/hooks/useIntegrations";

// Use hook
const { 
  getImportHistory, 
  getImportStats, 
  retryFailedImports,
  isFetchingHistory,
  isFetchingStats 
} = useIntegrations();

// Load data
useEffect(() => {
  getImportHistory(integrationId, 50);
  getImportStats(integrationId);
}, [integrationId]);

// Handle retry
const handleRetry = async () => {
  try {
    const result = await retryFailedImports(integrationId);
    Alert.alert("Success", `Retried ${result.retriedCount} imports`);
  } catch (error) {
    Alert.alert("Error", "Failed to retry imports");
  }
};
```

**Effort:** 2-3 hours

---

### 6. Moderation Screen (`app/moderation.tsx`)

**Current State:** Needs to be created

**Required Changes:**

```typescript
// Create new screen
import { useModeration } from "@/hooks/useModeration";

export default function ModerationScreen() {
  const { 
    flaggedReviews, 
    getFlaggedReviews, 
    markReviewed,
    isLoadingFlagged,
    isMarkingReviewed 
  } = useModeration();

  useEffect(() => {
    getFlaggedReviews(50);
  }, []);

  const handleApprove = async (signalId: number) => {
    try {
      const result = await markReviewed(signalId, "approved");
      if (result.success) {
        Alert.alert("Success", "Review approved");
        getFlaggedReviews(50); // Refresh
      }
    } catch (error) {
      Alert.alert("Error", "Failed to approve review");
    }
  };

  return (
    <ScreenContainer>
      {isLoadingFlagged ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={flaggedReviews}
          renderItem={({ item }) => (
            <FlaggedReviewCard
              item={item}
              onApprove={() => handleApprove(item.id)}
              onReject={() => handleReject(item.id)}
              onEscalate={() => handleEscalate(item.id)}
            />
          )}
        />
      )}
    </ScreenContainer>
  );
}
```

**Effort:** 3-4 hours

---

### 7. Customer Profile Screen (`app/customer/[id].tsx`)

**Current State:** Placeholder profile display

**Required Changes:**

```typescript
// Import hooks
import { useSearch } from "@/hooks/useSearch";
import { useReviews } from "@/hooks/useReviews";

// Use hooks
const { getRiskProfile } = useSearch();
const { getReviewHistory, getFraudStats } = useReviews();

// Load data
useEffect(() => {
  getRiskProfile(customerId);
  getReviewHistory(customerId);
  getFraudStats(customerId);
}, [customerId]);

// Display profile with real data
<View>
  <Text>Risk Score: {riskProfile?.riskScore}</Text>
  <Text>Reviews: {reviewHistory?.length}</Text>
  <Text>Fraud Flags: {fraudStats?.flaggedReviews}</Text>
</View>
```

**Effort:** 2-3 hours

---

### 8. Contractor Profile Screen (`app/contractor-profile.tsx`)

**Current State:** Placeholder profile display

**Required Changes:**

```typescript
// Import hooks
import { useModeration } from "@/hooks/useModeration";
import { useReferrals } from "@/hooks/useReferrals";

// Use hooks
const { getContractorFraudHistory } = useModeration();
const { status } = useReferrals();

// Load data
useEffect(() => {
  getContractorFraudHistory(contractorId);
}, [contractorId]);

// Display profile
<View>
  <Text>Fraud History: {fraudHistory?.length}</Text>
  <Text>Referrals: {status?.totalReferrals}</Text>
</View>
```

**Effort:** 2-3 hours

---

## Implementation Checklist

### Phase 3A: Core Screens (High Priority)
- [ ] Search Screen - `useSearch` hook
- [ ] Add Review Screen - `useReviews` hook
- [ ] Referrals Screen - `useReferrals` hook

### Phase 3B: Admin & Secondary Screens
- [ ] Moderation Screen - `useModeration` hook (create new)
- [ ] Notifications Screen - `useNotifications` hook
- [ ] Integrations Screen - `useIntegrations` hook

### Phase 3C: Profile Screens
- [ ] Customer Profile - `useSearch` + `useReviews` hooks
- [ ] Contractor Profile - `useModeration` + `useReferrals` hooks

### Phase 3D: Testing & Validation
- [ ] Unit tests for each screen
- [ ] Integration tests for each flow
- [ ] E2E flow validation
- [ ] Error handling verification
- [ ] Loading state verification

## Common Patterns

### Error Handling Pattern
```typescript
try {
  const result = await hookMethod(params);
  if (result.success) {
    // Handle success
    Alert.alert("Success", successMessage);
  }
} catch (error) {
  Alert.alert("Error", error.message || "An error occurred");
}
```

### Loading State Pattern
```typescript
{isLoading ? (
  <ActivityIndicator size="large" />
) : data.length > 0 ? (
  <FlatList data={data} renderItem={renderItem} />
) : (
  <Text>No data found</Text>
)}
```

### Data Refresh Pattern
```typescript
useEffect(() => {
  loadData();
}, []);

const handleRefresh = async () => {
  setRefreshing(true);
  try {
    await loadData();
  } finally {
    setRefreshing(false);
  }
};
```

## Testing Strategy

### Unit Tests
- Test each hook in isolation
- Mock API responses
- Verify error handling

### Integration Tests
- Test screen + hook integration
- Verify data flow from API to UI
- Test user interactions

### E2E Tests
- Test complete user flows
- Verify data persistence
- Test error recovery

## Timeline

- **Phase 3A (Core Screens):** 8-10 hours
- **Phase 3B (Admin & Secondary):** 6-8 hours
- **Phase 3C (Profile Screens):** 4-6 hours
- **Phase 3D (Testing):** 8-10 hours

**Total Phase 3:** 26-34 hours

## Success Criteria

✅ All screens connected to real APIs
✅ All data flows end-to-end
✅ Proper error handling on all screens
✅ Loading states on all screens
✅ User confirmations on all actions
✅ 90%+ test coverage
✅ Zero placeholder data
✅ All flows validated with real data
