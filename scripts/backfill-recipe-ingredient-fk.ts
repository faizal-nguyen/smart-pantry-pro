/**
 * Phase 3 follow-up — backfill recipe_ingredients.inventory_product_id.
 *
 * The Phase 3 RPC `assistant_match_recipe_ingredients_to_inventory`
 * relies on this FK to find the canonical product per ingredient. The
 * import flow (SocialImportService → saveImportedDraftAsRecipe) does
 * set it, but the bulk SQL seeds we shipped earlier (Instagram,
 * myriadrecipes, moribyan, …) inserted recipe_ingredients with the FK
 * NULL — so every recipe analysis falls through to "missing".
 *
 * This script :
 *   1. Selects every recipe_ingredients row where inventory_product_id
 *      IS NULL and ingredient_name is non-empty.
 *   2. Pre-processes the name to strip culinary measure words
 *      ("gousses d'ail" → "ail", "tranches de pain" → "pain",
 *      "feuilles de laurier" → "laurier", etc.) so the resolver gets
 *      the substance, not the unit.
 *   3. Calls ProductResolver.resolveBatch(name) for each chunk. The
 *      resolver pipeline (exact → semantic → fuzzy → create) handles
 *      the rest, including cross-lingual matches now that products
 *      have embeddings.
 *   4. UPDATEs each row with the resolved product_id.
 *
 * Defaults to DRY-RUN. Set BACKFILL_APPLY=true to write.
 *
 * Usage :
 *   set -a; source .env; set +a
 *   npm run backfill:recipe-ingredient-fk         # dry-run
 *   BACKFILL_APPLY=true npm run backfill:recipe-ingredient-fk
 *
 * Env knobs :
 *   BACKFILL_BATCH_SIZE   rows per loop iteration (default 50)
 *   BACKFILL_MAX_ROWS     stop after N rows (default ∞)
 */

import { createClient } from '@supabase/supabase-js';

import { ProductResolver } from '../apps/api/src/services/assistant/ProductResolver.js';
import { EmbeddingService } from '../apps/api/src/services/products/EmbeddingService.js';

const BATCH_SIZE = Number(process.env.BACKFILL_BATCH_SIZE ?? '50') || 50;
const MAX_ROWS = Number(process.env.BACKFILL_MAX_ROWS ?? '0') || Infinity;
const APPLY = process.env.BACKFILL_APPLY === 'true';

const SEMANTIC_THRESHOLD = Number(process.env.BACKFILL_SEMANTIC_THRESHOLD ?? '0.90') || 0.90;
// User-id used for product creation when the resolver has to insert a
// brand-new product. We use a known seed user so the audit trail is
// consistent.
const SYSTEM_USER_ID =
  process.env.BACKFILL_SYSTEM_USER_ID ?? 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';

function envOrThrow(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`✖ Missing env var: ${key}`);
    process.exit(1);
  }
  return v;
}

/**
 * Strip culinary measure-words / containers / modifiers from an
 * ingredient name so the resolver matches the substance instead of
 * the unit or preparation. Examples :
 *   "gousses d'ail"          → "ail"
 *   "tranches de pain"       → "pain"
 *   "bâtons de cannelle"     → "cannelle"
 *   "feuilles de laurier"    → "laurier"
 *   "pincée de sucre"        → "sucre"
 *   "bouquet de coriandre"   → "coriandre"
 *   "branche de céleri"      → "céleri"
 *   "ail émincé"             → "ail"
 *   "curcuma moulu"          → "curcuma"
 *   "persil frais"           → "persil"
 *   "sauce soja claire"      → "sauce soja"
 *   "piments rouges séchés"  → "piments rouges"
 *
 * Keeps the original input as-is if no pattern matches.
 */
function stripMeasureWords(raw: string): string {
  let name = raw.trim().toLowerCase();
  // Leading article / count / measure-container + linking word.
  const LEADING: RegExp[] = [
    /^(\d+(?:\s*[.,]\s*\d+)?\s+)?(gousses?|tranches?|feuilles?|brins?|branches?|bouquets?|bâtons?|batons?|pincée?s?|cuillerées?|cuilleres?|cuillères?\s+à\s+(?:café|cafe|soupe)|c\.\s*à\s*(?:café|cafe|soupe))\s+(?:d'|de\s+|du\s+|des\s+|de l'\s+)/i,
    /^(une|un|deux|trois|quelques|quelque)\s+/i,
  ];
  // Trailing culinary modifiers — preparation descriptors that are
  // irrelevant for product matching. Drops "(e)(s)" agreement endings.
  const TRAILING: RegExp[] = [
    /\s+(émincée?s?|emincee?s?|hachée?s?|hachee?s?|moulue?s?|frais|fraîche?s?|fraiche?s?|séchée?s?|sechee?s?|en\s+poudre|en\s+poudres|granulée?s?|granulee?s?|bio|grandes?|petits?|fondue?s?|fondu)$/i,
    /\s+(clairé?e?s?|claire?s?|foncée?s?|foncees?)$/i,
  ];
  let changed = true;
  while (changed) {
    changed = false;
    for (const re of LEADING) {
      const next = name.replace(re, '');
      if (next !== name) {
        name = next;
        changed = true;
      }
    }
    for (const re of TRAILING) {
      const next = name.replace(re, '');
      if (next !== name) {
        name = next;
        changed = true;
      }
    }
  }
  return name.trim();
}

interface RecipeIngredientRow {
  id: string;
  ingredient_name: string;
}

async function main(): Promise<void> {
  envOrThrow('SUPABASE_URL');
  envOrThrow('SUPABASE_SERVICE_KEY');
  envOrThrow('OPENAI_API_KEY');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const embeddingService = new EmbeddingService();
  // Strict semantic threshold to avoid false positives like
  // "oignon rouge" → "Oignon frit" that 0.85 would let through.
  const resolver = new ProductResolver(supabase as any, {
    embeddingService,
    semanticThreshold: SEMANTIC_THRESHOLD,
  });

  console.log(
    `▶ Recipe FK backfill — batch=${BATCH_SIZE} max=${MAX_ROWS} apply=${APPLY} semanticThreshold=${SEMANTIC_THRESHOLD}`,
  );

  let totalProcessed = 0;
  let totalExact = 0;
  let totalSemantic = 0;
  let totalCreated = 0;
  let totalAmbiguous = 0;
  let totalLinked = 0;
  let totalEmpty = 0;

  while (totalProcessed < MAX_ROWS) {
    const remaining = MAX_ROWS - totalProcessed;
    const pageSize = Math.min(BATCH_SIZE, remaining);

    const { data, error } = await supabase
      .from('recipe_ingredients')
      .select('id, ingredient_name')
      .is('inventory_product_id', null)
      .not('ingredient_name', 'is', null)
      .order('id', { ascending: true })
      .limit(pageSize);
    if (error) {
      console.error('✖ select failed:', error.message);
      process.exit(1);
    }
    const rows = (data ?? []) as RecipeIngredientRow[];
    if (rows.length === 0) {
      console.log('✔ No NULL FK rows left — done.');
      break;
    }

    const cleaned = rows.map((r) => ({
      ...r,
      cleaned: stripMeasureWords(r.ingredient_name),
    }));

    const valid = cleaned.filter((r) => r.cleaned.length > 0);
    const emptyCount = rows.length - valid.length;
    totalEmpty += emptyCount;
    totalProcessed += emptyCount;

    if (valid.length === 0) continue;

    // Resolver pipeline: exact → semantic → fuzzy → create.
    // Pass the CLEANED name so "ail émincé" matches "Ail" instead of
    // creating a parasite variant.
    const results = await resolver.resolveBatch(
      SYSTEM_USER_ID,
      valid.map((r) => ({ name: r.cleaned })),
    );

    for (let i = 0; i < valid.length; i++) {
      const row = valid[i];
      const res = results[i];
      totalProcessed += 1;

      if (res.kind === 'ambiguous') {
        totalAmbiguous += 1;
        console.log(`  ? "${row.ingredient_name}" → ambiguous (skipped)`);
        continue;
      }

      const productId = res.product.id;
      const via = res.kind === 'matched' ? res.via : 'created';
      if (via === 'exact' || via === 'fuzzy') totalExact += 1;
      else if (via === 'semantic') totalSemantic += 1;
      else if (via === 'created') totalCreated += 1;

      console.log(
        `  ✔ "${row.ingredient_name}" → "${res.product.name}" (${via}, ${productId.slice(0, 8)})`,
      );

      if (!APPLY) continue;
      const { error: updateErr } = await supabase
        .from('recipe_ingredients')
        .update({ inventory_product_id: productId })
        .eq('id', row.id);
      if (updateErr) {
        console.warn(`    UPDATE failed: ${updateErr.message}`);
        continue;
      }
      totalLinked += 1;
    }
  }

  console.log('\n───────────────────────────────────────────────');
  console.log(`Processed       : ${totalProcessed}`);
  console.log(`Exact / fuzzy   : ${totalExact}`);
  console.log(`Semantic        : ${totalSemantic}`);
  console.log(`Newly created   : ${totalCreated}`);
  console.log(`Ambiguous (skip): ${totalAmbiguous}`);
  console.log(`Empty / skipped : ${totalEmpty}`);
  console.log(`Linked          : ${totalLinked}`);
  console.log(`Apply mode      : ${APPLY ? 'YES' : 'DRY-RUN'}`);
  console.log('───────────────────────────────────────────────');
}

main().catch((err) => {
  console.error('✖ Fatal:', err);
  process.exit(1);
});
