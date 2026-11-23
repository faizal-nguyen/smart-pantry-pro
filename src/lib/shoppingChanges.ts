import type { ShoppingChange } from '@smart/shared';

const quantityFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });
/** A list quantity as the user reads it: « 1,5 », not « 1.5 ». */
export const formatShoppingQuantity = (quantity: number): string => quantityFormat.format(quantity);
const amount = (quantity: number | undefined, unit: string | undefined) =>
  `${quantity === undefined ? '' : formatShoppingQuantity(quantity)} ${unit ?? ''}`.trim();

/** What the user reads once the database confirmed a list command (V11-05 E2). */
export function describeShoppingChanges(changes: ShoppingChange[] = []): string {
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
  }
}
