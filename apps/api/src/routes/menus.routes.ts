/**
 * V11-01 E1 — menus routes.
 *
 * `POST /api/v1/menus/shopping-preview`: the review of a week's shopping, computed from the
 * menu basis shared with the command menu_add_missing (which the stock commands route executes).
 * User-scoped (`req.supabaseClient`, RLS); 60 previews per hour free, 600 premium (V11-01 E0).
 */
import { Router } from 'express';
import { MenuShoppingPreviewRequestSchema } from '@smart/shared';
import { ok, fail } from '../utils/responses.js';
import { userRateLimit } from '../middleware/userRateLimit.js';
import { MenuShoppingService } from '../services/menus/MenuShoppingService.js';
import { StockCommandError } from '../services/stock/StockCommandService.js';

const HOUR = 3_600_000;

export function createMenusRouter(): Router {
  const router = Router();
  router.post('/shopping-preview', userRateLimit({ key: 'menus.shopping-preview', freeMax: 60, premiumMax: 600, windowMs: HOUR }), async (req, res) => {
    if (!req.user?.id || !req.supabaseClient) return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    const parsed = MenuShoppingPreviewRequestSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'Semaine invalide : indique le lundi de la semaine.', 400, 'INVALID_BODY');
    try {
      const preview = await new MenuShoppingService(req.supabaseClient).preview(req.user.id, parsed.data.week_start);
      return ok(res, preview, 'OK', 'MENU_SHOPPING_PREVIEW_OK');
    } catch (error) {
      if (error instanceof StockCommandError) return fail(res, error.message, error.status, error.code);
      return fail(res, 'Les courses de la semaine ne peuvent pas être calculées. Réessaie dans un instant.', 503, 'MENU_SHOPPING_UNAVAILABLE');
    }
  });
  return router;
}
