/**
 * V11-01 E1 — menus routes.
 *
 * `POST /api/v1/menus/shopping-preview`: the review of a week's shopping, computed from the
 * menu basis shared with the command menu_add_missing (which the stock commands route executes);
 * since E4a, it may count the meals of a proposed week, saved nowhere.
 * `POST /api/v1/menus/week-proposal` (E4a): recipes for empty slots, read from the recommendation
 * engine without any write; validated by the screen as one update_menu.
 * User-scoped (`req.supabaseClient`, RLS); 60 reads per hour free, 600 premium, each (V11-01 E0).
 */
import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase.js';
import { MenuShoppingPreviewRequestSchema, WeekProposalRequestSchema } from '@smart/shared';
import { ok, fail } from '../utils/responses.js';
import { logError } from '../config/logger.js';
import { userRateLimit } from '../middleware/userRateLimit.js';
import { MenuShoppingService } from '../services/menus/MenuShoppingService.js';
import { WeekPlanService } from '../services/menus/WeekPlanService.js';
import { MemoryService } from '../services/assistant/MemoryService.js';
import { StockCommandError } from '../services/stock/StockCommandService.js';

const HOUR = 3_600_000;

/** `adminClient` gives the proposal the taste memory, read only, as the recommendations route does. */
export function createMenusRouter(adminClient?: SupabaseClient<Database>): Router {
  const router = Router();
  const memoryService = adminClient ? new MemoryService(adminClient) : undefined;
  router.post('/shopping-preview', userRateLimit({ key: 'menus.shopping-preview', freeMax: 60, premiumMax: 600, windowMs: HOUR }), async (req, res) => {
    if (!req.user?.id || !req.supabaseClient) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    const parsed = MenuShoppingPreviewRequestSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'Semaine invalide : indique le lundi de la semaine et des repas de cette semaine.', 400, 'INVALID_BODY');
    try {
      const preview = await new MenuShoppingService(req.supabaseClient).preview(req.user.id, parsed.data.week_start, parsed.data.proposal);
      return ok(res, preview, 'OK', 'MENU_SHOPPING_PREVIEW_OK');
    } catch (error) {
      // A known refusal (stale week, migration missing) is answered as is; a read that failed is not a refused write.
      if (error instanceof StockCommandError && error.code !== 'STOCK_WRITE_FAILED') return fail(res, error.message, error.status, error.code);
      logError(error, { context: 'menus.shopping-preview', week_start: parsed.data.week_start });
      return fail(res, 'Les courses de la semaine ne peuvent pas être calculées. Réessaie dans un instant.', 503, 'MENU_SHOPPING_UNAVAILABLE');
    }
  });
  router.post('/week-proposal', userRateLimit({ key: 'menus.week-proposal', freeMax: 60, premiumMax: 600, windowMs: HOUR }), async (req, res) => {
    if (!req.user?.id || !req.supabaseClient) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    const parsed = WeekProposalRequestSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'Créneaux invalides : indique le lundi de la semaine et des créneaux de cette semaine.', 400, 'INVALID_BODY');
    try {
      const proposal = await new WeekPlanService(req.supabaseClient, { memoryService }).propose(req.user.id, parsed.data);
      return ok(res, proposal, 'OK', 'WEEK_PROPOSAL_OK');
    } catch (error) {
      // A known refusal (week changed, day passed, migration missing) is answered as is; nothing was written.
      if (error instanceof StockCommandError && error.code !== 'STOCK_WRITE_FAILED') return fail(res, error.message, error.status, error.code);
      logError(error, { context: 'menus.week-proposal', week_start: parsed.data.week_start });
      return fail(res, 'La semaine ne peut pas être proposée pour le moment. Réessaie dans un instant.', 503, 'WEEK_PROPOSAL_UNAVAILABLE');
    }
  });
  return router;
}
