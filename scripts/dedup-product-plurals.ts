/**
 * Find and merge French singular / plural product pairs.
 *
 * Examples handled :
 *   oignon       ↔ oignons
 *   œuf          ↔ œufs
 *   poivron rouge ↔ poivrons rouges     (compound : every word pluralised)
 *   petits oignons ↔ petit oignon
 *   noix de coco  ↔ noix de cocos       (only the trailing noun pluralised)
 *
 * Strategy :
 *   1. Pull every product row (id, name, normalized_name, created_at).
 *   2. For each product, enumerate every "alternative pluralisation"
 *      candidate by toggling 's' on each of its words (skipping the
 *      French connector words 'de', 'du', 'des', 'de l\'', 'd\'', 'à',
 *      'au', 'aux', 'en' which are never pluralised).
 *   3. If a candidate matches another product's normalized_name AND
 *      that other product has a DIFFERENT id, we have a candidate
 *      pair. Canonical = the oldest row.
 *   4. Apply merges via assistant_merge_product_into.
 *
 * Defaults to DRY-RUN. Set DEDUP_APPLY=true to write.
 *
 * Usage :
 *   set -a; source .env; set +a
 *   npm run dedup:plurals                      # dry-run
 *   DEDUP_APPLY=true npm run dedup:plurals     # execute
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const APPLY = process.env.DEDUP_APPLY === 'true';

function envOrThrow(key: string): string {
  const v = process.env[key];
  if (!v) { console.error(`✖ Missing ${key}`); process.exit(1); }
  return v;
}

interface ProductRow {
  id: string;
  name: string;
  normalized_name: string;
  created_at: string;
}

// Connector words that never get pluralised — we skip them when
// generating candidates.
const CONNECTORS = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'l', 'd',
  'à', 'a', 'au', 'aux', 'en', 'et', 'ou', 'avec', 'sans',
]);

/**
 * Toggle the trailing 's' of a single word. Returns the variant that
 * differs from the input (or null if no toggle makes sense, e.g. the
 * word is too short).
 */
function toggleS(word: string): string | null {
  if (word.length < 3) return null;
  if (word.endsWith('s')) {
    // already plural — singularise (drop trailing 's' unless 'ss')
    if (word.endsWith('ss')) return null;
    return word.slice(0, -1);
  }
  // x-ending plurals (chevaux, etc.) — skip, irregular
  if (word.endsWith('x')) return null;
  return word + 's';
}

/**
 * Enumerate every alternative pluralisation by toggling 's' on each
 * non-connector word independently (cartesian product). For "poivron
 * rouge" returns ["poivron rouge", "poivrons rouge", "poivron
 * rouges", "poivrons rouges"] minus the original.
 */
function enumerateVariants(normalisedName: string): string[] {
  const words = normalisedName.split(/\s+/);
  const wordVariants: string[][] = words.map((w) => {
    if (CONNECTORS.has(w)) return [w]; // never pluralise connectors
    const alt = toggleS(w);
    return alt ? [w, alt] : [w];
  });
  const out: string[] = [];
  function recurse(idx: number, acc: string[]): void {
    if (idx === wordVariants.length) {
      out.push(acc.join(' '));
      return;
    }
    for (const v of wordVariants[idx]) recurse(idx + 1, [...acc, v]);
  }
  recurse(0, []);
  return out.filter((v) => v !== normalisedName);
}

async function main(): Promise<void> {
  envOrThrow('SUPABASE_URL');
  envOrThrow('SUPABASE_SERVICE_KEY');

  console.log(`▶ dedup:plurals — apply=${APPLY}`);

  // 1. Load all products.
  const all: ProductRow[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, normalized_name, created_at')
      .order('created_at', { ascending: true })
      .range(from, from + 499);
    if (error) { console.error('✖ select failed:', error); process.exit(1); }
    const rows = (data ?? []) as ProductRow[];
    if (rows.length === 0) break;
    all.push(...rows);
    if (rows.length < 500) break;
  }
  console.log(`… ${all.length} products loaded.`);

  // 2. Build normalized_name → row map.
  const byName = new Map<string, ProductRow>();
  for (const r of all) byName.set(r.normalized_name, r);

  // 3. For each row, look for plural-variant siblings.
  const pairs: Array<{ canonical: ProductRow; duplicate: ProductRow }> = [];
  const seen = new Set<string>(); // to avoid emitting the same pair twice

  for (const row of all) {
    if (seen.has(row.id)) continue;
    for (const variant of enumerateVariants(row.normalized_name)) {
      const sibling = byName.get(variant);
      if (!sibling || sibling.id === row.id) continue;
      if (seen.has(sibling.id)) continue;
      // Canonical = the older one
      const [canonical, duplicate] =
        new Date(row.created_at) <= new Date(sibling.created_at)
          ? [row, sibling]
          : [sibling, row];
      pairs.push({ canonical, duplicate });
      seen.add(canonical.id);
      seen.add(duplicate.id);
      break; // one pair per canonical is enough
    }
  }

  console.log(`\nDetected ${pairs.length} singular/plural pair(s):`);
  for (const p of pairs) {
    console.log(`  "${p.canonical.name}" (${p.canonical.id.slice(0, 8)}) ← "${p.duplicate.name}" (${p.duplicate.id.slice(0, 8)})`);
  }

  if (!APPLY) {
    console.log(`\n↳ DRY-RUN. Re-run with DEDUP_APPLY=true to execute.`);
    return;
  }

  let merged = 0;
  let totalRecipesRepointed = 0;
  let totalInventoryRepointed = 0;
  let totalInventoryMerged = 0;
  let totalShoppingRepointed = 0;
  let totalShoppingMerged = 0;
  for (const p of pairs) {
    const { data, error } = await supabase.rpc('assistant_merge_product_into', {
      p_canonical: p.canonical.id,
      p_duplicate: p.duplicate.id,
    });
    if (error) {
      console.warn(`  ✖ merge "${p.duplicate.name}" → "${p.canonical.name}":`, error.message);
      continue;
    }
    const summary = data as any;
    if (summary?.duplicate_deleted) merged += 1;
    totalRecipesRepointed += summary?.recipes_repointed ?? 0;
    totalInventoryRepointed += summary?.inventory_repointed ?? 0;
    totalInventoryMerged += summary?.inventory_merged ?? 0;
    totalShoppingRepointed += summary?.shopping_repointed ?? 0;
    totalShoppingMerged += summary?.shopping_merged ?? 0;
  }

  // Bust ALL recipe analysis caches now that products changed.
  await supabase.from('recipe_inventory_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('\n───────────────────────────────────────────────');
  console.log(`Pairs detected     : ${pairs.length}`);
  console.log(`Pairs merged       : ${merged}`);
  console.log(`Recipe FKs moved   : ${totalRecipesRepointed}`);
  console.log(`Inventory repoint  : ${totalInventoryRepointed}`);
  console.log(`Inventory merged   : ${totalInventoryMerged}`);
  console.log(`Shopping repoint   : ${totalShoppingRepointed}`);
  console.log(`Shopping merged    : ${totalShoppingMerged}`);
  console.log(`Recipe caches      : cleared`);
  console.log('───────────────────────────────────────────────');
}

main().catch((e) => { console.error(e); process.exit(1); });
