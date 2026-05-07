/**
 * Public-surface smoke (PRP-220.21).
 *
 * Validates that Playwright is wired correctly + the dev server is
 * reachable on the expected port. Targets pages that don't require
 * authentication so the test passes against any deployment without a
 * pre-seeded test user.
 *
 * Run with `npm run e2e -- --project=desktop e2e/smoke.spec.ts` after
 * starting `npm run dev`.
 */
import { test, expect } from '@playwright/test';

test('home page returns 2xx and renders the Smart Pantry shell', async ({ page }) => {
  const response = await page.goto('/');
  expect(response, 'no response from baseURL').not.toBeNull();
  expect(response!.ok(), `unexpected status ${response!.status()}`).toBe(true);

  // The shell mounts a <main> + the app title in the document. We
  // don't assert specific copy because the home page evolves; we only
  // care that the SPA boots and React paints something useful.
  await expect(page).toHaveTitle(/.+/);
  await expect(page.locator('body')).not.toBeEmpty();
});

test('auth page renders the login form', async ({ page }) => {
  await page.goto('/auth');
  // shadcn Input with type=email — accept any localised label.
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await expect(emailInput).toBeVisible({ timeout: 5000 });
});

test('unknown route shows the NotFound page', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist');
  expect(response).not.toBeNull();
  // SPA serves index.html for every route (200), but the body should
  // mount the NotFound component. Match either the 404 shell or the
  // generic "Page introuvable" copy.
  const body = page.locator('body');
  await expect(body).toContainText(/404|introuvable|not found/i, { timeout: 5000 });
});
