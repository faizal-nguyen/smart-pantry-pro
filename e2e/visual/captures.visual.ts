/**
 * V11-06 E0 — the reduced capture matrix (PRP V11-06, section 12), on the bench's `carnet` scene:
 * home, analyses and shopping at seven widths; the other screens at 390 and 1440 px; light and
 * dark; empty, loading and error states at 390 px (75 captures). Time is fixed: the scene depends on the day.
 * Each capture first checks the page is the one expected: an unknown path of the bench renders a
 * recipe page. A horizontal overflow or a page error is recorded in `test-results/visual/findings.jsonl`
 * (emptied by each run), not failed: E0 is the reference, the exit criteria of the lot apply later.
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/** `still=1`: the bench ends framer-motion animations at once (they ignore reduced motion). */
const BENCH = '/scripts/fixtures/v10/index.html?scene=carnet&still=1';
const NOW = new Date('2026-11-25T10:00:00+01:00');
const RECIPE = '30000000-0000-4000-8000-000000000001';
const ALL_WIDTHS = [320, 390, 768, 899, 900, 1024, 1440];
const TWO_WIDTHS = [390, 1440];
const THEMES = ['light', 'dark'] as const;
const viewportHeight = (width: number) => (width < 900 ? 844 : 900);
const FINDINGS = 'test-results/visual/findings.jsonl';

type ScreenKey = 'accueil' | 'analyses' | 'courses' | 'bibliotheque' | 'fiche' | 'stock' | 'menus' | 'assistant' | 'parametres';
interface Screen { key: ScreenKey; route: string; title: RegExp; widths: number[] }
/** The page's own h1: a wrong route or a crash never passes for the screen. */
const SCREENS: Screen[] = [
  { key: 'accueil', route: '/kitchen', title: /ce soir/i, widths: ALL_WIDTHS },
  { key: 'analyses', route: '/insights', title: /^Mes analyses$/, widths: ALL_WIDTHS },
  { key: 'courses', route: '/shopping/list', title: /^Mes courses$/, widths: ALL_WIDTHS },
  { key: 'bibliotheque', route: '/kitchen/recipes', title: /^Recettes$/, widths: TWO_WIDTHS },
  { key: 'fiche', route: `/kitchen/recipes/${RECIPE}`, title: /^Couscous de légumes rôtis$/, widths: TWO_WIDTHS },
  { key: 'stock', route: '/pantry/inventory', title: /^Mon stock$/, widths: TWO_WIDTHS },
  { key: 'menus', route: '/kitchen/meal-planning', title: /^Menus$/, widths: TWO_WIDTHS },
  { key: 'assistant', route: '/assistant', title: /^Assistant$/, widths: TWO_WIDTHS },
  { key: 'parametres', route: '/settings', title: /^Paramètres$/, widths: TWO_WIDTHS },
];
const READ_TABLES = 'food_waste_events,inventory,shopping_list,weekly_meal_plans,meal_plan_entries';
/**
 * States at 390 px, light: what the address asks of the bench. Held reads never answer, so the
 * loading state lasts. A status or a skeleton in the page shows it (on the phone home, the week
 * preview and its status are hidden: present, not visible); a page showing none is a finding.
 */
const STATES = [
  { key: 'vide', query: `&empty=${READ_TABLES}`, loading: false },
  { key: 'chargement', query: '&hold=1', loading: true },
  { key: 'erreur', query: `&fail=${READ_TABLES}`, loading: false },
] as const;
/** Home, shopping, and « Mes analyses » (stock and declared losses since V11-06 E1b). */
const STATE_SCREENS: ScreenKey[] = ['accueil', 'analyses', 'courses'];
const BY_KEY = new Map(SCREENS.map(screen => [screen.key, screen]));

function record(finding: Record<string, unknown>) {
  mkdirSync(dirname(FINDINGS), { recursive: true });
  appendFileSync(FINDINGS, `${JSON.stringify(finding)}\n`);
}

async function open(page: Page, screen: Screen, width: number, theme: string, query = '') {
  await page.setViewportSize({ width, height: viewportHeight(width) });
  await page.clock.setFixedTime(NOW);
  await page.addInitScript(value => { try { localStorage.setItem('theme', value); } catch { /* storage off */ } }, theme);
  await page.goto(`${BENCH}${query}&route=${encodeURIComponent(screen.route)}`);
  await expect(page.getByRole('heading', { level: 1, name: screen.title }).first()).toBeVisible();
}

/**
 * Waits for what a full-page capture would otherwise take half-done: requests, every image (lazy
 * ones below the fold included), fonts, and any inline style still moving. Two identical shots of
 * an empty frame or of a slow easing tail look stable too.
 */
async function settle(page: Page, name: string) {
  await page.waitForLoadState('networkidle');
  const settled = await page.evaluate(async () => {
    const images = Array.from(document.images);
    for (const image of images) image.loading = 'eager';
    await Promise.all(images.filter(image => !image.complete).map(image => new Promise<void>(done => {
      image.addEventListener('load', () => done(), { once: true });
      image.addEventListener('error', () => done(), { once: true });
    })));
    await document.fonts.ready;
    const styles = () => Array.from(document.querySelectorAll('[style]'), node => node.getAttribute('style')).join('|');
    const pause = (ms: number) => new Promise(done => setTimeout(done, ms));
    // Infinite animations (skeleton pulses) never end; the capture itself freezes them.
    const moving = () => document.getAnimations().some(item => item.playState === 'running'
      && Number.isFinite(Number(item.effect?.getComputedTiming().endTime ?? Infinity)));
    let previous = styles();
    for (let round = 0; round < 20; round += 1) {
      await pause(150);
      const current = styles();
      if (current === previous && !moving()) return true;
      previous = current;
    }
    return false;
  });
  if (!settled) record({ capture: name, finding: 'still moving after 3 s: captured anyway' });
}

/** Records what E0 notes without failing (overflow, page errors), then compares the full page. */
async function capture(page: Page, name: string, width: number, errors: string[]) {
  await settle(page, name);
  // `overflow-x: clip` on html and body hides a too-wide row instead of letting it scroll: measure both.
  const scroll = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
  if (scroll > width) record({ capture: name, overflow: scroll - width });
  if (errors.length) record({ capture: name, errors });
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
}

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

for (const screen of SCREENS) {
  for (const theme of THEMES) {
    for (const width of screen.widths) {
      const name = `${screen.key}-${width}-${theme}`;
      test(name, async ({ page }) => {
        const errors = watchErrors(page);
        await open(page, screen, width, theme);
        await capture(page, name, width, errors);
      });
    }
  }
}

for (const key of STATE_SCREENS) {
  const screen = BY_KEY.get(key);
  if (!screen) throw new Error(`Unknown screen ${key}`);
  for (const state of STATES) {
    const name = `${screen.key}-${state.key}-390-light`;
    test(name, async ({ page }) => {
      const errors = watchErrors(page);
      await open(page, screen, 390, 'light', state.query);
      if (state.loading) {
        const marker = page.getByText(/Chargement/).or(page.locator('.animate-pulse')).first();
        const shown = await marker.waitFor({ state: 'attached', timeout: 2_000 }).then(() => true, () => false);
        if (!shown) record({ capture: name, finding: 'no loading status nor skeleton while reads are held' });
      }
      await capture(page, name, 390, errors);
    });
  }
}
