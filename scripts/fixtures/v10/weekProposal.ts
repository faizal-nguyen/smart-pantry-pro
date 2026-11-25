import { menuSlotKey, WEEK_PROPOSAL_TTL_MINUTES, type WeekProposal, type WeekProposalRequest } from '@smart/shared';
import { data, failures } from './supabase';

/**
 * Visual QA only (V11-01 E4b): week-proposal on the fictional data, close enough to judge the screen.
 * The engine, the exclusions, the stock replay and the two causes are tested on the API (E4a).
 */
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const NEEDS = [[], [{ name: 'Coriandre fraîche', quantity: 1, unit: 'botte', status: 'to_buy' as const }],
  [{ name: 'Lait de coco', quantity: 400, unit: 'ml', status: 'to_buy' as const }, { name: 'Sucre', quantity: 10, unit: 'g', status: 'verify' as const }]];

type Recipe = { id: string; source: 'recipes' | 'recipes_catalog'; name: string; minutes: number };
const pool = (): Recipe[] => [
  ...data.recipes.map(row => ({ id: String(row.id), source: 'recipes' as const, name: String(row.name), minutes: Number(row.prep_time ?? 0) + Number(row.cook_time ?? 0) })),
  ...data.recipes_catalog.map(row => ({ id: String(row.id), source: 'recipes_catalog' as const, name: String(row.title ?? row.name), minutes: Number(row.prep_time ?? 0) + Number(row.cook_time ?? 0) })),
];

export function weekProposalFixture(request: WeekProposalRequest): WeekProposal {
  const plan = data.weekly_meal_plans.find(row => row.week_start_date === request.week_start);
  const planned = (data.meal_plan_entries ?? []).filter(row => plan && row.meal_plan_id === plan.id);
  const taken = new Set(planned.map(row => menuSlotKey({ date: new Date(Date.parse(`${request.week_start}T12:00:00Z`) + Number(row.day_of_week) * DAY_MS).toISOString().slice(0, 10), meal_type: String(row.meal_type) })));
  if ([...request.slots, ...(request.keep ?? [])].some(slot => taken.has(menuSlotKey(slot)))) {
    throw Object.assign(new Error('Ce repas a changé dans le menu entre-temps.'), { status: 409, code: 'MENU_CHANGED' });
  }
  const used = new Set([...planned.map(row => String((row.recipe_reference as { id?: string } | null)?.id ?? row.recipe_id)),
    ...(request.keep ?? []).map(meal => meal.recipe.id), ...(request.avoid ?? []).map(recipe => recipe.id)]);
  const all = pool();
  const name = (id: string) => all.find(recipe => recipe.id === id)?.name ?? 'Recette';
  const now = new Date();
  const servings = request.servings ?? 2;
  const kept = (request.keep ?? []).map((meal, index) => ({ date: meal.date, meal_type: meal.meal_type, status: 'kept' as const,
    recipe: { reference: meal.recipe, name: name(meal.recipe.id), image_url: null, duration_minutes: null, servings: meal.servings },
    reasons: [], availability: index % 3 === 1 ? 'to_buy' as const : 'in_stock' as const, missing: NEEDS[index % 3 === 1 ? 1 : 0] }));
  const proposed = [...request.slots].sort((a, b) => menuSlotKey(a).localeCompare(menuSlotKey(b))).map((slot, index) => {
    const recipe = all.find(item => !used.has(item.id));
    if (!recipe) return { date: slot.date, meal_type: slot.meal_type, status: 'empty' as const, cause: all.length ? 'POOL_EXHAUSTED' as const : 'NO_COMPATIBLE_RECIPE' as const };
    used.add(recipe.id);
    const missing = NEEDS[index % NEEDS.length];
    return { date: slot.date, meal_type: slot.meal_type, status: 'proposed' as const,
      recipe: { reference: { id: recipe.id, source: recipe.source }, name: recipe.name, image_url: null, duration_minutes: recipe.minutes || null, servings },
      reasons: [`Prête en ${recipe.minutes || 30} min.`, 'Change de tes derniers repas.'],
      availability: missing.some(item => item.status === 'to_buy') ? 'to_buy' as const : 'in_stock' as const, missing };
  });
  // A proposal already expired, on demand, to judge « Recalculer ».
  const expired = failures.proposalExpired;
  failures.proposalExpired = false;
  return { proposal_id: Math.random().toString(16).slice(2).padEnd(32, '0').slice(0, 32), week_start: request.week_start,
    calculated_at: now.toISOString(), expires_at: new Date(now.getTime() + (expired ? -1 : WEEK_PROPOSAL_TTL_MINUTES) * MINUTE_MS).toISOString(),
    menu_version: 'a'.repeat(32), context_revision: 1, profile_version: 1,
    slots: [...kept, ...proposed].sort((a, b) => a.date.localeCompare(b.date) || ['breakfast', 'lunch', 'dinner', 'snack'].indexOf(a.meal_type) - ['breakfast', 'lunch', 'dinner', 'snack'].indexOf(b.meal_type)) };
}
