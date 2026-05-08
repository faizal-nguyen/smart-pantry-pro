/**
 * PRP-221 Sprint 1 frontend — typed client over /api/assistant/*.
 *
 * Wraps the 5 endpoints :
 *   POST /api/assistant/voice            multipart audio
 *   POST /api/assistant/text             { text, client_request_id }
 *   POST /api/assistant/actions/execute  { confirmation_token }
 *   POST /api/assistant/actions/:id/undo
 *   GET  /api/assistant/request-id       (helper)
 *
 * Reuses the project's existing `apiPost` for JSON endpoints; rolls
 * its own multipart helper for /voice (apiPost is JSON-only).
 */
import { supabase } from '@/integrations/supabase/client';

import { apiGet, apiPost, ApiError } from '@/lib/api';

// ---- Response shapes (mirror VoiceAgentService) ---------------------

export type RiskTier = 'read' | 'low' | 'medium' | 'high';

export interface ExecutedAction {
  action_id: string;
  step_seq: number;
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  reversible: boolean;
  undo_expires_at: string | null;
  risk_tier: RiskTier;
}

export interface PendingAction {
  action_id: string;
  step_seq: number;
  tool: string;
  args: Record<string, unknown>;
  risk_tier: RiskTier;
  reason: string;
}

export interface AssistantPlanResponse {
  session_id: string;
  transcript: string;
  detected_language?: string;
  message: string;
  actions_executed: ExecutedAction[];
  actions_pending: PendingAction[];
  confirmation_token: string | null;
  cost: {
    whisper_usd: number;
    llm_usd: number;
    total_usd: number;
  };
  model_used: string;
  duration_ms: number;
  replayed?: boolean;
}

export interface ExecuteConfirmationResponse {
  actions_executed: ExecutedAction[];
  actions_failed: Array<{ action_id: string; tool: string; error_code: string }>;
}

export interface UndoResponse {
  undone: boolean;
  result?: unknown;
}

// ---- API ------------------------------------------------------------

const ASSISTANT_BASE = '/assistant';

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function resolveApiBase(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  return (fromEnv && fromEnv.length > 0 ? fromEnv.replace(/\/$/, '') : '') + '/api';
}

/** Generate a v4 UUID. Stable on retries — caller decides when to mint a new one. */
export function newClientRequestId(): string {
  // crypto.randomUUID is universally available since 2022 — Vite's
  // browserslist doesn't target older browsers.
  return crypto.randomUUID();
}

/**
 * Sends an audio blob with multipart/form-data. apiPost is JSON-only,
 * so we hand-roll fetch here. Auth header is the same Supabase JWT.
 */
export async function postAssistantVoice(input: {
  audio: Blob;
  audioMime: string;
  clientRequestId: string;
  language?: string;
  audioDurationSeconds?: number;
  allowedTools?: readonly string[];
}): Promise<AssistantPlanResponse> {
  const ext = mimeToExt(input.audioMime);
  const form = new FormData();
  form.append('audio', input.audio, `recording.${ext}`);
  form.append('client_request_id', input.clientRequestId);
  if (input.language) form.append('language', input.language);
  if (typeof input.audioDurationSeconds === 'number') {
    form.append('audio_duration_seconds', String(Math.round(input.audioDurationSeconds)));
  }
  if (input.allowedTools?.length) form.append('allowed_tools', input.allowedTools.join(','));

  const res = await fetch(`${resolveApiBase()}${ASSISTANT_BASE}/voice`, {
    method: 'POST',
    headers: { ...(await authHeader()) },
    body: form,
  });
  return await unwrapAssistant<AssistantPlanResponse>(res);
}

export function postAssistantText(input: {
  text: string;
  clientRequestId: string;
  language?: string;
  allowedTools?: readonly string[];
}): Promise<AssistantPlanResponse> {
  return apiPost<AssistantPlanResponse>(`${ASSISTANT_BASE}/text`, {
    text: input.text,
    client_request_id: input.clientRequestId,
    language: input.language,
    allowed_tools: input.allowedTools,
  });
}

export function postAssistantConfirm(
  confirmationToken: string
): Promise<ExecuteConfirmationResponse> {
  return apiPost<ExecuteConfirmationResponse>(
    `${ASSISTANT_BASE}/actions/execute`,
    { confirmation_token: confirmationToken }
  );
}

export function postAssistantUndo(actionId: string): Promise<UndoResponse> {
  return apiPost<UndoResponse>(`${ASSISTANT_BASE}/actions/${actionId}/undo`);
}

export function getAssistantRequestId(): Promise<{ client_request_id: string }> {
  return apiGet<{ client_request_id: string }>(`${ASSISTANT_BASE}/request-id`);
}

// ---- internals ------------------------------------------------------

function mimeToExt(mime: string): string {
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  return 'webm';
}

async function unwrapAssistant<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    const err = body as { error?: { message?: string; code?: string } } | undefined;
    throw new ApiError(err?.error?.message ?? `HTTP ${res.status}`, {
      status: res.status,
      code: err?.error?.code,
      details: err?.error,
    });
  }
  if (body && typeof body === 'object' && 'success' in (body as object)) {
    const envelope = body as { success: boolean; data?: T; error?: { message?: string } };
    if (!envelope.success) {
      throw new ApiError(envelope.error?.message ?? 'Assistant failed', {
        status: res.status,
      });
    }
    return envelope.data as T;
  }
  return body as T;
}

export { ApiError };
