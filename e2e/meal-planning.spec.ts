/**
 * `/kitchen/meal-planning` smoke (P0.1 regression guard).
 *
 * Before this fix, the page threw on every visit because
 * `useCipherMealPlanning` destructured `familyProfiles` while
 * `useFamilyMode` exposes `availableProfiles`. The page tried to read
 * `.length` on `undefined` and React mounted the error boundary.
 *
 * This test asserts the page mounts without surfacing the
 * react-router "Unexpected Application Error!" overlay or our
 * ErrorBoundary fallback. It runs without authentication because the
 * crash happened before any auth gate in the previous render path.
 */
import { test, expect } from '@playwright/test';

test('/kitchen/meal-planning mounts without surfacing the React error overlay', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/kitchen/meal-planning');

  // Either the auth gate redirects us to /auth or the page renders.
  // What MUST NOT happen is the react-router default error overlay
  // ("Unexpected Application Error!") or our shell-level error
  // boundary surfacing a runtime crash.
  await expect(page.locator('body')).not.toContainText(
    /Unexpected Application Error|Cannot read properties of undefined/i,
    { timeout: 5000 }
  );

  // Sanity: the documented crash literal must not show up in console.
  const cipherCrash = consoleErrors.find((line) =>
    /Cannot read properties of undefined \(reading 'length'\)/.test(line)
  );
  expect(cipherCrash, `meal-planning crash regressed:\n${cipherCrash}`).toBeUndefined();
});
