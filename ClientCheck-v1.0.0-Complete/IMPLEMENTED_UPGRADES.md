# ClientCheck implementation changes

This handoff includes real code changes to move the app closer to a production launch:

- Removed `react-native-call-detection` usage from the shipped build to avoid Google Play restricted-permission issues.
- Updated Expo config to use a production Android package id: `com.clientcheck.app`.
- Mounted Express routes for risk scores, dispute moderation, verification, referrals, beta signup, email verification, support, subscription recovery, and partner risk-check integrations.
- Wired review creation to automatically recalculate the customer risk score and create a moderation record when fraud signals are detected.
- Added a new partner integration endpoint: `POST /api/integrations/risk-check`.
- Added Drizzle migration `0011_platform_scale_up.sql` with tables for review evidence, fraud signals, contractor reputation, referral campaigns, partner API keys, and webhook deliveries.

## Next required step
Run a clean install after opening the project:

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
```

Then build with:

```bash
eas build -p android --profile production
```
