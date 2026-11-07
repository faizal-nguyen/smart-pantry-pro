/**
 * REST client for the social-recipe-imports API (PRP-220.10 / 220.11).
 *
 * Each function maps 1:1 to an endpoint exposed by
 * `apps/api/src/routes/imports.social.ts` and uses the shared
 * `apiPost / apiGet / apiPatch` helpers (PRP-220.02) so the user's
 * Supabase JWT is automatically attached.
 */
import { apiGet, apiPatch, apiPost } from '@/lib/api';

import type {
  CaptureResponse,
  BulkCaptureResponse,
  CountsResponse,
  CurrentDraftResponse,
  ListResponse,
  ListImportsQuery,
  PatchImportFields,
  ExtractRequest,
  ExtractResponse,
  SaveRequest,
  SaveResponse,
  SocialImport,
  ReviewDraftResponse,
} from './types';

const BASE = '/imports/social';

export const importsApi = {
  capture(url: string, source?: 'paste' | 'share_target' | 'bulk' | 'manual', expectedUserId?: string) {
    return apiPost<CaptureResponse>(`${BASE}`, source ? { url, source } : { url }, { expectedUserId });
  },

  bulkCapture(urls: string[]) {
    return apiPost<BulkCaptureResponse>(`${BASE}/bulk`, { urls });
  },

  list(query: ListImportsQuery = {}) {
    return apiGet<ListResponse>(`${BASE}`, {
      status: query.status,
      platform: query.platform,
      search: query.search,
      cursor: query.cursor,
      limit: query.limit,
    });
  },

  get(id: string, expectedUserId?: string) {
    return apiGet<SocialImport>(`${BASE}/${id}`,undefined,{ expectedUserId });
  },

  patch(id: string, fields: PatchImportFields) {
    return apiPatch<SocialImport>(`${BASE}/${id}`, fields);
  },

  extract(id: string, body: ExtractRequest = {}) {
    return apiPost<ExtractResponse>(`${BASE}/${id}/extract`, body);
  },

  save(id: string, body: SaveRequest = {}, expectedUserId?: string, signal?: AbortSignal) {
    return apiPost<SaveResponse>(`${BASE}/${id}/save`, body, { expectedUserId, signal });
  },

  review(id: string, body: SaveRequest = {}, expectedUserId?: string, signal?: AbortSignal) {
    return apiPost<ReviewDraftResponse>(`${BASE}/${id}/review`, body, { expectedUserId, signal });
  },

  getCurrentDraft(id: string, expectedUserId?: string, signal?: AbortSignal) {
    return apiGet<CurrentDraftResponse>(`${BASE}/${id}/current-draft`, undefined, { expectedUserId, signal });
  },

  // PRP-220.19: counts + quota in one round-trip.
  getCounts() {
    return apiGet<CountsResponse>(`${BASE}/counts`);
  },
};

// Re-export for the convenience of components that already import
// from './api'.
export type {
  CaptureResponse,
  BulkCaptureResponse,
  CountsResponse,
  CurrentDraftResponse,
  ListResponse,
  SocialImport,
  ExtractRequest,
  ExtractResponse,
  SaveRequest,
  SaveResponse,
  ListImportsQuery,
  PatchImportFields,
} from './types';
