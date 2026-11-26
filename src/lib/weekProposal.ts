/**
 * V11-01 E4b — the « Proposer la semaine » screen, as pure functions: the slots it offers, the
 * requests it sends to week-proposal (first, « Autre recette », recomputation), the update_menu it
 * validates with, and the words of each slot. The server checks everything again.
 */
import { APP_LOCALE, menuSlotKey, type ProposedMeal, type RecipeReference, type WeekProposal, type WeekProposalRequest, type WeekProposalSlot } from '@smart/shared';
import type { MenuEntryView, MenuMealType } from '@/hooks/useWeeklyMenu';
import { MEALS, slotDate, slotLabel } from '@/lib/menuEdit';
import type { MenuSetOperation } from '@/lib/menuCopy';
import { menuWeekLabel } from '@/lib/menuWeek';

export type ProposalMeal = Extract<MenuMealType, 'lunch' | 'dinner'>;
export interface ProposalSettings {
  meals: ProposalMeal[];
  /** null: the profile's usual servings. */
  servings: number | null;
  timeLimitMinutes: number | null;
  /** « Sans ces aliments », as typed. */
  excluded: string;
}
export const DEFAULT_PROPOSAL_SETTINGS: ProposalSettings = { meals: ['dinner'], servings: null, timeLimitMinutes: null, excluded: '' };
export type ProposalSlot = WeekProposalRequest['slots'][number];
export type FilledSlot = Extract<WeekProposalSlot, { status: 'proposed' | 'kept' }>;

const MAX_EXCLUDED = 10;
/** What WeekProposalRequestSchema takes in `avoid`. */
const MAX_AVOID = 50;
const MAX_TERM = 80;
const NAMES_SHOWN = 3;

export const CAUSE_TEXT: Record<Extract<WeekProposalSlot, { status: 'empty' }>['cause'], string> = {
  NO_COMPATIBLE_RECIPE: 'Aucune recette ne respecte ton profil et ces réglages.',
  POOL_EXHAUSTED: 'Toutes les recettes qui conviennent sont déjà placées cette semaine.',
};

export const isFilled = (slot: WeekProposalSlot): slot is FilledSlot => slot.status !== 'empty';

/** « Mardi · dîner » for a slot named by its date. */
export function proposalSlotLabel(slot: { date: string; meal_type: MenuMealType }): string {
  return slotLabel({ day_of_week: (new Date(`${slot.date}T12:00:00Z`).getUTCDay() + 6) % 7, meal_type: slot.meal_type });
}

/** The empty slots of the chosen meals, from `today` (AAAA-MM-JJ) to Sunday. */
export function openSlots(weekStart: string, today: string, entries: MenuEntryView[], meals: ProposalMeal[]): ProposalSlot[] {
  const taken = new Set(entries.map(entry => `${entry.day_of_week}:${entry.meal_type}`));
  return Array.from({ length: 7 }, (_, day) => day)
    .filter(day => slotDate(weekStart, day) >= today)
    .flatMap(day => MEALS.filter((meal): meal is ProposalMeal => (meals as string[]).includes(meal) && !taken.has(`${day}:${meal}`))
      .map(meal_type => ({ date: slotDate(weekStart, day), meal_type })));
}

/** « poisson, crème » → up to ten distinct terms, each cut to what the engine reads. */
export function excludedTerms(text: string): string[] {
  const seen = new Set<string>();
  return text.split(/[,;]/).map(term => term.trim().slice(0, MAX_TERM)).filter(term => {
    const key = term.toLocaleLowerCase(APP_LOCALE);
    if (!term || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MAX_EXCLUDED);
}

/** What every request of this screen shares: the week, and the settings only when set. */
function base(weekStart: string, settings: ProposalSettings): Omit<WeekProposalRequest, 'slots'> {
  const excluded = excludedTerms(settings.excluded);
  const constraints = {
    ...(settings.timeLimitMinutes ? { timeLimitMinutes: settings.timeLimitMinutes } : {}),
    ...(excluded.length ? { excludedIngredients: excluded } : {}),
  };
  return { week_start: weekStart, ...(settings.servings ? { servings: settings.servings } : {}),
    ...(Object.keys(constraints).length ? { constraints } : {}) };
}

export function initialRequest(weekStart: string, slots: ProposalSlot[], settings: ProposalSettings): WeekProposalRequest {
  return { ...base(weekStart, settings), slots };
}

/** The proposal's choices still wanted: filled, not left empty, not `except`. */
function keptMeals(proposal: WeekProposal, cleared: string[], except: string[] = []): ProposedMeal[] {
  return proposal.slots.filter(isFilled).filter(slot => !cleared.includes(menuSlotKey(slot)) && !except.includes(menuSlotKey(slot)))
    .map(slot => ({ date: slot.date, meal_type: slot.meal_type, recipe: slot.recipe.reference, servings: slot.recipe.servings }));
}

/** The recipes set aside, each once (the latest kept), at most what the contract takes. */
export function setAside(avoid: RecipeReference[], ...recipes: RecipeReference[]): RecipeReference[] {
  const seen = new Set<string>();
  const kept: RecipeReference[] = [];
  for (const recipe of [...avoid, ...recipes].reverse()) {
    if (seen.has(recipe.id)) continue;
    seen.add(recipe.id);
    kept.unshift(recipe);
  }
  return kept.slice(-MAX_AVOID);
}

/**
 * « Autre recette » : that slot again, every other choice kept; its current recipe set aside, and those
 * of slots left empty too (« Remettre » would otherwise put one twice in the week).
 */
export function replaceRequest(weekStart: string, settings: ProposalSettings, proposal: WeekProposal, slotKey: string,
  cleared: string[], avoid: RecipeReference[]): WeekProposalRequest {
  const slot = proposal.slots.find(item => menuSlotKey(item) === slotKey);
  const current = slot && isFilled(slot) ? [slot.recipe.reference] : [];
  const left = proposal.slots.filter(isFilled).filter(item => cleared.includes(menuSlotKey(item))).map(item => item.recipe.reference);
  return { ...base(weekStart, settings), slots: slot ? [{ date: slot.date, meal_type: slot.meal_type }] : [],
    keep: keptMeals(proposal, cleared, [slotKey]), avoid: setAside(avoid, ...current, ...left) };
}

/**
 * Recomputing (expired, or refused): every choice kept, without the slots taken since. Nothing left
 * to keep: null, a new proposal is asked for instead.
 */
export function refreshRequest(weekStart: string, settings: ProposalSettings, proposal: WeekProposal, cleared: string[],
  avoid: RecipeReference[], taken: string[]): WeekProposalRequest | null {
  const keep = keptMeals(proposal, cleared, taken);
  if (!keep.length) return null;
  return { ...base(weekStart, settings), slots: [], keep, ...(avoid.length ? { avoid: setAside(avoid) } : {}) };
}

/** The update_menu that adds the choices: each into its slot, empty when proposed. */
export function proposalOperations(proposal: WeekProposal, cleared: string[]): MenuSetOperation[] {
  return keptMeals(proposal, cleared).map(meal => ({ op: 'set', date: meal.date, meal_type: meal.meal_type, recipe: meal.recipe,
    servings: meal.servings, expected_version: null }));
}

const names = (items: Array<{ name: string }>) => {
  const all = [...new Set(items.map(item => item.name))];
  const rest = all.length - NAMES_SHOWN;
  return rest > 0 ? `${all.slice(0, NAMES_SHOWN).join(', ')} et ${rest} autre${rest > 1 ? 's' : ''}` : all.join(', ');
};

/** What the week leaves this meal to buy or to check. */
export function availabilityText(slot: FilledSlot): string {
  if (slot.availability === 'in_stock') return 'Tout est en stock pour ce repas.';
  const buy = slot.missing.filter(item => item.status === 'to_buy');
  const check = slot.missing.filter(item => item.status !== 'to_buy');
  const parts = [buy.length ? `À acheter : ${names(buy)}.` : '', check.length ? `À vérifier : ${names(check)}.` : ''].filter(Boolean);
  return parts.length ? parts.join(' ') : 'Stock à vérifier pour cette recette.';
}

/** « 5 repas ajoutés au menu de la semaine du 7 → 13 déc. » */
export function addedMessage(count: number, weekStart: string): string {
  const week = menuWeekLabel(weekStart);
  return `${count} repas ajouté${count > 1 ? 's' : ''} au menu de la ${week.charAt(0).toLocaleLowerCase(APP_LOCALE)}${week.slice(1)}`;
}

/** A kept slot comes back without reasons (no engine read): it keeps those it was proposed with. */
export function mergeReasons(previous: WeekProposal | null, next: WeekProposal): WeekProposal {
  if (!previous) return next;
  return { ...next, slots: next.slots.map(slot => {
    if (slot.status !== 'kept' || slot.reasons.length) return slot;
    const before = previous.slots.find(item => menuSlotKey(item) === menuSlotKey(slot));
    return before && isFilled(before) && before.recipe.reference.id === slot.recipe.reference.id ? { ...slot, reasons: before.reasons } : slot;
  }) };
}
