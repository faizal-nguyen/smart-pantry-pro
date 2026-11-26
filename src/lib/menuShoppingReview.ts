/**
 * V11-01 E2 — the review of a week's shopping: what the user keeps, and the menu_add_missing
 * payload it gives. Pure functions; the page holds the choices, the server bounds them again.
 */
import { formatNumber, formatDate, SHOPPING_NAME_MAX_LENGTH, SHOPPING_UNIT_MAX_LENGTH, type MenuLineState, type MenuNeedMeal, type MenuShoppingLine, type MenuShoppingPreview, type StockCommand } from '@smart/shared';
import { formatShoppingQuantity } from '@/lib/shoppingChanges';

export type MenuAddMissingPayload = Extract<StockCommand, { command_type: 'menu_add_missing' }>['payload'];
/** A choice on a line the user can write: kept or not, and the amount typed (to_add). */
export interface LineChoice { state: 'to_add' | 'excess'; selected: boolean; quantity: string }
export type ReviewChoices = Record<string, LineChoice>;
export interface ReviewDraft {
  /** null: nothing kept, or an amount to correct. */
  payload: MenuAddMissingPayload | null;
  adds: number; reductions: number;
  /** By line key: why its amount cannot be sent. */
  errors: Record<string, string>;
}
export interface ReviewSection { state: MenuLineState; lines: MenuShoppingLine[] }

const EPSILON = 1e-9;
const SECTION_ORDER: MenuLineState[] = ['to_add', 'excess', 'manual', 'verify', 'listed', 'purchased_pending'];
const MEAL_LABELS: Record<string, string> = { breakfast: 'petit-déjeuner', lunch: 'déjeuner', dinner: 'dîner', snack: 'collation' };
const INVALID_AMOUNT = 'Indique une quantité positive.';
/** An amount as it is typed: no grouping space (« 1500 »), a comma, at most three decimals. */

/** The list's command accepts the name (when no product is known) and the unit only up to a length. */
const listCanHold = (line: MenuShoppingLine) => {
  const unit = line.unit?.trim() ?? '';
  return unit.length > 0 && unit.length <= SHOPPING_UNIT_MAX_LENGTH
    && (!!line.product_id || (line.name.trim().length > 0 && line.name.trim().length <= SHOPPING_NAME_MAX_LENGTH));
};
const isWritable = (line: MenuShoppingLine): line is MenuShoppingLine & { state: LineChoice['state'] } =>
  (line.state === 'to_add' && line.quantity != null && listCanHold(line)) || (line.state === 'excess' && !!line.reduction);

/** The text of an amount in its field. */
export function editableQuantity(value: number): string {
  return formatNumber(value, { maximumFractionDigits: 3, useGrouping: false });
}

/** The amount proposed for a line: the need to add, or the menu's share to take back. */
function proposed(line: MenuShoppingLine): number {
  return line.state === 'excess' ? line.reduction!.quantity : line.quantity!;
}

/** What the user typed, « 1,5 » and « 1 500 » included; null when it is not a positive amount. */
export function typedQuantity(text: string): number | null {
  const compact = text.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  const value = Number(compact);
  return compact && Number.isFinite(value) && value > 0 ? value : null;
}

/** The amount a choice sends: the exact need while its field still shows it, else what was typed. */
function chosenAmount(need: number, text: string): number | null {
  return text.trim() === editableQuantity(need) ? need : typedQuantity(text);
}

/** By default every amount to add is kept, and no excess is taken back (PRP V11-01, section 4). */
export function initialChoices(lines: MenuShoppingLine[]): ReviewChoices {
  return mergeChoices({}, lines);
}

/**
 * After the week is computed again, each choice stays with its line while the line keeps its key
 * and state; an amount above the new need is brought down to it.
 */
export function mergeChoices(previous: ReviewChoices, lines: MenuShoppingLine[]): ReviewChoices {
  return Object.fromEntries(lines.filter(isWritable).map(line => {
    const known = previous[line.key];
    const need = proposed(line);
    if (!known || known.state !== line.state) return [line.key, { state: line.state, selected: line.state === 'to_add', quantity: editableQuantity(need) }];
    const typed = chosenAmount(need, known.quantity);
    const quantity = line.state === 'excess' || (typed != null && typed > need + EPSILON) ? editableQuantity(need) : known.quantity;
    return [line.key, { ...known, quantity }];
  }));
}

/** Why a kept amount to add cannot be sent, or null. */
function amountError(line: MenuShoppingLine, choice: LineChoice): string | null {
  const typed = chosenAmount(line.quantity!, choice.quantity);
  if (typed == null) return INVALID_AMOUNT;
  // The server bounds an add by the week's gross need (rule C): the computed gap never exceeds it.
  if (typed > line.quantity! + EPSILON) return `Au plus ${formatShoppingQuantity(line.quantity!)} ${line.unit} : ce que la semaine demande. Le reste s’ajoute depuis ta liste.`;
  return null;
}

/** The menu_add_missing payload of the lines kept, against the tokens the week was computed with. */
export function reviewDraft(preview: MenuShoppingPreview, choices: ReviewChoices): ReviewDraft {
  const errors: Record<string, string> = {};
  const adds: MenuAddMissingPayload['adds'] = [];
  const reductions: MenuAddMissingPayload['reductions'] = [];
  for (const line of preview.lines.filter(isWritable)) {
    const choice = choices[line.key];
    if (!choice?.selected || choice.state !== line.state) continue;
    if (line.state === 'excess') {
      const { id, expected_version, quantity, unit } = line.reduction!;
      reductions.push({ id, expected_version, quantity, unit });
      continue;
    }
    const error = amountError(line, choice);
    if (error) { errors[line.key] = error; continue; }
    adds.push({ ...(line.product_id ? { product_id: line.product_id } : { name: line.name.trim() }), quantity: chosenAmount(line.quantity!, choice.quantity)!, unit: line.unit!.trim(),
      ...(line.target ? { target: line.target } : {}) });
  }
  const { week_start, as_of, menu_version, context_revision } = preview;
  const empty = !adds.length && !reductions.length;
  return { payload: empty || Object.keys(errors).length ? null : { week_start, as_of, menu_version, context_revision, adds, reductions },
    adds: adds.length, reductions: reductions.length, errors };
}

/** Lines grouped by what the user can do with them, writable ones first; empty groups left out. */
export function reviewSections(lines: MenuShoppingLine[]): ReviewSection[] {
  return SECTION_ORDER.map(state => ({ state, lines: lines.filter(line => line.state === state) })).filter(section => section.lines.length);
}

/** « mar. 1 déc., déjeuner ». */
export function mealMoment(meal: Pick<MenuNeedMeal, 'date' | 'meal_type'>): string {
  return `${formatDate(meal.date, 'weekdayShortDayMonthShort')}, ${MEAL_LABELS[meal.meal_type] ?? meal.meal_type}`;
}

/** « Pour : Curry (mar. 1 déc., déjeuner) · Curry jaune (jeu. 3 déc., dîner) ». */
export function mealsLabel(meals: MenuNeedMeal[]): string {
  return `Pour : ${meals.map(meal => `${meal.recipe_name} (${mealMoment(meal)})`).join(' · ')}`;
}
