import { Router, type Request, type Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { DiscoveryCreateItemSchema, DiscoveryCreateCreatorSchema, DiscoveryCreatorPatchSchema, DiscoveryDecisionSchema, DiscoveryFeedbackSchema } from '@smart/shared';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { userRateLimit } from '../middleware/userRateLimit.js';
import { DiscoveryError, DiscoveryService } from '../services/discovery/DiscoveryService.js';
import { discoveryConfig } from '../services/discovery/DiscoveryConfig.js';
import { ok, fail } from '../utils/responses.js';

const idSchema = z.string().uuid();
const prepareSchema = z.object({ commandId: idSchema, expectedVersion: z.number().int().positive() }).strict();
export function createRecipeDiscoveryRouter(admin: SupabaseClient, options: { service?: (request: Request) => DiscoveryService; enabled?: boolean } = {}): Router {
  const router = Router();
  router.use(createAuthMiddleware(admin));
  const enabled = options.enabled ?? discoveryConfig.enabled;
  router.use((_req, res, next) => enabled ? next() : fail(res, 'Découverte temporairement indisponible.', 503, 'DISCOVERY_DISABLED'));
  const limiter = userRateLimit({ key: 'discovery.commands', freeMax: 120, premiumMax: 300, windowMs: 3600000 });
  const handler = (run: (service: DiscoveryService, req: Request) => Promise<unknown>) => async (req: Request, res: Response) => {
    if (!req.user?.id || !req.supabaseClient) return fail(res, 'Connexion requise.', 401, 'UNAUTHORIZED');
    try {
      if (req.params.id && !idSchema.safeParse(req.params.id).success) return fail(res, 'Identifiant invalide.', 400, 'INVALID_BODY');
      const service = options.service ? options.service(req) : new DiscoveryService(req.supabaseClient, req.user.id);
      return ok(res, await run(service, req));
    } catch (error) {
      if (error instanceof z.ZodError) return fail(res, 'Vérifiez les champs saisis.', 400, 'INVALID_BODY');
      if (error instanceof DiscoveryError) return fail(res, error.code, error.status, error.code);
      // No external source text, profile or signed URL is logged here.
      return fail(res, 'La découverte n’a pas pu être chargée. Votre saisie est conservée.', 503, 'DISCOVERY_UNAVAILABLE');
    }
  };
  router.get('/', handler(service => service.feed()));
  router.get('/creators', handler(async service => ({ creators: await service.creators() })));
  router.get('/links', handler(async service => ({ links: await service.starterLinks() })));
  router.post('/creators', limiter, handler((service, req) => service.createCreator(DiscoveryCreateCreatorSchema.parse(req.body))));
  router.patch('/creators/:id', limiter, handler((service, req) => service.pauseCreator(req.params.id, DiscoveryCreatorPatchSchema.parse(req.body))));
  router.post('/items', limiter, handler((service, req) => service.capture(DiscoveryCreateItemSchema.parse(req.body))));
  router.post('/items/:id/decision', limiter, handler((service, req) => service.decide(req.params.id, DiscoveryDecisionSchema.parse(req.body))));
  router.post('/items/:id/feedback', limiter, handler((service, req) => service.feedback(req.params.id, DiscoveryFeedbackSchema.parse(req.body))));
  router.post('/items/:id/prepare-import', limiter, handler((service, req) => {
    const input = prepareSchema.parse(req.body);
    return service.prepareImport(req.params.id, { commandId: input.commandId!, expectedVersion: input.expectedVersion! });
  }));
  return router;
}
