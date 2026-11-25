import type { ShoppingChange } from '@smart/shared';

const quantityFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });
/** A list quantity as the user reads it: « 1,5 », not « 1.5 ». */
export const formatShoppingQuantity = (quantity: number): string => quantityFormat.format(quantity);
const amount = (quantity: number | undefined, unit: string | undefined) =>
  `${quantity === undefined ? '' : formatShoppingQuantity(quantity)} ${unit ?? ''}`.trim();

const count = (value: number, one: string, many: string) => `${value} ${value > 1 ? many : one}`;
/** V11-01 E5b: a receipt applied to the list, told by what it did to the list. */
function describeReceipt(changes: ShoppingChange[]): string {
  const checked = changes.filter(change => change.outcome === 'checked' || change.outcome === 'updated').length;
  const remainder = changes.filter(change => change.note === 'receipt_remainder').length;
  const added = changes.filter(change => change.note === 'receipt_added').length;
  const parts = [checked && count(checked, 'achat coché', 'achats cochés'), remainder && count(remainder, 'reste à acheter', 'restes à acheter'),
    added && count(added, 'ajouté', 'ajoutés')].filter(Boolean);
  return parts.length ? `Ticket rapproché : ${parts.join(', ')}.` : 'Ticket rapproché.';
}

/** What the user reads once the database confirmed a list command (V11-05 E2); a receipt is told as such (V11-01 E5b). */
export function describeShoppingChanges(changes: ShoppingChange[] = [], commandType?: string): string {
  if (commandType === 'reconcile_receipt' || changes.some(change => change.note?.startsWith('receipt_'))) return describeReceipt(changes);
  if (changes.length > 1) {
    if (changes.every(change => change.outcome === 'removed')) return `${changes.length} articles retirés des courses.`;
    if (changes.every(change => change.outcome === 'checked')) return `${changes.length} articles cochés.`;
    return `${changes.length} articles mis à jour.`;
  }
  const change = changes[0];
  if (!change) return 'Liste mise à jour.';
  const name = change.name ?? 'Produit';
  switch (change.outcome) {
    case 'merged': return `${name} : ${amount(change.added_quantity, change.unit)} ajouté, ${amount(change.quantity, change.unit)} au total.`;
    case 'created':
      if (change.note === 'unit_incompatible') return `${name} : nouvelle ligne de ${amount(change.quantity, change.unit)}, l’unité diffère de la ligne déjà prévue.`;
      if (change.note === 'purchased_pending') return `${name} : nouvelle ligne de ${amount(change.quantity, change.unit)}, l’achat précédent est déjà coché, à ranger.`;
      return `${name} ajouté aux courses.`;
    case 'checked': return `${name} coché.`;
    case 'unchecked': return `${name} remis à acheter.`;
    case 'unchanged': return `${name} est déjà dans cet état.`;
    case 'updated': return `${name} modifié.`;
    case 'removed': return `${name} retiré des courses.`;
    case 'restored': return `${name} rétabli.`;
    case 'reduced': return `${name} : ${amount(change.added_quantity, change.unit)} retiré, ${amount(change.quantity, change.unit)} restant.`;
  }
}
