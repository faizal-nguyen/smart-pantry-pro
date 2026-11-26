import { ROUTE_ORIGIN, resolveLegacyPath } from './legacyRoutes';

const legacyTabs: Record<string,string> = {
  inventory:'/pantry/inventory', pantry:'/pantry/inventory', recipes:'/kitchen/recipes',
  shopping:'/shopping/list', assistant:'/assistant', insights:'/insights', kitchen:'/kitchen', today:'/kitchen',
};
/**
 * Only recognized internal routes may become a post-authentication destination. A historical alias
 * resolves through the router's own table (V11-06 E4b, R8), then the allow-list applies.
 */
export function routineDestination(input: string | null | undefined): string {
  if (!input || !input.startsWith('/') || input.startsWith('//') || /[\\\r\n]/.test(input)) return '/kitchen';
  const url = new URL(input,ROUTE_ORIGIN);
  if (url.pathname === '/') {
    const tab = url.searchParams.get('tab');
    if (tab && Object.prototype.hasOwnProperty.call(legacyTabs,tab)) { url.pathname = legacyTabs[tab]; url.searchParams.delete('tab'); }
    else url.pathname = '/kitchen';
  }
  const legacy = resolveLegacyPath(url.pathname,url.search,url.hash);
  const destination = legacy === null ? url : new URL(legacy,ROUTE_ORIGIN);
  if (!/^\/(?:kitchen(?:\/.*)?|pantry(?:\/.*)?|shopping(?:\/.*)?|assistant(?:\/.*)?|insights(?:\/.*)?|settings|onboarding|share-target)$/.test(destination.pathname)) return '/kitchen';
  return `${destination.pathname}${destination.search}${destination.hash}`;
}
export function isNavigationActive(pathname: string, target: string): boolean {
  if (target === '/kitchen/recipes' && (pathname.startsWith('/kitchen/cooking/') || pathname === '/kitchen/meal-planning')) return true;
  return target === '/kitchen' ? pathname === target : pathname === target || pathname.startsWith(`${target}/`);
}
