import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

const ReportSchema = z.object({
  kind: z.enum(['render', 'route', 'window', 'promise']),
  message: z.string().trim().min(1).max(500),
  stack: z.string().max(1500).optional(),
  path: z.string().max(200).optional(),
  build: z.string().max(40).optional(),
}).strict();

/**
 * A crash in the browser becomes one JSON line in the server logs (Vercel). Sentry was
 * referenced but never set up, so no crash was ever seen (audit 2026-11-07, reliability
 * P1 5). Mounted behind requireUser and a rate limit in app.ts.
 */
export function createClientErrorsRouter(): Router {
  const router = Router();
  router.post('/', (req: Request, res: Response) => {
    const parsed = ReportSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ success: false, error: { message: 'Rapport d’erreur invalide.', code: 'BAD_REQUEST' } });
    console.error(JSON.stringify({ event: 'client_error', user_id: req.user?.id ?? null, ...parsed.data }));
    return res.status(204).end();
  });
  return router;
}
