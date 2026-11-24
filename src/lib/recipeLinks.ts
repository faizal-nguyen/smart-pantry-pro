import type { RecipeReference } from '@smart/shared';

/** Outbound attribution accepts public HTTP links, never scripts or credentials. */
export function safeRecipeSourceUrl(value: string | null | undefined): string | null {
  try {
    const url = new URL(value ?? '');
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

/** `meal`: the planned meal it was opened from, which cooking it from the page marks as cooked. */
export function recipeDetailPath(reference: Pick<RecipeReference, 'id' | 'source'>, servings?: number | null, meal?: string | null): string {
  const params = new URLSearchParams({ source: reference.source });
  if (servings != null && Number.isFinite(servings) && servings > 0 && servings <= 100) params.set('servings', String(servings));
  if (meal) params.set('meal', meal);
  return `/kitchen/recipes/${encodeURIComponent(reference.id)}?${params}`;
}
