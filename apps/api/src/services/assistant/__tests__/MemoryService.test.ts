/**
 * PRP-223 PR2 — MemoryService unit tests.
 *
 * Mocks the Supabase admin client at the chain-builder level (same shape as
 * `ActionLogWriter.test.ts`). Covers the core behaviours that subsequent PRs
 * rely on: user-scoping, soft-delete, health-sensitive guardrail, V1 quota
 * with dedup, and pagination shape.
 */
import {
  MemoryService,
  MemoryServiceError,
  MAX_ACTIVE_MEMORIES_PER_USER,
  type AssistantConversation,
  type AssistantMemoryItem,
  type AssistantMessage,
} from '../MemoryService.js';

const USER = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const CONV = '33333333-3333-3333-3333-333333333333';
const MEM = '44444444-4444-4444-4444-444444444444';
const MSG = '55555555-5555-5555-5555-555555555555';

const ISO = (s: string) => s; // marker for readability

function makeConv(o: Partial<AssistantConversation> = {}): AssistantConversation {
  return {
    id: CONV,
    user_id: USER,
    title: null,
    mode: 'general',
    status: 'active',
    last_message_at: null,
    metadata: {},
    created_at: ISO('2026-05-13T00:00:00Z'),
    updated_at: ISO('2026-05-13T00:00:00Z'),
    ...o,
  };
}

function makeMsg(o: Partial<AssistantMessage> = {}): AssistantMessage {
  return {
    id: MSG,
    conversation_id: CONV,
    user_id: USER,
    role: 'user',
    content: 'hello',
    content_format: 'text',
    audio_transcript: null,
    tool_calls: [],
    action_log_ids: [],
    metadata: {},
    created_at: ISO('2026-05-13T00:00:00Z'),
    ...o,
  };
}

function makeMem(o: Partial<AssistantMemoryItem> = {}): AssistantMemoryItem {
  return {
    id: MEM,
    user_id: USER,
    kind: 'preference',
    scope: 'global',
    status: 'active',
    subject_type: null,
    subject_id: null,
    content: 'aime indien leger',
    normalized_content: 'aime indien leger',
    confidence: 0.8,
    sensitivity: 'normal',
    source: 'assistant_inferred',
    evidence: {},
    approved_at: null,
    last_used_at: null,
    expires_at: null,
    deleted_at: null,
    created_at: ISO('2026-05-13T00:00:00Z'),
    updated_at: ISO('2026-05-13T00:00:00Z'),
    ...o,
  };
}

/**
 * Tiny chainable builder mock. Each table call exposes the methods
 * MemoryService uses. Responses are programmable via `cfg`.
 */
interface MockConfig {
  insertResult?: unknown;
  insertError?: { message: string };
  selectMaybeSingle?: unknown;
  selectSingle?: unknown;
  selectMany?: unknown[];
  selectCount?: number;
  updateResult?: unknown;
}

interface MockCalls {
  inserts: Array<{ table: string; payload: Record<string, unknown> }>;
  updates: Array<{ table: string; payload: Record<string, unknown>; filters: Record<string, unknown> }>;
  selects: Array<{ table: string; filters: Record<string, unknown> }>;
}

function makeAdmin(perTable: Record<string, MockConfig>) {
  const calls: MockCalls = { inserts: [], updates: [], selects: [] };
  const client: any = {
    from(table: string) {
      const cfg = perTable[table] ?? {};
      const filters: Record<string, unknown> = {};
      const chain: any = {
        insert(payload: Record<string, unknown>) {
          calls.inserts.push({ table, payload });
          return {
            select() {
              return {
                async single() {
                  if (cfg.insertError) return { data: null, error: cfg.insertError };
                  return { data: cfg.insertResult ?? payload, error: null };
                },
                async maybeSingle() {
                  if (cfg.insertError) return { data: null, error: cfg.insertError };
                  return { data: cfg.insertResult ?? payload, error: null };
                },
              };
            },
          };
        },
        update(payload: Record<string, unknown>) {
          const u: any = {
            eq(col: string, val: unknown) {
              filters[col] = val;
              return u;
            },
            neq() {
              return u;
            },
            select() {
              return {
                async maybeSingle() {
                  calls.updates.push({ table, payload, filters: { ...filters } });
                  return { data: cfg.updateResult ?? null, error: null };
                },
              };
            },
            // Tail without .select() — for touchLastMessageAt etc.
            then(resolve: (v: unknown) => void) {
              calls.updates.push({ table, payload, filters: { ...filters } });
              resolve({ error: null });
            },
          };
          return u;
        },
        select(_cols: string, _opts?: { count?: string; head?: boolean }) {
          if (_opts?.head) {
            // Count-only path.
            return {
              eq(col: string, val: unknown) {
                filters[col] = val;
                return {
                  eq(col2: string, val2: unknown) {
                    filters[col2] = val2;
                    calls.selects.push({ table, filters: { ...filters } });
                    return Promise.resolve({ count: cfg.selectCount ?? 0, error: null });
                  },
                };
              },
            };
          }
          return chain;
        },
        eq(col: string, val: unknown) {
          filters[col] = val;
          return chain;
        },
        neq() {
          return chain;
        },
        gt(col: string, val: unknown) {
          filters[`${col}__gt`] = val;
          return chain;
        },
        lt(col: string, val: unknown) {
          filters[`${col}__lt`] = val;
          return chain;
        },
        order() {
          return chain;
        },
        limit(_n: number) {
          calls.selects.push({ table, filters: { ...filters } });
          if (Array.isArray(cfg.selectMany)) {
            // chain.limit returns a Promise-like
            return Promise.resolve({ data: cfg.selectMany, error: null });
          }
          return chain;
        },
        async maybeSingle() {
          calls.selects.push({ table, filters: { ...filters } });
          return { data: cfg.selectMaybeSingle ?? null, error: null };
        },
        async single() {
          calls.selects.push({ table, filters: { ...filters } });
          return { data: cfg.selectSingle ?? null, error: null };
        },
      };
      return chain;
    },
  };
  return { client, calls };
}

describe('MemoryService', () => {
  describe('createConversation', () => {
    it('inserts a user-scoped row with defaults', async () => {
      const expected = makeConv({ mode: 'kitchen' });
      const { client, calls } = makeAdmin({
        assistant_conversations: { insertResult: expected },
      });
      const svc = new MemoryService(client);
      const conv = await svc.createConversation(USER, { mode: 'kitchen' });
      expect(conv).toEqual(expected);
      expect(calls.inserts).toHaveLength(1);
      expect(calls.inserts[0].payload).toMatchObject({
        user_id: USER,
        mode: 'kitchen',
      });
    });
  });

  describe('recordMessage', () => {
    it('inserts a message and touches conversation last_message_at', async () => {
      const expected = makeMsg({ role: 'assistant', content: 'hi' });
      const { client, calls } = makeAdmin({
        assistant_messages: { insertResult: expected },
        assistant_conversations: {},
      });
      const svc = new MemoryService(client);
      const msg = await svc.recordMessage(CONV, USER, {
        role: 'assistant',
        content: 'hi',
        action_log_ids: ['log-1'],
      });
      expect(msg).toEqual(expected);
      expect(calls.inserts).toHaveLength(1);
      expect(calls.updates.find(u => u.table === 'assistant_conversations')).toBeTruthy();
    });
  });

  describe('createMemory', () => {
    it('enforces V1 quota by throwing QUOTA_EXCEEDED', async () => {
      const { client } = makeAdmin({
        assistant_memory_items: { selectCount: MAX_ACTIVE_MEMORIES_PER_USER },
      });
      const svc = new MemoryService(client);
      await expect(
        svc.createMemory(USER, { kind: 'preference', content: 'x', normalized_content: 'x' }),
      ).rejects.toThrow(MemoryServiceError);
    });

    it('returns existing memory on normalized_content dedup', async () => {
      const existing = makeMem({ content: 'aime indien leger' });
      const { client, calls } = makeAdmin({
        assistant_memory_items: { selectMaybeSingle: existing, selectCount: 0 },
      });
      const svc = new MemoryService(client);
      const mem = await svc.createMemory(USER, {
        kind: 'preference',
        content: 'aime indien leger',
        normalized_content: 'aime indien leger',
      });
      expect(mem).toEqual(existing);
      // No insert because dedup short-circuited.
      expect(calls.inserts).toHaveLength(0);
    });

    it('forces health_sensitive memories into candidate status', async () => {
      const { client, calls } = makeAdmin({
        assistant_memory_items: { selectCount: 0 },
      });
      const svc = new MemoryService(client);
      await svc.createMemory(USER, {
        kind: 'constraint',
        content: 'allergique aux noix',
        sensitivity: 'health_sensitive',
        status: 'active', // requested active, but should be downgraded
      });
      const insert = calls.inserts[0];
      expect(insert).toBeDefined();
      expect(insert!.payload.status).toBe('candidate');
      expect(insert!.payload.sensitivity).toBe('health_sensitive');
    });
  });

  describe('forgetMemory', () => {
    it('soft-deletes by setting status=deleted + deleted_at', async () => {
      const after = makeMem({ status: 'deleted', deleted_at: '2026-05-13T01:00:00Z' });
      const { client, calls } = makeAdmin({
        assistant_memory_items: { updateResult: after },
      });
      const svc = new MemoryService(client);
      const mem = await svc.forgetMemory(MEM, USER);
      expect(mem.status).toBe('deleted');
      expect(calls.updates[0].payload).toMatchObject({ status: 'deleted' });
      expect(calls.updates[0].filters).toMatchObject({ id: MEM, user_id: USER });
    });
  });

  describe('promoteCandidate', () => {
    it('refuses cross-user (NOT_FOUND)', async () => {
      const { client } = makeAdmin({
        assistant_memory_items: { selectMaybeSingle: null },
      });
      const svc = new MemoryService(client);
      await expect(svc.promoteCandidate(MEM, OTHER)).rejects.toThrow(MemoryServiceError);
    });

    it('transitions candidate→active, sets approved_at', async () => {
      const candidate = makeMem({ status: 'candidate' });
      const after = makeMem({ status: 'active', approved_at: '2026-05-13T01:00:00Z' });
      // First select returns the candidate (via getMemory), then update returns active.
      const { client, calls } = makeAdmin({
        assistant_memory_items: { selectMaybeSingle: candidate, updateResult: after },
      });
      const svc = new MemoryService(client);
      const mem = await svc.promoteCandidate(MEM, USER);
      expect(mem.status).toBe('active');
      expect(calls.updates[0].payload).toMatchObject({ status: 'active' });
    });
  });

  describe('getResponseStyleMemory', () => {
    it('returns null when no response_style memory exists', async () => {
      const { client } = makeAdmin({
        assistant_memory_items: { selectMaybeSingle: null },
      });
      const svc = new MemoryService(client);
      const mem = await svc.getResponseStyleMemory(USER);
      expect(mem).toBeNull();
    });

    it('returns the single active response_style memory', async () => {
      const expected = makeMem({ kind: 'response_style', content: 'reponds court' });
      const { client, calls } = makeAdmin({
        assistant_memory_items: { selectMaybeSingle: expected },
      });
      const svc = new MemoryService(client);
      const mem = await svc.getResponseStyleMemory(USER);
      expect(mem).toEqual(expected);
      expect(calls.selects[0].filters).toMatchObject({
        user_id: USER,
        kind: 'response_style',
        status: 'active',
      });
    });
  });

  describe('listConversations', () => {
    it('paginates and emits nextCursor when results exceed limit', async () => {
      const rows = [makeConv({ id: 'a' }), makeConv({ id: 'b' }), makeConv({ id: 'c' })];
      const { client } = makeAdmin({
        assistant_conversations: { selectMany: rows },
      });
      const svc = new MemoryService(client);
      const result = await svc.listConversations(USER, { limit: 2 });
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).not.toBeNull();
    });
  });
});
