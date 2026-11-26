import { LEGACY_ROUTES, legacyTarget, resolveLegacyPath, withLegacyTarget } from '../legacyRoutes';
import { routineDestination } from '../routineRoutes';

const ORIGIN = 'https://pantry.invalid';
const pathOf = (target: string) => new URL(target, ORIGIN).pathname;
/** A concrete address for each key: a prefix key `/x/*` is probed with a sub-path. */
const sample = (key: string) => (key.endsWith('/*') ? `${key.slice(0, -2)}/ancienne-page` : key);
const entries = Object.entries(LEGACY_ROUTES);

describe('one table of historical addresses (V11-06 E4b, R8)', () => {
  test('covers the aliases the router and the sign-in return used to know', () => {
    for (const alias of ['/ai-assistant', '/assistant-chat', '/kitchen-favorites', '/recipe-catalog', '/insights-waste',
      '/settings/appearance', '/shopping-legacy', '/inventory', '/recipes', '/home', '/dashboard', '/main', '/games/*',
      '/settings/family', '/settings/parental', '/shopping/store-mode']) {
      expect(LEGACY_ROUTES).toHaveProperty([alias]);
    }
  });

  test.each(entries)('%s reaches %s in one hop', (key, target) => {
    expect(legacyTarget(sample(key))).toBe(target);
    // No double hop: the canonical target is never itself an alias, nor the alias itself.
    expect(legacyTarget(pathOf(target))).toBeNull();
    expect(pathOf(target)).not.toBe(sample(key));
  });

  test.each(entries)('%s resolves the same after sign-in', (key, target) => {
    // The target passes the sign-in allow-list unchanged, and the alias leads there too.
    expect(routineDestination(target)).toBe(target);
    expect(routineDestination(sample(key))).toBe(target);
  });

  test('a prefix key matches its root and its sub-paths, not a longer word', () => {
    expect(legacyTarget('/games')).toBe('/kitchen/recipes');
    expect(legacyTarget('/games/quiz/2')).toBe('/kitchen/recipes');
    expect(legacyTarget('/gamesroom')).toBeNull();
  });

  test('matching ignores case and one trailing slash, as the router does', () => {
    expect(legacyTarget('/AI-Assistant')).toBe('/assistant');
    expect(legacyTarget('/recipes/')).toBe('/kitchen/recipes');
    expect(routineDestination('/Recipe-Catalog/')).toBe('/kitchen/recipes');
  });

  test('matching decodes each segment, as the router does', () => {
    expect(legacyTarget('/%72ecipes')).toBe('/kitchen/recipes');
    expect(routineDestination('/%72ecipes')).toBe('/kitchen/recipes');
    // An encoded slash stays inside its segment; a malformed escape is compared as is.
    expect(legacyTarget('/kitchen%2Ffavorites')).toBeNull();
    expect(legacyTarget('/%E0%A4%A')).toBeNull();
  });

  test('canonical screens and unknown paths are not aliases', () => {
    for (const path of ['/kitchen', '/kitchen/recipes', '/assistant', '/insights', '/settings', '/shopping/list', '/pantry/inventory', '/constructor', '/__proto__']) {
      expect(legacyTarget(path)).toBeNull();
    }
    expect(routineDestination('/does-not-exist')).toBe('/kitchen');
  });
});

describe('query and anchor', () => {
  test('a target without query keeps the visitor query verbatim', () => {
    expect(withLegacyTarget('/kitchen/recipes', '?q=p%C3%A2tes&tri=temps', '')).toBe('/kitchen/recipes?q=p%C3%A2tes&tri=temps');
    expect(withLegacyTarget('/assistant', '', '')).toBe('/assistant');
  });

  test("the alias's own parameters win, the others are kept", () => {
    const favorites = LEGACY_ROUTES['/kitchen-favorites'];
    expect(withLegacyTarget(favorites, '', '')).toBe('/kitchen/recipes?tab=library&filter=favorites');
    expect(withLegacyTarget(favorites, '?sort=a&tab=discover', '')).toBe('/kitchen/recipes?sort=a&tab=library&filter=favorites');
  });

  test("the alias's anchor wins, otherwise the visitor anchor is kept", () => {
    expect(withLegacyTarget('/insights#pertes', '', '#autre')).toBe('/insights#pertes');
    expect(withLegacyTarget('/insights', '?periode=30', '#pertes')).toBe('/insights?periode=30#pertes');
  });

  test('resolveLegacyPath combines both, and leaves non-aliases alone', () => {
    expect(resolveLegacyPath('/ai-assistant', '?x=1', '#h')).toBe('/assistant?x=1#h');
    expect(resolveLegacyPath('/settings/appearance', '?section=account', '')).toBe('/settings?section=appearance');
    expect(resolveLegacyPath('/kitchen/recipes', '?x=1', '')).toBeNull();
  });

  test('after sign-in, query and anchor survive the alias', () => {
    expect(routineDestination('/recipe-catalog?q=soupe#liste')).toBe('/kitchen/recipes?q=soupe#liste');
    expect(routineDestination('/insights-waste')).toBe('/insights#pertes');
    expect(routineDestination('/kitchen/favorites?sort=a')).toBe('/kitchen/recipes?sort=a&tab=library&filter=favorites');
  });

  test('the sign-in guards still hold', () => {
    expect(routineDestination('//evil.test/ai-assistant')).toBe('/kitchen');
    expect(routineDestination('/ai-assistant\\@evil.test')).toBe('/kitchen');
    expect(routineDestination('https://evil.test/recipes')).toBe('/kitchen');
    expect(routineDestination('/?tab=inventory')).toBe('/pantry/inventory');
    // A prototype key is an unknown tab, like any other: the home, its parameter left alone.
    expect(routineDestination('/?tab=inconnu')).toBe('/kitchen?tab=inconnu');
    expect(routineDestination('/?tab=constructor')).toBe('/kitchen?tab=constructor');
    expect(routineDestination('/?tab=__proto__')).toBe('/kitchen?tab=__proto__');
  });
});
