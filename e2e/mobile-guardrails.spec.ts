/**
 * Mobile guardrails — preventer for the May 2026 audit findings.
 *
 * What this catches that no other test catches :
 *   1. Boutons primaires < 44px (cible tactile iOS minimum) sur mobile.
 *      Détecte les `size="sm"` malencontreux ou les fixes manqués.
 *   2. Éléments `position: fixed` qui recouvrent un `data-testid` flaggé
 *      « primary-action ». Détecte par exemple un FAB qui re-revient sur
 *      la page assistant.
 *   3. Page bloquée sur `<Loader2>` après 8s — détecte les erreurs fetch
 *      silencieuses (inventaire blank, etc.).
 *
 * Lance avec :
 *   npm run e2e -- --project=mobile e2e/mobile-guardrails.spec.ts
 *
 * Routes testées : seulement les routes publiques (pas de session) — la
 * page d'accueil et /auth. Pour les routes authentifiées on documente
 * mais on skip car PRP-220 n'a pas encore de seed test user stable.
 */
import { test, expect, type Page } from '@playwright/test';

const MIN_TOUCH_TARGET = 44;
const STUCK_LOADER_TIMEOUT_MS = 8000;

const PUBLIC_ROUTES = ['/', '/auth'] as const;

/** Détecte les `position: fixed` qui couvrent visuellement un élément cible. */
async function getFixedOverlaps(page: Page, targetSelector: string) {
  return page.evaluate(
    ({ targetSelector }) => {
      const targets = Array.from(document.querySelectorAll(targetSelector));
      const overlaps: Array<{ target: string; fixed: string }> = [];

      for (const target of targets) {
        const tRect = target.getBoundingClientRect();
        if (tRect.width === 0 || tRect.height === 0) continue;

        const all = Array.from(document.querySelectorAll('*'));
        for (const el of all) {
          if (el === target || el.contains(target) || target.contains(el)) continue;
          const style = window.getComputedStyle(el);
          if (style.position !== 'fixed') continue;
          if (style.display === 'none' || style.visibility === 'hidden') continue;

          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;

          const overlapsX = r.left < tRect.right && r.right > tRect.left;
          const overlapsY = r.top < tRect.bottom && r.bottom > tRect.top;
          if (overlapsX && overlapsY) {
            overlaps.push({
              target: (target.getAttribute('data-testid') ?? '') + ':' + target.tagName,
              fixed: el.className?.toString().slice(0, 120) ?? '<no class>',
            });
          }
        }
      }
      return overlaps;
    },
    { targetSelector },
  );
}

/** Vérifie que tous les boutons visibles ont une hauteur ≥ 44px. */
async function getTooSmallTouchTargets(page: Page) {
  return page.evaluate((min) => {
    const buttons = Array.from(
      document.querySelectorAll('button, [role="button"], a[href]'),
    );
    const tooSmall: Array<{ tag: string; text: string; h: number; w: number }> = [];
    for (const el of buttons) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Ignore les boutons décoratifs / hidden visuellement.
      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      if (r.height < min) {
        tooSmall.push({
          tag: el.tagName,
          text: (el.textContent ?? '').trim().slice(0, 40),
          h: Math.round(r.height),
          w: Math.round(r.width),
        });
      }
    }
    return tooSmall;
  }, MIN_TOUCH_TARGET);
}

test.describe('Mobile guardrails — public routes', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} — touch targets ≥ 44px`, async ({ page }) => {
      await page.goto(route);
      // Attendre que la page ait fini son chargement initial avant de
      // mesurer (sinon les boutons en cours de mount apparaissent à 0px).
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      const tooSmall = await getTooSmallTouchTargets(page);

      // On accepte une marge sur quelques boutons décoratifs (close × dialogs)
      // mais on bloque si un primary-action est sous le seuil.
      const primaryUnder = tooSmall.filter((t) =>
        ['SUBMIT', 'CONTINUER', 'CONNEXION', 'SE CONNECTER'].some((kw) =>
          t.text.toUpperCase().includes(kw),
        ),
      );
      expect(
        primaryUnder,
        `Boutons primaires < ${MIN_TOUCH_TARGET}px : ${JSON.stringify(primaryUnder, null, 2)}`,
      ).toEqual([]);
    });

    test(`${route} — pas d'overlap fixed sur primary-action`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      const overlaps = await getFixedOverlaps(page, '[data-testid="primary-action"]');
      expect(
        overlaps,
        `Éléments fixed couvrent primary-action : ${JSON.stringify(overlaps, null, 2)}`,
      ).toEqual([]);
    });

    test(`${route} — pas bloqué sur Loader2 après ${STUCK_LOADER_TIMEOUT_MS}ms`, async ({
      page,
    }) => {
      await page.goto(route);
      await page.waitForTimeout(STUCK_LOADER_TIMEOUT_MS);

      // La classe `animate-spin` est posée par <Loader2> et <Spinner>.
      // Si elle est toujours visible après 8s, c'est qu'on est coincé.
      const spinnersStillVisible = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('.animate-spin'));
        return els.filter((el) => {
          const r = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return (
            r.width > 0 &&
            r.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none'
          );
        }).length;
      });
      expect(
        spinnersStillVisible,
        `Page bloquée sur ${spinnersStillVisible} spinner(s) après ${STUCK_LOADER_TIMEOUT_MS}ms`,
      ).toBe(0);
    });
  }
});
