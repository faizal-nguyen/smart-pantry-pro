/**
 * V11-01 E5b — the storage draft of « Ranger mes achats » (PRP V11-01 §7), merged per row instead of
 * being set once and wiped whole: a new purchase (a receipt applied, a row checked) joins it; a row
 * whose version changed takes its new quantity and keeps what the user typed (zone, date), with a
 * word; a row no longer bought leaves; after storing, only the stored rows leave it.
 */
import type { LotDateKind, QuantityQuality } from '@/components/inventory/LotQualificationFields';
import type { ShoppingItem } from '@/hooks/useShoppingList';
import { formatShoppingQuantity } from '@/lib/shoppingChanges';

export interface DraftRow {
  id: string; version: number; name: string; quantity: string; unit: string; location: string; date: string; selected: boolean;
  dateKind?: LotDateKind; quality?: QuantityQuality;
  /** What changed since the row was put in the draft. */
  notice?: string;
}

const unitOf = (item: ShoppingItem) => item.unit ?? item.product?.unit_type ?? '';

export function draftRow(item: ShoppingItem): DraftRow {
  return { id: item.id, version: item.stock_version ?? 0, name: item.product?.name ?? 'Produit', quantity: String(item.quantity), unit: unitOf(item),
    location: '', date: '', selected: true };
}

/** The draft against the list as it stands; the same array when nothing changed. */
export function mergeDraft(rows: DraftRow[], items: ShoppingItem[]): DraftRow[] {
  const bought = new Map(items.filter(item => item.is_purchased).map(item => [item.id, item]));
  let changed = false;
  const kept = rows.flatMap(row => {
    const item = bought.get(row.id);
    if (!item) { changed = true; return []; }
    if ((item.stock_version ?? 0) === row.version) return [row];
    changed = true;
    return [{ ...row, version: item.stock_version ?? 0, name: item.product?.name ?? row.name, quantity: String(item.quantity), unit: unitOf(item),
      notice: `Quantité mise à jour : ${formatShoppingQuantity(Number(item.quantity))} ${unitOf(item)}.`.replace(/ \.$/, '.') }];
  });
  const known = new Set(rows.map(row => row.id));
  const added = [...bought.values()].filter(item => !known.has(item.id)).map(draftRow);
  return changed || added.length ? [...kept, ...added] : rows;
}

export function afterStorage(rows: DraftRow[], stored: string[]): DraftRow[] {
  const gone = new Set(stored);
  return rows.filter(row => !gone.has(row.id));
}
