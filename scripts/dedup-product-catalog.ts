/**
 * Phase 3 J6 — Dedup the products catalog using semantic similarity.
 *
 * Walks `products` looking for clusters of rows whose embeddings are
 * extremely close (cosine ≥ DEDUP_THRESHOLD, default 0.95). For each
 * cluster, the OLDEST row is the canonical and the rest are merged
 * into it via the SECURITY DEFINER RPC
 * `assistant_merge_product_into(canonical, duplicate)`.
 *
 * Prerequisite : the embedding backfill MUST have run first
 * (`npm run backfill:product-embeddings`). Rows with NULL embeddings
 * are silently skipped.
 *
 * Default mode is DRY-RUN — prints the plan, no writes. Set
 * DEDUP_APPLY=true to execute.
 *
 * Usage :
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
 *     npm run dedup:product-catalog              # dry-run
 *   DEDUP_APPLY=true SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
 *     npm run dedup:product-catalog              # actually merge
 *
 * Env knobs :
 *   DEDUP_THRESHOLD    cosine similarity floor (default 0.95)
 *   DEDUP_LIMIT        max canonicals to consider this run (default ∞)
 *   DEDUP_APPLY        'true' to execute, anything else = dry-run
 *   DEDUP_CATEGORY_GATE 'true' skips pairs whose categories differ
 *                        when BOTH categories are non-NULL/non-'autres'
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

interface ProductRow {
  id: string;
  name: string;
  category: string | null;
  created_at: string;
  embedding: number[] | null;
}

interface MergeSummary {
  canonical: string;
  duplicate: string;
  inventory_repointed: number;
  inventory_merged: number;
  shopping_repointed: number;
  shopping_merged: number;
  recipes_repointed: number;
  duplicate_deleted: boolean;
}

const THRESHOLD = Number(process.env.DEDUP_THRESHOLD ?? '0.95') || 0.95;
const LIMIT = Number(process.env.DEDUP_LIMIT ?? '0') || Infinity;
const APPLY = process.env.DEDUP_APPLY === 'true';
const CATEGORY_GATE = process.env.DEDUP_CATEGORY_GATE === 'true';

function envOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`✖ Missing env var: ${key}`);
    process.exit(1);
  }
  return value;
}

interface NearestMatch {
  duplicate_id: string;
  duplicate_name: string;
  duplicate_category: string | null;
  duplicate_created_at: string;
  similarity: number;
}

/**
 * For one canonical product, fetch the products that are :
 *   - cosine similarity ≥ THRESHOLD
 *   - NOT the canonical itself
 *   - created STRICTLY after the canonical (so we only ever fold
 *     newer rows into older ones — guarantees deterministic order
 *     across runs)
 *
 * Uses the HNSW index on the embedding column.
 */
async function fetchNeighbours(
  supabase: SupabaseClient,
  canonical: ProductRow,
): Promise<NearestMatch[]> {
  // We can't use the existing assistant_semantic_search_products RPC
  // here because it doesn't expose the created_at gate. Fall back to a
  // raw SQL via the rpc('execute_sql') is overkill — instead run a
  // SELECT with the embedding operator and a created_at filter. The
  // .filter() / .lt() helpers don't support pgvector ops, so build the
  // ordering via the SDK's `.order(... { ascending })` is also limited.
  // Easiest: a dedicated tiny RPC.
  const { data, error } = await supabase.rpc('assistant_semantic_search_products', {
    p_query: canonical.embedding as unknown as string,
    p_limit: 25,
    p_min_score: THRESHOLD,
  });
  if (error) {
    console.warn('  ↳ neighbours RPC failed:', error.message);
    return [];
  }
  const rows = (data ?? []) as Array<{
    product: { id: string; name: string; category: string | null; created_at: string };
    score: number;
  }>;
  return rows
    .filter((r) => r.product.id !== canonical.id)
    .filter((r) => r.product.created_at > canonical.created_at)
    .map((r) => ({
      duplicate_id: r.product.id,
      duplicate_name: r.product.name,
      duplicate_category: r.product.category,
      duplicate_created_at: r.product.created_at,
      similarity: r.score,
    }));
}

function categoryConflict(
  a: string | null,
  b: string | null,
): boolean {
  if (!CATEGORY_GATE) return false;
  if (!a || !b) return false;
  if (a === 'autres' || b === 'autres') return false;
  return a !== b;
}

async function main(): Promise<void> {
  const url = envOrThrow('SUPABASE_URL');
  const serviceKey = envOrThrow('SUPABASE_SERVICE_KEY');
  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(
    `▶ Catalog dedup start — threshold=${THRESHOLD} limit=${LIMIT} apply=${APPLY} categoryGate=${CATEGORY_GATE}`,
  );

  // Pull every product with an embedding, oldest first. We process
  // them in chronological order so a long chain (A → B → C) folds B
  // and C into A in one pass without flip-flopping.
  const canonicals: ProductRow[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, category, created_at, embedding')
      .not('embedding', 'is', null)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) {
      console.error('✖ products page fetch failed:', error.message);
      process.exit(1);
    }
    const rows = (data ?? []) as unknown as ProductRow[];
    if (rows.length === 0) break;
    canonicals.push(...rows);
    if (rows.length < pageSize) break;
  }
  console.log(`… ${canonicals.length} products with embeddings to inspect.`);

  const merged = new Set<string>();
  let totalMerged = 0;
  let totalInventoryRepointed = 0;
  let totalInventoryMerged = 0;
  let totalShoppingRepointed = 0;
  let totalShoppingMerged = 0;
  let totalRecipesRepointed = 0;
  const summaries: MergeSummary[] = [];
  let inspected = 0;

  for (const canonical of canonicals) {
    if (merged.has(canonical.id)) continue; // already folded into someone else
    if (inspected >= LIMIT) break;
    inspected += 1;

    const neighbours = await fetchNeighbours(supabase, canonical);
    const targets = neighbours.filter(
      (n) =>
        !merged.has(n.duplicate_id) &&
        !categoryConflict(canonical.category, n.duplicate_category),
    );
    if (targets.length === 0) continue;

    console.log(
      `\n• canonical ${canonical.id.slice(0, 8)} "${canonical.name}" (cat=${canonical.category ?? '∅'})`,
    );
    for (const t of targets) {
      console.log(
        `    ↳ ${t.duplicate_id.slice(0, 8)} "${t.duplicate_name}" (cat=${
          t.duplicate_category ?? '∅'
        }) — sim ${(t.similarity * 100).toFixed(1)}%`,
      );
    }

    if (!APPLY) {
      // In dry-run, mark them as merged so we don't propose them again
      // when they're hit as a canonical later in the loop.
      targets.forEach((t) => merged.add(t.duplicate_id));
      continue;
    }

    for (const t of targets) {
      const { data, error } = await supabase.rpc('assistant_merge_product_into', {
        p_canonical: canonical.id,
        p_duplicate: t.duplicate_id,
      });
      if (error) {
        console.error(`    ✖ merge failed (${t.duplicate_id}):`, error.message);
        continue;
      }
      const summary = data as MergeSummary;
      summaries.push(summary);
      merged.add(t.duplicate_id);
      if (summary.duplicate_deleted) totalMerged += 1;
      totalInventoryRepointed += summary.inventory_repointed;
      totalInventoryMerged += summary.inventory_merged;
      totalShoppingRepointed += summary.shopping_repointed;
      totalShoppingMerged += summary.shopping_merged;
      totalRecipesRepointed += summary.recipes_repointed;
      console.log(
        `    ✔ merged — inv repoint=${summary.inventory_repointed} merge=${summary.inventory_merged} | shop repoint=${summary.shopping_repointed} merge=${summary.shopping_merged} | recipes=${summary.recipes_repointed}`,
      );
    }
  }

  console.log('\n───────────────────────────────────────────────');
  console.log(`✔ Canonicals inspected   : ${inspected}`);
  if (APPLY) {
    console.log(`✔ Products merged        : ${totalMerged}`);
    console.log(`✔ Inventory repointed    : ${totalInventoryRepointed}`);
    console.log(`✔ Inventory merged       : ${totalInventoryMerged}`);
    console.log(`✔ Shopping repointed     : ${totalShoppingRepointed}`);
    console.log(`✔ Shopping merged        : ${totalShoppingMerged}`);
    console.log(`✔ Recipe ingredients FK  : ${totalRecipesRepointed}`);
  } else {
    console.log(
      `↳ DRY-RUN — re-run with DEDUP_APPLY=true to execute (${merged.size} products would be folded).`,
    );
  }
  console.log('───────────────────────────────────────────────');
}

main().catch((err) => {
  console.error('✖ Fatal:', err);
  process.exit(1);
});
