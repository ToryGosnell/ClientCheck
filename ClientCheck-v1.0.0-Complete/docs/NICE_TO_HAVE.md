# Nice-to-have — post-launch

Optional improvements once core launch is done.

---

## More tests

- **Re-enable excluded suites:** Fix path resolution and/or add `server/_core/db.ts` so `phase4-security` and `phase5-fraud-identity` run. See `tests/README.md`.
- **Integration tests:** Run `fraud-signals-service` and `integration-import-service` with a test `DATABASE_URL` and include in CI when you have a test DB.
- **E2E:** Add Playwright or Detox for critical flows (sign up, add customer, subscription, dispute).
- **API smoke script:** Extend the `SMOKE_TEST.md` curl example into a small script (e.g. `scripts/smoke-api.mjs`) that hits `/api/health`, optional auth, and reports pass/fail.

---

## Performance

- **DB:** Add indexes for hot queries (e.g. customer search by name/phone, reviews by customer/contractor). Use `EXPLAIN` on slow queries.
- **App:** Lazy-load heavy screens or tabs; avoid large lists without virtualization (e.g. `FlatList` with `windowSize`).
- **Images:** Use `expo-image` or sized thumbnails for review/photo lists; consider CDN for S3 URLs.
- **Bundle:** Run `npx expo export` and check bundle size; use dynamic imports for admin or rarely used flows if needed.

---

## i18n (internationalization)

- **Library:** e.g. `expo-localization` + `i18next` (or `react-i18next`) to switch locale and load translation JSON.
- **Scope:** Start with one extra locale (e.g. Spanish); wrap visible strings in `t('key')` and add a language picker in settings.
- **Store:** Store listing and in-app legal copy can stay English initially; add translated store listings when expanding regions.

---

## Accessibility (a11y)

- **Labels:** Add `accessibilityLabel` (and `accessibilityHint` where helpful) to buttons, links, and form fields so screen readers announce them.
- **Roles:** Use `accessibilityRole="button"`, `"link"`, `"header"` etc. on pressables and headings.
- **Focus order:** Ensure tab order and focus management in modals and forms are logical.
- **Contrast:** Check text/background contrast (e.g. WCAG AA); avoid low-contrast muted text for critical actions.
- **Testing:** Use TalkBack (Android) and VoiceOver (iOS) for a quick pass on main flows.
