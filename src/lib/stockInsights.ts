import { calendarDate, calendarDaysUntil } from '@smart/shared';

/** Same window as `getExpiringItems` (useInventory): today and the next seven calendar days. */
export const EXPIRY_HORIZON_DAYS = 7;

export interface StockLot {
  quantity: number;
  expiry_date?: string | null;
}

export interface StockInsights {
  /** Lots with a positive quantity. */
  lotsInStock: number;
  /** Lots with a positive quantity whose date falls between today and the horizon, both included. */
  expiringSoon: number;
  /** Lots with a positive quantity and no readable date: never counted as expiring. */
  undatedLots: number;
  /** Lots with a positive quantity whose date has passed: outside the window, said apart. */
  expiredLots: number;
  /** Last calendar day of the window (YYYY-MM-DD, shared time zone). */
  horizon: string;
}

function horizonFrom(now: Date): string {
  const today = calendarDate(now);
  if (!today) throw new RangeError('stockInsights needs a valid date.');
  const day = new Date(`${today}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + EXPIRY_HORIZON_DAYS);
  return day.toISOString().slice(0, 10);
}

/** Measures read from the stock lots only: calendar days of the shared time zone, empty lots left out. */
export function stockInsights(lots: readonly StockLot[], now: Date = new Date()): StockInsights {
  const held = lots.filter(lot => lot.quantity > 0);
  const days = held.map(lot => calendarDaysUntil(lot.expiry_date, now));
  return {
    lotsInStock: held.length,
    expiringSoon: days.filter(value => value != null && value >= 0 && value <= EXPIRY_HORIZON_DAYS).length,
    undatedLots: days.filter(value => value == null).length,
    expiredLots: days.filter(value => value != null && value < 0).length,
    horizon: horizonFrom(now),
  };
}
