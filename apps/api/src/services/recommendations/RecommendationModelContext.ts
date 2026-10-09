/** Compact model transport only. The UI and private action receipt keep the
 * original evidence; this module never filters or ranks recipes. */
const object = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown, max = 160) => typeof value === 'string' ? value.slice(0, max) : null;

export function recommendationProfileChanged(value: unknown, expectedVersion?: number): boolean {
  if (expectedVersion===undefined) return false;
  const result=object(value);
  if (!result) return false;
  const versions=[result.profile_version,...['cookable_now','almost_cookable','verify_suggestions','excluded_suggestions','recipes'].flatMap(key=>list(result[key]).map(item=>object(item)?.profile_version))];
  return versions.some(version=>typeof version==='number' && version!==expectedVersion);
}

export function recommendationModelContext(value: unknown, allowedProfileVersion?: number): unknown | null {
  const result = object(value);
  if (!result) return null;
  const buckets = ['cookable_now', 'almost_cookable', 'verify_suggestions', 'excluded_suggestions', 'recipes'];
  if (result.pipeline_version !== 3 && !buckets.some(key => list(result[key]).some(item => {
    const recipe = object(item);
    return recipe?.profile_version !== undefined && !!recipe.constraints;
  }))) return null;

  const mayShare = (item: unknown) => {
    const recipe = object(item);
    return allowedProfileVersion !== undefined && recipe?.profile_version === allowedProfileVersion;
  };
  const candidate = (item: unknown) => {
    const recipe = object(item) ?? {};
    const stock = object(recipe.availability), constraints = object(recipe.constraints), nutrition = object(recipe.nutrition);
    const share = mayShare(item);
    const reasons = list(recipe.reason_codes).map(object).filter(reason => reason &&
      (share || ['STOCK_AVAILABLE', 'STOCK_MISSING', 'STOCK_UNCERTAIN', 'TIME_UNKNOWN', 'NEAR_DATE'].includes(String(reason.code))))
      .slice(0, 3).map(reason => ({ code: reason!.code, text: text(reason!.text) }));
    return {
      id: recipe.id, name: text(recipe.name, 120), reference: { id: object(recipe.reference)?.id, source: object(recipe.reference)?.source },
      duration_minutes: recipe.duration_minutes,
      availability: { status: stock?.status }, reason_codes: reasons,
      ...(share ? {
        servings: recipe.servings,
        constraints: { status: constraints?.status, findings: list(constraints?.findings).slice(0, 2).map(item => {
          const finding = object(item);
          return { code: finding?.code, ingredient: text(finding?.ingredient, 80), message: text(finding?.message) };
        }) },
        missing: list(stock?.missing).slice(0, 3).map(item => {
          const gap = object(item);
          return { ingredient_name: text(gap?.ingredient_name, 80), quantity: gap?.quantity, unit: text(gap?.unit, 30) };
        }),
        nutrition: { status: nutrition?.status, coverage: nutrition?.coverage,
          per_serving: { energyKcal: object(nutrition?.per_serving)?.energyKcal, proteinG: object(nutrition?.per_serving)?.proteinG, fiberG: object(nutrition?.per_serving)?.fiberG },
          sources: list(nutrition?.sources).slice(0, 3).map(item => ({ source: text(object(item)?.source, 40), base: text(object(item)?.base, 30), updated_at: text(object(item)?.updated_at, 40) })),
        },
        unavailable_criteria: list(recipe.unavailable_criteria).slice(0, 8).map(value => text(value, 40)),
        limitations: [...list(stock?.uncertainties), ...list(constraints?.limitations), ...list(nutrition?.limitations)].slice(0, 3).map(value => text(value)),
      } : {}),
    };
  };
  const cookable = list(result.cookable_now).slice(0, 3);
  return {
    cookable_now: cookable.map(candidate),
    almost_cookable: list(result.almost_cookable).slice(0, 3 - cookable.length).map(candidate),
    verify_suggestions: list(result.verify_suggestions).slice(0, 2).map(candidate),
    excluded_suggestions: list(result.excluded_suggestions).filter(mayShare).slice(0, 2).map(candidate),
    ...(Array.isArray(result.recipes) ? { recipes: result.recipes.slice(0, 3).map(candidate) } : {}),
    note: 'Les cartes dans l’application portent les explications complètes. Seules les raisons présentes ici peuvent être expliquées. Ne déduisez aucune allergie ni besoin de santé et ne certifiez pas une compatibilité.',
  };
}
