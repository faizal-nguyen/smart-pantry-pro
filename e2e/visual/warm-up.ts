/**
 * Loads the bench once before the workers start. On a cold Vite cache the first page makes Vite
 * optimise dependencies again; with HMR off, pages caught half-way by four workers would fail.
 */
import { chromium, type FullConfig } from '@playwright/test';

export default async function warmUp(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) throw new Error('The visual config has no baseURL.');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`${baseURL}/scripts/fixtures/v10/index.html?scene=carnet&still=1&route=%2Fkitchen`);
    await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 60_000 });
  } finally {
    await browser.close();
  }
}
