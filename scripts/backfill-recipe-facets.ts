/**
 * PRP-239 PR3 — Backfill `recipes.recipe_facets` with protein families,
 * cuts and dietary flags.
 *
 * Merges into the existing facets blob:
 *   - Adds `protein_families`, `protein_cuts`, `dietary_flags`,
 *     `generated_at`, `generated_by`
 *   - Preserves `quality_flags` from PR1b/PR2 (porc_substituted,
 *     alcohol_removed, low_confidence_match)
 *
 * Cursor-paginated by `recipes.id` so re-runs are cheap and a re-run
 * after new recipes land just picks them up.
 *
 * Usage :
 *   set -a; source .env; set +a
 *   npm run backfill:recipe-facets                       # dry-run
 *   BACKFILL_APPLY=true npm run backfill:recipe-facets
 *
 * Env knobs :
 *   BACKFILL_APPLY=true             write to DB (default: dry-run)
 *   BACKFILL_BATCH_SIZE=50          recipes per page (default 50)
 *   BACKFILL_MAX_ROWS=0             stop after N recipes (default ∞)
 *   BACKFILL_FORCE=1                re-extract even if generated_by is set
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  extractRecipeFacets,
  type RecipeIngredientInput,
} from '../apps/api/src/services/recipes/RecipeFacetExtractor.js';

const BATCH_SIZE = Number(process.env.BACKFILL_BATCH_SIZE ?? '50') || 50;
const MAX_ROWS = Number(process.env.BACKFILL_MAX_ROWS ?? '0') || Infinity;
const APPLY = process.env.BACKFILL_APPLY === 'true';
const FORCE = process.env.BACKFILL_FORCE === '1';

function envOrThrow(key: string): string {
  const v = process.env[key];
  if (!v) {
    process.stderr.write(`✖ Missing env var: ${key}\n`);
    process.exit(1);
  }
  return v;
}

interface RecipeRow {
  id: string;
  name: string;
  recipe_facets: Record<string, unknown> | null;
}

async function fetchRecipesBatch(
  client: SupabaseClient<any, any, any>,
  afterId: string | null,
  limit: number,
): Promise<RecipeRow[]> {
  let query = client
    .from('recipes')
    .select('id, name, recipe_facets')
    .order('id')
    .limit(limit);
  if (afterId) query = query.gt('id', afterId);
  const { data, error } = await query;
  if (error) throw new Error(`fetch recipes: ${error.message}`);
  return (data ?? []) as RecipeRow[];
}

async function fetchIngredientsForRecipes(
  client: SupabaseClient<any, any, any>,
  recipeIds: readonly string[],
): Promise<Map<string, RecipeIngredientInput[]>> {
  if (recipeIds.length === 0) return new Map();
  const { data, error } = await client
    .from('recipe_ingredients')
    .select('recipe_id, ingredient_name, notes')
    .in('recipe_id', recipeIds);
  if (error) throw new Error(`fetch ingredients: ${error.message}`);

  const byRecipe = new Map<string, RecipeIngredientInput[]>();
  for (const row of (data ?? []) as Array<{
    recipe_id: string;
    ingredient_name: string | null;
    notes: string | null;
  }>) {
    if (!row.ingredient_name) continue;
    const list = byRecipe.get(row.recipe_id) ?? [];
    list.push({ name: row.ingredient_name, notes: row.notes });
    byRecipe.set(row.recipe_id, list);
  }
  return byRecipe;
}

async function main(): Promise<void> {
  const supabaseUrl = envOrThrow('SUPABASE_URL');
  const serviceRole =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!serviceRole) {
    process.stderr.write(
      '✖ Missing env var: SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY)\n',
    );
    process.exit(1);
  }
  const client = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let afterId: string | null = null;
  let processed = 0;
  let updated = 0;
  let skipped = 0;
  const startedAt = Date.now();
  const familyCounts = new Map<string, number>();
  const cutCounts = new Map<string, number>();

  process.stderr.write(
    `[backfill-facets] mode=${APPLY ? 'APPLY' : 'DRY-RUN'} batch=${BATCH_SIZE} maxRows=${
      MAX_ROWS === Infinity ? '∞' : MAX_ROWS
    } force=${FORCE ? '1' : '0'}\n`,
  );

  while (processed < MAX_ROWS) {
    const remaining = Math.min(BATCH_SIZE, MAX_ROWS - processed);
    const recipes = await fetchRecipesBatch(client, afterId, remaining);
    if (recipes.length === 0) break;
    afterId = recipes[recipes.length - 1].id;

    const ingredientsByRecipe = await fetchIngredientsForRecipes(
      client,
      recipes.map((r) => r.id),
    );

    for (const recipe of recipes) {
      processed += 1;
      const existingFacets = (recipe.recipe_facets ?? {}) as Record<string, unknown>;

      if (!FORCE && typeof existingFacets.generated_by === 'string' &&
          (existingFacets.generated_by as string).startsWith('prp-239-pr3')) {
        skipped += 1;
        continue;
      }

      const ingredients = ingredientsByRecipe.get(recipe.id) ?? [];
      const existingQualityFlags = Array.isArray(existingFacets.quality_flags)
        ? (existingFacets.quality_flags as string[])
        : undefined;

      const next = extractRecipeFacets(ingredients, {
        qualityFlags: existingQualityFlags,
      });

      for (const f of next.protein_families) familyCounts.set(f, (familyCounts.get(f) ?? 0) + 1);
      for (const c of next.protein_cuts) cutCounts.set(c, (cutCounts.get(c) ?? 0) + 1);

      if (APPLY) {
        // Preserve any non-PRP-239 keys already in facets (forward compat).
        const merged = {
          ...existingFacets,
          protein_families: next.protein_families,
          protein_cuts: next.protein_cuts,
          dietary_flags: next.dietary_flags,
          generated_at: next.generated_at,
          generated_by: next.generated_by,
          // quality_flags carried through by the extractor.
          ...(existingQualityFlags ? { quality_flags: existingQualityFlags } : {}),
        };
        const { error } = await client
          .from('recipes')
          .update({ recipe_facets: merged })
          .eq('id', recipe.id);
        if (error) {
          process.stderr.write(
            `[backfill-facets] error on ${recipe.id} (${recipe.name}): ${error.message}\n`,
          );
          continue;
        }
        updated += 1;
      }

      if (processed % 50 === 0) {
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
        process.stderr.write(
          `[backfill-facets] progress ${processed} recipes in ${elapsed}s (${(processed / Math.max(Number(elapsed), 0.1)).toFixed(1)}/s)\n`,
        );
      }
      if (processed >= MAX_ROWS) break;
    }
  }

  const fmtMap = (m: Map<string, number>): string =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(' ');

  process.stderr.write('\n[backfill-facets] Summary\n');
  process.stderr.write(`  Recipes processed: ${processed}\n`);
  process.stderr.write(`  Updated:           ${updated}\n`);
  process.stderr.write(`  Skipped (already): ${skipped}\n`);
  process.stderr.write(`  Family counts:     ${fmtMap(familyCounts)}\n`);
  process.stderr.write(`  Cut counts:        ${fmtMap(cutCounts)}\n`);
  if (!APPLY) process.stderr.write('  (dry-run — no DB writes)\n');
}

main().catch((err) => {
  process.stderr.write(`✖ ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
