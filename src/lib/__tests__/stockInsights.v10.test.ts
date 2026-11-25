import { EXPIRY_HORIZON_DAYS, stockInsights } from '../stockInsights';

const NOW = new Date('2026-11-25T10:00:00+01:00');
const lot = (quantity: number, expiry_date: string | null) => ({ quantity, expiry_date });

describe('stock insights', () => {
  test('an empty stock measures zero everywhere, with the horizon seven calendar days ahead', () => {
    expect(EXPIRY_HORIZON_DAYS).toBe(7);
    expect(stockInsights([], NOW)).toEqual({ lotsInStock: 0, expiringSoon: 0, undatedLots: 0, expiredLots: 0, horizon: '2026-12-02' });
  });

  test('today and the seventh day count, the eighth day does not, a passed date is said apart', () => {
    const result = stockInsights([lot(1, '2026-11-25'), lot(2, '2026-12-02'), lot(1, '2026-12-03'), lot(1, '2026-11-24')], NOW);
    expect(result).toMatchObject({ lotsInStock: 4, expiringSoon: 2, undatedLots: 0, expiredLots: 1 });
  });

  test('a lot without a quantity is left out of every measure', () => {
    const result = stockInsights([lot(0, '2026-11-26'), lot(0, null), lot(-1, '2026-11-26'), lot(3, '2026-11-26')], NOW);
    expect(result).toMatchObject({ lotsInStock: 1, expiringSoon: 1, undatedLots: 0, expiredLots: 0 });
  });

  test('a missing or unreadable date is counted apart, never as expiring', () => {
    const result = stockInsights([lot(1, null), lot(1, ''), lot(1, 'not-a-date'), lot(1, '2026-02-30')], NOW);
    expect(result).toMatchObject({ lotsInStock: 4, expiringSoon: 0, undatedLots: 4, expiredLots: 0 });
  });

  test('days are calendar days in the shared time zone, not the device clock', () => {
    const lateEvening = new Date('2026-11-25T23:30:00Z'); // already 26 November in Paris
    const result = stockInsights([lot(1, '2026-11-25'), lot(1, '2026-12-03'), lot(1, '2026-11-26T23:30:00Z')], lateEvening);
    expect(result).toEqual({ lotsInStock: 3, expiringSoon: 2, undatedLots: 0, expiredLots: 1, horizon: '2026-12-03' });
  });

  test('an invalid clock is refused rather than measured', () => {
    expect(() => stockInsights([], new Date('invalid'))).toThrow(RangeError);
  });
});
