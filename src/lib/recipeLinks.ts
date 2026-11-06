import type { RecipeReference } from '@smart/shared';

/** Outbound attribution accepts public HTTP links, never scripts or credentials. */
export function safeRecipeSourceUrl(value: string | null | undefined): string | null {
  try {
    const url = new URL(value ?? '');
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function recipeDetailPath(reference: Pick<RecipeReference, 'id' | 'source'>, servings?: number | null): string {
  const params = new URLSearchParams({ source: reference.source });
  if (servings != null && Number.isFinite(servings) && servings > 0 && servings <= 100) params.set('servings', String(servings));
  return `/kitchen/recipes/${encodeURIComponent(reference.id)}?${params}`;
}
