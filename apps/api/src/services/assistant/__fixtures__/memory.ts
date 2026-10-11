import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../types/supabase.js';
import type { AssistantMemoryItem, AssistantMessage, AssistantConversationSummary, AssistantSessionContext } from '../MemoryService.js';
import type { MemoryPolicy, MemoryCommand, MemoryWriteResult } from '@smart/shared';
export const USER = '11111111-1111-4111-8111-111111111111';
export const OTHER = '22222222-2222-4222-8222-222222222222';
export const CONV = '33333333-3333-4333-8333-333333333333';
export const MEM = '44444444-4444-4444-8444-444444444444';
export const CID = '55555555-5555-4555-8555-555555555555';
export const policy = (changes: Partial<MemoryPolicy> = {}): MemoryPolicy => ({ userId: USER, revision: 4, memoryEnabled: true, saveHistory: true, shareProfile: false, profileVersion: 2, ...changes });
export const memory = (changes: Partial<AssistantMemoryItem> = {}): AssistantMemoryItem => ({
  id: MEM, user_id: USER, kind: 'preference', scope: 'global', status: 'active', subject_type: null, subject_id: null,
  content: 'Je préfère les plats épicés.', normalized_content: null, confidence: 1, sensitivity: 'normal', source: 'user_explicit',
  evidence: { channel: 'text', pattern: 'spiciness' }, approved_at: '2026-10-11T10:00:00Z', last_used_at: null,
  expires_at: null, deleted_at: null, created_at: '2026-10-11T10:00:00Z', updated_at: '2026-10-11T10:00:00Z',
  version: 1, destination: 'memory', payload: { type: 'taste', subject: 'spiciness', value: 'spicy' }, semantic_key: 'opaque', policy_revision: 4, profile_version: null, ...changes,
});
export const message = (changes: Partial<AssistantMessage> = {}): AssistantMessage => ({
  id: CID, user_id: USER, conversation_id: CONV, role: 'user', content: 'Préparons une soupe.', content_format: 'text',
  audio_transcript: null, tool_calls: [], action_log_ids: [], metadata: {}, created_at: '2026-10-11T10:00:00Z', policy_revision: 4, ...changes,
});
export const summary = (changes: Partial<AssistantConversationSummary> = {}): AssistantConversationSummary => ({
  id: MEM, user_id: USER, conversation_id: CONV, summary: 'Une soupe a été choisie. Cuisson à vérifier.', covered_message_ids: [CID], model_used: 'mock',
  created_at: '2026-10-11T10:00:00Z', policy_revision: 4, coverage_hash: 'opaque-coverage', ...changes,
});
export const session = (changes: Partial<AssistantSessionContext> = {}): AssistantSessionContext => ({
  id: MEM, user_id: USER, conversation_id: CONV, key: 'meal_context', value: { text: 'Ce soir, pas épicé' },
  expires_at: '2099-01-01T00:00:00Z', created_at: '2026-10-11T10:00:00Z', policy_revision: 4, ...changes,
});
export const command = (changes: Partial<MemoryCommand> = {}): MemoryCommand => ({ command_id: CID, expected_version: 0, expected_revision: 4,
  operation: 'save', payload: { content: 'Souviens-toi que je préfère les plats épicés', source: 'user_explicit' }, ...changes });
export const receipt = (changes: Partial<MemoryWriteResult> = {}): MemoryWriteResult => ({ command_id: CID, operation: 'save', status: 'saved', memory_id: MEM,
  version: 1, destination: 'memory', policy_revision: 5, profile_version: null, reason: null, ...changes });
export function clientFixture(tables: Record<string, { data: unknown; error?: { message: string; code?: string } }> = {}) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  class Query {
    constructor(readonly table: string) {}
    call(method: string, args: unknown[]) { calls.push({ table: this.table, method, args }); return this; }
    select(...args: unknown[]) { return this.call('select', args); }
    eq(...args: unknown[]) { return this.call('eq', args); }
    neq(...args: unknown[]) { return this.call('neq', args); }
    not(...args: unknown[]) { return this.call('not', args); }
    gt(...args: unknown[]) { return this.call('gt', args); }
    lt(...args: unknown[]) { return this.call('lt', args); }
    or(...args: unknown[]) { return this.call('or', args); }
    order(...args: unknown[]) { return this.call('order', args); }
    limit(...args: unknown[]) { return this.call('limit', args); }
    update(...args: unknown[]) { return this.call('update', args); }
    async maybeSingle() { return { data: tables[this.table]?.data ?? null, error: tables[this.table]?.error ?? null }; }
    async then(resolve: (result: { data: unknown; error: unknown }) => unknown) {
      return resolve({ data: tables[this.table]?.data ?? [], error: tables[this.table]?.error ?? null });
    }
  }
  const rpc = jest.fn(async (_name: string, _args: Record<string, unknown>) => ({ data: policy() as unknown, error: null as { message: string; code?: string } | null }));
  const client = { from: (table: string) => new Query(table), rpc } as unknown as SupabaseClient<Database>;
  return { client, calls, rpc };
}
