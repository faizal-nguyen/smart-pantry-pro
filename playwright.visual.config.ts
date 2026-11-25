/**
 * V11-06 E0 — the visual captures of the consolidation, on the fictional bench only (no account,
 * no secret, no network). References are taken from `main` before a step, then compared on its
 * branch; they live in `.visual-baseline/`, ignored by git, since they depend on the machine's fonts.
 *
 *   npm run test:v11:visual:baseline   # references from the current commit
 *   npm run test:v11:visual            # compare
 *
 * The default config (playwright.config.ts) targets the authenticated e2e surface; this one starts
 * the bench itself. Files end in `.visual.ts`, so that the default config never runs them.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.VISUAL_PORT ?? 5176);

export default defineConfig({
  testDir: './e2e/visual',
  testMatch: /.*\.visual\.ts$/,
  globalSetup: './e2e/visual/warm-up.ts',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  reporter: [['list']],
  snapshotPathTemplate: '.visual-baseline/{arg}{ext}',
  outputDir: 'test-results/visual',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.002, animations: 'disabled', caret: 'hide', scale: 'css' },
  },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://127.0.0.1:${PORT}`,
    deviceScaleFactor: 1,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    contextOptions: { reducedMotion: 'reduce' },
    launchOptions: { args: ['--font-render-hinting=none'] },
  },
  webServer: {
    command: `npm run -s test:v10:ui -- --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/scripts/fixtures/v10/index.html`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
