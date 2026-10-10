import { getRecipeDetails, saveRecipePhoto } from '../recipeDetails';
import { fetchUnifiedRecipe, invalidateUnifiedRecipeCache } from '@/lib/recipeSource';
const OWNER = '00000000-0000-4000-8000-000000000001';
const ID = '10000000-0000-4000-8000-000000000001';
let mockOwner = OWNER, mockWritten: string | null = ID;
const mockWrites: Array<{ table: string; values: unknown; filters: unknown[] }> = [];
jest.mock('@/lib/api', () => ({ ApiError: class extends Error { code?: string; constructor(message: string, options: { code?: string }) { super(message); this.code = options.code; } } }));
jest.mock('@/lib/recipeSource', () => ({ fetchUnifiedRecipe: jest.fn(), invalidateUnifiedRecipeCache: jest.fn() }));
jest.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: mockOwner } } } }) },
  from: (table: string) => {
    const write = { table, values: {} as unknown, filters: [] as unknown[] }; mockWrites.push(write);
    const query: any = { update: (values: unknown) => { write.values = values; return query; }, eq: (key: string, value: unknown) => { write.filters.push([key, value]); return query; },
      select: () => query, single: async () => ({ data: mockWritten ? { id: mockWritten } : null, error: null }) };
    return query;
  },
} }));
beforeEach(() => { jest.clearAllMocks(); mockOwner = OWNER; mockWritten = ID; mockWrites.length = 0; });
test('an exact library reference with empty personal ingredients does not fall through to legacy ingredients', async () => {
  jest.mocked(fetchUnifiedRecipe).mockResolvedValue({ id: ID, source: 'user_recipes', canonicalId: ID, inlineIngredients: [], instructions: '["Cuire.","Servir."]' } as any);
  const result = await getRecipeDetails(OWNER, { id: ID, source: 'user_recipes' });
  expect(fetchUnifiedRecipe).toHaveBeenCalledWith(ID, 'user_recipes', OWNER);
  expect(result.ingredients).toEqual([]); expect(result.instructions).toEqual(['Cuire.', 'Servir.']);
  expect(mockWrites).toEqual([]);
});
test('a changed account during a read cannot receive the previous account recipe', async () => {
  jest.mocked(fetchUnifiedRecipe).mockImplementation(async () => { mockOwner = 'other'; return { id: ID, source: 'user_recipes', instructions: '' } as any; });
  await expect(getRecipeDetails(OWNER, { id: ID, source: 'user_recipes' })).rejects.toMatchObject({ code: 'AUTH_CHANGED' });
});
test.each(['recipes', 'user_recipes'] as const)('photo write targets the owned %s row and verifies success', async source => {
  await saveRecipePhoto(OWNER, { id: ID, source }, '/new.jpg');
  expect(mockWrites[0]).toEqual({ table: source, values: { [source === 'recipes' ? 'image_url' : 'custom_photo_url']: '/new.jpg' }, filters: [['id', ID], ['user_id', OWNER]] });
  expect(invalidateUnifiedRecipeCache).toHaveBeenCalledWith(ID);
  mockWritten = null;
  await expect(saveRecipePhoto(OWNER, { id: ID, source }, '/lost.jpg')).rejects.toThrow('non enregistrée');
});
test('the shared catalogue cannot be overwritten by a personal photo', async () => {
  await expect(saveRecipePhoto(OWNER, { id: ID, source: 'recipes_catalog' }, '/new.jpg')).rejects.toThrow('bibliothèque');
  expect(mockWrites).toEqual([]);
});
