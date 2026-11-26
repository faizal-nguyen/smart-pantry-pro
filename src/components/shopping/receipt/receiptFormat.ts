import { formatMoney, formatNumber, formatDate } from '@smart/shared';

// V11-01 E5b — how a receipt reads on screen: a day, an amount.

/** « 20 novembre », from a calendar day (AAAA-MM-JJ) or an instant. */
export function receiptDay(value: string | null): string | null {
  if (!value) return null;
  return formatDate(value, 'dayMonth') || null;
}

/** « 12,40 € » with the receipt's currency; a bare amount when the currency was not read. */
export function receiptAmount(value: number | null, currency: string | null): string | null {
  if (value === null) return null;
  return currency ? formatMoney(value, currency) : formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
