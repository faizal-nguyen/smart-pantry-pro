/** V11-01 E5b — how a receipt reads on screen: a day, an amount. */
const day = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });

/** « 20 novembre », from a calendar day (AAAA-MM-JJ) or an instant. */
export function receiptDay(value: string | null): string | null {
  if (!value) return null;
  const calendar = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = calendar ? new Date(Number(calendar[1]), Number(calendar[2]) - 1, Number(calendar[3])) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : day.format(date);
}

/** « 12,40 € » with the receipt's currency; a bare amount when the currency was not read. */
export function receiptAmount(value: number | null, currency: string | null): string | null {
  if (value === null) return null;
  if (!currency) return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(value); }
  catch { return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value); }
}
