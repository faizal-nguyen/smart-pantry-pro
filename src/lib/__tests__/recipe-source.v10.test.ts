import { fetchUnifiedRecipe, invalidateUnifiedRecipeCache } from '../recipeSource';
const OWNER = '00000000-0000-4000-8000-000000000001', ID = '10000000-0000-4000-8000-000000000001';
let mockOwner = OWNER;
let mockRead: (table: string) => Promise<{ data: unknown; error: null }>;
const mockTables: string[] = [];
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: mockOwner } } } }) },
  from: (table: string) => {
    mockTables.push(table);
    const query = { select: () => query, eq: () => query, or: () => query, maybeSingle: () => mockRead(table) }; return query;
  },
} }));
beforeEach(() => { invalidateUnifiedRecipeCache(); mockOwner = OWNER; mockTables.length = 0; });
test('three colliding UUIDs stay separate in cache and an explicit absent source never falls through', async () => {
  mockRead = async table => ({ data: table === 'recipes' ? { id: ID, name: 'Legacy' } : table === 'user_recipes'
    ? { id: ID, user_id: OWNER, is_from_catalog: false, custom_title: 'Personnel', custom_photo_url: '/personal.jpg' }
    : { id: ID, title: 'Catalogue', photo_url: '/catalog.jpg' }, error: null });
  for (const source of ['recipes', 'user_recipes', 'recipes_catalog'] as const) expect((await fetchUnifiedRecipe(ID, source, OWNER))?.source).toBe(source);
  expect(mockTables).toEqual(['recipes', 'user_recipes', 'recipes_catalog']);
  await fetchUnifiedRecipe(ID, 'user_recipes', OWNER); expect(mockTables).toHaveLength(3);
  invalidateUnifiedRecipeCache(); mockRead = async () => ({ data: null, error: null }); mockTables.length = 0;
  expect(await fetchUnifiedRecipe(ID, 'user_recipes', OWNER)).toBeNull(); expect(mockTables).toEqual(['user_recipes']);
});
test('an unrelated invalidation during a read cannot leave a permanently resolved stale promise in cache', async () => {
  let finish!: (value: { data: unknown; error: null }) => void;
  mockRead = () => new Promise(resolve => { finish = resolve; });
  const pending = fetchUnifiedRecipe(ID, 'recipes', OWNER);
  await Promise.resolve(); await Promise.resolve();
  invalidateUnifiedRecipeCache('another-recipe');
  finish({ data: { id: ID, name: 'Before' }, error: null }); await pending;
  mockRead = async () => ({ data: { id: ID, name: 'After' }, error: null });
  expect((await fetchUnifiedRecipe(ID, 'recipes', OWNER))?.name).toBe('After');
  expect(mockTables).toHaveLength(2);
});
test('an account change during resolution rejects the old response', async () => {
  mockRead = async () => { mockOwner = 'other'; return { data: { id: ID, name: 'Private' }, error: null }; };
  await expect(fetchUnifiedRecipe(ID, 'recipes', OWNER)).rejects.toThrow('compte a changé');
});
