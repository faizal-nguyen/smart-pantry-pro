import { ActionLogWriter, type ActionLogRow } from '../ActionLogWriter.js';

const USER = '11111111-1111-1111-1111-111111111111';
const REQ = '22222222-2222-2222-2222-222222222222';
const SESS = '33333333-3333-3333-3333-333333333333';

function makeRow(overrides: Partial<ActionLogRow> = {}): ActionLogRow {
  return {
    id: '44444444-4444-4444-4444-444444444444',
    user_id: USER,
    client_request_id: REQ,
    session_id: SESS,
    step_seq: 0,
    audio_sha256: null,
    tool: 'add_inventory_items',
    tool_args: {},
    risk_tier: 'low',
    status: 'planned',
    result: null,
    error_code: null,
    error_message: null,
    reversible: true,
    reversible_action: null,
    undo_expires_at: null,
    undone_at: null,
    llm_model: 'gpt-4o-mini',
    cost_usd: null,
    created_at: '2026-05-08T00:00:00Z',
    executed_at: null,
    updated_at: '2026-05-08T00:00:00Z',
    ...overrides,
  };
}

interface ClientCalls {
  inserts: Array<Record<string, unknown>>;
  updates: Array<{ id: string; payload: Record<string, unknown> }>;
  selects: Array<{ filters: Record<string, unknown> }>;
}

function makeAdminClient(opts: {
  insertResult?: ActionLogRow;
  insertError?: { code: string; message: string };
  selectMaybeSingle?: ActionLogRow | null;
  selectMany?: ActionLogRow[];
}) {
  const calls: ClientCalls = { inserts: [], updates: [], selects: [] };

  const builder: any = {
    from(table: string) {
      if (table !== 'assistant_action_log') {
        throw new Error(`unexpected table ${table}`);
      }
      const filters: Record<string, unknown> = {};
      const chain: any = {
        insert(payload: Record<string, unknown>) {
          calls.inserts.push(payload);
          return {
            select() {
              return {
                async single() {
                  if (opts.insertError) {
                    return { data: null, error: opts.insertError };
                  }
                  return {
                    data: opts.insertResult ?? makeRow(payload as Partial<ActionLogRow>),
                    error: null,
                  };
                },
              };
            },
          };
        },
        update(payload: Record<string, unknown>) {
          return {
            async eq(_col: string, val: string) {
              calls.updates.push({ id: val, payload });
              return { error: null };
            },
          };
        },
        select(_cols: string) {
          return chain;
        },
        eq(col: string, val: unknown) {
          filters[col] = val;
          return chain;
        },
        in(col: string, val: unknown) {
          filters[col] = val;
          return Promise.resolve({ data: opts.selectMany ?? [], error: null });
        },
        gte(col: string, val: unknown) {
          filters[`${col}__gte`] = val;
          return chain;
        },
        order() {
          return chain;
        },
        limit() {
          return chain;
        },
        async maybeSingle() {
          calls.selects.push({ filters: { ...filters } });
          return { data: opts.selectMaybeSingle ?? null, error: null };
        },
      };
      return chain;
    },
  };

  return { client: builder, calls };
}

describe('ActionLogWriter', () => {
  describe('insertPlanned', () => {
    it('inserts a row with status=planned and returns it', async () => {
      const expected = makeRow({ id: 'inserted-id' });
      const { client, calls } = makeAdminClient({ insertResult: expected });
      const writer = new ActionLogWriter(client);

      const row = await writer.insertPlanned({
        userId: USER,
        clientRequestId: REQ,
        sessionId: SESS,
        stepSeq: 0,
        audioSha256: 'abc',
        tool: 'add_inventory_items',
        toolArgs: { items: [{ name: 'tomate', quantity: 1 }] },
        riskTier: 'low',
        reversible: true,
        llmModel: 'gpt-4o-mini',
      });

      expect(row.id).toBe('inserted-id');
      expect(calls.inserts).toHaveLength(1);
      expect(calls.inserts[0]).toMatchObject({
        user_id: USER,
        client_request_id: REQ,
        session_id: SESS,
        step_seq: 0,
        audio_sha256: 'abc',
        tool: 'add_inventory_items',
        risk_tier: 'low',
        status: 'planned',
        reversible: true,
        llm_model: 'gpt-4o-mini',
      });
    });

    it('on 23505 race, fetches the existing row and returns it', async () => {
      const existing = makeRow({ id: 'existing-id' });
      let called = 0;

      const builder: any = {
        from() {
          called += 1;
          if (called === 1) {
            // INSERT path → returns 23505
            return {
              insert() {
                return {
                  select() {
                    return {
                      async single() {
                        return {
                          data: null,
                          error: { code: '23505', message: 'duplicate' },
                        };
                      },
                    };
                  },
                };
              },
            };
          }
          // 2nd call — findByRequestStep SELECT
          return {
            select() {
              return {
                eq() {
                  return {
                    eq() {
                      return {
                        eq() {
                          return {
                            async maybeSingle() {
                              return { data: existing, error: null };
                            },
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };

      const writer = new ActionLogWriter(builder);
      const row = await writer.insertPlanned({
        userId: USER,
        clientRequestId: REQ,
        sessionId: SESS,
        stepSeq: 0,
        tool: 'add_inventory_items',
        toolArgs: {},
        riskTier: 'low',
        reversible: true,
      });
      expect(row.id).toBe('existing-id');
    });
  });

  describe('markExecuted', () => {
    it('updates with status=executed, result, reversible_action and undo_expires_at', async () => {
      const { client, calls } = makeAdminClient({});
      const writer = new ActionLogWriter(client);

      const undoAt = new Date('2026-05-08T01:00:00Z');
      await writer.markExecuted('row-1', {
        result: { ok: true },
        reversibleAction: { tool: 'remove_x', args: { ids: ['a'] } },
        undoExpiresAt: undoAt,
      });

      expect(calls.updates).toHaveLength(1);
      expect(calls.updates[0].id).toBe('row-1');
      expect(calls.updates[0].payload).toMatchObject({
        status: 'executed',
        result: { ok: true },
        reversible_action: { tool: 'remove_x', args: { ids: ['a'] } },
        reversible: true,
        undo_expires_at: undoAt.toISOString(),
      });
    });

    it('downgrades reversible to false when no inverse can be computed', async () => {
      const { client, calls } = makeAdminClient({});
      const writer = new ActionLogWriter(client);

      await writer.markExecuted('row-2', {
        result: { ok: true },
        reversibleAction: null,
      });

      expect(calls.updates[0].payload).toMatchObject({
        reversible_action: null,
        reversible: false,
      });
    });

    it('omits the reversible flag when reversibleAction is undefined', async () => {
      const { client, calls } = makeAdminClient({});
      const writer = new ActionLogWriter(client);

      await writer.markExecuted('row-3', { result: { ok: true } });

      expect(calls.updates[0].payload.reversible).toBeUndefined();
      expect(calls.updates[0].payload.reversible_action).toBeUndefined();
    });
  });

  describe('markFailed', () => {
    it('updates status=failed with truncated error_message', async () => {
      const { client, calls } = makeAdminClient({});
      const writer = new ActionLogWriter(client);

      const longMsg = 'x'.repeat(700);
      await writer.markFailed('row-1', 'EXEC_FAILED', longMsg);

      expect(calls.updates[0].payload).toMatchObject({
        status: 'failed',
        error_code: 'EXEC_FAILED',
      });
      expect((calls.updates[0].payload.error_message as string).length).toBe(500);
    });
  });

  describe('findByAudioSha', () => {
    it('returns the most recent row within the 10-min window', async () => {
      const expected = makeRow({ id: 'most-recent', audio_sha256: 'abc' });
      const { client } = makeAdminClient({ selectMaybeSingle: expected });
      const writer = new ActionLogWriter(client);

      const row = await writer.findByAudioSha(USER, 'abc');
      expect(row?.id).toBe('most-recent');
    });

    it('returns null when nothing matches', async () => {
      const { client } = makeAdminClient({ selectMaybeSingle: null });
      const writer = new ActionLogWriter(client);

      const row = await writer.findByAudioSha(USER, 'never');
      expect(row).toBeNull();
    });
  });

  describe('fetchPlanned', () => {
    it('returns empty array on empty input without hitting the DB', async () => {
      const { client, calls } = makeAdminClient({});
      const writer = new ActionLogWriter(client);

      const rows = await writer.fetchPlanned(USER, []);
      expect(rows).toEqual([]);
      expect(calls.selects.length + calls.updates.length + calls.inserts.length).toBe(0);
    });

    it('returns matching rows from the DB', async () => {
      const rows = [makeRow({ id: 'a' }), makeRow({ id: 'b' })];
      const { client } = makeAdminClient({ selectMany: rows });
      const writer = new ActionLogWriter(client);

      const result = await writer.fetchPlanned(USER, ['a', 'b']);
      expect(result.map((r) => r.id)).toEqual(['a', 'b']);
    });
  });
});
