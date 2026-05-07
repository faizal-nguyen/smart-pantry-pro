/**
 * Inbox capture -> extract -> save E2E (PRP-220.21).
 *
 * STATUS: skipped by default. The whole flow happens behind the auth
 * gate (`/kitchen/recipes?tab=inbox`), and the auth gate is backed by
 * a real Supabase session. To enable:
 *
 *   1. Provision a test user in your Supabase project (see
 *      docs/e2e-testing.md — TODO).
 *   2. Inject the access_token into localStorage via the Playwright
 *      `storageState` mechanism (or a `page.addInitScript` step that
 *      seeds `sb-<project>-auth-token`).
 *   3. Drop the `.skip` below.
 *
 * The mocked API surface (`mockedApiPage`) already covers the imports
 * routes, so once the auth seed is in place this test should turn
 * green without further changes.
 */
import { test, expect } from './fixtures';

test.describe('Inbox: capture → extract → save', () => {
  test.skip(
    true,
    'Requires a seeded Supabase test user. See e2e/README.md for the setup steps.'
  );

  test('captures an Instagram URL, extracts a draft, and saves it as a recipe', async ({
    mockedApiPage: page,
    mockState,
  }) => {
    await page.goto('/kitchen/recipes?tab=inbox');

    // Capture
    await page
      .getByPlaceholder(/Colle une URL/)
      .fill('https://www.instagram.com/reel/abc123/');
    await page.getByRole('button', { name: /Capturer/ }).click();

    // The mocked POST / put the row in the inbox.
    await expect(page.getByText(/Pâtes carbonara|reel/i).first()).toBeVisible({
      timeout: 5000,
    });
    expect(mockState.imports).toHaveLength(1);

    // Extract
    await page.getByRole('button', { name: /Extraire/ }).first().click();
    await expect(page.getByText(/Vérifier/i).first()).toBeVisible();
    expect(mockState.imports[0].status).toBe('draft_ready');

    // Save
    await page.getByRole('button', { name: /Sauvegarder/ }).first().click();
    await expect(page.getByText(/Recette sauvegardée/i)).toBeVisible();
    expect(mockState.imports[0].status).toBe('saved');
    expect(mockState.imports[0].recipe_id).toMatch(/^recipe-\d+/);
  });
});
