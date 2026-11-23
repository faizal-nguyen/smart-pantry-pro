/**
 * The units offered when adding to the shopping list. Count, mass and volume choices are
 * spellings of the conversion table (quantities.ts, and stock_unit in SQL), so an add tops up
 * a row in a convertible unit (V11-05 D16). A packaging only adds up with itself.
 */
export type ShoppingUnitGroupId = 'count' | 'mass' | 'volume' | 'packaging';
export interface ShoppingUnitGroup { id: ShoppingUnitGroupId; label: string; units: readonly string[] }

export const SHOPPING_UNIT_GROUPS: readonly ShoppingUnitGroup[] = [
  { id: 'count', label: 'Comptage', units: ['pièce'] },
  { id: 'mass', label: 'Poids', units: ['g', 'kg'] },
  { id: 'volume', label: 'Volume', units: ['ml', 'cl', 'l'] },
  { id: 'packaging', label: 'Conditionnements', units: ['paquet', 'boîte', 'sachet', 'bouteille', 'pot', 'tube', 'brique', 'barquette', 'botte'] },
];

/** The listed units, plus a row's current unit when it is not one of them (it is never lost). */
export function shoppingUnitOptions(current?: string | null): string[] {
  const listed = SHOPPING_UNIT_GROUPS.flatMap(group => group.units);
  const value = current?.trim();
  return value && !listed.includes(value) ? [...listed, value] : listed;
}
