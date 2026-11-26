import { Router, type Request, type Response } from 'express';
import { ClientErrorReportSchema } from '@smart/shared';

/**
 * A crash in the browser becomes one JSON line in the server logs (Vercel). Sentry was
 * referenced but never set up, so no crash was ever seen (audit 2026-11-07, reliability
 * P1 5). Mounted behind requireUser and a rate limit in app.ts.
 *
 * V11-06 D10: the report holds no free text (message, address, input) and the line no account
 * identifier, so it is no personal data. Anything outside the shared schema is refused.
 */
export function createClientErrorsRouter(): Router {
  const router = Router();
  router.post('/', (req: Request, res: Response) => {
    const parsed = ClientErrorReportSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Rapport d’erreur invalide.', code: 'BAD_REQUEST' } });
    console.error(JSON.stringify({ event: 'client_error', ...parsed.data }));
    return res.status(204).end();
  });
  return router;
}
