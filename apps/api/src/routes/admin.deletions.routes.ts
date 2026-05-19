/**
 * PRP-235 Backlog 1 — Admin deletion worker route.
 *
 * Endpoint `POST /api/admin/deletions/process` qui finalise les
 * `data_deletion_requests` pending via le RPC SECURITY DEFINER
 * `process_pending_deletion_requests(p_max_batch)`.
 *
 * Sécurité :
 *   - `createAdminAuthMiddleware` (X-Admin-Token header) requis
 *   - RPC restreint à `service_role` (REVOKE EXECUTE FROM PUBLIC)
 *   - Hard cap `max_batch` à 50 côté SQL — défensive
 *
 * Invocation V1 : cron externe (Vercel Cron, GitHub Actions, etc.)
 * qui fire toutes les N minutes avec :
 *   curl -X POST https://api.example.com/api/admin/deletions/process \
 *     -H "X-Admin-Token: <token>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"maxBatch": 10}'
 *
 * Body shape attendu (optionnel) : `{maxBatch: number}` (1..50).
 *
 * Réponse : `{processed, failed, errors}` du RPC, wrapped dans le
 * `ok()` envelope.
 */
import { Router } from 'express';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

import { ok, fail } from '../utils/responses.js';
import type { Database } from '../types/supabase.js';

const ProcessRequestSchema = z.object({
  maxBatch: z.number().int().min(1).max(50).optional(),
});

// `Database` ne typifie pas la fonction `process_pending_deletion_requests`.
// On cast en `any` localement — sûreté portée par RPC SECURITY DEFINER +
// GRANT EXECUTE service_role only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = SupabaseClient<any, any, any>;

export function createAdminDeletionsRouter(
  adminClient: SupabaseClient<Database>,
): Router {
  const router = Router();

  router.post('/process', async (req, res) => {
    const parsed = ProcessRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return fail(res, 'Invalid body', 400, 'INVALID_BODY');
    }
    const maxBatch = parsed.data.maxBatch ?? 10;

    try {
      const client = adminClient as unknown as LooseClient;
      const { data, error } = await client.rpc(
        'process_pending_deletion_requests',
        { p_max_batch: maxBatch },
      );
      if (error) throw error;
      return ok(res, data ?? null, 'OK', 'DELETIONS_PROCESSED');
    } catch (err) {
      console.error('[admin.deletions.process] error:', err);
      return fail(res, 'Internal error', 500, 'DELETIONS_PROCESS_FAILED');
    }
  });

  return router;
}
