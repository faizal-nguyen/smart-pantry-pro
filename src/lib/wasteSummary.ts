import { calendarDate } from '@smart/shared';

export type WasteReason = 'expired' | 'spoiled' | 'leftover' | 'other';
export type WastePeriod = 'last30' | 'all';

/** A declared loss as read from `food_waste_events` (numeric columns may come back as strings). */
export interface WasteEvent {
  id: string;
  product_name: string;
  category: string | null;
  quantity: number | string;
  unit_type: string | null;
  reason: WasteReason;
  notes: string | null;
  estimated_cost_eur: number | string | null;
  occurred_at: string;
}

export interface WasteSummary {
  /** Declarations in the period. */
  count: number;
  byReason: { reason: WasteReason; count: number }[];
  /** The most frequent categories, at most CATEGORY_LIMIT. */
  byCategory: { category: string; count: number }[];
  /** Declarations whose category is beyond the shown ones. */
  otherCategoriesCount: number;
  /** Declarations with a known cost; an unknown cost never enters the sum. */
  knownCostCount: number;
  knownCostTotal: number;
  /** Declarations with an unreadable or future date: in no period, said apart. */
  undatedCount: number;
  /** First and last calendar day of the period (shared zone); `start` is null for an empty history. */
  start: string | null;
  end: string;
}

export const WASTE_WINDOW_DAYS = 30;
export const CATEGORY_LIMIT = 6;
export const NO_CATEGORY = 'Sans catégorie';
const REASON_ORDER: WasteReason[] = ['expired', 'spoiled', 'leftover', 'other'];

function shiftDay(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

/** A cost the summary can add: present, numeric and not negative. */
export function knownCost(value: WasteEvent['estimated_cost_eur']): number | null {
  if (value === null || value === undefined || value === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function ranked<K extends string>(counts: Map<K, number>, order: (a: K, b: K) => number) {
  return [...counts.entries()].sort(([a, x], [b, y]) => y - x || order(a, b));
}

/**
 * The losses of a period, in calendar days of the shared zone (PRP V11-06, section 5): counts of
 * declarations, never a quantity summed across units; a cost only when known, with its coverage.
 */
export function wasteSummary(events: readonly WasteEvent[], period: WastePeriod, now: Date = new Date()): WasteSummary {
  const end = calendarDate(now);
  if (!end) throw new RangeError('wasteSummary needs a valid date.');
  const dated = events
    .map(event => ({ event, day: calendarDate(event.occurred_at) }))
    .filter((item): item is { event: WasteEvent; day: string } => item.day !== null && item.day <= end);
  const first = dated.reduce<string | null>((oldest, item) => (oldest === null || item.day < oldest ? item.day : oldest), null);
  const start = period === 'last30' ? shiftDay(end, 1 - WASTE_WINDOW_DAYS) : first;
  const inPeriod = start === null ? [] : dated.filter(item => item.day >= start).map(item => item.event);

  const reasons = new Map<WasteReason, number>();
  const categories = new Map<string, number>();
  let knownCostCount = 0;
  let knownCostTotal = 0;
  for (const event of inPeriod) {
    reasons.set(event.reason, (reasons.get(event.reason) ?? 0) + 1);
    const category = event.category?.trim() || NO_CATEGORY;
    categories.set(category, (categories.get(category) ?? 0) + 1);
    const cost = knownCost(event.estimated_cost_eur);
    if (cost !== null) { knownCostCount += 1; knownCostTotal += cost; }
  }
  const byCategory = ranked(categories, (a, b) => a.localeCompare(b, 'fr')).map(([category, count]) => ({ category, count }));
  return {
    count: inPeriod.length,
    byReason: ranked(reasons, (a, b) => REASON_ORDER.indexOf(a) - REASON_ORDER.indexOf(b)).map(([reason, count]) => ({ reason, count })),
    byCategory: byCategory.slice(0, CATEGORY_LIMIT),
    otherCategoriesCount: byCategory.slice(CATEGORY_LIMIT).reduce((sum, item) => sum + item.count, 0),
    knownCostCount,
    knownCostTotal: Math.round(knownCostTotal * 100) / 100,
    undatedCount: events.length - dated.length,
    start,
    end,
  };
}
