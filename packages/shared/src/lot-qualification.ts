import { calendarDaysUntil } from './calendar.js';
import type { StockLot } from './quantities.js';

/** A stock lot with what the pantry knows of its date and amount. */
export type QualifiedLot = StockLot & {
  date_kind?: 'use_by' | 'best_before' | 'unknown';
  quantity_quality?: 'measured' | 'estimated' | 'unknown';
  location?: string | null;
  notes?: string | null;
};

/** Recommendations: a lot past its date is never promised, whatever the kind of date. */
export function qualifyLots(lots: QualifiedLot[], now: Date) {
  const eligible: QualifiedLot[] = [], excluded: string[] = [];
  const reasons: Array<{ id: string; date_kind: 'use_by' | 'best_before' | 'unknown'; message: string }> = [];
  for (const lot of lots) {
    if (!(lot.quantity > 0)) continue;
    const days = calendarDaysUntil(lot.expiry_date, now);
    // Expired DDM / unknown dates require a human check too; no automatic stock promise.
    if (days !== null && days < 0) {
      excluded.push(lot.id);
      const kind = lot.date_kind ?? 'unknown';
      reasons.push({ id: lot.id, date_kind: kind, message: kind === 'use_by' ? `${lot.product_name} : DLC dépassée, lot exclu des idées automatiques.` : kind === 'best_before' ? `${lot.product_name} : DDM dépassée, vérification nécessaire avant de compter ce lot.` : `${lot.product_name} : date dépassée de type inconnu, lot à vérifier.` });
    } else eligible.push(lot);
  }
  return { eligible, excluded, reasons };
}

/**
 * Lots as they will be on a meal's day (V11-01, section 4): a use-by date passed by then excludes
 * the lot; a best-before or unknown date passed by then leaves it to verify. Neither is counted as
 * available. An empty lot is left out.
 */
export function qualifyLotsOn(lots: QualifiedLot[], day: string): { eligible: QualifiedLot[]; verify: QualifiedLot[]; excluded: QualifiedLot[] } {
  const on = new Date(`${day}T12:00:00Z`);
  const eligible: QualifiedLot[] = [], verify: QualifiedLot[] = [], excluded: QualifiedLot[] = [];
  for (const lot of lots) {
    if (!(lot.quantity > 0)) continue;
    const days = calendarDaysUntil(lot.expiry_date, on);
    if (days === null || days >= 0) eligible.push(lot);
    else if (lot.date_kind === 'use_by') excluded.push(lot);
    else verify.push(lot);
  }
  return { eligible, verify, excluded };
}
