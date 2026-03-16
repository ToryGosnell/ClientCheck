# ClientCheck rollout and alerting

## Environments
- local: developer machines
- staging: docker-compose.staging.yml backed by a disposable MySQL database
- production: managed MySQL + managed secrets + rolling deploys

## Minimum alerts
- API health endpoint failing for 3 consecutive checks
- Stripe webhook processing failures
- integration webhook replay detection
- notification delivery failure rate > 5% over 15 minutes
- database connection failures

## Rollback plan
1. Stop deploy traffic.
2. Re-point app to previous release.
3. Restore DB from the latest snapshot if a destructive migration ran.
4. Re-run smoke tests for auth, risk checks, reviews, disputes, and subscriptions.
