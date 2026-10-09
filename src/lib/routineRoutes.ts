const legacyTabs: Record<string,string> = {
  inventory:'/pantry/inventory', pantry:'/pantry/inventory', recipes:'/kitchen/recipes',
  shopping:'/shopping/list', assistant:'/assistant', insights:'/insights', kitchen:'/kitchen', today:'/kitchen',
};
const legacyPaths: Record<string,string> = {
  '/inventory':'/pantry/inventory', '/pantry-inventory':'/pantry/inventory',
  '/recipes':'/kitchen/recipes', '/kitchen-recipes':'/kitchen/recipes',
  '/shopping-list':'/shopping/list', '/meal-planning':'/kitchen/meal-planning',
  '/home':'/kitchen', '/dashboard':'/kitchen', '/main':'/kitchen', '/ai-assistant':'/assistant',
};
/** Only recognized internal routes may become a post-authentication destination. */
export function routineDestination(input: string | null | undefined): string {
  if (!input || !input.startsWith('/') || input.startsWith('//') || /[\\\r\n]/.test(input)) return '/kitchen';
  const url = new URL(input,'https://pantry.invalid');
  if (url.pathname === '/') {
    const tab = url.searchParams.get('tab');
    if (tab && legacyTabs[tab]) { url.pathname = legacyTabs[tab]; url.searchParams.delete('tab'); }
    else url.pathname = '/kitchen';
  }
  url.pathname = legacyPaths[url.pathname] ?? url.pathname;
  if (!/^\/(?:kitchen(?:\/.*)?|pantry(?:\/.*)?|shopping(?:\/.*)?|assistant(?:\/.*)?|insights(?:\/.*)?|settings|onboarding|share-target)$/.test(url.pathname)) return '/kitchen';
  return `${url.pathname}${url.search}${url.hash}`;
}
export function isNavigationActive(pathname: string, target: string): boolean {
  if (target === '/kitchen/recipes' && pathname.startsWith('/kitchen/cooking/')) return true;
  return target === '/kitchen' ? pathname === target : pathname === target || pathname.startsWith(`${target}/`);
}
