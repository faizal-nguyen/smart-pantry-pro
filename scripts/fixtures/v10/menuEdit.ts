import type { MenuOperation, StockCommand, StockCommandResult } from '@smart/shared';
import { data, failures, OWNER } from './supabase';

/**
 * Visual QA only: update_menu (V11-01 E3) on the fictional menu, close enough to judge the screen.
 * The rules (versions, order of leftovers, capacity, swap) are tested on PostgreSQL.
 */
type Row = Record<string, unknown>;
type Refuse = (code: string, message: string) => never;
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
const DAY_MS = 86_400_000;

const entries = (): Row[] => (data.meal_plan_entries ??= []);
const mondayOf = (date: string) => { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() - (value.getUTCDay() + 6) % 7); return value.toISOString().slice(0, 10); };
const weekOf = (row: Row) => String(data.weekly_meal_plans.find(plan => plan.id === row.meal_plan_id)?.week_start_date);
const moment = (row: Row) => Date.parse(`${weekOf(row)}T12:00:00Z`) / DAY_MS * 4 + Number(row.day_of_week) * 4 + MEALS.indexOf(String(row.meal_type));
const slotMoment = (date: string, meal: string) => Date.parse(`${date}T12:00:00Z`) / DAY_MS * 4 + MEALS.indexOf(meal);
const bump = (row: Row) => { row.version = Number(row.version ?? 0) + 1; };

function slot(date: string, meal: string) {
  const week = mondayOf(date);
  let plan = data.weekly_meal_plans.find(row => row.week_start_date === week);
  if (!plan) { plan = { id: crypto.randomUUID(), user_id: OWNER, week_start_date: week }; data.weekly_meal_plans.push(plan); }
  const day = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${week}T12:00:00Z`)) / DAY_MS);
  const occupant = entries().find(row => row.meal_plan_id === plan!.id && row.day_of_week === day && row.meal_type === meal);
  return { plan: String(plan.id), day, occupant };
}

function entryFor(operation: Extract<MenuOperation, { entry_id: string }>, refuse: Refuse): Row {
  const row = entries().find(item => item.id === operation.entry_id);
  if (!row || Number(row.version ?? 0) !== operation.expected_version) refuse('MENU_CHANGED', 'Ce repas a changé dans le menu entre-temps.');
  return row!;
}

function apply(operation: MenuOperation, removed: Row[], refuse: Refuse) {
  if (operation.op === 'set') {
    // As the database: the slot's version, a cooked meal never replaced, a replaced meal's leftovers gone with it.
    const target = slot(operation.date, operation.meal_type);
    const occupant = target.occupant;
    if ((occupant ? Number(occupant.version ?? 0) : null) !== operation.expected_version) refuse('MENU_CHANGED', 'Ce créneau a changé entre-temps.');
    if (occupant?.cooked_command_id) refuse('MEAL_COOKED', 'Ce repas a déjà été cuisiné.');
    if (occupant) {
      const gone = entries().filter(item => item === occupant || item.leftover_of === occupant.id);
      removed.push(...gone);
      data.meal_plan_entries = entries().filter(item => !gone.includes(item));
    }
    const recipe = [...data.recipes, ...data.recipes_catalog].find(row => row.id === operation.recipe.id);
    if (!recipe) refuse('RECIPE_NOT_FOUND', 'Recette introuvable.');
    entries().push({ id: crypto.randomUUID(), meal_plan_id: target.plan, day_of_week: target.day, meal_type: operation.meal_type, recipe_id: null,
      recipe_reference: { id: String(recipe!.id), source: data.recipes.includes(recipe!) ? 'recipes' : 'recipes_catalog' }, recipe_name: String(recipe!.name ?? recipe!.title),
      servings: operation.servings, prep_time: Number(recipe!.prep_time ?? 0), cook_time: Number(recipe!.cook_time ?? 0), version: 0, cooked_command_id: null, leftover_of: null });
    return;
  }
  const row = entryFor(operation, refuse);
  const leftovers = entries().filter(item => item.leftover_of === row.id);
  const sum = (items: Row[]) => items.reduce((total, item) => total + Number(item.servings), 0);
  if (operation.op === 'servings') {
    const origin = entries().find(item => item.id === row.leftover_of);
    const max = origin ? Number(origin.servings) - sum(entries().filter(item => item.leftover_of === origin.id && item.id !== row.id)) : Infinity;
    if (sum(leftovers) > operation.servings || operation.servings > max) refuse('LEFTOVER_CAPACITY', 'Les restes dépasseraient les portions du repas d’origine.');
    row.servings = operation.servings; bump(row);
  } else if (operation.op === 'move') {
    const target = slot(operation.date, operation.meal_type);
    if (target.occupant && Number(target.occupant.version ?? 0) !== operation.target_version) refuse('MENU_CHANGED', 'Le créneau a changé entre-temps.');
    const from = { meal_plan_id: row.meal_plan_id, day_of_week: row.day_of_week, meal_type: row.meal_type };
    Object.assign(row, { meal_plan_id: target.plan, day_of_week: target.day, meal_type: operation.meal_type }); bump(row);
    if (target.occupant) { Object.assign(target.occupant, from); bump(target.occupant); }
    const origin = entries().find(item => item.id === row.leftover_of);
    const broken = [row, ...(target.occupant ? [target.occupant] : [])].some(item => {
      const source = entries().find(other => other.id === item.leftover_of);
      return (source && moment(item) <= moment(source)) || entries().some(other => other.leftover_of === item.id && moment(other) <= moment(item));
    });
    if (broken || (origin && moment(row) <= moment(origin))) refuse('LEFTOVER_ORDER', 'Un reste doit rester après son repas d’origine.');
  } else if (operation.op === 'remove') {
    removed.push(...leftovers, row);
    data.meal_plan_entries = entries().filter(item => item !== row && item.leftover_of !== row.id);
  } else if (operation.op === 'leftover') {
    const target = slot(operation.date, operation.meal_type);
    if (target.occupant) refuse('MENU_CHANGED', 'Ce créneau est déjà pris.');
    if (slotMoment(operation.date, operation.meal_type) <= moment(row)) refuse('LEFTOVER_ORDER', 'Un reste doit rester après son repas d’origine.');
    if (sum(leftovers) + operation.servings > Number(row.servings)) refuse('LEFTOVER_CAPACITY', 'Les restes dépasseraient les portions du repas d’origine.');
    entries().push({ id: crypto.randomUUID(), meal_plan_id: target.plan, day_of_week: target.day, meal_type: operation.meal_type, recipe_id: null, recipe_reference: null,
      recipe_name: `Reste : ${String(row.recipe_name)}`, servings: operation.servings, prep_time: 0, cook_time: 0, version: 0, cooked_command_id: null, leftover_of: row.id });
  }
}

/** Applies the operations in order, all or nothing, as the command does under the account's lock. */
export function applyUpdateMenu(command: Extract<StockCommand, { command_type: 'update_menu' }>, result: StockCommandResult, refuse: Refuse): void {
  const before = structuredClone(entries());
  const plans = structuredClone(data.weekly_meal_plans);
  const removed: Row[] = [];
  if (failures.menuChanged) { failures.menuChanged = false; refuse('MENU_CHANGED', 'Ce repas a changé dans le menu entre-temps.'); }
  try {
    for (const operation of command.payload.operations) apply(operation, removed, refuse);
  } catch (failure) {
    data.meal_plan_entries = before; data.weekly_meal_plans = plans;
    throw failure;
  }
  result.affected_tables = ['meal_plan_entries'];
  result.menu_edit = {
    removed: removed.map(row => ({ id: String(row.id), recipe_name: String(row.recipe_name), ...(row.leftover_of ? { leftover_of: String(row.leftover_of) } : {}) })),
    after: entries().map(row => ({ id: String(row.id), version: Number(row.version ?? 0) })),
  };
}
