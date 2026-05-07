/**
 * Playwright configuration for the PRP-220 E2E surface (PRP-220.21).
 *
 * Notes for operators:
 *   - We deliberately DO NOT auto-spawn the dev server here. The repo
 *     runs API + Vite via `npm run dev`, which depends on Supabase
 *     secrets that aren't available in every environment. Start
 *     `npm run dev` manually before running tests, or override
 *     E2E_BASE_URL to point at any deployed preview.
 *   - Chromium only, three projects (desktop / tablet / mobile) so we
 *     keep the matrix narrow until the suite stabilises.
 *   - Trace + video are kept on failure only to avoid drowning CI in
 *     gigabytes of artefacts on the green path.
 */
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3002';

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Disable animations + force a deterministic font-rendering hint
    // so visual snapshots stay stable across runs.
    launchOptions: {
      args: ['--font-render-hinting=none'],
    },
  },
  expect: {
    // Tolerate minor anti-aliasing differences in visual diffs without
    // letting actual UI regressions slip through.
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.005,
      animations: 'disabled',
    },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'tablet',
      use: { ...devices['iPad Pro 11'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
