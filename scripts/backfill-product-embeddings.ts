/**
 * Phase 3 J4 — Backfill embeddings for existing products.
 *
 * Iterates over products where `embedding IS NULL`, generates a
 * 1536-dim text-embedding-3-small vector via the EmbeddingService, and
 * UPDATEs the row. Idempotent: re-running picks up wherever it left
 * off, including rows that previously failed (those stay NULL).
 *
 * Usage :
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... OPENAI_API_KEY=... \
 *     npx tsx scripts/backfill-product-embeddings.ts
 *
 * Options (env) :
 *   BACKFILL_BATCH_SIZE   rows per loop iteration (default 100)
 *   BACKFILL_MAX_ROWS     stop after N rows (default Infinity)
 *   BACKFILL_DRY_RUN      'true' = log what would happen, no writes
 *
 * Coût attendu : text-embedding-3-small @ $0.020/1M tokens, product
 * names ~5 tokens chacun → <$1 pour 10k produits.
 */

import { createClient } from '@supabase/supabase-js';

import { EmbeddingService } from '../apps/api/src/services/products/EmbeddingService.js';

interface ProductRow {
  id: string;
  name: string;
}

const BATCH_SIZE = Number(process.env.BACKFILL_BATCH_SIZE ?? '100') || 100;
const MAX_ROWS = Number(process.env.BACKFILL_MAX_ROWS ?? '0') || Infinity;
const DRY_RUN = process.env.BACKFILL_DRY_RUN === 'true';

function envOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`✖ Missing env var: ${key}`);
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
  const url = envOrThrow('SUPABASE_URL');
  const serviceKey = envOrThrow('SUPABASE_SERVICE_KEY');
  envOrThrow('OPENAI_API_KEY');

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const embeddingService = new EmbeddingService();

  console.log(`▶ Backfill start — batch=${BATCH_SIZE} max=${MAX_ROWS} dryRun=${DRY_RUN}`);

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  let totalTokensApprox = 0;

  while (totalProcessed < MAX_ROWS) {
    const remaining = MAX_ROWS - totalProcessed;
    const pageSize = Math.min(BATCH_SIZE, remaining);

    const { data, error } = await supabase
      .from('products')
      .select('id, name')
      .is('embedding', null)
      .order('created_at', { ascending: true })
      .limit(pageSize);

    if (error) {
      console.error('✖ Supabase select failed:', error);
      process.exit(1);
    }

    const rows = (data ?? []) as ProductRow[];
    if (rows.length === 0) {
      console.log('✔ No rows left to backfill — done.');
      break;
    }

    console.log(`… batch of ${rows.length} (cumulative processed=${totalProcessed})`);

    const names = rows.map((r) => r.name);
    const vectors = await embeddingService.generateBatch(names);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const vec = vectors[i];
      totalProcessed += 1;

      if (!vec) {
        totalFailed += 1;
        console.warn(`  ↳ ${row.id} "${row.name}" — embedding failed (leaving NULL)`);
        continue;
      }

      // Rough token count: 1 token ≈ 4 chars for FR/EN mix
      totalTokensApprox += Math.ceil(row.name.length / 4);

      if (DRY_RUN) {
        totalUpdated += 1;
        continue;
      }

      const { error: updateErr } = await supabase
        .from('products')
        .update({
          embedding: vec as unknown as string,
          embedding_updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      if (updateErr) {
        totalFailed += 1;
        console.warn(`  ↳ ${row.id} "${row.name}" — UPDATE failed:`, updateErr.message);
        continue;
      }
      totalUpdated += 1;
    }

    // Safety guard: if a whole batch failed, abort to avoid an infinite
    // loop on a permanent OpenAI outage.
    const batchAllFailed = vectors.every((v) => v === null);
    if (batchAllFailed && rows.length > 0) {
      console.error('✖ Entire batch failed — aborting to avoid infinite loop.');
      break;
    }
  }

  const estimatedUsd = (totalTokensApprox / 1_000_000) * 0.02;
  console.log('───────────────────────────────────────────────');
  console.log(`✔ Processed : ${totalProcessed}`);
  console.log(`✔ Updated   : ${totalUpdated}`);
  console.log(`✖ Failed    : ${totalFailed}`);
  console.log(`≈ Tokens    : ${totalTokensApprox} (~$${estimatedUsd.toFixed(4)} USD)`);
  console.log('───────────────────────────────────────────────');
}

main().catch((err) => {
  console.error('✖ Fatal:', err);
  process.exit(1);
});
