import {
  AskClarificationHandler,
  SummarizeSessionHandler,
  UndoActionHandler,
} from '../meta.js';
import { ToolHandlerRegistry, type ToolHandler, type ToolExecutionContext } from '../types.js';
import type { ActionLogRow } from '../../ActionLogWriter.js';
import { UndoFailedError } from '../../undo.js';

const USER = '11111111-1111-1111-1111-111111111111';
const SESSION = '33333333-3333-3333-3333-333333333333';

function makeCtx(overrides: Partial<ToolExecutionContext> = {}): ToolExecutionContext {
  return {
    userId: USER,
    userClient: {} as any,
    adminClient: {} as any,
    productResolver: {} as any,
    sessionId: SESSION,
    ...overrides,
  };
}

// ---- AskClarificationHandler ----------------------------------------

describe('AskClarificationHandler', () => {
  it('returns the question + options as-is, no DB write', async () => {
    const handler = new AskClarificationHandler();
    const result = await handler.execute(makeCtx(), {
      question: 'Tomate cerise ou tomate ronde ?',
      options: ['Tomate cerise', 'Tomate ronde'],
    });
    expect(result.result).toEqual({
      question: 'Tomate cerise ou tomate ronde ?',
      options: ['Tomate cerise', 'Tomate ronde'],
    });
    expect(result.reversibleAction).toBeUndefined();
  });

  it('defaults options to empty array', async () => {
    const result = await new AskClarificationHandler().execute(makeCtx(), {
      question: 'On parle de quel yaourt ?',
    });
    expect(result.result.options).toEqual([]);
  });
});

// ---- SummarizeSessionHandler ----------------------------------------

interface MockSelectChain {
  data: any[];
  filters: Record<string, unknown>;
}

function makeUserClient(rows: any[], opts: { capture?: MockSelectChain } = {}) {
  const filters: Record<string, unknown> = {};
  return {
    from(table: string) {
      if (table !== 'assistant_action_log') {
        throw new Error(`unexpected table ${table}`);
      }
      const chain: any = {
        select() {
          return chain;
        },
        eq(col: string, val: unknown) {
          filters[col] = val;
          return chain;
        },
        order() {
          return chain;
        },
        then(resolve: any) {
          if (opts.capture) {
            opts.capture.filters = { ...filters };
            opts.capture.data = rows;
          }
          return resolve({ data: rows, error: null });
        },
      };
      return chain;
    },
  };
}

describe('SummarizeSessionHandler', () => {
  it('returns empty summary when ctx has no sessionId', async () => {
    const handler = new SummarizeSessionHandler();
    const result = await handler.execute(
      makeCtx({ sessionId: undefined }),
      {}
    );
    expect(result.result).toMatchObject({
      session_id: null,
      actions: [],
      total_actions: 0,
    });
  });

  it('summarizes the session and computes counts + total cost', async () => {
    const cap: MockSelectChain = { data: [], filters: {} };
    const rows = [
      {
        id: 'a',
        step_seq: 0,
        tool: 'add_inventory_items',
        status: 'executed',
        risk_tier: 'low',
        reversible: true,
        cost_usd: 0.001,
        created_at: '2026-05-08T00:00:00Z',
        executed_at: '2026-05-08T00:00:01Z',
      },
      {
        id: 'b',
        step_seq: 1,
        tool: 'delete_recipe',
        status: 'planned',
        risk_tier: 'high',
        reversible: false,
        cost_usd: null,
        created_at: '2026-05-08T00:00:02Z',
        executed_at: null,
      },
      {
        id: 'c',
        step_seq: 2,
        tool: 'add_shopping_items',
        status: 'failed',
        risk_tier: 'low',
        reversible: true,
        cost_usd: 0.002,
        created_at: '2026-05-08T00:00:03Z',
        executed_at: null,
      },
    ];
    const ctx = makeCtx({ userClient: makeUserClient(rows, { capture: cap }) as any });

    const result = await new SummarizeSessionHandler().execute(ctx, {});
    expect(result.result.session_id).toBe(SESSION);
    expect(result.result.actions.length).toBe(3);
    expect(result.result.total_actions).toBe(3);
    expect(result.result.executed).toBe(1);
    expect(result.result.pending).toBe(1);
    expect(result.result.failed).toBe(1);
    expect(result.result.total_cost_usd).toBeCloseTo(0.003, 6);
    expect(cap.filters).toMatchObject({ user_id: USER, session_id: SESSION });
  });
});

// ---- UndoActionHandler ----------------------------------------------

class MockWriter {
  rows: ActionLogRow[] = [];
  undoneIds: string[] = [];

  async fetchById(_userId: string, id: string) {
    return this.rows.find((r) => r.id === id) ?? null;
  }
  async markUndone(id: string) {
    this.undoneIds.push(id);
    const row = this.rows.find((r) => r.id === id);
    if (row) row.status = 'undone';
  }
}

function makeRow(overrides: Partial<ActionLogRow> = {}): ActionLogRow {
  return {
    id: '44444444-4444-4444-4444-444444444444',
    user_id: USER,
    client_request_id: '22222222-2222-2222-2222-222222222222',
    session_id: SESSION,
    step_seq: 0,
    audio_sha256: null,
    tool: 'add_inventory_items',
    tool_args: {},
    risk_tier: 'low',
    status: 'executed',
    result: null,
    error_code: null,
    error_message: null,
    reversible: true,
    reversible_action: { tool: '_remove_inventory_items', args: { inventory_ids: ['inv-1'] } },
    undo_expires_at: new Date(Date.now() + 60_000).toISOString(),
    undone_at: null,
    llm_model: 'gpt-4o-mini',
    cost_usd: null,
    created_at: '2026-05-08T00:00:00Z',
    executed_at: '2026-05-08T00:00:01Z',
    updated_at: '2026-05-08T00:00:01Z',
    ...overrides,
  };
}

describe('UndoActionHandler', () => {
  it('looks up the inverse handler in the registry and executes it', async () => {
    const writer = new MockWriter();
    const row = makeRow();
    writer.rows.push(row);

    const inverseSpy = jest.fn(async (_ctx, args: any) => ({
      result: { removed: args.inventory_ids.length },
    }));
    const inverseHandler: ToolHandler = { execute: inverseSpy };

    const registry = new ToolHandlerRegistry();
    registry.register('_remove_inventory_items', inverseHandler);

    const handler = new UndoActionHandler(writer as any, registry);
    registry.register('undo_action', handler); // self-register late, like the router does

    const result = await handler.execute(makeCtx(), { action_id: row.id });
    expect(inverseSpy).toHaveBeenCalled();
    expect(result.result).toMatchObject({
      undone: true,
      action_id: row.id,
      inverse_tool: '_remove_inventory_items',
    });
    expect(writer.undoneIds).toEqual([row.id]);
  });

  it('throws UndoFailedError NOT_FOUND on a bogus id', async () => {
    const writer = new MockWriter();
    const registry = new ToolHandlerRegistry();
    const handler = new UndoActionHandler(writer as any, registry);

    await expect(
      handler.execute(makeCtx(), {
        action_id: '99999999-9999-9999-9999-999999999999',
      })
    ).rejects.toBeInstanceOf(UndoFailedError);
  });

  it('throws UndoFailedError EXPIRED past the window', async () => {
    const writer = new MockWriter();
    writer.rows.push(
      makeRow({
        undo_expires_at: new Date(Date.now() - 1000).toISOString(),
      })
    );
    const registry = new ToolHandlerRegistry();
    registry.register('_remove_inventory_items', { execute: jest.fn() } as any);
    const handler = new UndoActionHandler(writer as any, registry);

    let caught: unknown;
    try {
      await handler.execute(makeCtx(), { action_id: writer.rows[0].id });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(UndoFailedError);
    expect((caught as UndoFailedError).code).toBe('EXPIRED');
  });

  it('throws HANDLER_MISSING when the inverse tool is not registered', async () => {
    const writer = new MockWriter();
    writer.rows.push(makeRow());
    const registry = new ToolHandlerRegistry();
    const handler = new UndoActionHandler(writer as any, registry);

    let caught: unknown;
    try {
      await handler.execute(makeCtx(), { action_id: writer.rows[0].id });
    } catch (e) {
      caught = e;
    }
    expect((caught as UndoFailedError).code).toBe('HANDLER_MISSING');
  });

  it('throws NOT_REVERSIBLE when row was not executed or has no reversible_action', async () => {
    const writer = new MockWriter();
    writer.rows.push(makeRow({ status: 'planned' }));
    const registry = new ToolHandlerRegistry();
    const handler = new UndoActionHandler(writer as any, registry);

    let caught: unknown;
    try {
      await handler.execute(makeCtx(), { action_id: writer.rows[0].id });
    } catch (e) {
      caught = e;
    }
    expect((caught as UndoFailedError).code).toBe('NOT_REVERSIBLE');
  });
});
