# PRP-220.21 — Playwright E2E

This directory contains the end-to-end Playwright suite for the
recipe-import surface. The harness is intentionally small — three
viewport projects, mocked API, no auto-launched dev server — so the
suite is cheap to run locally and easy to extend without committing
to a CI Postgres or a Supabase test fixture.

## Layout

```
e2e/
├── fixtures.ts          # mockedApiPage + MockState (in-memory inbox)
├── smoke.spec.ts        # public surface (no auth needed)
└── inbox-flow.spec.ts   # capture → extract → save (skipped, see below)
```

## Running locally

```bash
# 1. Install browser binaries (once)
npx playwright install --with-deps chromium

# 2. Start the dev server in another shell
npm run dev

# 3. Run the suite
npm run e2e                # all projects
npm run e2e -- --project=desktop e2e/smoke.spec.ts
npm run e2e:ui             # interactive watch mode
```

`E2E_BASE_URL` overrides the target — point it at any preview deploy.

## Mocked API

`fixtures.ts` exposes a `mockedApiPage` Page with every
`/api/imports/social/**` route stubbed via `page.route()`. State lives
in a per-test `MockState` object, so capture → list → extract → save
threads through coherently across mocked calls. No backend required.

## Gaps to close

- **Auth seeding**: the inbox is behind `/kitchen/recipes`, which
  requires a real Supabase session. The flow test in
  `inbox-flow.spec.ts` is `test.skip`'d until we wire a `storageState`
  containing a `sb-<project>-auth-token`. Workflow:
  1. Create a dedicated test user in the dev Supabase project.
  2. Capture its session JSON via `page.context().storageState()`.
  3. Reference it in `playwright.config.ts` via `use.storageState`.
- **Visual snapshots**: the PRP plans baseline screenshots across
  five viewports. Held until the auth seed lands — visuals against
  unauthenticated pages would only cover `/auth` and `/`, which is
  thin signal.
- **CI workflow**: `.github/workflows/e2e.yml` is not in this PR. The
  blocker is the same as auth seeding — we need a way for CI to mint
  a Supabase session deterministically.

## Adding a scenario

1. Pull `test` from `./fixtures` (not `@playwright/test`) so the
   mocked API is available.
2. Use `mockedApiPage` if the test exercises imports.social; use the
   plain `page` if it only touches public surface.
3. Prefer accessible selectors (`getByRole`, `getByLabel`) so the
   tests survive markup churn.
4. Mark anything auth-gated `test.skip(...)` with a one-line comment
   pointing at this README until the auth seed is ready.
