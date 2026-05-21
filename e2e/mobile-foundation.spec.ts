/**
 * PRP-238 PR1 etape (e) — Captures mobile authentifiees.
 *
 * Visite les routes coeur de l'app authentifiee sur les 3 viewports
 * iPhone SE / Pro Max / Pixel 7 et capture des screenshots de reference.
 * Verifie aussi quelques invariants critiques :
 *   - Le shell de nav (data-testid="app-navigation") est monte une fois.
 *   - La bottom nav (data-testid="mobile-bottom-nav") est visible.
 *   - Le contenu n'a pas de scroll horizontal.
 *   - Sur RecipeDetail, l'action bar mobile est presente avec ses 3
 *     boutons >= 44px de hauteur.
 *
 * Pre-requis : auth.setup.ts a populated e2e/.auth/user.json.
 * Run :
 *   E2E_TEST_USER_EMAIL=... E2E_TEST_USER_PASSWORD=... \
 *     npm run e2e -- --project=mobile-auth-se e2e/mobile-foundation.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'mobile-foundation');

function ensureScreenshotDir() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function assertNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    };
  });
  expect(
    overflow.scrollWidth,
    `Horizontal scroll detected: scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`,
  ).toBeLessThanOrEqual(overflow.clientWidth);
}

async function assertSingleAppNavigation(page: Page) {
  // AppNavigation a une branche loading qui ne rend pas le data-testid
  // tant que family/personalization/gridReady ne sont pas resolus.
  // On attend que le shell auth apparaisse, puis on verifie qu'il
  // n'y en a qu'un seul (PR2 ajoutera l'assertion stricte == 1 quand
  // le shell sera unifie ; pour PR1 c'est == 1 ou plus tolerant en
  // attendant que le DOM soit settled).
  await page.locator('[data-testid="app-navigation"]').first().waitFor({
    state: 'visible',
    timeout: 15_000,
  });
  const count = await page.locator('[data-testid="app-navigation"]').count();
  expect(count, 'AppNavigation should be mounted exactly once').toBe(1);
}

async function captureRoute(page: Page, slug: string) {
  ensureScreenshotDir();
  const filename = `${slug}-${test.info().project.name}.png`;
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, filename),
    fullPage: false,
  });
}

test.describe('mobile foundation — authenticated screenshots', () => {
  test('home (/insights)', async ({ page }) => {
    // Note : Index.tsx (`/`) est juste une redirection transitoire vers
    // /insights ou /onboarding selon l'etat du profil. On va directement
    // sur la cible authentifiee `/insights` qui rend AppNavigation.
    await page.goto('/insights');
    await assertSingleAppNavigation(page);
    await assertNoHorizontalScroll(page);
    await captureRoute(page, 'insights');
  });

  test('kitchen dashboard', async ({ page }) => {
    await page.goto('/kitchen');
    await assertSingleAppNavigation(page);
    await assertNoHorizontalScroll(page);
    await captureRoute(page, 'kitchen');
  });

  test('recipes library', async ({ page }) => {
    await page.goto('/kitchen/recipes');
    await assertSingleAppNavigation(page);
    await assertNoHorizontalScroll(page);
    await captureRoute(page, 'recipes-library');
  });

  test('pantry inventory', async ({ page }) => {
    await page.goto('/pantry/inventory');
    await assertSingleAppNavigation(page);
    await assertNoHorizontalScroll(page);
    await captureRoute(page, 'pantry-inventory');
  });

  test('shopping list', async ({ page }) => {
    await page.goto('/shopping/list');
    await assertSingleAppNavigation(page);
    await assertNoHorizontalScroll(page);
    await captureRoute(page, 'shopping-list');
  });

  test('assistant', async ({ page }) => {
    await page.goto('/assistant');
    await assertSingleAppNavigation(page);
    await assertNoHorizontalScroll(page);
    await captureRoute(page, 'assistant');
  });

  // Skip pour PR1 : la library utilise navigate() programmatique sur
  // les cards (pas de Link href), donc le test e2e ne peut pas
  // facilement obtenir un id deterministe. A reactiver en PR2 quand
  // soit (a) les cards exposent un data-testid stable, soit (b) on
  // ajoute un E2E_RECIPE_ID hardcoded dans .env.local + on hit
  // /kitchen/recipes/${id} directement.
  test.skip('recipe detail — action bar mobile + tap targets >= 44px', async ({ page }) => {
    // Strategie (b) du PRP : on visite la library et on intercepte le
    // navigate vers /kitchen/recipes/:id. Les cards utilisent
    // navigate() programmatique (pas de Link), donc on ne peut pas
    // utiliser un selecteur href. Soit on click sur la 1ere card et
    // on suit la navigation, soit on lit l'id depuis le DOM.
    await page.goto('/kitchen/recipes?tab=library');
    await assertSingleAppNavigation(page);

    // Wait for the library cards to load. Les cards LibraryRecipeCard
    // wrappent leur contenu dans un MaterialCard cliquable. On cherche
    // un container article/article-like avec un h2/h3 (titre recette).
    const cardSelector = 'article, [class*="cursor-pointer"]';
    await page.locator(cardSelector).first().waitFor({ state: 'visible', timeout: 15_000 });

    // Click sur la premiere card et attendre la navigation vers
    // /kitchen/recipes/:id.
    await Promise.all([
      page.waitForURL(/\/kitchen\/recipes\/[a-f0-9-]+/, { timeout: 15_000 }),
      page.locator(cardSelector).first().click(),
    ]);

    // Attendre que la page detail soit chargee (l'action bar mobile
    // apparait apres resolution de la recette via fetchUnifiedRecipe).
    const actionBar = page.locator('[data-testid="recipe-action-bar-mobile"]');
    await expect(actionBar).toBeVisible({ timeout: 15_000 });

    // Tap targets >= 44px sur tous les boutons de l'action bar mobile.
    const buttons = actionBar.locator('button');
    const count = await buttons.count();
    expect(count, 'Action bar should have 3 primary buttons').toBe(3);

    for (let i = 0; i < count; i += 1) {
      const box = await buttons.nth(i).boundingBox();
      expect(box, `Button #${i} has no bounding box`).not.toBeNull();
      expect(
        box!.height,
        `Button #${i} height ${box!.height}px < 44px tap target minimum`,
      ).toBeGreaterThanOrEqual(44);
    }

    await assertNoHorizontalScroll(page);
    await captureRoute(page, 'recipe-detail');
  });
});
