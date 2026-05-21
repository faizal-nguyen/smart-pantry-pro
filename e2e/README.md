# Playwright E2E

This directory contains the end-to-end Playwright suite.

Two surfaces :
1. **Public surface** (PRP-220.21) : mocked API, no auth. Smoke + inbox
   flow.
2. **Authenticated mobile foundation** (PRP-238 PR1 etape e) : real
   Supabase session via storage state, 3 mobile viewports, captures of
   reference + tap target guardrails.

## Layout

```
e2e/
├── .auth/                       # gitignored: storage state Supabase
├── auth.setup.ts                # login + capture storageState (PRP-238)
├── fixtures.ts                  # mockedApiPage + MockState (PRP-220)
├── mobile-foundation.spec.ts    # captures auth 7 routes x 3 viewports
├── mobile-guardrails.spec.ts    # public guardrails (touch targets, no overlap)
├── smoke.spec.ts                # public surface
└── inbox-flow.spec.ts           # capture flow (mocked)
```

## Running locally

```bash
# 1. Install browser binaries (once)
npx playwright install --with-deps chromium

# 2. Start the dev server in another shell
npm run dev

# 3. Run the public suite (no auth needed)
npm run e2e                # all projects
npm run e2e -- --project=desktop e2e/smoke.spec.ts
npm run e2e:ui             # interactive watch mode
```

`E2E_BASE_URL` overrides the target — point it at any preview deploy.

## Authenticated mobile foundation (PRP-238 PR1 etape e)

### Pre-requisites

Add to `.env.local` (NEVER commit these values) :

```bash
# Supabase test user used by Playwright for authenticated captures
E2E_TEST_USER_EMAIL=your.test.account@example.com
E2E_TEST_USER_PASSWORD=your-test-password
```

The test user must :
- Exist in your Supabase project (sign up via the app's /auth page).
- Have at least one recipe in their library (Instagram import, manual
  add, etc.). The recipe id is auto-discovered by clicking the first
  card on `/kitchen/recipes`, no env var needed (PRP-238 V3.3 strategy b).

### Run the authenticated suite

```bash
# Single viewport, full mobile-foundation suite
npm run e2e -- --project=mobile-auth-se e2e/mobile-foundation.spec.ts

# All 3 mobile viewports (iPhone SE, Pro Max, Pixel 7)
npm run e2e -- --project=mobile-auth-se --project=mobile-auth-pro-max --project=mobile-auth-pixel
```

The first run executes `auth.setup.ts` which :
1. Logs in via `/auth` using the env vars above.
2. Captures the session into `e2e/.auth/user.json` (gitignored).

Subsequent runs reuse the storage state, no re-login until the token
expires (Supabase default : 1h).

### Regenerate storage state

If your session expires or the token leaks :

```bash
rm e2e/.auth/user.json
npm run e2e -- --project=setup
```

### Screenshots

Captures are written to `e2e/screenshots/mobile-foundation/` (gitignored).
Use them as before/after reference when iterating on mobile UX.

## Mocked API

`fixtures.ts` exposes a `mockedApiPage` Page with every
`/api/imports/social/**` route stubbed via `page.route()`. State lives
in a per-test `MockState` object, so capture → list → extract → save
threads through coherently across mocked calls. No backend required.

## Gaps to close

- ~~**Auth seeding**~~ **CLOSED (PRP-238 PR1 etape e)** : `auth.setup.ts`
  + `storageState` configures dans `playwright.config.ts`. Voir section
  "Authenticated mobile foundation" ci-dessus.
- **CI workflow**: `.github/workflows/e2e.yml` is not in this PR. The
  blocker now is environment variable management : `E2E_TEST_USER_EMAIL`
  + `E2E_TEST_USER_PASSWORD` doivent etre injectes en secrets GitHub
  Actions, et le storage state ne doit jamais persister entre les runs.
- **Visual snapshots**: maintenant possible (auth seed dispo). Les
  screenshots de reference sont dans `e2e/screenshots/mobile-foundation/`.
  Pour les transformer en visual regression tests, ajouter
  `expect(page).toHaveScreenshot('...')` au lieu de `page.screenshot()`.

## Adding a scenario

1. Pull `test` from `./fixtures` (not `@playwright/test`) so the
   mocked API is available.
2. Use `mockedApiPage` if the test exercises imports.social; use the
   plain `page` if it only touches public surface.
3. Prefer accessible selectors (`getByRole`, `getByLabel`) so the
   tests survive markup churn.
4. Mark anything auth-gated `test.skip(...)` with a one-line comment
   pointing at this README until the auth seed is ready.
