# ClientCheck production hardening additions

This handoff adds real persistence and platform-hardening scaffolding for the most important production gaps:

## Added in this upgrade
- DB-backed email verification tokens
- DB-backed contractor verification workflow
- DB-backed referral tracking and rewards
- audit log table + write service
- role/auth scaffolding middleware
- persistent rate limiting table + middleware
- review policy acceptance workflow
- notification delivery queue/logging
- partner API key scopes + rotation endpoint scaffolding
- integration usage metering
- customer identity profiles, match suggestions, and merge events
- dispute escalation records
- CI workflow and environment template

## Important
These changes move the repo much closer to a real platform, but they still need local install, migration, and end-to-end testing before release.

## Suggested next commands
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm check
