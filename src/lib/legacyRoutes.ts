/**
 * V11-06 E4b (R8) — the one table of historical addresses.
 *
 * The router redirects with it and the post-sign-in return resolves with it, so an alias reaches the
 * same canonical screen, in one hop, whether or not the visitor was signed in. A bookmark or an
 * external shortcut cannot be checked, so the aliases stay. A key ending in `/*` also matches its
 * sub-paths. Each target is canonical: never an alias itself (tested).
 */
const FAVORITES = '/kitchen/recipes?tab=library&filter=favorites';

export const LEGACY_ROUTES: Readonly<Record<string, string>> = Object.freeze({
  // Stock
  '/pantry': '/pantry/inventory',
  '/pantry/scanner': '/pantry/inventory',
  '/pantry/alerts': '/pantry/inventory',
  '/inventory': '/pantry/inventory',
  '/pantry-inventory': '/pantry/inventory',
  // Recipes and menus
  '/recipes': '/kitchen/recipes',
  '/kitchen-recipes': '/kitchen/recipes',
  '/recipe-catalog': '/kitchen/recipes',
  '/kitchen/favorites': FAVORITES,
  '/kitchen-favorites': FAVORITES,
  '/meal-planning': '/kitchen/meal-planning',
  // Shopping
  '/shopping': '/shopping/list',
  '/shopping-list': '/shopping/list',
  '/shopping-legacy': '/shopping/list',
  '/shopping/history': '/shopping/list',
  // Assistant
  '/assistant/chat': '/assistant',
  '/ai-assistant': '/assistant',
  '/assistant-chat': '/assistant',
  '/assistant/suggestions': '/assistant',
  '/assistant/nutrition': '/assistant',
  // Insights
  '/insights/waste': '/insights#pertes',
  '/insights-waste': '/insights#pertes',
  '/insights/analytics': '/insights',
  '/insights/goals': '/insights',
  // Settings
  '/settings/appearance': '/settings?section=appearance',
  // Home
  '/home': '/kitchen',
  '/dashboard': '/kitchen',
  '/main': '/kitchen',
  // Retired features: the closest screen.
  '/games/*': '/kitchen/recipes',
  '/shopping/store-mode': '/shopping/list',
  '/settings/family': '/settings',
  '/settings/parental': '/settings',
});

/** Base for parsing in-app addresses; never part of a result. */
export const ROUTE_ORIGIN = 'https://pantry.invalid';
const PREFIXES = Object.entries(LEGACY_ROUTES)
  .filter(([key]) => key.endsWith('/*'))
  .map(([key, target]) => [key.slice(0, -2), target] as const);

/** Decodes each segment as React Router does before matching; an encoded slash stays encoded. */
function decodeSegments(path: string): string {
  try {
    return path.split('/').map(segment => decodeURIComponent(segment).replace(/\//g, '%2F')).join('/');
  } catch {
    return path;
  }
}

/**
 * The canonical target of a historical path, or null when the path is not an alias. Like the router,
 * matching decodes each segment and ignores case and one trailing slash.
 */
export function legacyTarget(pathname: string): string | null {
  const decoded = decodeSegments(pathname);
  const path = (decoded.length > 1 && decoded.endsWith('/') ? decoded.slice(0, -1) : decoded).toLowerCase();
  if (Object.prototype.hasOwnProperty.call(LEGACY_ROUTES, path)) return LEGACY_ROUTES[path];
  const prefix = PREFIXES.find(([base]) => path === base || path.startsWith(`${base}/`));
  return prefix ? prefix[1] : null;
}

/**
 * The address to reach: the target, plus the visitor's query and anchor. The alias's own parameters
 * win and the others are kept (verbatim when the target has none); the alias's anchor wins, otherwise
 * the visitor's is kept.
 */
export function withLegacyTarget(target: string, search: string, hash: string): string {
  const url = new URL(target, ROUTE_ORIGIN);
  let query = search;
  if (url.search) {
    const params = new URLSearchParams(search);
    url.searchParams.forEach((value, key) => params.set(key, value));
    query = `?${params.toString()}`;
  }
  return `${url.pathname}${query}${url.hash || hash}`;
}

/** The canonical address for a historical one, or null when the path is not an alias. */
export function resolveLegacyPath(pathname: string, search: string, hash: string): string | null {
  const target = legacyTarget(pathname);
  return target === null ? null : withLegacyTarget(target, search, hash);
}
