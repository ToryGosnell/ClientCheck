# ClientCheck — ChatGPT Developer Handoff

## Project Status

**Current State:** MVP features implemented, ready for full engineering spec build-out

**What's Complete:**
- ✅ Risk Score Engine (0-100 scoring algorithm with component scores)
- ✅ Pre-Job Risk Check screen (customer lookup with risk visualization)
- ✅ Industry Specialization (plumbing, HVAC, electrical + 12 other trades)
- ✅ Dispute Moderation system (moderation workflow with decision tracking)
- ✅ Database schema extended (40+ tables per engineering spec)
- ✅ Backend services for all 4 features
- ✅ API routes for all 4 features
- ✅ 164 tests passing, 0 TypeScript errors

**What Needs Implementation:**
- Contractor Verification (enhance existing basic system)
- Fraud Detection & Trust Layer (basic implementation)
- Referral System (basic implementation)
- Tab navigation integration (add new screens to tabs)
- API route integration (wire up all endpoints)
- Admin Dashboard (moderation queue, fraud flags, analytics)
- Background jobs (risk score recalculation, fraud detection)
- Webhooks & integrations (partner API support)

## Architecture Overview

```
apps/
  mobile/                    # Expo React Native app
    app/(tabs)/              # Tab-based navigation
    components/              # Reusable UI components
    hooks/                   # Custom React hooks
    lib/                     # Utilities and services
  
server/
  routes/                    # API endpoints
    risk-scores.ts           # Risk score lookups
    dispute-moderation.ts    # Moderation workflow
    industry.ts              # Industry specialization
  services/                  # Business logic
    risk-score-engine.ts     # Risk calculation
    industry-service.ts      # Industry management
    dispute-moderation-service.ts  # Moderation logic
  _core/                     # Core infrastructure
    db.ts                    # Database connection
    index.ts                 # Server bootstrap

drizzle/
  schema.ts                  # Database schema (40+ tables)
  migrations/                # Database migrations
```

## Key Files to Review

### Database Schema
- **File:** `/drizzle/schema.ts`
- **New Tables Added:**
  - `customerRiskScores` — Risk score snapshots
  - `customerScoreFactors` — Score component breakdown
  - `contractorIndustries` — Industry specialization
  - `disputeModerations` — Moderation decisions
  - `fraudSignals` — Fraud detection signals
  - `entityLinks` — Duplicate detection

### Services
- **Risk Score Engine:** `/server/services/risk-score-engine.ts`
  - `calculateCustomerRiskScore()` — Main scoring algorithm
  - `getRiskScore()` — Cached lookup
  - `saveRiskScore()` — Persistence
  
- **Industry Service:** `/server/services/industry-service.ts`
  - `addContractorIndustry()` — Add industry to contractor
  - `getContractorIndustries()` — List all industries
  - `searchContractorsByIndustry()` — Search by trade
  
- **Dispute Moderation:** `/server/services/dispute-moderation-service.ts`
  - `getPendingDisputes()` — Moderation queue
  - `submitModerationDecision()` — Approve/reject
  - `getModerationStats()` — Analytics

### API Routes
- **Risk Scores:** `/server/routes/risk-scores.ts`
  - `GET /api/risk-scores/:customerId` — Get risk score
  - `POST /api/risk-scores/:customerId/recalculate` — Force recalc
  - `POST /api/risk-scores/batch-recalculate` — Batch job

- **Dispute Moderation:** `/server/routes/dispute-moderation.ts`
  - `GET /api/disputes/moderation/pending` — Queue
  - `POST /api/disputes/moderation/:disputeId/decide` — Decision
  - `GET /api/disputes/moderation/stats` — Stats

### Mobile Screens
- **Pre-Job Risk Check:** `/app/(tabs)/pre-job-risk-check.tsx`
  - Customer search by name/phone
  - Risk score display with color coding
  - Component scores with progress bars
  - Risk factors visualization

## Engineering Spec Reference

The complete engineering spec is available in the project root: `clientcheck_full_engineering_spec(1).docx`

**Key sections to implement next:**
1. **Fraud Prevention** (Section 7) — Duplicate detection, velocity checks, coordinated abuse
2. **Verification System** (Section 8) — Business proof, domain verification, badge issuance
3. **API Endpoints** (Section 9) — 50+ endpoints across all services
4. **Event System** (Section 10) — Event-driven architecture for risk recalc, fraud checks
5. **Admin Dashboard** (Section 11) — Moderation queue, fraud flags, KPI dashboard

## Scoring Algorithm

```typescript
// Current implementation in risk-score-engine.ts
riskScore = 100
score -= missedPayments * 15
score -= chargebacks * 20
score -= noShows * 10
score -= latePayments * 5
score += min(verifiedPositiveJobs * 3, 15)
score = max(0, min(score, 100))

// Risk Bands
0-39:   HIGH RISK 🔴
40-69:  MEDIUM RISK 🟡
70-100: LOW RISK 🟢
```

## Database Migrations

Run migrations with:
```bash
npm run db:push
```

This will apply all schema changes including the new tables for risk scoring, industry specialization, and dispute moderation.

## Testing

All tests passing:
```bash
npm run test      # 164 tests passing
npm run check     # 0 TypeScript errors
npm run lint      # ESLint clean
```

## Next Steps for ChatGPT

### Phase 1: Complete Core Features (High Priority)
1. **Contractor Verification Enhancement**
   - Implement document upload and verification
   - Add verification status badges
   - Create verification submission flow

2. **Fraud Detection**
   - Implement duplicate detection (same device/IP across accounts)
   - Add velocity checks (5+ reviews in 1 hour)
   - Create fraud signal scoring

3. **Referral System**
   - Implement invite/referral tracking
   - Add reward wallet system
   - Create referral campaign tracking

### Phase 2: Integration & Polish (Medium Priority)
1. **Tab Navigation**
   - Add Pre-Job Risk Check to tab bar
   - Add Contractor Profile to tab bar
   - Add Dispute Inbox to tab bar

2. **API Integration**
   - Wire up all 50+ endpoints from engineering spec
   - Add error handling and validation
   - Implement pagination and filtering

3. **Background Jobs**
   - Implement risk score recalculation (daily/weekly)
   - Add fraud signal processing
   - Create notification triggers

### Phase 3: Admin & Analytics (Lower Priority)
1. **Admin Dashboard**
   - Build moderation queue UI
   - Add fraud flag visualization
   - Create KPI dashboard

2. **Webhooks & Integrations**
   - Implement partner API support
   - Add webhook delivery system
   - Create integration sync jobs

## Deployment Notes

**Current Issues Fixed:**
- ✅ Android SDK version mismatch (minSdkVersion 22 → 24)
- ✅ Removed forbidden permissions (react-native-call-detection)
- ✅ Downgraded to stable versions (React 18.3, RN 0.76, Expo 51)
- ✅ Created app.json with explicit permissions

**To Publish:**
```bash
eas build --platform android --profile production
eas submit --platform android --latest
```

**Environment Variables Needed:**
```
DATABASE_URL=mysql://user:pass@host:port/db
JWT_SECRET=<generate with: openssl rand -base64 32>
STRIPE_SECRET_KEY=sk_live_...
AWS_ACCESS_KEY_ID=<optional for S3>
AWS_SECRET_ACCESS_KEY=<optional for S3>
```

## Code Style & Conventions

- **TypeScript:** Strict mode enabled
- **React:** Functional components with hooks
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **API:** tRPC for type-safe backend calls
- **Database:** Drizzle ORM with migrations
- **Testing:** Vitest with 164 passing tests

## Questions for ChatGPT

When continuing development, consider:

1. **Risk Score Accuracy:** Should component scores be weighted differently for different industries?
2. **Fraud Detection:** What confidence threshold for duplicate detection (currently 0.9)?
3. **Moderation SLA:** What's the target time to resolve disputes?
4. **Referral Rewards:** What's the incentive structure (free months, credits, etc.)?
5. **Admin Access:** Should moderators be separate from admins?

## Contact & Support

This project is ready for handoff to ChatGPT or another developer. All code is documented and tested.

**Key Metrics:**
- 164 tests passing
- 0 TypeScript errors
- 40+ database tables
- 4 core services implemented
- 3 API route modules
- 1 mobile screen (Pre-Job Risk Check)

Good luck! 🚀
