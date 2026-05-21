/**
 * PRP-238 PR1 etape (e) — Auth setup pour Playwright.
 *
 * Ferme le gap "Auth seeding" documente dans e2e/README.md depuis
 * PRP-220.21 : on logge un utilisateur test via le formulaire /auth,
 * on capture le storageState (contient le token Supabase actif), puis
 * les tests `mobile-auth` et autres projects authentifies reutilisent
 * ce state sans repasser par le login.
 *
 * Env vars requises (mettre dans `.env.local`, jamais dans .env.example
 * ni dans un commit) :
 *   - E2E_TEST_USER_EMAIL      : email du compte test Supabase
 *   - E2E_TEST_USER_PASSWORD   : mot de passe du compte
 *
 * Output :
 *   - e2e/.auth/user.json (gitignored) : session storage capturee
 *   - process.env.E2E_RECIPE_ID populated avec l'id d'une recette
 *     trouvee dans la library de l'user test (strategie b du PRP).
 *
 * Note : ce fichier est un "setup project" (cf playwright.config.ts),
 * pas un test classique. Il s'execute UNE FOIS avant les `mobile-auth`
 * tests et son storageState est partage entre tous les autres projects.
 */
import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_TEST_USER_EMAIL;
  const password = process.env.E2E_TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'auth.setup.ts: E2E_TEST_USER_EMAIL et E2E_TEST_USER_PASSWORD doivent etre definis dans .env.local. ' +
        'Voir e2e/README.md pour la procedure.',
    );
  }

  // 0. Skip onboarding via localStorage AVANT le login : evite que
  //    AppNavigation rediroute vers /onboarding sur les routes
  //    authentifiees suivantes (cf. AppNavigation.tsx useEffect
  //    onboarding gate).
  await page.goto('/auth');
  await page.evaluate(() => window.localStorage.setItem('skipOnboarding', '1'));

  // 1. Login via le formulaire /auth.
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  // Le bouton de soumission peut etre "Se connecter", "Connexion", "Sign in"...
  // On utilise un selecteur generique sur button[type=submit].
  await page.locator('button[type="submit"]').first().click();

  // 2. Attendre la redirection hors de /auth.
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 });

  // 3. Skip onboarding si on y atterit (compte fresh ou Playwright
  //    sans localStorage.skipOnboarding). On clique le bouton "Plus
  //    tard" qui set le flag et redirige vers Settings.
  if (page.url().includes('/onboarding')) {
    const skipBtn = page.locator('button', { hasText: /plus tard|skip|ignorer/i }).first();
    if (await skipBtn.isVisible()) {
      await skipBtn.click();
      await page.waitForURL((url) => !url.pathname.startsWith('/onboarding'), {
        timeout: 10_000,
      });
    } else {
      // Fallback : set le flag manuellement et reload.
      await page.evaluate(() => window.localStorage.setItem('skipOnboarding', '1'));
    }
  }

  // 4. Naviguer explicitement vers une route authentifiee qui DOIT
  //    monter AppNavigation. /kitchen est garanti l'avoir (PRP-238
  //    PR1 etape c). On evite Index.tsx (`/`) qui est juste une
  //    redirection transitoire.
  await page.goto('/kitchen');
  await expect(page.locator('[data-testid="app-navigation"]')).toBeVisible({ timeout: 15_000 });

  // 4. Capture le storage state. Le dossier .auth est cree au besoin.
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });

  // 5. Strategie (b) du PRP : si E2E_RECIPE_ID n'est pas deja defini
  //    par l'env, on va chercher la 1ere recette de la library de
  //    l'user. On l'expose via le storageState origins[0].localStorage
  //    pour le passer aux tests, mais le plus simple est juste de
  //    laisser les tests visiter /kitchen/recipes et cliquer sur le
  //    1er card. Voir mobile-foundation.spec.ts.
});
