/**
 * V11-01 E4a — the meals of a week as they stand (cooked and leftovers included), for what the week
 * proposal and the shopping of a proposal must not overwrite nor repeat. Read with the user-scoped
 * client (RLS): only the account's own plan.
 */
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { menuSlotKey } from '@smart/shared';
import { databaseError, StockCommandError } from '../stock/StockCommandService.js';

const DAY_MS = 86_400_000;

export interface WeekMeal {
  id: string; version: number; date: string; meal_type: string;
  /** Every recipe identity the meal names (its reference, or the recipe_id of an older meal). */
  recipe_ids: string[];
  cooked: boolean; leftover: boolean;
}
export interface WeekMenu { meals: WeekMeal[]; version: string }

interface EntryRow {
  id: string; version: number | null; day_of_week: number; meal_type: string;
  recipe_reference: { id?: unknown } | null; recipe_id: string | null; cooked_command_id: string | null; leftover_of: string | null;
}

/** Keys sorted at every depth: the same value always gives the same text. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/** A 32-hex imprint of a value (SHA-256, truncated): an identity, never a secret. */
export const imprint = (value: unknown): string => createHash('sha256').update(canonicalJson(value)).digest('hex').slice(0, 32);

const dayOf = (weekStart: string, offset: number) => new Date(Date.parse(`${weekStart}T12:00:00Z`) + offset * DAY_MS).toISOString().slice(0, 10);

export async function readWeekMenu(client: SupabaseClient, userId: string, weekStart: string): Promise<WeekMenu> {
  const { data, error } = await client.from('weekly_meal_plans')
    .select('id, meal_plan_entries(id, version, day_of_week, meal_type, recipe_reference, recipe_id, cooked_command_id, leftover_of)')
    .eq('user_id', userId).eq('week_start_date', weekStart)
    // One plan per week since E3a; the oldest, as the commands write, should another ever appear.
    .order('created_at', { ascending: true, nullsFirst: false }).order('id', { ascending: true }).limit(1);
  if (error) databaseError(error);
  const entries = ((data?.[0] as { meal_plan_entries?: EntryRow[] } | undefined)?.meal_plan_entries ?? []);
  const meals = entries.map(entry => ({
    id: String(entry.id), version: Number(entry.version ?? 0), date: dayOf(weekStart, Number(entry.day_of_week)), meal_type: String(entry.meal_type),
    recipe_ids: [typeof entry.recipe_reference?.id === 'string' ? entry.recipe_reference.id : null, entry.recipe_id].filter((id): id is string => !!id),
    cooked: !!entry.cooked_command_id, leftover: !!entry.leftover_of,
  })).sort((a, b) => a.id.localeCompare(b.id));
  return { meals, version: imprint(meals.map(meal => [meal.id, meal.version, meal.date, meal.meal_type, meal.cooked, meal.leftover])) };
}

/**
 * Slots a proposal may fill: today or later (the database's Paris date), and empty in the week as it
 * stands. A passed day is refused (INVALID_PROPOSAL); a slot taken since the screen read the week too
 * (MENU_CHANGED): the screen rereads it.
 */
export function assertFreeSlots(week: WeekMenu, today: string, slots: Array<{ date?: string; meal_type?: string }>): void {
  if (slots.some(slot => String(slot.date) < today)) throw new StockCommandError('INVALID_PROPOSAL', 400);
  const taken = new Set(week.meals.map(menuSlotKey));
  if (slots.some(slot => taken.has(menuSlotKey(slot)))) throw new StockCommandError('MENU_CHANGED', 409);
}
