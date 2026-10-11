/**
 * PRP-223 PR2 — MemoryService.
 *
 * Thin service over the assistant memory tables introduced by PR1
 * (`assistant_conversations`, `assistant_messages`, `assistant_memory_items`,
 * `assistant_conversation_summaries`, `assistant_session_context`).
 *
 * V10-03C writes use owner-bound, versioned commands and awaited artifact RPCs.
 * Reads carry an explicit owner and reject expired data. The common policy RPC
 * also purges expired new data and invalidates its derived contexts.
 *
 * Cooking journal lives in its own `CookingJournalService` (PR7).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase.js';
import { MemoryCommandSchema, MemoryPolicySchema, MemoryWriteResultSchema, type MemoryCommand, type MemoryWriteResult, type MemoryPolicy, type ReliableMemoryMetadata, classifyMemoryFact, normalizeMemoryText, NutritionProfileSettingsSchema } from '@smart/shared';
import { memoryRpc } from './memoryRpc.js';
import { allowedMemory, allowedMessage, allowedSummary, allowedSession, privateProfileTerms } from './MemoryPolicy.js';

type Tables = Database['public']['Tables'];
type ConversationRow = Tables['assistant_conversations']['Row'] & { policy_revision?: number | null; expires_at?: string | null };
type MessageRow = Tables['assistant_messages']['Row'] & { policy_revision?: number | null; expires_at?: string | null };
type MemoryRow = Tables['assistant_memory_items']['Row'] & Partial<ReliableMemoryMetadata>;
type SummaryRow = Tables['assistant_conversation_summaries']['Row'] & { policy_revision?: number | null; coverage_hash?: string | null };
type SessionContextRow = Tables['assistant_session_context']['Row'] & { policy_revision?: number | null };

export type AssistantConversation = ConversationRow;
export type AssistantMessage = MessageRow;
export type AssistantMemoryItem = MemoryRow;
export type AssistantConversationSummary = SummaryRow;
export type AssistantSessionContext = SessionContextRow;

// PRP-224 PR1 — search result shape.
export interface SearchMatch {
  source: 'message' | 'summary';
  conversation_id: string;
  /** Message id when `source='message'`, summary id otherwise. */
  message_id: string;
  role?: MessageRow['role'];
  snippet: string;
  created_at: string;
}

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
      | 'DB_ERROR' | 'COMMAND_REQUIRED' | 'VERSION_CONFLICT' | 'IDEMPOTENCY_CONFLICT' | 'DISABLED',
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
  policy?: MemoryPolicy;
  id?: string;
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
    if (!createdAt || !id || !Number.isFinite(Date.parse(createdAt)) || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) return null;
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

  async createConversation(userId: string, opts: CreateConversationOpts = {}): Promise<ConversationRow> {
    const policy = await this.readPolicy(userId);
    const data = await this.persistArtifact(userId, policy, 'conversation', { ...opts, title: opts.title ?? 'Échange en cuisine' });
    if (!data) throw new MemoryServiceError('DISABLED', 'Activez l’historique pour conserver une conversation.');
    return data as ConversationRow;
  }

  async getConversation(conversationId: string, userId: string): Promise<ConversationRow> {
    const { data, error } = await this.admin
      .from('assistant_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
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
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);
    if (opts.status) query = query.eq('status', opts.status);
    else query = query.neq('status', 'deleted');
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

  /**
   * PRP-224 PR1 — patch title and/or mode on a conversation. At least
   * one field must be provided; the schema layer enforces that.
   */
  async updateConversation(
    conversationId: string,
    userId: string,
    patch: { title?: string | null; mode?: ConversationMode },
  ): Promise<ConversationRow> {
    if (
      patch.title === undefined &&
      patch.mode === undefined
    ) {
      return this.getConversation(conversationId, userId);
    }
    const payload: Partial<ConversationRow> = {};
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.mode !== undefined) payload.mode = patch.mode;
    const { data, error } = await this.admin
      .from('assistant_conversations')
      .update(payload)
      .eq('id', conversationId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();
    if (error) throw this.dbError('updateConversation', error);
    if (!data) throw new MemoryServiceError('NOT_FOUND', 'conversation not found');
    return data;
  }

  /**
   * PRP-224 PR1 — soft-delete by setting `status='deleted'`. The row is
   * not removed; downstream lists filter `status != 'deleted'` per the
   * default `listConversations` behaviour (unless status is explicitly
   * passed in opts).
   */
  async softDeleteConversation(conversationId: string, userId: string): Promise<ConversationRow> {
    const { data, error } = await this.admin
      .from('assistant_conversations')
      .update({ status: 'deleted' })
      .eq('id', conversationId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();
    if (error) throw this.dbError('softDeleteConversation', error);
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

  async recordMessage(conversationId: string, userId: string, opts: RecordMessageOpts): Promise<MessageRow> {
    const policy = opts.policy ?? await this.readPolicy(userId);
    const { policy: _policy, ...payload } = opts;
    const data = await this.persistArtifact(userId, policy, 'message', { ...payload, conversation_id: conversationId });
    if (!data) throw new MemoryServiceError('DISABLED', 'Historique non enregistré : autorisation modifiée.');
    await this.touchLastMessageAt(conversationId, userId, (data as MessageRow).created_at);
    return data as MessageRow;
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
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
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
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(Math.max(1, Math.min(limit, MAX_LIMIT)));
    if (error) throw this.dbError('getRecentMessages', error);
    return (data ?? []).reverse();
  }

  // ----- Memories ----------------------------------------------------------

  /** Legacy writers fail explicitly instead of bypassing the command contract. */
  async createMemory(_userId: string, _opts: CreateMemoryOpts): Promise<MemoryRow> {
    throw new MemoryServiceError('COMMAND_REQUIRED', 'Utilisez une commande mémoire versionnée.');
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
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);
    if (opts.status) {
      query = query.eq('status', opts.status);
    } else {
      query = query.not('status', 'in', '(deleted,rejected)');
    }
    if (opts.kind) query = query.eq('kind', opts.kind);
    if (opts.cursor) {
      const cur = decodeCursor(opts.cursor);
      if (cur) query = query.or(`created_at.lt.${new Date(cur.createdAt).toISOString()},and(created_at.eq.${new Date(cur.createdAt).toISOString()},id.lt.${cur.id})`);
    }
    const { data, error } = await query;
    if (error) throw this.dbError('listMemories', error);
    return this.paginate(data ?? [], limit);
  }

  async patchMemory(_memoryId: string, _userId: string, _opts: PatchMemoryOpts): Promise<MemoryRow> {
    throw new MemoryServiceError('COMMAND_REQUIRED', 'Utilisez une commande de correction versionnée.');
  }

  async forgetMemory(_memoryId: string, _userId: string): Promise<MemoryRow> {
    throw new MemoryServiceError('COMMAND_REQUIRED', 'Utilisez une commande d’oubli versionnée.');
  }

  async promoteCandidate(_memoryId: string, _userId: string): Promise<MemoryRow> {
    throw new MemoryServiceError('COMMAND_REQUIRED', 'Utilisez une commande de confirmation versionnée.');
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
    const policy = await this.readPolicySafe(userId);
    return policy ? (await this.modelMemories(userId, policy, 200)).find(m => m.kind === 'response_style') ?? null : null;
  }
  async getTopActiveMemories(userId: string, limit: number): Promise<MemoryRow[]> {
    const policy = await this.readPolicySafe(userId);
    return policy ? this.modelMemories(userId, policy, limit) : [];
  }

  async getMemory(memoryId: string, userId: string): Promise<MemoryRow> {
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

  // ----- Search (PRP-224 PR1) ----------------------------------------------

  async searchMessages(
    userId: string,
    query: string,
    limit = 20,
  ): Promise<SearchMatch[]> {
    const safeLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
    const trimmed = query.trim();
    if (!trimmed) return [];
    // V1: ilike substring. Escape the % and _ wildcards from user input
    // so a literal `%` does not get treated as a wildcard.
    const escaped = trimmed.replace(/([\\%_])/g, '\\$1');
    const pattern = `%${escaped}%`;

    const [messagesResult, summariesResult] = await Promise.all([
      this.admin
        .from('assistant_messages')
        .select('id, conversation_id, content, role, created_at')
        .eq('user_id', userId)
        .ilike('content', pattern)
        .order('created_at', { ascending: false })
        .limit(safeLimit),
      this.admin
        .from('assistant_conversation_summaries')
        .select('id, conversation_id, summary, created_at')
        .eq('user_id', userId)
        .ilike('summary', pattern)
        .order('created_at', { ascending: false })
        .limit(safeLimit),
    ]);

    if (messagesResult.error) throw this.dbError('searchMessages.messages', messagesResult.error);
    if (summariesResult.error) throw this.dbError('searchMessages.summaries', summariesResult.error);

    const matches: SearchMatch[] = [];
    for (const row of messagesResult.data ?? []) {
      matches.push({
        source: 'message',
        conversation_id: row.conversation_id,
        message_id: row.id,
        role: row.role,
        snippet: snippetFor(row.content, trimmed),
        created_at: row.created_at,
      });
    }
    for (const row of summariesResult.data ?? []) {
      matches.push({
        source: 'summary',
        conversation_id: row.conversation_id,
        message_id: row.id, // reuse field for summary id (UI knows via source)
        snippet: snippetFor(row.summary, trimmed),
        created_at: row.created_at,
      });
    }
    matches.sort((a, b) => (b.created_at < a.created_at ? -1 : 1));
    return matches.slice(0, safeLimit);
  }

  // ----- Summaries ---------------------------------------------------------

  async recordSummary(conversationId: string, userId: string,
    opts: { summary: string; covered_message_ids: string[]; model_used?: string | null; policy?: MemoryPolicy }): Promise<SummaryRow> {
    const policy = opts.policy ?? await this.readPolicy(userId);
    const data = await this.persistArtifact(userId, policy, 'summary', { ...opts, policy: undefined, conversation_id: conversationId });
    if (!data) throw new MemoryServiceError('DISABLED', 'Résumé non conservé : révision modifiée.');
    return data as SummaryRow;
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

  async setSessionContext(userId: string, key: string, value: unknown, expiresAt: Date,
    opts: SessionContextOpts & { policy?: MemoryPolicy } = {}): Promise<SessionContextRow> {
    const policy = opts.policy ?? await this.readPolicy(userId);
    const data = await this.persistArtifact(userId, policy, 'session', {
      conversation_id: opts.conversationId, key, value, expires_at: expiresAt.toISOString(),
    });
    if (!data) throw new MemoryServiceError('DISABLED', 'Contexte temporaire non conservé.');
    return data as SessionContextRow;
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

  async readPolicy(userId: string): Promise<MemoryPolicy> {
    const { data, error } = await memoryRpc(this.admin, 'read_assistant_memory_policy', { p_user_id: userId });
    if (error) throw this.dbError('readPolicy', error);
    const parsed = MemoryPolicySchema.safeParse(data);
    if (!parsed.success || parsed.data.userId !== userId) throw this.dbError('readPolicy', null);
    return parsed.data;
  }
  async readPolicySafe(userId: string): Promise<MemoryPolicy | null> {
    try { return await this.readPolicy(userId); } catch { return null; }
  }
  async getCommandReceipt(userId: string, commandId: string): Promise<MemoryWriteResult | null> {
    const client = this.admin as unknown as SupabaseClient;
    const { data, error } = await client.from('assistant_memory_commands').select('result')
      .eq('user_id', userId).eq('command_id', commandId).maybeSingle();
    if (error) throw this.dbError('getCommandReceipt', error);
    return data ? MemoryWriteResultSchema.parse(data.result) : null;
  }
  async executeCommand(userId: string, input: MemoryCommand, userClient: SupabaseClient<Database>): Promise<MemoryWriteResult> {
    const command = MemoryCommandSchema.parse(input);
    const { data, error } = await memoryRpc(userClient, 'execute_assistant_memory_command', { p_command: command });
    if (error) {
      if (['PGRST202', '42883'].includes(error.code ?? '')) return {
        command_id: command.command_id, operation: command.operation, status: 'not_saved', memory_id: command.memory_id ?? null,
        version: null, destination: null, policy_revision: command.expected_revision, profile_version: null, reason: 'migration_required',
      };
      if (error.code === '42501') throw new MemoryServiceError('FORBIDDEN', 'Modification non autorisée.');
      if (/MEMORY_(VERSION|REVISION|SEMANTIC)_CONFLICT|PROFILE_VERSION_CONFLICT/.test(error.message))
        throw new MemoryServiceError('VERSION_CONFLICT', 'Une autre modification a été enregistrée. Rechargez la version actuelle.');
      if (error.message.includes('IDEMPOTENCY_CONFLICT')) throw new MemoryServiceError('IDEMPOTENCY_CONFLICT', 'Cette commande correspond à une autre modification.');
      if (error.message.includes('MEMORY_NOT_FOUND')) throw new MemoryServiceError('NOT_FOUND', 'Souvenir introuvable.');
      if (error.message.includes('MEMORY_QUOTA')) throw new MemoryServiceError('QUOTA_EXCEEDED', 'La limite de souvenirs est atteinte.');
      if (/INVALID_MEMORY_COMMAND|INVALID_PROFILE|INVALID_PRIVACY/.test(error.message)) return {
        command_id: command.command_id, operation: command.operation, status: 'not_saved', memory_id: command.memory_id ?? null,
        version: null, destination: null, policy_revision: command.expected_revision, profile_version: null, reason: 'invalid_command',
      };
      // A lost reply may have committed. The same command ID is the only retry.
      try { const receipt = await this.getCommandReceipt(userId, command.command_id); if (receipt) return { ...receipt, replayed: true }; } catch { /* still uncertain */ }
      return { command_id: command.command_id, operation: command.operation, status: 'verification_required', memory_id: command.memory_id ?? null,
        version: null, destination: null, policy_revision: command.expected_revision, profile_version: null, reason: 'reply_unknown' };
    }
    return MemoryWriteResultSchema.parse(data);
  }
  async saveExtractedFact(userId: string, commandId: string, content: string, kind: MemoryKind,
    source: 'user_explicit' | 'assistant_inferred', userClient: SupabaseClient<Database>, channel: 'text' | 'voice' | 'tool' = 'text'): Promise<MemoryWriteResult> {
    const receipt = await this.getCommandReceipt(userId, commandId);
    if (receipt) return { ...receipt, replayed: true };
    const policy = await this.readPolicy(userId);
    const fact = classifyMemoryFact(content, { explicit: source === 'user_explicit', kind });
    const first = await this.listMemories(userId, { limit: 100 });
    const items = first.nextCursor ? [...first.items, ...(await this.listMemories(userId, { limit: 100, cursor: first.nextCursor })).items] : first.items;
    const previous = items.find(row => row.status !== 'rejected' && (
      (fact?.payload.type === 'taste' && (row.payload as { type?: string })?.type === 'taste') ||
      (kind === 'response_style' && row.kind === kind) || normalizeMemoryText(row.content) === normalizeMemoryText(fact?.content ?? content)));
    try {
      return await this.executeCommand(userId, { command_id: commandId, operation: 'save', expected_version: previous?.version ?? 0,
        expected_revision: policy.revision, payload: { content, kind, source, evidence: { channel, pattern: fact?.pattern ?? 'note' } } }, userClient);
    } catch (failure) {
      if (failure instanceof MemoryServiceError && ['IDEMPOTENCY_CONFLICT','VERSION_CONFLICT'].includes(failure.code)) {
        const committed = await this.getCommandReceipt(userId, commandId);
        if (committed) return { ...committed, replayed: true };
      }
      throw failure;
    }
  }
  async persistArtifact(userId: string, policy: MemoryPolicy, kind: string, payload: object): Promise<unknown | null> {
    if (policy.userId !== userId || !policy.saveHistory) return null;
    const { data, error } = await memoryRpc(this.admin, 'persist_assistant_memory_artifact', {
      p_user_id: userId, p_revision: policy.revision, p_kind: kind, p_payload: payload,
    });
    if (error) throw this.dbError('persistArtifact', error);
    return data;
  }
  async modelMemories(userId: string, policy: MemoryPolicy, limit = 8, purpose: 'model_context' | 'model_tool' | 'deterministic' = 'model_context'): Promise<MemoryRow[]> {
    if (policy.userId !== userId || !policy.memoryEnabled) return [];
    // The atomic quota is 200. Filter the complete candidate set before limit.
    const { data, error } = await this.admin.from('assistant_memory_items').select('*').eq('user_id', userId)
      .eq('status', 'active').order('last_used_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false }).limit(200);
    if (error) throw this.dbError('modelMemories', error);
    return (data ?? []).filter(row => allowedMemory(row, policy, purpose)).slice(0, limit);
  }
  async modelArtifacts(userId: string, policy: MemoryPolicy, conversationId: string, limit = 10) {
    if (policy.userId !== userId || !policy.saveHistory) return { messages: [] as MessageRow[], summary: null as SummaryRow | null, session: [] as SessionContextRow[], privateTerms: [] as string[] };
    const { data: profile, error } = await (this.admin as unknown as SupabaseClient).from('nutrition_profiles').select('settings').eq('user_id', userId).maybeSingle();
    if (error) throw this.dbError('modelArtifacts', error);
    const settings = NutritionProfileSettingsSchema.safeParse(profile?.settings);
    const terms = privateProfileTerms(settings.success ? settings.data : null);
    const [messages, summary, session] = await Promise.all([
      this.getRecentMessages(conversationId, userId, 100), this.getLatestSummary(conversationId, userId),
      this.getActiveSessionContext(userId, { conversationId }),
    ]);
    return { messages: messages.filter(row => allowedMessage(row, policy, terms)).slice(-limit),
      summary: summary && allowedSummary(summary, policy, terms) ? summary : null,
      session: session.filter(row => allowedSession(row, policy, conversationId, terms)), privateTerms: terms };
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

/**
 * PRP-224 PR1 — snippet builder for search results. Returns roughly
 * `[..-60 chars..]query[..+60 chars..]` so the UI can render context
 * around the match without highlighting (V1 keeps the highlight client-
 * side, the server just returns the snippet).
 */
function snippetFor(content: string, query: string): string {
  const idx = content.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return content.slice(0, 200);
  const start = Math.max(0, idx - 60);
  const end = Math.min(content.length, idx + query.length + 60);
  const head = start > 0 ? '…' : '';
  const tail = end < content.length ? '…' : '';
  return `${head}${content.slice(start, end)}${tail}`;
}
