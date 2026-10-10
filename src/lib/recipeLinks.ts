import type { RecipeReference } from '@smart/shared';

export function recipeDetailPath(reference: Pick<RecipeReference, 'id' | 'source'>, servings?: number | null): string {
  const params = new URLSearchParams({ source: reference.source });
  if (servings != null && Number.isFinite(servings) && servings > 0 && servings <= 100) params.set('servings', String(servings));
  return `/kitchen/recipes/${encodeURIComponent(reference.id)}?${params}`;
}
