import { emptyNutritionProfile, type DiscoveryItem, type ImportedRecipeDraft, type NutritionProfileSettings } from '@smart/shared';
import { evaluateConstraints, scoreExplicitTaste } from '../recommendations/PersonalizationScoring.js';
import type { RecipeWithIngredients } from '../recommendations/types.js';

/** ISO week with Monday/Thursday windows, computed in Paris rather than the host timezone. */
export function discoverySelectionKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(value => value.type === type)!.value;
  const day = new Date(Date.UTC(Number(part('year')), Number(part('month')) - 1, Number(part('day'))));
  const isoDay = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - isoDay);
  const year = day.getUTCFullYear();
  const week = Math.ceil(((day.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-${String(week).padStart(2, '0')}-${isoDay >= 4 ? 'b' : 'a'}`;
}

export function discoveryContentEvidence(draft: ImportedRecipeDraft | null, profile: NutritionProfileSettings | null) {
  if (!draft || !draft.ingredients.length) return { constraints: 'unknown' as const, reasons: ['Ingrédients à compléter avant de vérifier votre profil.'], tasteScore: 0 };
  const content: RecipeWithIngredients = {
    id: '', name: draft.title, description: draft.description ?? null,
    prep_time: draft.prepTimeMinutes ?? null, cook_time: draft.cookTimeMinutes ?? null,
    servings: draft.servings ?? null, image_url: null, cuisine_category: draft.cuisineCategory ?? null,
    meal_type: draft.mealType ?? null, tags: draft.tags, created_at: draft.source.importedAt,
    recipe_ingredients: draft.ingredients.map((ingredient, index) => ({
      id: String(index), ingredient_name: ingredient.name, quantity: ingredient.quantity ?? null,
      unit: ingredient.unit ?? null, inventory_product_id: null, is_essential: ingredient.isEssential ?? true,
    })),
  };
  // No temporary RecipeReference is persisted or returned for a discovery draft.
  const constraints = evaluateConstraints(content, profile ?? emptyNutritionProfile(), new Map());
  const taste = profile ? scoreExplicitTaste(content, profile) : { score: 0, reasons: [] };
  return {
    constraints: constraints.status === 'incompatible' ? 'incompatible' as const : profile ? constraints.status : 'verify' as const,
    reasons: [...constraints.findings.slice(0, 2).map(finding => finding.message),
      ...(profile ? taste.reasons.slice(0, 2) : ['Profil indisponible : contraintes à vérifier.']),
      ...(constraints.status === 'compatible' && profile ? ['Ingrédients connus comparés à votre profil ; traces non certifiées.'] : [])],
    tasteScore: taste.score,
  };
}

/** Diversity before a second item from the same creator. Refusal is per item only. */
export function chooseDiscoveryItems(items: DiscoveryItem[], paused: Set<string>, now: Date): DiscoveryItem[] {
  const eligible = items.filter(item => !paused.has(item.creatorId) && item.constraints !== 'incompatible' &&
    (item.status === 'new' || (item.status === 'snoozed' && item.snoozedUntil && new Date(item.snoozedUntil) <= now)));
  eligible.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  const first: DiscoveryItem[] = [], rest: DiscoveryItem[] = [];
  const creators = new Set<string>();
  for (const item of eligible) {
    if (!creators.has(item.creatorId)) { first.push(item); creators.add(item.creatorId); }
    else rest.push(item);
  }
  return [...first, ...rest].slice(0, 5);
}
