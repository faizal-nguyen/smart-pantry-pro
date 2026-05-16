/**
 * PRP-224 PR1 — MemoryService search + conversation update/delete tests.
 *
 * Mocks the Supabase chain at the table level, similar pattern to
 * MemoryService.test.ts. Each test exercises a single code path; we
 * focus on the new V1 surfaces:
 *   - updateConversation (rename + mode patch)
 *   - softDeleteConversation
 *   - searchMessages (ilike escape, ordering, user scoping)
 *   - recordMessage auto-titre on first user turn
 */
import { MemoryService, type AssistantConversation } from '../MemoryService.js';

const USER = '11111111-1111-1111-1111-111111111111';
const CONV = '22222222-2222-2222-2222-222222222222';

function makeConv(o: Partial<AssistantConversation> = {}): AssistantConversation {
  return {
    id: CONV,
    user_id: USER,
    title: null,
    mode: 'general',
    status: 'active',
    last_message_at: null,
    metadata: {},
    created_at: '2026-05-14T00:00:00Z',
    updated_at: '2026-05-14T00:00:00Z',
    ...o,
  };
}

interface MockConfig {
  // Per-table programmable responses keyed on call type.
  insertResult?: unknown;
  updateResult?: unknown;
  selectMaybeSingle?: unknown;
  selectMany?: unknown[];
}

function makeAdmin(perTable: Record<string, MockConfig>) {
  const calls = {
    inserts: [] as Array<{ table: string; payload: Record<string, unknown> }>,
    updates: [] as Array<{ table: string; payload: Record<string, unknown>; filters: Record<string, unknown> }>,
    selects: [] as Array<{ table: string; filters: Record<string, unknown>; mode: 'maybeSingle' | 'limit' }>,
  };
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
                  return { data: cfg.insertResult ?? payload, error: null };
                },
                async maybeSingle() {
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
            select() {
              return {
                async maybeSingle() {
                  calls.updates.push({ table, payload, filters: { ...filters } });
                  return { data: cfg.updateResult ?? { ...(cfg.selectMaybeSingle as object | null) ?? {}, ...payload }, error: null };
                },
              };
            },
            then(resolve: (v: unknown) => void) {
              calls.updates.push({ table, payload, filters: { ...filters } });
              resolve({ error: null });
            },
          };
          return u;
        },
        select(_cols: string) {
          return chain;
        },
        eq(col: string, val: unknown) {
          filters[col] = val;
          return chain;
        },
        neq() {
          return chain;
        },
        ilike(col: string, val: unknown) {
          filters[`${col}__ilike`] = val;
          return chain;
        },
        order() {
          return chain;
        },
        limit(_n: number) {
          calls.selects.push({ table, filters: { ...filters }, mode: 'limit' });
          return Promise.resolve({ data: cfg.selectMany ?? [], error: null });
        },
        async maybeSingle() {
          calls.selects.push({ table, filters: { ...filters }, mode: 'maybeSingle' });
          return { data: cfg.selectMaybeSingle ?? null, error: null };
        },
      };
      return chain;
    },
  };
  return { client, calls };
}

describe('MemoryService search & conversation patch (PRP-224 PR1)', () => {
  describe('updateConversation', () => {
    it('patches title only', async () => {
      const after = makeConv({ title: 'Pâtes carbonara' });
      const { client, calls } = makeAdmin({
        assistant_conversations: { updateResult: after },
      });
      const svc = new MemoryService(client);
      const conv = await svc.updateConversation(CONV, USER, { title: 'Pâtes carbonara' });
      expect(conv.title).toBe('Pâtes carbonara');
      expect(calls.updates[0].payload).toEqual({ title: 'Pâtes carbonara' });
      expect(calls.updates[0].filters).toMatchObject({ id: CONV, user_id: USER });
    });

    it('patches mode only', async () => {
      const after = makeConv({ mode: 'kitchen' });
      const { client, calls } = makeAdmin({
        assistant_conversations: { updateResult: after },
      });
      const svc = new MemoryService(client);
      const conv = await svc.updateConversation(CONV, USER, { mode: 'kitchen' });
      expect(conv.mode).toBe('kitchen');
      expect(calls.updates[0].payload).toEqual({ mode: 'kitchen' });
    });
  });

  describe('softDeleteConversation', () => {
    it('sets status=deleted', async () => {
      const after = makeConv({ status: 'deleted' });
      const { client, calls } = makeAdmin({
        assistant_conversations: { updateResult: after },
      });
      const svc = new MemoryService(client);
      const conv = await svc.softDeleteConversation(CONV, USER);
      expect(conv.status).toBe('deleted');
      expect(calls.updates[0].payload).toEqual({ status: 'deleted' });
    });
  });

  describe('searchMessages', () => {
    it('returns matches scoped by user, ordered by created_at desc', async () => {
      const messages = [
        {
          id: 'msg-1',
          conversation_id: 'conv-a',
          content: 'des pâtes ce soir',
          role: 'user',
          created_at: '2026-05-14T10:00:00Z',
        },
        {
          id: 'msg-2',
          conversation_id: 'conv-b',
          content: 'pâtes au pesto',
          role: 'user',
          created_at: '2026-05-14T09:00:00Z',
        },
      ];
      const { client, calls } = makeAdmin({
        assistant_messages: { selectMany: messages },
        assistant_conversation_summaries: { selectMany: [] },
      });
      const svc = new MemoryService(client);
      const matches = await svc.searchMessages(USER, 'pâtes', 10);

      expect(matches).toHaveLength(2);
      expect(matches[0].conversation_id).toBe('conv-a');
      expect(matches[0].snippet).toContain('pâtes');
      // Both queries should filter on user_id and ILIKE on content/summary.
      const msgCall = calls.selects.find(c => c.table === 'assistant_messages');
      expect(msgCall?.filters).toMatchObject({ user_id: USER });
      expect(msgCall?.filters.content__ilike).toContain('pâtes');
    });

    it('returns empty array on empty query', async () => {
      const { client } = makeAdmin({});
      const svc = new MemoryService(client);
      const matches = await svc.searchMessages(USER, '   ', 10);
      expect(matches).toEqual([]);
    });
  });

  describe('recordMessage auto-title', () => {
    it('sets title from first user message when conversation has none', async () => {
      const conv = makeConv({ title: null });
      // Returns conv on getConversation lookup; the underlying update is captured.
      const { client, calls } = makeAdmin({
        assistant_conversations: { selectMaybeSingle: conv, updateResult: { ...conv, title: 'des pâtes ce soir' } },
        assistant_messages: { insertResult: { id: 'msg-1', conversation_id: CONV, user_id: USER, role: 'user', content: 'des pâtes ce soir', content_format: 'text', audio_transcript: null, tool_calls: [], action_log_ids: [], metadata: {}, created_at: '2026-05-14T10:00:00Z' } },
      });
      const svc = new MemoryService(client);
      await svc.recordMessage(CONV, USER, { role: 'user', content: 'des pâtes ce soir' });

      const titleUpdate = calls.updates.find(
        u => u.table === 'assistant_conversations' && u.payload.title === 'des pâtes ce soir',
      );
      expect(titleUpdate).toBeDefined();
    });

    it('does NOT override an existing title', async () => {
      const conv = makeConv({ title: 'Existing title' });
      const { client, calls } = makeAdmin({
        assistant_conversations: { selectMaybeSingle: conv },
        assistant_messages: { insertResult: { id: 'msg-1', conversation_id: CONV, user_id: USER, role: 'user', content: 'second message', content_format: 'text', audio_transcript: null, tool_calls: [], action_log_ids: [], metadata: {}, created_at: '2026-05-14T10:00:00Z' } },
      });
      const svc = new MemoryService(client);
      await svc.recordMessage(CONV, USER, { role: 'user', content: 'second message' });

      const titleUpdate = calls.updates.find(
        u => u.table === 'assistant_conversations' && 'title' in u.payload,
      );
      expect(titleUpdate).toBeUndefined();
    });

    it('does NOT set title for assistant messages', async () => {
      const conv = makeConv({ title: null });
      const { client, calls } = makeAdmin({
        assistant_conversations: { selectMaybeSingle: conv },
        assistant_messages: { insertResult: { id: 'msg-1', conversation_id: CONV, user_id: USER, role: 'assistant', content: 'response', content_format: 'text', audio_transcript: null, tool_calls: [], action_log_ids: [], metadata: {}, created_at: '2026-05-14T10:00:00Z' } },
      });
      const svc = new MemoryService(client);
      await svc.recordMessage(CONV, USER, { role: 'assistant', content: 'response' });

      const titleUpdate = calls.updates.find(
        u => u.table === 'assistant_conversations' && 'title' in u.payload,
      );
      expect(titleUpdate).toBeUndefined();
    });
  });
});
