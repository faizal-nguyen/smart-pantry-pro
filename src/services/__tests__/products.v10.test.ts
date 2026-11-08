import { findOrCreateProduct, productNameKey } from '../products';

const mockLookups: string[] = [];
const mockRows = new Map<string, { id: string; name: string }>();
let mockInsertError: { code: string; message: string } | null = null;
/** Rows the next lookups see, before mockRows (a row created between two lookups). */
const mockSeen: Array<{ id: string; name: string } | null> = [];
jest.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({
  select: () => ({ eq: (_column: string, key: string) => ({ maybeSingle: async () => { mockLookups.push(key); return { data: mockSeen.length ? mockSeen.shift() : mockRows.get(key) ?? null, error: null }; } }) }),
  insert: (row: { name: string }) => ({ select: () => ({ single: async () => mockInsertError
    ? { data: null, error: mockInsertError } : { data: { id: 'new', name: row.name }, error: null } }) }),
}) } }));

beforeEach(() => { mockLookups.length = 0; mockRows.clear(); mockSeen.length = 0; mockInsertError = null; });

test.each([['Crème fraîche', 'creme fraiche'], ['  Œufs ', 'oeufs'], ['Bœuf haché', 'boeuf hache'], ['Pâte brisée', 'pate brisee']])(
  'the key of %s is the one the database derives (lower(unaccent(trim)))', (name, key) => expect(productNameKey(name)).toBe(key));

// Audit 2026-11-07: an ilike lookup missed « Crème fraîche » for « Creme fraiche », then the insert hit the unique key (23505).
test('« Creme fraiche » finds the existing « Crème fraîche » instead of creating it', async () => {
  mockRows.set('creme fraiche', { id: 'creme', name: 'Crème fraîche' });
  await expect(findOrCreateProduct({ name: 'Creme fraiche', category: 'Général', unit: 'g' })).resolves.toEqual({ id: 'creme', name: 'Crème fraîche' });
  expect(mockLookups).toEqual(['creme fraiche']);
});

test('a new product is created', async () => {
  await expect(findOrCreateProduct({ name: 'Sumac', category: 'Général', unit: 'g' })).resolves.toEqual({ id: 'new', name: 'Sumac' });
});

test('created meanwhile by someone else: the existing one is used', async () => {
  mockInsertError = { code: '23505', message: 'duplicate key value violates unique constraint' };
  mockSeen.push(null);
  mockRows.set('sumac', { id: 'sumac', name: 'Sumac' });
  await expect(findOrCreateProduct({ name: 'Sumac', category: 'Général', unit: 'g' })).resolves.toEqual({ id: 'sumac', name: 'Sumac' });
  expect(mockLookups).toEqual(['sumac', 'sumac']);
});

test('a duplicate that cannot be found again says so in French', async () => {
  mockInsertError = { code: '23505', message: 'duplicate key value violates unique constraint' };
  await expect(findOrCreateProduct({ name: 'Sumac', category: 'Général', unit: 'g' })).rejects.toThrow('Ce produit existe déjà sous un nom proche. Choisis-le dans la liste.');
});
