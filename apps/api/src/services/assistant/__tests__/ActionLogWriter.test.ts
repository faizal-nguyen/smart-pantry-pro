import { ActionLogWriter, EXECUTING_STALE_AFTER_MS, type ActionLogRow } from '../ActionLogWriter.js';

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

// ---- Confirmation taken in hand (V11-04 E2, advanced fix) ------------
// A recording fake that resolves every chain the writer builds, terminal
// `.maybeSingle()` or an awaited chain alike.
interface RecordedQuery {
  table: string;
  op: 'select' | 'update';
  payload?: Record<string, unknown>;
  filters: Array<[string, string, unknown]>;
}

type QueryOutcome = { data: unknown; error: unknown };
interface FakeChain {
  select(): FakeChain;
  update(payload: Record<string, unknown>): FakeChain;
  eq(col: string, val: unknown): FakeChain;
  in(col: string, val: unknown): FakeChain;
  maybeSingle(): Promise<QueryOutcome>;
  then<T>(resolve: (v: QueryOutcome) => T, reject: (e: unknown) => T): Promise<T>;
}

function makeRecordingClient(respond: (q: RecordedQuery) => QueryOutcome) {
  const queries: RecordedQuery[] = [];
  const fake = {
    from(table: string): FakeChain {
      const q: RecordedQuery = { table, op: 'select', filters: [] };
      const settle = () => {
        queries.push(q);
        return Promise.resolve(respond(q));
      };
      const chain: FakeChain = {
        select() { return chain; },
        update(payload) { q.op = 'update'; q.payload = payload; return chain; },
        eq(col, val) { q.filters.push(['eq', col, val]); return chain; },
        in(col, val) { q.filters.push(['in', col, val]); return chain; },
        maybeSingle: settle,
        then(resolve, reject) { return settle().then(resolve, reject); },
      };
      return chain;
    },
  };
  const client = fake as unknown as ConstructorParameters<typeof ActionLogWriter>[0];
  return { client, queries };
}

const filter = (q: RecordedQuery, col: string) => q.filters.find(([, c]) => c === col)?.[2];

describe('ActionLogWriter confirmation states', () => {
  const NOW = Date.parse('2026-11-22T12:00:00Z');
  const ago = (ms: number) => new Date(NOW - ms).toISOString();

  it('claimPlanned takes planned rows as executing, never as executed', async () => {
    const { client, queries } = makeRecordingClient(() => ({ data: [makeRow({ status: 'executing' })], error: null }));
    const rows = await new ActionLogWriter(client).claimPlanned(USER, ['44444444-4444-4444-4444-444444444444']);

    expect(rows.map(r => r.status)).toEqual(['executing']);
    expect(queries).toHaveLength(1);
    expect(queries[0].payload).toEqual({ status: 'executing' });
    expect(filter(queries[0], 'status')).toBe('planned');
    expect(filter(queries[0], 'user_id')).toBe(USER);
  });

  it('the stale delay stays below the five-minute confirmation token', () => {
    expect(EXECUTING_STALE_AFTER_MS).toBeGreaterThanOrEqual(60_000);
    expect(EXECUTING_STALE_AFTER_MS).toBeLessThan(5 * 60_000);
  });

  it('reconcileExecuting leaves a row that is not executing untouched', async () => {
    const { client, queries } = makeRecordingClient(() => { throw new Error('no query expected'); });
    const row = makeRow({ status: 'executed' });
    expect(await new ActionLogWriter(client).reconcileExecuting(USER, row, NOW)).toBe(row);
    expect(queries).toHaveLength(0);
  });

  it('reconcileExecuting waits for a run still within the delay', async () => {
    const { client, queries } = makeRecordingClient(() => { throw new Error('no query expected'); });
    const row = makeRow({ status: 'executing', updated_at: ago(EXECUTING_STALE_AFTER_MS - 1_000) });
    expect(await new ActionLogWriter(client).reconcileExecuting(USER, row, NOW)).toBe(row);
    expect(queries).toHaveLength(0);
  });

  it('a stale executing row with a stock receipt becomes executed, without an assistant undo', async () => {
    const row = makeRow({ status: 'executing', updated_at: ago(EXECUTING_STALE_AFTER_MS + 1_000), reversible: true });
    const { client, queries } = makeRecordingClient(q => q.table === 'stock_commands'
      ? { data: { result: { command_id: row.id, status: 'confirmed' } }, error: null }
      : { data: { ...row, ...q.payload }, error: null });

    const out = await new ActionLogWriter(client).reconcileExecuting(USER, row, NOW);

    expect(queries[0].table).toBe('stock_commands');
    expect(filter(queries[0], 'user_id')).toBe(USER);
    expect(filter(queries[0], 'command_id')).toBe(row.id);
    const update = queries[1];
    expect(update.table).toBe('assistant_action_log');
    expect(update.payload).toMatchObject({ status: 'executed', reversible: false, reversible_action: null, undo_expires_at: null,
      result: { command_id: row.id, status: 'confirmed', reconciled_from: 'stock_commands' } });
    // Guarded: the first run's own result, written meanwhile, is never overwritten.
    expect(filter(update, 'status')).toBe('executing');
    expect(out.status).toBe('executed');
  });

  it('a stale executing row without a receipt is left to verify, never reported done', async () => {
    const row = makeRow({ status: 'executing', updated_at: ago(EXECUTING_STALE_AFTER_MS + 1_000) });
    const { client, queries } = makeRecordingClient(q => q.table === 'stock_commands'
      ? { data: null, error: null }
      : { data: { ...row, ...q.payload }, error: null });

    const out = await new ActionLogWriter(client).reconcileExecuting(USER, row, NOW);

    expect(queries[1].payload).toMatchObject({ status: 'failed', error_code: 'EXECUTION_UNVERIFIED' });
    expect(filter(queries[1], 'status')).toBe('executing');
    expect(out).toMatchObject({ status: 'failed', error_code: 'EXECUTION_UNVERIFIED' });
  });

  it('when the first run finished meanwhile, reconcileExecuting returns what it wrote', async () => {
    const row = makeRow({ status: 'executing', updated_at: ago(EXECUTING_STALE_AFTER_MS + 1_000) });
    const finished = { ...row, status: 'executed' as const, result: { consumed: 1 } };
    const { client } = makeRecordingClient(q => q.table === 'stock_commands'
      ? { data: null, error: null }
      : q.op === 'update' ? { data: null, error: null } : { data: finished, error: null });

    expect(await new ActionLogWriter(client).reconcileExecuting(USER, row, NOW)).toEqual(finished);
  });
});
