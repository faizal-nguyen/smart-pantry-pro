/** The build this page runs, set by vite.config.ts (empty in tests). */
declare const __APP_BUILD__: string | undefined;
export const CURRENT_BUILD: string = typeof __APP_BUILD__ === 'string' ? __APP_BUILD__ : '';

/** The build now deployed, from /version.json written by the same build; null when unknown. */
export async function fetchDeployedBuild(fetcher: typeof fetch = fetch): Promise<string | null> {
  try {
    const response = await fetcher(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const body = await response.json() as { build?: unknown };
    return typeof body.build === 'string' && body.build ? body.build : null;
  } catch {
    return null;
  }
}
