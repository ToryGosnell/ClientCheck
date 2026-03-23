# Local development

## Full stack (recommended for search, tRPC, DB)

```bash
npm run dev
```

Runs **API + Metro web** together (`dev:server` + `dev:metro`). The app’s tRPC client calls `/api/trpc` on **`EXPO_PUBLIC_API_BASE_URL`** — align that with wherever `dev:server` listens (often `http://localhost:3000`).

## Environment

| Variable | Role |
|----------|------|
| `DATABASE_URL` | MySQL for `server/` — same DB the API queries |
| `EXPO_PUBLIC_API_BASE_URL` | Base URL baked into the Expo client for API calls |
| `EXPO_PUBLIC_DEMO_MODE` | Set **`false`** for real backend search/data |

Use **`.env.example`** as a template. Client and server should target the **same** API + DB story (e.g. local API + local DB, or production URL + production DB).

## Schema migrations

After pulling schema changes:

```bash
npm run db:migrate
```

Apply against the database in `DATABASE_URL` (dev/staging/prod as appropriate).

If migrate **fails** (e.g. `ER_PARSE_ERROR` on multi-statement batches, or tables already partially created), the DB may be **ahead/behind** the migration journal. Fix by using a clean dev database, repairing `__drizzle_migrations`, or applying SQL manually—there is no one-size fix in-repo.

## Search test data

Idempotent seed (skips existing phones):

```bash
npm run db:seed:search
```
