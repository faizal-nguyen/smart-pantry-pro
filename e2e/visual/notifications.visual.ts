/**
 * V11-06 E2a — one notification stack, kept clear of the bottom navigation (PRP V11-06, sections 6
 * and 14). A real notification, from the theme switch of Settings › Appearance on the bench:
 * - at 390 and 899 px, it sits 1rem above `mobile-bottom-nav` (Sonner switches to its mobile layout
 *   at 600 px, the navigation at 900 px: both sides of the gap are covered);
 * - at 1440 px, where the bar is hidden, it sits bottom right, 1rem from the bottom and 32px from
 *   the right edge.
 * Geometry only, no screenshot. The document holds a single notification region. The bar and the
 * notification are measured together and polled, so a late re-measure of the bar cannot mislead.
 */
import { expect, test, type Page } from '@playwright/test';

const BENCH = '/scripts/fixtures/v10/index.html?scene=carnet&still=1';
const NOW = new Date('2026-11-25T10:00:00+01:00');
const GAP_PX = 16;
const SIDE_PX = 32;
/** Rounding of sub-pixel layout. */
const TOLERANCE_PX = 2;

const NOTIFICATION = '[data-sonner-toast]';

async function notify(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: width < 900 ? 844 : 900 });
  await page.clock.setFixedTime(NOW);
  // The switch is named after the theme it turns on: start from the light one.
  await page.addInitScript(() => { try { localStorage.setItem('theme', 'light'); } catch { /* storage off */ } });
  await page.goto(`${BENCH}&route=${encodeURIComponent('/settings?section=appearance')}`);
  await expect(page.getByRole('heading', { level: 1, name: /^Paramètres$/ })).toBeVisible();
  await page.getByRole('switch', { name: 'Activer le mode sombre' }).click();
  await expect(page.locator(NOTIFICATION).filter({ hasText: 'Thème modifié' })).toBeVisible();
  await expect(page.locator('[aria-label^="Notifications"]')).toHaveCount(1);
}

/** Gaps of the notification to the bar (null when hidden), to the bottom and to the right edge. */
function gaps(page: Page) {
  return page.evaluate(selector => {
    const box = document.querySelector(selector)?.getBoundingClientRect();
    if (!box) return null;
    const nav = document.querySelector('[data-testid="mobile-bottom-nav"]');
    const navTop = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect().top : null;
    return { toNav: navTop === null ? null : navTop - box.bottom, toBottom: innerHeight - box.bottom, toRight: innerWidth - box.right };
  }, NOTIFICATION);
}

const near = (value: number | null | undefined, target: number) => value != null && Math.abs(value - target) <= TOLERANCE_PX;

for (const width of [390, 899]) {
  test(`à ${width} px, la notification reste au-dessus de la barre basse`, async ({ page }) => {
    await notify(page, width);
    await expect(page.getByTestId('mobile-bottom-nav')).toBeVisible();
    await expect.poll(async () => {
      const measured = await gaps(page);
      return near(measured?.toNav, GAP_PX) ? 'au-dessus de la barre' : JSON.stringify(measured);
    }).toBe('au-dessus de la barre');
  });
}

test('à 1440 px, la notification est en bas à droite, dans la fenêtre', async ({ page }) => {
  await notify(page, 1440);
  await expect(page.getByTestId('mobile-bottom-nav')).toBeHidden();
  await expect.poll(async () => {
    const measured = await gaps(page);
    return near(measured?.toBottom, GAP_PX) && near(measured?.toRight, SIDE_PX) ? 'en bas à droite' : JSON.stringify(measured);
  }).toBe('en bas à droite');
});
