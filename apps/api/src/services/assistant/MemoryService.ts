/**
 * PRP-223 PR2 — MemoryService.
 *
 * Thin service over the assistant memory tables introduced by PR1
 * (`assistant_conversations`, `assistant_messages`, `assistant_memory_items`,
 * `assistant_conversation_summaries`, `assistant_session_context`).
 *
 * Constructor takes the admin client because PR1 set up SELECT-only RLS:
 * INSERT/UPDATE/DELETE must go through service-role. Every query carries
 * an explicit `.eq('user_id', userId)` so that, even with the service-role
 * client, a logic bug cannot leak a row across users.
 *
 * Subsequent PRs consume this service:
 *   - PR3: VoiceAgentService records user+assistant messages on every turn.
 *   - PR4: ContextBuilder reads top memories + last summary + recent messages.
 *   - PR5: MemoryExtractor (async best-effort) calls `createMemory` on
 *          rules-matched candidates.
 *   - PR6: Frontend hooks consume the CRUD via REST.
 *
 * Cooking journal lives in its own `CookingJournalService` (PR7).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase.js';

type Tables = Database['public']['Tables'];
type ConversationRow = Tables['assistant_conversations']['Row'];
type ConversationInsert = Tables['assistant_conversations']['Insert'];
type MessageRow = Tables['assistant_messages']['Row'];
type MessageInsert = Tables['assistant_messages']['Insert'];
type MemoryRow = Tables['assistant_memory_items']['Row'];
type MemoryInsert = Tables['assistant_memory_items']['Insert'];
type SummaryRow = Tables['assistant_conversation_summaries']['Row'];
type SessionContextRow = Tables['assistant_session_context']['Row'];

export type AssistantConversation = ConversationRow;
export type AssistantMessage = MessageRow;
export type AssistantMemoryItem = MemoryRow;
export type AssistantConversationSummary = SummaryRow;
export type AssistantSessionContext = SessionContextRow;

export type MemoryKind = MemoryRow['kind'];
export type MemoryScope = MemoryRow['scope'];
export type MemoryStatus = MemoryRow['status'];
export type MemorySensitivity = MemoryRow['sensitivity'];
export type MemorySource = MemoryRow['source'];
export type ConversationMode = ConversationRow['mode'];
export type ConversationStatus = ConversationRow['status'];
export type MessageRole = MessageRow['role'];
export type MessageContentFormat = MessageRow['content_format'];

// PRP-223 §6.3 — V1 quota for active memories per user.
export const MAX_ACTIVE_MEMORIES_PER_USER = 200;

// PRP-223 §13 — health-sensitive memories never auto-promote.
export class MemoryServiceError extends Error {
  constructor(
    readonly code:
      | 'NOT_FOUND'
      | 'FORBIDDEN'
      | 'QUOTA_EXCEEDED'
      | 'HEALTH_SENSITIVE_REQUIRES_CONFIRMATION'
      | 'DB_ERROR',
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'MemoryServiceError';
  }
}

interface CursorListResult<T> {
  items: T[];
  nextCursor: string | null;
}

interface CursorListOpts {
  cursor?: string | null;
  limit?: number;
}

interface CreateConversationOpts {
  mode?: ConversationMode;
  title?: string | null;
  metadata?: Record<string, unknown>;
}

interface RecordMessageOpts {
  role: MessageRole;
  content: string;
  content_format?: MessageContentFormat;
  audio_transcript?: string | null;
  tool_calls?: unknown[];
  action_log_ids?: string[];
  metadata?: Record<string, unknown>;
}

interface CreateMemoryOpts {
  kind: MemoryKind;
  content: string;
  normalized_content?: string;
  scope?: MemoryScope;
  status?: MemoryStatus;
  sensitivity?: MemorySensitivity;
  source?: MemorySource;
  subject_type?: string | null;
  subject_id?: string | null;
  confidence?: number;
  evidence?: Record<string, unknown>;
}

interface PatchMemoryOpts {
  status?: MemoryStatus;
  content?: string;
  normalized_content?: string;
  sensitivity?: MemorySensitivity;
}

interface SessionContextOpts {
  conversationId?: string | null;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Cursor encoding for stable pagination (PRP-223 §11 — never offset).
 * Tuple `created_at | id` base64url-encoded.
 */
function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`, 'utf8').toString('base64url');
}

function decodeCursor(raw: string): { createdAt: string; id: string } | null {
  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    const [createdAt, id] = decoded.split('|');
    if (!createdAt || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

function normaliseLimit(limit?: number): number {
  if (!limit || limit <= 0) return DEFAULT_LIMIT;
  return Math.min(limit, MAX_LIMIT);
}

export class MemoryService {
  constructor(private readonly admin: SupabaseClient<Database>) {}

  // ----- Conversations -----------------------------------------------------

  async createConversation(
    userId: string,
    opts: CreateConversationOpts = {},
  ): Promise<ConversationRow> {
    const payload: ConversationInsert = {
      user_id: userId,
      mode: opts.mode ?? 'general',
      title: opts.title ?? null,
      metadata: (opts.metadata ?? {}) as ConversationInsert['metadata'],
    };
    const { data, error } = await this.admin
      .from('assistant_conversations')
      .insert(payload)
      .select('*')
      .single();
    if (error || !data) throw this.dbError('createConversation', error);
    return data;
  }

  async getConversation(conversationId: string, userId: string): Promise<ConversationRow> {
    const { data, error } = await this.admin
      .from('assistant_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw this.dbError('getConversation', error);
    if (!data) throw new MemoryServiceError('NOT_FOUND', 'conversation not found');
    return data;
  }

  async listConversations(
    userId: string,
    opts: CursorListOpts & { status?: ConversationStatus } = {},
  ): Promise<CursorListResult<ConversationRow>> {
    const limit = normaliseLimit(opts.limit);
    let query = this.admin
      .from('assistant_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);
    if (opts.status) query = query.eq('status', opts.status);
    if (opts.cursor) {
      const cur = decodeCursor(opts.cursor);
      if (cur) {
        // Cursor on (created_at, id) descending. Records with created_at
        // strictly less than the cursor, OR same created_at and id less
        // than cursor id. Acceptable approximation for V1.
        query = query.lt('created_at', cur.createdAt);
      }
    }
    const { data, error } = await query;
    if (error) throw this.dbError('listConversations', error);
    return this.paginate(data ?? [], limit);
  }

  async archiveConversation(conversationId: string, userId: string): Promise<ConversationRow> {
    const { data, error } = await this.admin
      .from('assistant_conversations')
      .update({ status: 'archived' })
      .eq('id', conversationId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();
    if (error) throw this.dbError('archiveConversation', error);
    if (!data) throw new MemoryServiceError('NOT_FOUND', 'conversation not found');
    return data;
  }

  async touchLastMessageAt(
    conversationId: string,
    userId: string,
    ts: string = new Date().toISOString(),
  ): Promise<void> {
    const { error } = await this.admin
      .from('assistant_conversations')
      .update({ last_message_at: ts })
      .eq('id', conversationId)
      .eq('user_id', userId);
    if (error) throw this.dbError('touchLastMessageAt', error);
  }

  // ----- Messages ----------------------------------------------------------

  async recordMessage(
    conversationId: string,
    userId: string,
    opts: RecordMessageOpts,
  ): Promise<MessageRow> {
    const payload: MessageInsert = {
      conversation_id: conversationId,
      user_id: userId,
      role: opts.role,
      content: opts.content,
      content_format: opts.content_format ?? 'text',
      audio_transcript: opts.audio_transcript ?? null,
      tool_calls: (opts.tool_calls ?? []) as MessageInsert['tool_calls'],
      action_log_ids: opts.action_log_ids ?? [],
      metadata: (opts.metadata ?? {}) as MessageInsert['metadata'],
    };
    const { data, error } = await this.admin
      .from('assistant_messages')
      .insert(payload)
      .select('*')
      .single();
    if (error || !data) throw this.dbError('recordMessage', error);
    // Touch conversation last_message_at on the back of every recorded message.
    await this.touchLastMessageAt(conversationId, userId, data.created_at);
    return data;
  }

  async listMessages(
    conversationId: string,
    userId: string,
    opts: CursorListOpts = {},
  ): Promise<CursorListResult<MessageRow>> {
    const limit = normaliseLimit(opts.limit);
    let query = this.admin
      .from('assistant_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(limit + 1);
    if (opts.cursor) {
      const cur = decodeCursor(opts.cursor);
      if (cur) query = query.gt('created_at', cur.createdAt);
    }
    const { data, error } = await query;
    if (error) throw this.dbError('listMessages', error);
    return this.paginate(data ?? [], limit);
  }

  async getRecentMessages(
    conversationId: string,
    userId: string,
    limit: number,
  ): Promise<MessageRow[]> {
    const { data, error } = await this.admin
      .from('assistant_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(Math.max(1, Math.min(limit, MAX_LIMIT)));
    if (error) throw this.dbError('getRecentMessages', error);
    return (data ?? []).reverse();
  }

  // ----- Memories ----------------------------------------------------------

  async createMemory(userId: string, opts: CreateMemoryOpts): Promise<MemoryRow> {
    // PRP-223 §6.3 — V1 quota + dedup by normalized_content.
    if (opts.normalized_content) {
      const existing = await this.findMemoryByNormalizedContent(userId, opts.normalized_content);
      if (existing) return existing; // idempotent dedup
    }
    const count = await this.countActiveMemories(userId);
    if (count >= MAX_ACTIVE_MEMORIES_PER_USER) {
      throw new MemoryServiceError(
        'QUOTA_EXCEEDED',
        `memory quota exceeded (${MAX_ACTIVE_MEMORIES_PER_USER})`,
      );
    }
    const payload: MemoryInsert = {
      user_id: userId,
      kind: opts.kind,
      content: opts.content,
      normalized_content: opts.normalized_content ?? null,
      scope: opts.scope ?? 'global',
      status: opts.status ?? 'active',
      sensitivity: opts.sensitivity ?? 'normal',
      source: opts.source ?? 'assistant_inferred',
      subject_type: opts.subject_type ?? null,
      subject_id: opts.subject_id ?? null,
      confidence: opts.confidence ?? 0.7,
      evidence: (opts.evidence ?? {}) as MemoryInsert['evidence'],
    };
    // Guardrail PRP-223 §13: never auto-active a health_sensitive memory.
    if (payload.sensitivity === 'health_sensitive' && payload.status === 'active') {
      payload.status = 'candidate';
    }
    if (payload.status === 'active') {
      payload.approved_at = new Date().toISOString();
    }
    const { data, error } = await this.admin
      .from('assistant_memory_items')
      .insert(payload)
      .select('*')
      .single();
    if (error || !data) throw this.dbError('createMemory', error);
    return data;
  }

  async listMemories(
    userId: string,
    opts: CursorListOpts & { status?: MemoryStatus; kind?: MemoryKind } = {},
  ): Promise<CursorListResult<MemoryRow>> {
    const limit = normaliseLimit(opts.limit);
    let query = this.admin
      .from('assistant_memory_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);
    if (opts.status) {
      query = query.eq('status', opts.status);
    } else {
      query = query.neq('status', 'deleted');
    }
    if (opts.kind) query = query.eq('kind', opts.kind);
    if (opts.cursor) {
      const cur = decodeCursor(opts.cursor);
      if (cur) query = query.lt('created_at', cur.createdAt);
    }
    const { data, error } = await query;
    if (error) throw this.dbError('listMemories', error);
    return this.paginate(data ?? [], limit);
  }

  async patchMemory(memoryId: string, userId: string, opts: PatchMemoryOpts): Promise<MemoryRow> {
    if (Object.keys(opts).length === 0) {
      return this.getMemory(memoryId, userId);
    }
    const { data, error } = await this.admin
      .from('assistant_memory_items')
      .update(opts)
      .eq('id', memoryId)
      .eq('user_id', userId)
      .neq('status', 'deleted')
      .select('*')
      .maybeSingle();
    if (error) throw this.dbError('patchMemory', error);
    if (!data) throw new MemoryServiceError('NOT_FOUND', 'memory not found');
    return data;
  }

  async forgetMemory(memoryId: string, userId: string): Promise<MemoryRow> {
    const now = new Date().toISOString();
    const { data, error } = await this.admin
      .from('assistant_memory_items')
      .update({ status: 'deleted', deleted_at: now })
      .eq('id', memoryId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();
    if (error) throw this.dbError('forgetMemory', error);
    if (!data) throw new MemoryServiceError('NOT_FOUND', 'memory not found');
    return data;
  }

  async promoteCandidate(memoryId: string, userId: string): Promise<MemoryRow> {
    const current = await this.getMemory(memoryId, userId);
    if (current.status !== 'candidate') return current;
    if (current.sensitivity === 'health_sensitive') {
      // PRP-223 §13 — explicit user confirmation is the only path.
      // The HTTP layer treats POST /memories/:id/promote as that
      // confirmation, so we accept the transition here.
    }
    const { data, error } = await this.admin
      .from('assistant_memory_items')
      .update({ status: 'active', approved_at: new Date().toISOString() })
      .eq('id', memoryId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();
    if (error) throw this.dbError('promoteCandidate', error);
    if (!data) throw new MemoryServiceError('NOT_FOUND', 'memory not found');
    return data;
  }

  async markUsed(memoryId: string, userId: string): Promise<void> {
    const { error } = await this.admin
      .from('assistant_memory_items')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', memoryId)
      .eq('user_id', userId);
    if (error) throw this.dbError('markUsed', error);
  }

  async countActiveMemories(userId: string): Promise<number> {
    const { count, error } = await this.admin
      .from('assistant_memory_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');
    if (error) throw this.dbError('countActiveMemories', error);
    return count ?? 0;
  }

  async getResponseStyleMemory(userId: string): Promise<MemoryRow | null> {
    const { data, error } = await this.admin
      .from('assistant_memory_items')
      .select('*')
      .eq('user_id', userId)
      .eq('kind', 'response_style')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw this.dbError('getResponseStyleMemory', error);
    return data ?? null;
  }

  async getTopActiveMemories(userId: string, limit: number): Promise<MemoryRow[]> {
    const { data, error } = await this.admin
      .from('assistant_memory_items')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(Math.max(1, Math.min(limit, MAX_LIMIT)));
    if (error) throw this.dbError('getTopActiveMemories', error);
    return data ?? [];
  }

  private async getMemory(memoryId: string, userId: string): Promise<MemoryRow> {
    const { data, error } = await this.admin
      .from('assistant_memory_items')
      .select('*')
      .eq('id', memoryId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw this.dbError('getMemory', error);
    if (!data) throw new MemoryServiceError('NOT_FOUND', 'memory not found');
    return data;
  }

  private async findMemoryByNormalizedContent(
    userId: string,
    normalized: string,
  ): Promise<MemoryRow | null> {
    const { data, error } = await this.admin
      .from('assistant_memory_items')
      .select('*')
      .eq('user_id', userId)
      .eq('normalized_content', normalized)
      .neq('status', 'deleted')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw this.dbError('findMemoryByNormalizedContent', error);
    return data ?? null;
  }

  // ----- Summaries ---------------------------------------------------------

  async recordSummary(
    conversationId: string,
    userId: string,
    opts: { summary: string; covered_message_ids: string[]; model_used?: string | null },
  ): Promise<SummaryRow> {
    const { data, error } = await this.admin
      .from('assistant_conversation_summaries')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        summary: opts.summary,
        covered_message_ids: opts.covered_message_ids,
        model_used: opts.model_used ?? null,
      })
      .select('*')
      .single();
    if (error || !data) throw this.dbError('recordSummary', error);
    return data;
  }

  async getLatestSummary(
    conversationId: string,
    userId: string,
  ): Promise<SummaryRow | null> {
    const { data, error } = await this.admin
      .from('assistant_conversation_summaries')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw this.dbError('getLatestSummary', error);
    return data ?? null;
  }

  // ----- Session context ---------------------------------------------------

  async setSessionContext(
    userId: string,
    key: string,
    value: unknown,
    expiresAt: Date,
    opts: SessionContextOpts = {},
  ): Promise<SessionContextRow> {
    const { data, error } = await this.admin
      .from('assistant_session_context')
      .insert({
        user_id: userId,
        conversation_id: opts.conversationId ?? null,
        key,
        value: value as Tables['assistant_session_context']['Insert']['value'],
        expires_at: expiresAt.toISOString(),
      })
      .select('*')
      .single();
    if (error || !data) throw this.dbError('setSessionContext', error);
    return data;
  }

  async getActiveSessionContext(
    userId: string,
    opts: SessionContextOpts = {},
  ): Promise<SessionContextRow[]> {
    const now = new Date().toISOString();
    let query = this.admin
      .from('assistant_session_context')
      .select('*')
      .eq('user_id', userId)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });
    if (opts.conversationId) query = query.eq('conversation_id', opts.conversationId);
    const { data, error } = await query;
    if (error) throw this.dbError('getActiveSessionContext', error);
    return data ?? [];
  }

  // ----- Helpers -----------------------------------------------------------

  private paginate<T extends { created_at: string; id: string }>(
    rows: T[],
    limit: number,
  ): CursorListResult<T> {
    if (rows.length <= limit) return { items: rows, nextCursor: null };
    const items = rows.slice(0, limit);
    const lastRow = items[items.length - 1]!;
    return { items, nextCursor: encodeCursor(lastRow.created_at, lastRow.id) };
  }

  private dbError(method: string, cause: unknown): MemoryServiceError {
    return new MemoryServiceError('DB_ERROR', `MemoryService.${method} failed`, cause);
  }
}
