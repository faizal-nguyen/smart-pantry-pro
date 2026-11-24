import { dispatchAgentDbChanged } from '@/lib/agentEvents';
import { linkIngredient, unlinkIngredient } from '../ingredientLinks';

const OWNER = '00000000-0000-4000-8000-000000000001';
const PRODUCT = '10000000-0000-4000-8000-000000000001';
let mockSession: string | null = OWNER;
let mockResult: { data?: unknown; error: { code?: string; message: string } | null } = { data: { ingredient_key: 'huile neutre' }, error: null };
const mockCalls: Array<[string, ...unknown[]]> = [];
jest.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: mockSession ? { user: { id: mockSession } } : null } }) },
  from: (table: string) => {
    mockCalls.push(['from', table]);
    const query: Record<string, unknown> = {};
    for (const name of ['upsert', 'delete', 'eq', 'select', 'single']) query[name] = (...args: unknown[]) => { mockCalls.push([name, ...args]); return query; };
    query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(mockResult).then(resolve);
    return query;
  },
} }));
jest.mock('@/lib/agentEvents', () => ({ dispatchAgentDbChanged: jest.fn() }));
beforeEach(() => { jest.clearAllMocks(); mockCalls.length = 0; mockSession = OWNER; mockResult = { data: { ingredient_key: 'huile neutre' }, error: null }; });

// Review 2026-11-24: the database keeps non-breaking spaces the app turns into spaces. It normalizes
// the key itself, as resolve_stock_recipe looks it up, and the stored key is the one removed.
test('a link sends the name as the recipe writes it; the database normalizes it and returns the stored key', async () => {
  await expect(linkIngredient(OWNER, '  Huile NEUTRE ', PRODUCT)).resolves.toBe('huile neutre');
  expect(mockCalls).toEqual([['from', 'ingredient_product_links'],
    ['upsert', { user_id: OWNER, ingredient_key: 'Huile NEUTRE', product_id: PRODUCT }, { onConflict: 'user_id,ingredient_key' }],
    ['select', 'ingredient_key'], ['single']]);
  expect(dispatchAgentDbChanged).toHaveBeenCalledWith(['recipe_ingredients']);
});

test('removing a link deletes this account’s stored key, and says so when nothing was there', async () => {
  mockResult = { data: [{ ingredient_key: 'huile neutre' }], error: null };
  await unlinkIngredient(OWNER, 'huile neutre');
  expect(mockCalls).toEqual([['from', 'ingredient_product_links'], ['delete'], ['eq', 'user_id', OWNER], ['eq', 'ingredient_key', 'huile neutre'], ['select', 'ingredient_key']]);
  expect(dispatchAgentDbChanged).toHaveBeenCalledWith(['recipe_ingredients']);
  mockResult = { data: [], error: null };
  await expect(unlinkIngredient(OWNER, 'huile neutre')).rejects.toThrow('Ce lien n’existe plus.');
});

test('another account’s session never writes', async () => {
  mockSession = '00000000-0000-4000-8000-000000000002';
  await expect(linkIngredient(OWNER, 'Huile neutre', PRODUCT)).rejects.toThrow('Reconnecte-toi');
  expect(mockCalls).toEqual([]);
});

test.each([['   '], ['x'.repeat(121)]])('a name that cannot be a link (« %s ») is refused before any write', async name => {
  await expect(linkIngredient(OWNER, name, PRODUCT)).rejects.toThrow('Ce nom d’ingrédient ne peut pas être relié.');
  expect(mockCalls).toEqual([]);
});

test.each([
  [{ code: 'PGRST205', message: 'table not found' }, 'Cette action n’est pas encore disponible. Réessaie un peu plus tard.'],
  [{ code: '23503', message: 'foreign key' }, 'Ce produit n’existe plus. Choisis-en un autre.'],
  [{ code: '23514', message: 'check' }, 'Ce nom d’ingrédient ne peut pas être relié.'],
  [{ code: '42501', message: 'row-level security' }, 'Le lien n’a pas pu être enregistré. Réessaie.'],
])('a refused write says why, never with the raw database message', async (error, message) => {
  mockResult = { error };
  await expect(linkIngredient(OWNER, 'Huile neutre', PRODUCT)).rejects.toThrow(message);
  expect(dispatchAgentDbChanged).not.toHaveBeenCalled();
});
