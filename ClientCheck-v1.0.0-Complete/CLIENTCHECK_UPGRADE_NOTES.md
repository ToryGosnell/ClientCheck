# ClientCheck upgrade notes

This handoff packages a stronger startup-platform foundation into the repo.

## Branding
- standardized the app brand to **ClientCheck**
- updated app slug to `clientcheck`
- updated package metadata to `clientcheck`
- replaced remaining visible `ContractorVet` references in key files

## Production architecture upgrades
- added **12 new schema tables** to support:
  - contractor reputation
  - evidence uploads
  - fraud detection
  - verification documents
  - partner API keys
  - webhook deliveries
  - growth campaigns/events
  - territory alerts
  - customer watchlists

## API additions
- `POST /api/verification/review`
- `GET /api/growth/dashboard`
- `POST /api/growth/campaigns`
- `GET /api/integrations/overview`
- `POST /api/integrations/api-keys`
- `GET /api/platform/overview`

## Important next steps for your developer
1. Run a clean install
2. Regenerate Drizzle metadata
3. Apply migration `0012_clientcheck_platform_foundation.sql`
4. Wire the new schema objects into admin dashboards and mobile UI
5. Add auth/role guards to new admin endpoints before production launch

## Commands
```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm check
eas build -p android --profile production
```

## Honest status
This repo is now a stronger **implementation handoff**, not a verified one-click production release.
Your developer still needs to run and validate the app locally, wire any missing UI flows, and test migrations against the real database.
