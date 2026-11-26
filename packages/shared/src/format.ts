import { PANTRY_TIME_ZONE, calendarDate } from './calendar.js';

/**
 * V11-06 D6 — translation is deferred (one French-speaking user); the locale and the time zone are
 * set here once. Days are calendar labels; instants are read in `PANTRY_TIME_ZONE`, whatever the
 * device's zone. Known limit: away from France, « today » stays the day in Paris.
 */
export const APP_LOCALE = 'fr-FR';

const DATE_PRESETS = {
  weekdayDayMonth: { weekday: 'long', day: 'numeric', month: 'long' },
  weekdayDayMonthYear: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  weekday: { weekday: 'long' },
  weekdayShort: { weekday: 'short' },
  weekdayShortDayMonthShort: { weekday: 'short', day: 'numeric', month: 'short' },
  dayMonthShort: { day: 'numeric', month: 'short' },
  day: { day: 'numeric' },
  dayMonth: { day: 'numeric', month: 'long' },
  dayMonthYear: { day: 'numeric', month: 'long', year: 'numeric' },
  dayMonthShortYear: { day: 'numeric', month: 'short', year: 'numeric' },
  day2MonthShort: { day: '2-digit', month: 'short' },
  numeric: {},
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;
export type DatePreset = keyof typeof DATE_PRESETS;

const DATE_TIME_PRESETS = {
  full: { dateStyle: 'short', timeStyle: 'medium' },
  short: { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;
export type DateTimePreset = keyof typeof DATE_TIME_PRESETS;

const dateFormats = new Map<string, Intl.DateTimeFormat>();
const numberFormats = new Map<string, Intl.NumberFormat>();
/** Currencies Intl refused once: not tried again. */
const invalidCurrencies = new Set<string>();

function dateFormat(key: string, options: () => Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  let format = dateFormats.get(key);
  if (!format) { format = new Intl.DateTimeFormat(APP_LOCALE, options()); dateFormats.set(key, format); }
  return format;
}

function instant(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/**
 * A day (`AAAA-MM-JJ`, kept as is) or an instant (its day in Paris), with one of the presets the
 * app uses. An unreadable value gives an empty string.
 */
export function formatDate(value: string | Date, preset: DatePreset): string {
  const day = calendarDate(value);
  if (!day) return '';
  // Noon UTC of the day, formatted in UTC: the same calendar day on every device.
  return dateFormat(`date:${preset}`, () => ({ ...DATE_PRESETS[preset], timeZone: 'UTC' })).format(new Date(`${day}T12:00:00Z`));
}

/** « 14:32 », in Paris. */
export function formatTime(value: string | Date): string {
  const date = instant(value);
  return date ? dateFormat('time', () => ({ hour: '2-digit', minute: '2-digit', timeZone: PANTRY_TIME_ZONE })).format(date) : '';
}

/** « 26/11/2026 14:32:05 » (`full`) or « 26 nov., 14:32 » (`short`), in Paris. */
export function formatDateTime(value: string | Date, preset: DateTimePreset = 'full'): string {
  const date = instant(value);
  return date ? dateFormat(`datetime:${preset}`, () => ({ ...DATE_TIME_PRESETS[preset], timeZone: PANTRY_TIME_ZONE })).format(date) : '';
}

export interface NumberFormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
}

function numberFormat(key: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  let format = numberFormats.get(key);
  if (!format) { format = new Intl.NumberFormat(APP_LOCALE, options); numberFormats.set(key, format); }
  return format;
}

/** « 1 234,5 »; at most 3 decimals unless told otherwise, as Intl does. */
export function formatNumber(value: number, options: NumberFormatOptions = {}): string {
  const { minimumFractionDigits, maximumFractionDigits, useGrouping } = options;
  return numberFormat(`number:${minimumFractionDigits}:${maximumFractionDigits}:${useGrouping}`, options).format(value);
}

/** « 12,40 € » in the given currency; a bare amount with two decimals when the currency is not one. */
export function formatMoney(value: number, currency = 'EUR'): string {
  if (!invalidCurrencies.has(currency)) {
    try {
      return numberFormat(`money:${currency}`, { style: 'currency', currency }).format(value);
    } catch {
      invalidCurrencies.add(currency);
    }
  }
  return formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
