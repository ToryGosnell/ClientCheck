# Tests

## Running tests

```bash
npm run test
```

By default, **unit tests** only run. The following are **excluded** from the default run:

- **phase4-security.test.ts**, **phase5-fraud-identity.test.ts** — Depend on `@/server/_core/db` and server modules that require path resolution and/or a database. Re-enable once path aliases and (optionally) a test DB are configured.
- **fraud-signals-service.test.ts**, **integration-import-service.test.ts** — **Integration tests** that expect a real database and service implementations (e.g. `success: true` from the services). Run with a test `DATABASE_URL` and include them when you need full integration coverage.

## Re-enabling excluded tests

1. **Path / module resolution:** Ensure `vitest.config.ts` resolves `@/` (and `@shared/`) so that imports like `@/server/services/jwt-service` and `@/server/_core/db` work. If `server/_core/db` is missing, add a re-export or fix imports to use `@/server/db` and `getDb()`.
2. **Integration tests:** Set `DATABASE_URL` to a test MySQL instance and remove the corresponding entries from `exclude` in `vitest.config.ts` (or run those files explicitly with `npx vitest run tests/fraud-signals-service.test.ts`).

## Zod v4

Tests use Zod 4. For record types use `z.record(z.string(), z.unknown())` instead of `z.record(z.any())`.
