/**
 * PRP-221 Sprint 1 frontend — typed client over /api/assistant/*.
 *
 * Wraps the endpoints :
 *   POST /api/assistant/transcribe       multipart audio → text only (V10-03E)
 *   POST /api/assistant/text             { text, client_request_id }
 *   POST /api/assistant/actions/execute  { confirmation_token }
 *   POST /api/assistant/actions/:id/undo
 *   GET  /api/assistant/request-id       (helper)
 *
 * Reuses the project's existing `apiPost` for JSON endpoints; rolls
 * its own multipart helper for /transcribe (apiPost is JSON-only). The app
 * no longer calls the historical /voice route, which acts on the audio
 * before the user can read it.
 */
import { supabase } from '@/integrations/supabase/client';

import { apiGet, apiPost, apiPatch, ApiError } from '@/lib/api';
import { MemoryPolicySchema, MemoryCommandSchema, MemoryWriteResultSchema,
  type MemoryPolicy, type MemoryCommand, type MemoryWriteResult, type ReliableMemoryMetadata, type AssistantSessionMessage } from '@smart/shared';
import { AssistantModelCatalogSchema, AssistantTranscriptionSchema, type AssistantModelCatalog, type AssistantModelReceipt, type AssistantTranscription } from '@smart/shared';

// ---- Response shapes (mirror VoiceAgentService) ---------------------

export type RiskTier = 'read' | 'low' | 'medium' | 'high';

export interface ExecutedAction {
  action_id: string;
  step_seq: number;
  tool: string;
  args: Record<string, unknown>;
  /** Names of the targeted rows (inventory or shopping ids), display only. */
  labels?: Record<string, string>;
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
  /** Names of the targeted rows (inventory or shopping ids), display only. */
  labels?: Record<string, string>;
  risk_tier: RiskTier;
  reason: string;
}

export interface AssistantPlanResponse {
  session_id: string;
  /** Returned by the existing conversation-aware text and voice endpoints. */
  conversation_id?: string;
  memory_results?: MemoryWriteResult[];
  memory_revision?: number;
  /** Revision of the last revocation; absent from older APIs. */
  history_floor?: number;
  summary_status?: 'disabled' | 'not_needed' | 'already_attempted' | 'saved' | 'not_saved' | 'revision_changed';
  transcript: string;
  detected_language?: string;
  message: string;
  actions_executed: ExecutedAction[];
  actions_pending: PendingAction[];
  confirmation_token: string | null;
  cost: {
    whisper_usd: number;
    llm_usd: number | null;
    total_usd: number | null;
  };
  model_used: string | null;
  model_receipt?: AssistantModelReceipt;
  actions_unverified?: Array<{ action_id: string; tool: string }>;
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
export async function getAssistantModels(owner: string): Promise<AssistantModelCatalog> {
  const result = await apiGet<{catalog:unknown}>(ASSISTANT_BASE+'/models',undefined,{expectedUserId:owner});
  return AssistantModelCatalogSchema.parse(result.catalog);
}

async function authHeader(expectedUserId?: string): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  if (expectedUserId && data.session?.user.id !== expectedUserId) throw new ApiError('Le compte a changé. Recommencez depuis ce compte.', { status: 401, code: 'AUTH_CHANGED' });
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
 * V10-03E — dictation. Sends the recording, gets back text to show and
 * correct. Nothing is executed: the corrected text goes through
 * postAssistantText like a typed message.
 */
export async function postAssistantTranscription(input: {
  audio: Blob;
  audioMime: string;
  clientRequestId: string;
  languages?: readonly string[];
  audioDurationSeconds?: number;
  expectedUserId?: string;
  signal?: AbortSignal;
}): Promise<AssistantTranscription> {
  const form = new FormData();
  form.append('audio', input.audio, `recording.${mimeToExt(input.audioMime)}`);
  form.append('client_request_id', input.clientRequestId);
  if (input.languages?.length) form.append('languages', input.languages.join(','));
  if (typeof input.audioDurationSeconds === 'number') {
    form.append('audio_duration_seconds', String(Math.round(input.audioDurationSeconds)));
  }
  const res = await fetch(`${resolveApiBase()}${ASSISTANT_BASE}/transcribe`, {
    method: 'POST',
    headers: { ...(await authHeader(input.expectedUserId)) },
    body: form,
    signal: input.signal,
  });
  const transcription = AssistantTranscriptionSchema.parse(await unwrapAssistant<unknown>(res));
  if (transcription.client_request_id !== input.clientRequestId) throw new Error('La transcription ne correspond pas à cet enregistrement.');
  return transcription;
}

export interface RecognizedGrocery {
  name: string;
  quantity: number | null;
  unit: string | null;
  brand: string | null;
  expiry_date: string | null;
  confidence: 'high' | 'medium' | 'low';
}

/** Grocery photos (already resized) → the products seen. Nothing is written. */
export async function postGroceryPhotos(input: { photos: Blob[]; expectedUserId?: string; signal?: AbortSignal }): Promise<{ items: RecognizedGrocery[] }> {
  const form = new FormData();
  input.photos.forEach((photo, index) => form.append('photos', photo, `photo-${index + 1}.jpg`));
  const res = await fetch(`${resolveApiBase()}${ASSISTANT_BASE}/photos/recognize`, {
    method: 'POST',
    headers: { ...(await authHeader(input.expectedUserId)) },
    body: form,
    signal: input.signal,
  });
  return unwrapAssistant<{ items: RecognizedGrocery[] }>(res);
}

/** The products kept after review: one stock add, undoable like any assistant action. */
export function postKeptGroceries(input: {
  clientRequestId: string;
  items: Array<{ name: string; quantity: number; unit: string; brand?: string; expiry_date?: string }>;
  expectedUserId?: string;
}): Promise<{ action: ExecutedAction }> {
  return apiPost<{ action: ExecutedAction }>(`${ASSISTANT_BASE}/photos/add`, {
    client_request_id: input.clientRequestId, items: input.items,
  }, { expectedUserId: input.expectedUserId });
}

export function postAssistantText(input: {
  text: string;
  clientRequestId: string;
  language?: string;
  allowedTools?: readonly string[];
  /** PRP-233 PR3 — sticky conversation id. Optional. */
  conversationId?: string;
  expectedUserId?: string;
  sessionMessages?: AssistantSessionMessage[];
  sessionRevision?: number;
}): Promise<AssistantPlanResponse> {
  return apiPost<AssistantPlanResponse>(`${ASSISTANT_BASE}/text`, {
    text: input.text,
    client_request_id: input.clientRequestId,
    language: input.language,
    allowed_tools: input.allowedTools,
    conversation_id: input.conversationId,
    session_messages: input.sessionMessages, session_revision: input.sessionRevision,
  }, { expectedUserId: input.expectedUserId });
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

// ---- PRP-223 PR6 — Memory CRUD client ------------------------------------
//
// Mirrors the routes mounted by `apps/api/src/routes/assistant.memory.ts`.
// Local TS interfaces (not generated) — the front Supabase types are still
// auto-regenerated by `supabase gen types`, which would overwrite manual
// edits. PR6 keeps these flat shapes here so PR1's tables can be consumed
// safely until the next regen.

export type AssistantConversationMode =
  | 'general'
  | 'kitchen'
  | 'shopping'
  | 'inventory'
  | 'recipes'
  | 'nutrition'
  | 'cooking';

export type AssistantConversationStatus = 'active' | 'archived' | 'deleted';

export interface AssistantConversation {
  id: string;
  user_id: string;
  title: string | null;
  mode: AssistantConversationMode;
  status: AssistantConversationStatus;
  last_message_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type AssistantMessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type AssistantMessageFormat = 'text' | 'transcript' | 'tool_result' | 'summary';

export interface AssistantMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: AssistantMessageRole;
  content: string;
  content_format: AssistantMessageFormat;
  audio_transcript: string | null;
  tool_calls: unknown[];
  action_log_ids: string[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export type AssistantMemoryKind =
  | 'preference'
  | 'negative_preference'
  | 'habit'
  | 'cooking_style'
  | 'diet_goal'
  | 'constraint'
  | 'recipe_feedback'
  | 'shopping_pattern'
  | 'response_style';

export type AssistantMemoryStatus = 'candidate' | 'active' | 'rejected' | 'deleted';
export type AssistantMemorySensitivity = 'normal' | 'personal' | 'health_sensitive';

export interface AssistantMemoryItem extends Partial<ReliableMemoryMetadata> {
  id: string;
  user_id: string;
  kind: AssistantMemoryKind;
  scope: 'global' | 'recipe' | 'ingredient' | 'product' | 'conversation' | 'temporary';
  status: AssistantMemoryStatus;
  subject_type: string | null;
  subject_id: string | null;
  content: string;
  normalized_content: string | null;
  confidence: number;
  sensitivity: AssistantMemorySensitivity;
  source: 'user_explicit' | 'assistant_inferred' | 'recipe_feedback' | 'imported' | 'system';
  evidence?: Record<string, unknown>;
  approved_at: string | null;
  last_used_at: string | null;
  expires_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

interface ListConversationsOpts {
  cursor?: string;
  limit?: number;
  status?: AssistantConversationStatus;
}

interface ListMessagesOpts {
  cursor?: string;
  limit?: number;
}

interface ListMemoriesOpts {
  cursor?: string;
  limit?: number;
  status?: AssistantMemoryStatus;
  kind?: AssistantMemoryKind;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `?${qs}` : '';
}

export function getAssistantConversations(
  opts: ListConversationsOpts = {},
  options?: { expectedUserId?: string },
): Promise<CursorPage<AssistantConversation>> {
  const q = buildQuery({ cursor: opts.cursor, limit: opts.limit, status: opts.status });
  return apiGet<CursorPage<AssistantConversation>>(`${ASSISTANT_BASE}/conversations${q}`, undefined, options);
}

export function createAssistantConversation(
  opts: { mode?: AssistantConversationMode; title?: string } = {},
): Promise<{ conversation: AssistantConversation }> {
  return apiPost<{ conversation: AssistantConversation }>(
    `${ASSISTANT_BASE}/conversations`,
    opts,
  );
}

export function getAssistantConversation(
  id: string,
  options?: { expectedUserId?: string },
): Promise<{ conversation: AssistantConversation }> {
  return apiGet<{ conversation: AssistantConversation }>(`${ASSISTANT_BASE}/conversations/${id}`, undefined, options);
}

export function getAssistantMessages(
  conversationId: string,
  opts: ListMessagesOpts = {},
  options?: { expectedUserId?: string },
): Promise<CursorPage<AssistantMessage>> {
  const q = buildQuery({ cursor: opts.cursor, limit: opts.limit });
  return apiGet<CursorPage<AssistantMessage>>(
    `${ASSISTANT_BASE}/conversations/${conversationId}/messages${q}`, undefined, options,
  );
}

export function archiveAssistantConversation(
  id: string,
): Promise<{ conversation: AssistantConversation }> {
  return apiPost<{ conversation: AssistantConversation }>(
    `${ASSISTANT_BASE}/conversations/${id}/archive`,
  );
}

export interface CreateAssistantMemoryInput {
  kind: AssistantMemoryKind;
  content: string;
  normalized_content?: string;
  scope?: 'global' | 'recipe' | 'ingredient' | 'product' | 'conversation' | 'temporary';
  sensitivity?: AssistantMemorySensitivity;
  source?: 'user_explicit' | 'assistant_inferred' | 'recipe_feedback' | 'imported' | 'system';
  subject_type?: string | null;
  subject_id?: string | null;
  confidence?: number;
  evidence?: Record<string, unknown>;
}

export function createAssistantMemory(
  input: CreateAssistantMemoryInput,
  options?: { expectedUserId?: string },
): Promise<{ memory: AssistantMemoryItem }> {
  return apiPost<{ memory: AssistantMemoryItem }>(
    `${ASSISTANT_BASE}/memories`,
    input,
    options,
  );
}

export function getAssistantMemories(
  opts: ListMemoriesOpts = {},
  options?: { expectedUserId?: string },
): Promise<CursorPage<AssistantMemoryItem>> {
  const q = buildQuery({
    cursor: opts.cursor,
    limit: opts.limit,
    status: opts.status,
    kind: opts.kind,
  });
  return apiGet<CursorPage<AssistantMemoryItem>>(`${ASSISTANT_BASE}/memories${q}`,undefined,options);
}

export function patchAssistantMemory(
  id: string,
  patch: { content?: string; status?: AssistantMemoryStatus; sensitivity?: AssistantMemorySensitivity; normalized_content?: string },
  options?: { expectedUserId?: string },
): Promise<{ memory: AssistantMemoryItem }> {
  return apiPatch<{ memory: AssistantMemoryItem }>(
    `${ASSISTANT_BASE}/memories/${id}`,
    patch,
    options,
  );
}

export function forgetAssistantMemory(
  id: string,
  options?: { expectedUserId?: string },
): Promise<{ memory: AssistantMemoryItem }> {
  return apiPost<{ memory: AssistantMemoryItem }>(
    `${ASSISTANT_BASE}/memories/${id}/forget`,
    undefined,options,
  );
}

export function promoteAssistantMemory(
  id: string,
  options?: { expectedUserId?: string },
): Promise<{ memory: AssistantMemoryItem }> {
  return apiPost<{ memory: AssistantMemoryItem }>(
    `${ASSISTANT_BASE}/memories/${id}/promote`,
    undefined,options,
  );
}

// ---- PRP-224 PR1 — conversation update/delete + history search --------

export interface AssistantSearchMatch {
  source: 'message' | 'summary';
  conversation_id: string;
  message_id: string;
  role?: AssistantMessageRole;
  snippet: string;
  created_at: string;
}

export function patchAssistantConversation(
  id: string,
  patch: { title?: string | null; mode?: AssistantConversationMode },
): Promise<{ conversation: AssistantConversation }> {
  return jsonRequest<{ conversation: AssistantConversation }>(
    `${ASSISTANT_BASE}/conversations/${id}`,
    'PATCH',
    patch,
  );
}

export function softDeleteAssistantConversation(
  id: string,
): Promise<{ conversation: AssistantConversation }> {
  return jsonRequest<{ conversation: AssistantConversation }>(
    `${ASSISTANT_BASE}/conversations/${id}`,
    'DELETE',
  );
}

export function searchAssistantHistory(
  query: string,
  limit?: number,
  options?: { expectedUserId?: string },
): Promise<{ matches: AssistantSearchMatch[] }> {
  const params = new URLSearchParams({ q: query });
  if (limit) params.set('limit', String(limit));
  return apiGet<{ matches: AssistantSearchMatch[] }>(
    `${ASSISTANT_BASE}/search?${params.toString()}`, undefined, options,
  );
}

async function jsonRequest<T>(
  path: string,
  method: 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${resolveApiBase()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeader()),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return unwrapAssistant<T>(res);
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
    // The API sends `{ error: string, code }` (utils/responses.fail); older
    // handlers nest `{ error: { message, code } }`. Same reading as lib/api.
    const err = body as { error?: string | { message?: string; code?: string }; code?: string } | undefined;
    const value = err?.error;
    throw new ApiError(typeof value === 'string' ? value : value?.message ?? `HTTP ${res.status}`, {
      status: res.status,
      code: typeof value === 'string' ? err?.code : value?.code,
      details: value,
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

export async function getAssistantMemoryPolicy(owner: string): Promise<MemoryPolicy> {
  const result = await apiGet<{ policy: unknown }>(ASSISTANT_BASE + '/memory-policy', undefined, { expectedUserId: owner });
  const policy = MemoryPolicySchema.parse(result.policy);
  if (policy.userId !== owner) throw new Error('Le compte a changé.');
  return policy;
}
export async function executeAssistantMemoryCommand(command: MemoryCommand, owner: string): Promise<MemoryWriteResult> {
  const result = await apiPost<{ receipt: unknown }>(ASSISTANT_BASE + '/memory-commands', MemoryCommandSchema.parse(command), { expectedUserId: owner });
  const receipt = MemoryWriteResultSchema.parse(result.receipt);
  if (receipt.command_id !== command.command_id) throw new Error('Le reçu ne correspond pas à cette commande.');
  return receipt;
}
export async function getAssistantMemoryReceipt(commandId: string, owner: string): Promise<MemoryWriteResult | null> {
  const result = await apiGet<{ receipt: unknown }>(ASSISTANT_BASE + '/memory-commands/' + commandId, undefined, { expectedUserId: owner });
  const receipt = result.receipt ? MemoryWriteResultSchema.parse(result.receipt) : null;
  if (receipt && receipt.command_id !== commandId) throw new Error('Reçu incohérent.');
  return receipt;
}
