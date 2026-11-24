/*
 * Visual QA only (V11-01 E2): a fictitious week's shopping in the six line states, read against
 * the fixture's list so that a confirmation turns lines « déjà sur ta liste ». The computation
 * and its SQL bounds are tested on PostgreSQL and in packages/shared, not here.
 */
import type { MenuShoppingLine, MenuShoppingPreview, StockCommand, StockCommandResult } from '@smart/shared';
import { data, failures, OWNER } from './supabase';

type Row = Record<string, unknown>;
type MenuAddMissing = Extract<StockCommand, { command_type: 'menu_add_missing' }>;
const DAY_MS = 86_400_000;
const day = (week: string, offset: number) => new Date(Date.parse(`${week}T12:00:00Z`) + offset * DAY_MS).toISOString().slice(0, 10);
const meal = (week: string, offset: number, meal_type: string, recipe_name: string, quantity: number, unit: string) =>
  ({ id: `meal-${offset}-${meal_type}`, date: day(week, offset), meal_type, recipe_name, quantity, unit });
const NEEDS = [
  { name: 'Riz jasmin', quantity: 250, unit: 'g', meals: (week: string) => [meal(week, 1, 'lunch', 'Curry de légumes', 250, 'g')] },
  { name: 'Lait de coco', quantity: 800, unit: 'ml', meals: (week: string) => [meal(week, 1, 'lunch', 'Curry de légumes', 400, 'ml'), meal(week, 3, 'dinner', 'Soupe thaïe', 400, 'ml')] },
  { name: 'Pâte de curry jaune', quantity: 90, unit: 'g', meals: (week: string) => [meal(week, 1, 'lunch', 'Curry de légumes', 45, 'g'), meal(week, 3, 'dinner', 'Soupe thaïe', 45, 'g')] },
];
const productName = (row: Row) => String(data.products.find(product => product.id === row.product_id)?.name ?? '');
const rowOf = (name: string) => data.shopping_list.find(row => productName(row).toLowerCase() === name.toLowerCase());

/** A need already on the list is « listed » (or « purchased_pending » once checked); otherwise to add. */
function needLine(week: string, need: typeof NEEDS[number]): MenuShoppingLine {
  const row = rowOf(need.name), meals = need.meals(week), key = `to_buy|${need.name}|${need.unit}`;
  if (row?.is_purchased) return { key, state: 'purchased_pending', name: need.name, product_id: String(row.product_id), quantity: need.quantity, unit: need.unit, purchased_quantity: Number(row.quantity), meals };
  const listed = row ? Number(row.quantity) : 0;
  if (listed >= need.quantity) return { key, state: 'listed', name: need.name, product_id: String(row!.product_id), quantity: need.quantity, unit: need.unit, listed_quantity: listed, meals };
  return { key, state: 'to_add', name: need.name, product_id: row ? String(row.product_id) : null, quantity: need.quantity - listed, unit: need.unit, meals,
    ...(row ? { target: { id: String(row.id), expected_version: Number(row.stock_version ?? 0) } } : {}) };
}

export function weekShoppingPreview(week: string): MenuShoppingPreview {
  const excessRow = data.shopping_list.find(row => !row.is_purchased && !NEEDS.some(need => need.name.toLowerCase() === productName(row).toLowerCase()));
  const lines: MenuShoppingLine[] = [
    ...NEEDS.map(need => needLine(week, need)),
    ...(excessRow ? [{ key: `excess|${excessRow.id}`, state: 'excess' as const, name: productName(excessRow), product_id: String(excessRow.product_id), quantity: 1, unit: String(excessRow.unit),
      reduction: { id: String(excessRow.id), expected_version: Number(excessRow.stock_version ?? 0), quantity: 1, unit: String(excessRow.unit) }, meals: [] }] : []),
    { key: 'manual|coriandre|botte', state: 'manual', name: 'Coriandre fraîche', product_id: null, quantity: 1, unit: 'botte', meals: [meal(week, 1, 'lunch', 'Curry de légumes', 1, 'botte')] },
    { key: 'verify|sucre|g', state: 'verify', name: 'Sucre', product_id: null, quantity: 12, unit: 'g', verify_lots: ['Sucre en poudre'], meals: [meal(week, 3, 'dinner', 'Soupe thaïe', 12, 'g')] },
  ];
  return {
    week_start: week, as_of: new Date().toISOString().slice(0, 10), menu_version: 'f'.repeat(32), context_revision: data.shopping_list.length, lines,
    meals: [{ id: 'meal-1-lunch', date: day(week, 1), meal_type: 'lunch', recipe_name: 'Curry de légumes', role: 'target' },
      { id: 'meal-3-dinner', date: day(week, 3), meal_type: 'dinner', recipe_name: 'Soupe thaïe', role: 'target' },
      { id: 'meal-5-dinner', date: day(week, 5), meal_type: 'dinner', recipe_name: 'Reste de gratin', role: 'target' }],
    uncomputable: [{ id: 'meal-5-dinner', date: day(week, 5), meal_type: 'dinner', recipe_name: 'Reste de gratin', role: 'target', reason: 'NO_RECIPE' }],
  };
}

/** Writes what the review kept on the fixture's list; `failures.menuChanged` refuses it once. */
export function applyMenuAddMissing(command: MenuAddMissing, result: StockCommandResult, refuse: (code: string, message: string) => never): void {
  if (failures.menuChanged) { failures.menuChanged = false; refuse('MENU_CHANGED', 'Ce repas a changé dans le menu entre-temps : rien n’a été modifié.'); }
  const now = new Date().toISOString();
  for (const reduction of command.payload.reductions) {
    const row = data.shopping_list.find(line => line.id === reduction.id);
    if (!row || Number(row.stock_version ?? 0) !== reduction.expected_version) refuse('CONFLICT', 'Le stock ou l’achat a changé. Actualise avant de confirmer.');
    const left = Number(row!.quantity) - reduction.quantity;
    data.shopping_list = left > 0 ? data.shopping_list.map(line => line === row ? { ...line, quantity: left, stock_version: Number(line.stock_version ?? 0) + 1, updated_at: now } : line)
      : data.shopping_list.filter(line => line !== row);
  }
  for (const add of command.payload.adds) {
    let product = data.products.find(row => add.product_id ? row.id === add.product_id : String(row.name).toLowerCase() === add.name?.toLowerCase());
    if (!product) { product = { id: crypto.randomUUID(), name: add.name, category: 'Autres', unit_type: add.unit }; data.products.push(product); }
    const row = data.shopping_list.find(line => line.product_id === product!.id && !line.is_purchased && line.unit === add.unit);
    data.shopping_list = row
      ? data.shopping_list.map(line => line === row ? { ...line, quantity: Number(line.quantity) + add.quantity, stock_version: Number(line.stock_version ?? 0) + 1, updated_at: now } : line)
      : [...data.shopping_list, { id: crypto.randomUUID(), user_id: OWNER, product_id: product.id, quantity: add.quantity, unit: add.unit, is_purchased: false, stock_version: 0, priority: 1, created_at: now, updated_at: now }];
  }
  result.affected_tables = ['shopping_list', 'products'];
}
