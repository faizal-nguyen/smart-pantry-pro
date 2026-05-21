/**
 * PRP-239 PR2 — Backfill `recipe_ingredients.inventory_product_id` via
 * the policy-aware `IngredientAliasResolver`.
 *
 * Distinct from `backfill-recipe-ingredient-fk.ts` (Phase 3) which uses
 * the broader `ProductResolver` (including a CREATE step that mints new
 * products). This script is **conservative**:
 *   - Only links to EXISTING products (exact / alias / semantic ≥ 0.85).
 *   - Never creates a new product.
 *   - Tags any recipe it couldn't reconcile with
 *     `recipe_facets.quality_flags = [..., 'low_confidence_match']` so
 *     the assistant + UI know the ingredient is unmapped.
 *
 * The two backfill scripts are complementary — use this one first to
 * lock in safe alias-based mappings, then run the create-capable one
 * for the remaining tail if you want every ingredient bound.
 *
 * Usage :
 *
 *   set -a; source .env; set +a
 *   npm run backfill:recipe-ingredient-canonical              # dry-run
 *   BACKFILL_APPLY=true npm run backfill:recipe-ingredient-canonical
 *
 * Env knobs :
 *   BACKFILL_APPLY=true             write to DB (default: dry-run)
 *   BACKFILL_BATCH_SIZE=50          rows per page (default 50)
 *   BACKFILL_MAX_ROWS=0             stop after N rows (default ∞)
 *   BACKFILL_DISABLE_SEMANTIC=1     skip the embedding step (alias-only)
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  IngredientAliasResolver,
  type ResolvedIngredient,
} from '../apps/api/src/services/ingredients/IngredientAliasResolver.js';
import { EmbeddingService } from '../apps/api/src/services/products/EmbeddingService.js';

const BATCH_SIZE = Number(process.env.BACKFILL_BATCH_SIZE ?? '50') || 50;
const MAX_ROWS = Number(process.env.BACKFILL_MAX_ROWS ?? '0') || Infinity;
const APPLY = process.env.BACKFILL_APPLY === 'true';
const DISABLE_SEMANTIC = process.env.BACKFILL_DISABLE_SEMANTIC === '1';

function envOrThrow(key: string): string {
  const v = process.env[key];
  if (!v) {
    process.stderr.write(`✖ Missing env var: ${key}\n`);
    process.exit(1);
  }
  return v;
}

interface RecipeIngredientRow {
  id: string;
  recipe_id: string;
  ingredient_name: string;
}

async function fetchUnlinkedBatch(
  client: SupabaseClient<any, any, any>,
  offset: number,
  limit: number,
): Promise<RecipeIngredientRow[]> {
  const { data, error } = await client
    .from('recipe_ingredients')
    .select('id, recipe_id, ingredient_name')
    .is('inventory_product_id', null)
    .not('ingredient_name', 'is', null)
    .neq('ingredient_name', '')
    .order('id')
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`fetch failed: ${error.message}`);
  }
  return (data ?? []) as RecipeIngredientRow[];
}

async function applyResolution(
  client: SupabaseClient<any, any, any>,
  row: RecipeIngredientRow,
  resolved: ResolvedIngredient,
): Promise<void> {
  if (resolved.productId) {
    const { error } = await client
      .from('recipe_ingredients')
      .update({ inventory_product_id: resolved.productId })
      .eq('id', row.id);
    if (error) throw new Error(`update ri ${row.id}: ${error.message}`);
    return;
  }

  // Unresolved → tag the recipe with low_confidence_match. Merge via
  // set union on the existing array.
  const { data: facetRow, error: readErr } = await client
    .from('recipes')
    .select('recipe_facets')
    .eq('id', row.recipe_id)
    .single();
  if (readErr) throw new Error(`read recipe ${row.recipe_id}: ${readErr.message}`);

  const facets =
    (facetRow?.recipe_facets as Record<string, unknown> | null | undefined) ?? {};
  const existing = Array.isArray((facets as { quality_flags?: unknown }).quality_flags)
    ? ((facets as { quality_flags: string[] }).quality_flags)
    : [];
  if (existing.includes('low_confidence_match')) return; // already flagged

  const next = { ...facets, quality_flags: [...existing, 'low_confidence_match'] };
  const { error: writeErr } = await client
    .from('recipes')
    .update({ recipe_facets: next })
    .eq('id', row.recipe_id);
  if (writeErr) throw new Error(`tag recipe ${row.recipe_id}: ${writeErr.message}`);
}

async function main(): Promise<void> {
  const supabaseUrl = envOrThrow('SUPABASE_URL');
  // Accept either name — sibling backfill script uses SUPABASE_SERVICE_KEY.
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

  const embeddingService = DISABLE_SEMANTIC
    ? undefined
    : new EmbeddingService({ apiKey: process.env.OPENAI_API_KEY });
  const resolver = new IngredientAliasResolver(client, { embeddingService });

  let offset = 0;
  let processed = 0;
  const stats = {
    exact: 0,
    alias: 0,
    semantic: 0,
    ambiguous: 0,
    low_confidence: 0,
  };
  const taggedRecipes = new Set<string>();

  process.stderr.write(
    `[backfill-canonical] mode=${APPLY ? 'APPLY' : 'DRY-RUN'} batch=${BATCH_SIZE} maxRows=${
      MAX_ROWS === Infinity ? '∞' : MAX_ROWS
    } semantic=${DISABLE_SEMANTIC ? 'OFF' : 'ON'}\n`,
  );

  while (processed < MAX_ROWS) {
    const remaining = Math.min(BATCH_SIZE, MAX_ROWS - processed);
    const rows = await fetchUnlinkedBatch(client, offset, remaining);
    if (rows.length === 0) break;

    for (const row of rows) {
      const resolved = await resolver.resolve(row.ingredient_name);
      stats[resolved.kind] = (stats[resolved.kind] ?? 0) + 1;

      if (APPLY) {
        try {
          await applyResolution(client, row, resolved);
          if (!resolved.productId) taggedRecipes.add(row.recipe_id);
        } catch (err) {
          process.stderr.write(
            `[backfill-canonical] error on ri ${row.id}: ${
              err instanceof Error ? err.message : String(err)
            }\n`,
          );
        }
      }

      processed += 1;
      if (processed >= MAX_ROWS) break;
    }

    // When we APPLY and the FK was just set, the next page's offset
    // would skip rows because the WHERE filter (`inventory_product_id IS
    // NULL`) shrinks the candidate set. In APPLY mode we therefore
    // stay at offset 0 and the loop terminates naturally when the set
    // is empty. In dry-run we paginate normally so we see the full set.
    if (!APPLY) offset += rows.length;
  }

  process.stderr.write('\n[backfill-canonical] Summary\n');
  process.stderr.write(`  Processed:     ${processed}\n`);
  process.stderr.write(`  Exact:         ${stats.exact}\n`);
  process.stderr.write(`  Alias:         ${stats.alias}\n`);
  process.stderr.write(`  Semantic:      ${stats.semantic}\n`);
  process.stderr.write(`  Ambiguous:     ${stats.ambiguous}\n`);
  process.stderr.write(`  Low-confidence:${stats.low_confidence}\n`);
  process.stderr.write(`  Recipes flagged low_confidence_match: ${taggedRecipes.size}\n`);
  if (!APPLY) process.stderr.write('  (dry-run — no DB writes)\n');
}

main().catch((err) => {
  process.stderr.write(`✖ ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
