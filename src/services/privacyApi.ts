/**
 * PRP-235 PR5 — Privacy API client.
 *
 * Wrap fin des 4 endpoints `/api/v1/settings/*` créés par
 * `apps/api/src/routes/settings.privacy.routes.ts`. Remplace les
 * appels directs aux RPC Supabase `delete_user_data` /
 * `export_user_data` côté front (hotfix PR #26 + ce PR ferment
 * définitivement l'exposition front aux RPC sensibles).
 *
 * Le shape `PrivacySettings` est le même côté front/back — on
 * réutilise volontairement la même interface pour éviter le
 * mismatch.
 */
import { apiGet, apiPatch, apiPost } from '@/lib/api';

export type PrivacyDataRetention = 'minimal' | 'standard' | 'full';

export interface PrivacySettings {
  hasConsent: boolean;
  consentDate?: string;
  allowAnalytics: boolean;
  saveHistory: boolean;
  allowImageProcessing: boolean;
  shareAnonymizedData: boolean;
  batterySaver: boolean;
  autoDeleteAfter?: number;
  dataRetention: PrivacyDataRetention;
}

export interface PrivacySettingsResponse {
  settings: PrivacySettings;
}

export interface DeleteRequestResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  /** true si une demande pending existait déjà — pas d'insert. */
  alreadyPending: boolean;
}

export interface ExportedUserData {
  user_id?: string | null;
  export_date?: string | null;
  inventory?: unknown[] | null;
  recipes?: unknown[] | null;
  shopping_list?: unknown[] | null;
  scan_history?: unknown[] | null;
  privacy_settings?: unknown | null;
}

export function getPrivacySettings(): Promise<PrivacySettingsResponse> {
  return apiGet<PrivacySettingsResponse>('/api/v1/settings/privacy');
}

export function patchPrivacySettings(
  patch: Partial<PrivacySettings>,
): Promise<PrivacySettingsResponse> {
  return apiPatch<PrivacySettingsResponse>('/api/v1/settings/privacy', patch);
}

export function postPrivacyExport(): Promise<ExportedUserData> {
  return apiPost<ExportedUserData>('/api/v1/settings/export');
}

export function postPrivacyDeleteRequest(): Promise<DeleteRequestResponse> {
  return apiPost<DeleteRequestResponse>('/api/v1/settings/delete-request');
}
