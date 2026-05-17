/**
 * PRP-235 PR5 — Settings privacy routes.
 *
 * Expose 4 endpoints user-scoped pour gérer la confidentialité et
 * le RGPD :
 *
 *   GET   /api/v1/settings/privacy        → lit user_privacy_settings
 *   PATCH /api/v1/settings/privacy        → upsert settings (partiel)
 *   POST  /api/v1/settings/export         → JSON GDPR via RPC durci
 *   POST  /api/v1/settings/delete-request → INSERT data_deletion_requests
 *
 * Sécurité :
 *   - `createAuthMiddleware` pose req.user.id + req.supabaseClient (RLS).
 *   - `userRateLimit` : conservatif pour les 2 ops sensibles (export
 *     10/h free / 60/h premium ; delete-request 3/h free / 10/h premium).
 *   - Les RPC `export_user_data` / `delete_user_data` ont été durcis
 *     en migration `20260517071100` (guard `auth.uid() = p_user_id`).
 *
 * Décision : pas de wrapper destructeur direct. Le bouton
 * « Supprimer » côté UI crée un row `data_deletion_requests` (status
 * `pending`) et un worker backend (futur) finalisera. Aujourd'hui :
 * cette row sert de trace + de signal qu'on devra processer
 * manuellement OU via le `delete_user_data` RPC déclenché depuis un
 * job admin.
 */
import { Router } from 'express';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

import { ok, fail } from '../utils/responses.js';
import { userRateLimit } from '../middleware/userRateLimit.js';
import type { Database } from '../types/supabase.js';

// `Database` ne contient pas les tables `user_privacy_settings` ni
// `data_deletion_requests` (générées via PRP-220 inventory/recipes
// seulement). On utilise un client `unknown` pour ces 2 tables —
// la sécurité est portée par RLS + middleware auth + Zod, pas par
// les types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseClient = SupabaseClient<any, any, any>;

const HOUR = 3_600_000;

// PRP-235 §5.2 — shape canonique côté API. Tolérant aux valeurs
// partielles côté PATCH (z.object().partial() en bas).
const PrivacySettingsSchema = z.object({
  hasConsent: z.boolean(),
  consentDate: z.string().datetime().optional(),
  allowAnalytics: z.boolean(),
  saveHistory: z.boolean(),
  allowImageProcessing: z.boolean(),
  shareAnonymizedData: z.boolean(),
  batterySaver: z.boolean(),
  autoDeleteAfter: z.number().int().min(0).max(365).optional(),
  dataRetention: z.enum(['minimal', 'standard', 'full']).default('standard'),
});

type PrivacySettings = z.infer<typeof PrivacySettingsSchema>;

const PrivacySettingsPatchSchema = PrivacySettingsSchema.partial();

const DEFAULT_SETTINGS: PrivacySettings = {
  hasConsent: false,
  allowAnalytics: false,
  saveHistory: true,
  allowImageProcessing: true,
  shareAnonymizedData: false,
  batterySaver: false,
  dataRetention: 'standard',
};

export function createSettingsPrivacyRouter(
  _adminClient: SupabaseClient<Database>,
): Router {
  const router = Router();

  const readLimiter = userRateLimit({
    key: 'settings.privacy.read',
    freeMax: 60,
    premiumMax: 600,
    windowMs: HOUR,
  });
  const patchLimiter = userRateLimit({
    key: 'settings.privacy.patch',
    freeMax: 30,
    premiumMax: 300,
    windowMs: HOUR,
  });
  const exportLimiter = userRateLimit({
    key: 'settings.privacy.export',
    freeMax: 10,
    premiumMax: 60,
    windowMs: HOUR,
  });
  const deleteLimiter = userRateLimit({
    key: 'settings.privacy.delete-request',
    freeMax: 3,
    premiumMax: 10,
    windowMs: HOUR,
  });

  // ---- GET /privacy ------------------------------------------------
  router.get('/privacy', readLimiter, async (req, res) => {
    if (!req.user?.id || !req.supabaseClient) {
      return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }
    try {
      // `user_privacy_settings` n'est pas dans le `Database` typé
      // généré (PRP-220 inventory/recipes/shopping/...). On cast en
      // `any` localement — RLS + Zod côté input couvrent la sûreté.
      const userClient = req.supabaseClient as unknown as LooseClient;
      const { data, error } = await userClient
        .from('user_privacy_settings')
        .select('settings, consent_date')
        .eq('user_id', req.user.id)
        .maybeSingle();
      if (error) throw error;

      // Pas de row encore → renvoyer DEFAULT_SETTINGS. PATCH créera
      // la row via upsert lors du premier toggle.
      const row = data as { settings: unknown; consent_date: string | null } | null;
      const settings: PrivacySettings = {
        ...DEFAULT_SETTINGS,
        ...((row?.settings as Partial<PrivacySettings>) ?? {}),
      };
      if (row?.consent_date) settings.consentDate = row.consent_date;

      return ok(res, { settings }, 'OK', 'PRIVACY_SETTINGS_OK');
    } catch (err) {
      console.error('[settings.privacy.GET] error:', err);
      return fail(res, 'Internal error', 500, 'PRIVACY_READ_FAILED');
    }
  });

  // ---- PATCH /privacy ----------------------------------------------
  router.patch('/privacy', patchLimiter, async (req, res) => {
    if (!req.user?.id || !req.supabaseClient) {
      return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }
    const parsed = PrivacySettingsPatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return fail(res, 'Invalid body', 400, 'INVALID_BODY');
    }

    try {
      // Cast `any` : voir commentaire GET /privacy plus haut.
      const userClient = req.supabaseClient as unknown as LooseClient;

      // Charge l'existant pour merge partiel (sinon le PATCH écrase
      // tout via les defaults).
      const { data: current, error: readErr } = await userClient
        .from('user_privacy_settings')
        .select('settings')
        .eq('user_id', req.user.id)
        .maybeSingle();
      if (readErr) throw readErr;

      const currentRow = current as { settings: Partial<PrivacySettings> | null } | null;
      const merged: PrivacySettings = {
        ...DEFAULT_SETTINGS,
        ...(currentRow?.settings ?? {}),
        ...parsed.data,
      };

      // Si hasConsent passe à true et c'est la première fois, stamper consent_date.
      const shouldStampConsent =
        parsed.data.hasConsent === true && !currentRow?.settings;

      const { error: upsertErr } = await userClient
        .from('user_privacy_settings')
        .upsert(
          {
            user_id: req.user.id,
            settings: merged,
            ...(shouldStampConsent ? { consent_date: new Date().toISOString() } : {}),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );
      if (upsertErr) throw upsertErr;

      return ok(res, { settings: merged }, 'OK', 'PRIVACY_PATCH_OK');
    } catch (err) {
      console.error('[settings.privacy.PATCH] error:', err);
      return fail(res, 'Internal error', 500, 'PRIVACY_PATCH_FAILED');
    }
  });

  // ---- POST /export ------------------------------------------------
  router.post('/export', exportLimiter, async (req, res) => {
    if (!req.user?.id || !req.supabaseClient) {
      return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }
    try {
      const userClient = req.supabaseClient as unknown as LooseClient;
      // RPC durci en hotfix 20260517071100 — guard auth.uid() interne.
      const { data, error } = await userClient.rpc('export_user_data', {
        p_user_id: req.user.id,
      });
      if (error) throw error;
      return ok(res, data ?? null, 'OK', 'PRIVACY_EXPORT_OK');
    } catch (err) {
      console.error('[settings.privacy.export] error:', err);
      return fail(res, 'Internal error', 500, 'PRIVACY_EXPORT_FAILED');
    }
  });

  // ---- POST /delete-request ----------------------------------------
  router.post('/delete-request', deleteLimiter, async (req, res) => {
    if (!req.user?.id || !req.supabaseClient) {
      return fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    }
    try {
      const userClient = req.supabaseClient as unknown as LooseClient;

      // Vérifie qu'il n'y a pas déjà une demande pending active —
      // évite de spammer la table.
      const { data: existing, error: readErr } = await userClient
        .from('data_deletion_requests')
        .select('id, status, requested_at')
        .eq('user_id', req.user.id)
        .in('status', ['pending', 'processing'])
        .maybeSingle();
      if (readErr) throw readErr;

      if (existing) {
        const row = existing as { id: string; status: string; requested_at: string };
        return ok(
          res,
          { id: row.id, status: row.status, requestedAt: row.requested_at, alreadyPending: true },
          'OK',
          'PRIVACY_DELETE_PENDING',
        );
      }

      const { data: inserted, error: insertErr } = await userClient
        .from('data_deletion_requests')
        .insert({ user_id: req.user.id, status: 'pending' })
        .select('id, status, requested_at')
        .single();
      if (insertErr) throw insertErr;
      const row = inserted as { id: string; status: string; requested_at: string };
      return ok(
        res,
        { id: row.id, status: row.status, requestedAt: row.requested_at, alreadyPending: false },
        'Demande enregistrée',
        'PRIVACY_DELETE_REQUESTED',
      );
    } catch (err) {
      console.error('[settings.privacy.delete-request] error:', err);
      return fail(res, 'Internal error', 500, 'PRIVACY_DELETE_FAILED');
    }
  });

  return router;
}
