import { CATEGORY_LIMIT, WASTE_WINDOW_DAYS, wasteSummary, type WasteEvent } from '../wasteSummary';

const NOW = new Date('2026-11-25T10:00:00+01:00');
let next = 0;
const event = (occurred_at: string, patch: Partial<WasteEvent> = {}): WasteEvent => ({
  id: `e${++next}`, product_name: 'Produit', category: 'Légumes', quantity: 1, unit_type: 'g', reason: 'expired',
  notes: null, estimated_cost_eur: null, occurred_at, ...patch,
});

describe('waste summary', () => {
  test('no declaration measures nothing, and the window still has its bounds', () => {
    expect(WASTE_WINDOW_DAYS).toBe(30);
    expect(wasteSummary([], 'last30', NOW)).toEqual({
      count: 0, byReason: [], byCategory: [], otherCategoriesCount: 0, knownCostCount: 0, knownCostTotal: 0, undatedCount: 0, start: '2026-10-27', end: '2026-11-25',
    });
    expect(wasteSummary([], 'all', NOW)).toMatchObject({ count: 0, start: null, end: '2026-11-25' });
  });

  test('the last 30 days are calendar days of the shared zone: day −29 counts, day −30 and the future do not', () => {
    const events = [
      event('2026-11-25T08:00:00+01:00'),
      event('2026-10-27T10:00:00+01:00'),
      event('2026-10-26T23:30:00Z'), // 27 October, 00:30 in Paris
      event('2026-10-26T12:00:00Z'),
      event('2026-11-26T09:00:00Z'),
    ];
    expect(wasteSummary(events, 'last30', NOW)).toMatchObject({ count: 3, undatedCount: 1 });
  });

  test('since the beginning starts on the calendar day of the first declaration', () => {
    const events = [event('2026-11-20T10:00:00Z'), event('2026-03-02T23:30:00Z'), event('2026-06-01T10:00:00Z')];
    expect(wasteSummary(events, 'all', NOW)).toMatchObject({ count: 3, start: '2026-03-03', end: '2026-11-25' });
  });

  test('reasons and categories count declarations, most frequent first, an absent category named apart', () => {
    const events = [
      event('2026-11-24T10:00:00Z', { reason: 'spoiled', category: 'Fruits' }),
      event('2026-11-23T10:00:00Z', { reason: 'spoiled', category: null }),
      event('2026-11-22T10:00:00Z', { reason: 'expired', category: 'Fruits' }),
    ];
    const summary = wasteSummary(events, 'last30', NOW);
    expect(summary.byReason).toEqual([{ reason: 'spoiled', count: 2 }, { reason: 'expired', count: 1 }]);
    expect(summary.byCategory).toEqual([{ category: 'Fruits', count: 2 }, { category: 'Sans catégorie', count: 1 }]);
  });

  test('beyond the shown categories, the rest is counted together', () => {
    const events = Array.from({ length: CATEGORY_LIMIT + 2 }, (_, index) => event('2026-11-24T10:00:00Z', { category: `Catégorie ${index}` }));
    const summary = wasteSummary(events, 'last30', NOW);
    expect(summary.byCategory).toHaveLength(CATEGORY_LIMIT);
    expect(summary.otherCategoriesCount).toBe(2);
  });

  test('an unknown cost stays out of the sum, a zero cost is known, and numeric strings are read', () => {
    const events = [
      event('2026-11-24T10:00:00Z', { estimated_cost_eur: 1.5 }),
      event('2026-11-24T11:00:00Z', { estimated_cost_eur: '2.25' }),
      event('2026-11-24T12:00:00Z', { estimated_cost_eur: 0 }),
      event('2026-11-24T13:00:00Z', { estimated_cost_eur: null }),
    ];
    expect(wasteSummary(events, 'last30', NOW)).toMatchObject({ count: 4, knownCostCount: 3, knownCostTotal: 3.75 });
  });

  test('a declaration with an unreadable date is left out rather than placed anywhere', () => {
    expect(wasteSummary([event('not-a-date'), event('2026-11-24T10:00:00Z')], 'all', NOW)).toMatchObject({ count: 1, undatedCount: 1, start: '2026-11-24' });
  });
});
