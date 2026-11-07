/**
 * Branded products added from grocery photos are filled from Open Food Facts
 * (Nutri-Score, NOVA, ingredients) when OFF knows the same brand and name.
 */
import { brandedMatch, ProductIntelligenceService } from '../ProductIntelligenceService.js';
import type { ExternalProductCandidate } from '../productTypes.js';

type Options = NonNullable<ConstructorParameters<typeof ProductIntelligenceService>[1]>;

const candidate = (name: string, brand: string | null, confidence = 0.9): ExternalProductCandidate => ({
  source: 'openfoodfacts', externalCode: `code-${name}-${brand}`, name, brand, confidence,
});

test('the OFF match has the same brand and most of the product words', () => {
  const kewpie = candidate('Mayonnaise japonaise', 'Kewpie');
  expect(brandedMatch('Mayonnaise Kewpie', 'Kewpie', [candidate('Mayonnaise', 'Amora'), kewpie, candidate('Sauce sésame', 'Kewpie')])).toBe(kewpie);
  expect(brandedMatch('Cacao en poudre 100 % cacao Cailler', 'Cailler', [candidate('Chocolat au lait', 'Cailler'), candidate('Cacao en poudre', 'Cailler, Nestlé')]))
    .toMatchObject({ name: 'Cacao en poudre' });
  expect(brandedMatch('Mayonnaise Kewpie', 'Kewpie', [candidate('Mayonnaise', 'Amora'), candidate('Mayonnaise', null)])).toBeNull();
});

function setup(products: Array<{ id: string; name: string; brand: string | null }>, search: () => Promise<unknown[]>) {
  const query: Record<string, unknown[]> = {};
  const chain = {
    select: (...args: unknown[]) => { query.select = args; return chain; },
    in: (...args: unknown[]) => { (query.in ??= []).push(args); return chain; },
    not: (...args: unknown[]) => { query.not = args; return chain; },
    limit: async (...args: unknown[]) => { query.limit = args; return { data: products, error: null }; },
  };
  const admin = { from: (table: string) => { query.table = [table]; return chain; } };
  const repository = {
    readCache: jest.fn(async () => ({ hit: null, expired: false })),
    writeCache: jest.fn(async () => undefined),
    applyEnrichment: jest.fn(async () => ({})),
  };
  const offClient = { searchProducts: jest.fn(search) };
  const service = new ProductIntelligenceService(admin as never, {
    resolver: {} as Options['resolver'], offClient: offClient as unknown as Options['offClient'], repository: repository as unknown as Options['repository'],
  });
  return { service, repository, offClient, query };
}

test('a branded product is filled from its OFF match, Nutri-Score included, without the OFF photo', async () => {
  const { service, repository, offClient, query } = setup([{ id: 'p-kewpie', name: 'Mayonnaise Kewpie', brand: 'Kewpie' }], async () => [
    { code: '111', product_name: 'Mayonnaise', brands: 'Amora', nutriscore_grade: 'd' },
    { code: '4901577', product_name: 'Mayonnaise', brands: 'Kewpie', nutriscore_grade: 'e', nova_group: 4,
      nutriments: { 'energy-kcal_100g': 703, energy_kcal_100g: 703 }, image_front_url: 'https://images.openfoodfacts.org/kewpie.jpg' },
  ]);

  await service.enrichBrandedProducts(['p-kewpie', 'p-kewpie']);

  expect(query.table).toEqual(['products']);
  expect(query.not).toEqual(['brand', 'is', null]);
  expect(query.in).toEqual([['id', ['p-kewpie']], ['enrichment_status', ['none', 'stale']]]);
  expect(query.limit).toEqual([5]);
  expect(offClient.searchProducts).toHaveBeenCalledWith('Mayonnaise Kewpie', { limit: 5, locale: 'fr' });
  expect(repository.applyEnrichment).toHaveBeenCalledTimes(1);
  const applied = (repository.applyEnrichment.mock.calls[0] as unknown as [{ productId: string; candidate: ExternalProductCandidate }])[0];
  expect(applied.productId).toBe('p-kewpie');
  expect(applied.candidate).toMatchObject({ externalCode: '4901577', brand: 'Kewpie', imageUrl: null });
  expect(applied.candidate.nutrition?.scores).toMatchObject({ nutriScore: 'e', novaGroup: 4 });
});

test('no OFF product of that brand, or OFF failing, leaves the product as it was and never throws', async () => {
  const other = setup([{ id: 'p-paste', name: 'Spice Paste for Szechuan Stir Fry Asian Home Gourmet', brand: 'Asian Home Gourmet' }],
    async () => [{ code: '9', product_name: 'Szechuan Stir Fry Paste', brands: 'Blue Dragon' }]);
  await other.service.enrichBrandedProducts(['p-paste']);
  expect(other.repository.applyEnrichment).not.toHaveBeenCalled();

  const down = setup([{ id: 'p-paste', name: 'Mayonnaise Kewpie', brand: 'Kewpie' }], async () => { throw new Error('OFF timeout'); });
  await expect(down.service.enrichBrandedProducts(['p-paste'])).resolves.toBeUndefined();
  expect(down.repository.applyEnrichment).not.toHaveBeenCalled();
});

test('nothing to enrich makes no query', async () => {
  const { service, query } = setup([], async () => []);
  await service.enrichBrandedProducts([]);
  expect(query.table).toBeUndefined();
});
