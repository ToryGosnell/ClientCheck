ClientCheck Enterprise Value Expansion

Added in this handoff:
- Collections & recovery workflows
- Deposit / prepay recommendation tools
- Contractor benchmarking views
- Smart job intake assistant scaffolding
- Market reputation passport scaffolding
- B2B partnerships hub
- ClientCheck Enterprise overview
- Review-to-claim workflow scaffolding
- Predictive territory intelligence
- Embedded financing / payment control scaffolding

Server additions:
- server/services/enterprise-value-service.ts
- Expanded server/routes/platform.ts endpoints

Database additions:
- drizzle/0016_enterprise_operating_system.sql
- Drizzle schema exports appended in drizzle/schema.ts

App additions:
- app/collections-recovery.tsx
- app/deposit-prepay-tools.tsx
- app/contractor-benchmarking.tsx
- app/smart-intake-assistant.tsx
- app/market-reputation-passport.tsx
- app/b2b-partnerships.tsx
- app/enterprise-platform.tsx
- app/review-to-claim.tsx
- app/predictive-territory-intelligence.tsx
- app/payment-control.tsx
- Home screen quick links for new areas

Notes:
- These additions are implementation-ready scaffolding and sample in-memory services.
- Your developer should connect these endpoints to persistent DB reads/writes and verify the complete app locally.
