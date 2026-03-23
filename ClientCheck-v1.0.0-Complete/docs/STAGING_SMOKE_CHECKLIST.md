# Staging smoke checklist (invited beta)

Run on **staging** with `EXPO_PUBLIC_DEMO_MODE=false` and staging API URL. Sign each line when verified.

See also: `.env.example`, `docs/CLOSED_BETA_DEPLOY.md`.

---

## Before handoff (infra — do once per staging environment)

### OAuth redirects
- [ ] **Server:** `OAUTH_SERVER_URL`, `VITE_APP_ID` (server), and portal configuration use the **same app** as client `EXPO_PUBLIC_APP_ID` / portal URLs.
- [ ] **Web callback:** After OAuth in a browser, you land on your **staging web origin** (not `localhost`). `OAUTH_WEB_REDIRECT_URL` or `APP_BASE_URL` / `FRONTEND_URL` matches that host.
- [ ] **Mobile:** OAuth return uses your app scheme / universal link; session or token ends up in the installed **staging** build (not production API).

### Stripe webhooks
- [ ] Stripe Dashboard → Webhooks: endpoint is **`https://<staging-api-host>/api/webhooks/stripe`** (or your actual route), not production-only if this is staging.
- [ ] `STRIPE_WEBHOOK_SECRET` on the **staging** server matches the **staging** webhook signing secret in Stripe.
- [ ] After a **test** payment or Stripe CLI `stripe trigger` for your subscribed events, server logs/DB show subscription or payment updated (no silent failures).

### Algolia search / index
- [ ] **Client:** `EXPO_PUBLIC_ALGOLIA_APP_ID`, `EXPO_PUBLIC_ALGOLIA_SEARCH_API_KEY` (or `EXPO_PUBLIC_ALGOLIA_SEARCH_KEY`), `EXPO_PUBLIC_ALGOLIA_CUSTOMERS_INDEX_NAME` match the **staging** index (usually same names as server).
- [ ] **Server:** `ALGOLIA_*` admin key can read/write that index; run reindex from admin if index is empty.
- [ ] Search returns **known** staging customers; if Algolia is empty/misconfigured, **tRPC fallback** still returns results.

### EAS build env (invite binary)
- [ ] The **profile** you use for the invite build (`preview` / `production`) has EAS secrets: at minimum `EXPO_PUBLIC_API_BASE_URL` → **staging API** (no `localhost`).
- [ ] Same profile includes Stripe publishable, Algolia client vars, OAuth `EXPO_PUBLIC_*` for **staging**.
- [ ] `EXPO_PUBLIC_DEMO_MODE` is **not** `true` on the build you ship.
- [ ] Note **build ID / git SHA** on the sign-off line for support.

---

## Contractor signup / login
- [ ] Open **Select account** → **Continue as contractor** (spinner shows on native; web redirects).
- [ ] Complete OAuth; land in app **signed in** (tabs visible).
- [ ] **Sign out** (if available) and sign in again — session restores.

## Customer signup / login
- [ ] **Select account** → **Continue as customer** → OAuth completes; customer-appropriate home or tabs.
- [ ] Sign out / sign in again if your build exposes it (e.g. Settings).

## Search
- [ ] Enter 2+ chars — **loading** then results (Algolia if configured).
- [ ] With Algolia configured, turn off network or break key briefly — **tRPC fallback** or error: generic message in production (not raw stack).
- [ ] Zero hits — empty state; no crash.

## Customer profile
- [ ] Open profile from search — loads; **Track** toggles; back works.
- [ ] Invalid `/customer/999999` — **not found** + go back.
- [ ] Kill API mid-load — **Couldn’t load** + **Retry** + go back.

## Track / alerts
- [ ] Track a customer from profile — **Tracking** state persists after leaving screen.
- [ ] **Alerts** → **Community**: list or empty state; on API failure — **Couldn’t load** + **Retry**.
- [ ] **Alerts** → **Saved** (signed in): sync / empty tracked / alerts list as expected.

## Paywall / payment
- [ ] Reach paywall (contractor or customer path) — **loading** on pay CTA; no double-charge from double-tap.
- [ ] Complete test payment — **success** screen; subscription status updates (Stripe webhook on server).

## Dispute submission
- [ ] Open dispute from review — form loads; **Submit** shows **Submitting…** and is disabled while in flight.
- [ ] Success — confirmation; failure — alert with message (not silent).

## Customer response (contractor view)
- [ ] Open a **review** that has a customer response (`/review/[id]` or from customer profile).
- [ ] **Customer response** section or badge appears when data exists; no crash if none.

## Admin login / moderation
- [ ] Admin user opens **`/admin`** — access granted; non-admin — blocked.
- [ ] Moderation / disputes / payments tabs load or show clear errors.

## Beta funnel tab
- [ ] **Admin** → **Beta funnel** — loads counts or **setup/query** message (PostHog keys on server).
- [ ] tRPC failure — error panel (not blank).

## Sign-off
- [ ] **Settings** (signed in) shows **app version** (and native **build** when available) for support triage.
- [ ] Date: ______  Tester: ______  Build / commit: ______  EAS build ID (if native): ______
