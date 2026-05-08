/**
 * Internal-handler tests. Each handler is the inverse of a public one;
 * the contract is "given the args we built at execute time, produce
 * the database state we had before". We mock supabase-js and assert
 * the right delete/update/insert payloads.
 */
import {
  RemoveInventoryItemsInternalHandler,
  RestoreInventoryQuantitiesInternalHandler,
  RestoreInventoryItemSnapshotInternalHandler,
  RestoreShoppingItemsInternalHandler,
  RemoveMealPlanEntriesInternalHandler,
  INTERNAL_TOOL_NAMES,
} from '../internal.js';
import type { ToolExecutionContext } from '../types.js';

const USER = '11111111-1111-1111-1111-111111111111';

interface QueryCall {
  table: string;
  op: string;
  payload?: any;
  filters: Array<{ kind: string; col?: string; val?: unknown }>;
}

function makeClient(plan: {
  selectRows?: Record<string, any[]>;
  count?: number;
}) {
  const calls: QueryCall[] = [];

  const builder = (table: string) => {
    let opKind = 'select';
    let payload: any;
    const filters: QueryCall['filters'] = [];

    const record = () => calls.push({ table, op: opKind, payload, filters: [...filters] });

    const chain: any = {
      select() {
        return chain;
      },
      eq(col: string, val: unknown) {
        filters.push({ kind: 'eq', col, val });
        return chain;
      },
      in(col: string, val: unknown) {
        filters.push({ kind: 'in', col, val });
        return chain;
      },
      update(p: any) {
        opKind = 'update';
        payload = p;
        const updateChain: any = {
          eq(col: string, val: unknown) {
            filters.push({ kind: 'eq', col, val });
            return updateChain;
          },
          in(col: string, val: unknown) {
            filters.push({ kind: 'in', col, val });
            return updateChain;
          },
          then(resolve: any, reject?: any) {
            record();
            return Promise.resolve({ data: null, error: null }).then(resolve, reject);
          },
        };
        return updateChain;
      },
      delete(_opts?: any) {
        opKind = 'delete';
        const deleteChain: any = {
          eq(col: string, val: unknown) {
            filters.push({ kind: 'eq', col, val });
            return deleteChain;
          },
          in(col: string, val: unknown) {
            filters.push({ kind: 'in', col, val });
            return deleteChain;
          },
          then(resolve: any, reject?: any) {
            record();
            return Promise.resolve({
              data: null,
              error: null,
              count: plan.count ?? 0,
            }).then(resolve, reject);
          },
        };
        return deleteChain;
      },
      insert(p: any, _opts?: any) {
        opKind = 'insert';
        payload = p;
        return {
          then(resolve: any, reject?: any) {
            record();
            return Promise.resolve({
              data: null,
              error: null,
              count: Array.isArray(p) ? p.length : 1,
            }).then(resolve, reject);
          },
        };
      },
      then(resolve: any, reject?: any) {
        record();
        return Promise.resolve({
          data: plan.selectRows?.[table] ?? [],
          error: null,
        }).then(resolve, reject);
      },
    };
    return chain;
  };

  return { client: { from: builder }, calls };
}

function makeCtx(client: any): ToolExecutionContext {
  return {
    userId: USER,
    userClient: client,
    adminClient: {} as any,
    productResolver: {} as any,
  };
}

describe('Internal tool name list', () => {
  it('matches the documented set (no orphans, no extras)', () => {
    expect(INTERNAL_TOOL_NAMES).toEqual([
      '_remove_inventory_items',
      '_restore_inventory_quantities',
      '_restore_inventory_item_snapshot',
      '_restore_shopping_items',
      '_remove_meal_plan_entries',
    ]);
  });
});

describe('RemoveInventoryItemsInternalHandler', () => {
  it('returns 0 on empty ids without hitting the DB', async () => {
    const { client, calls } = makeClient({});
    const handler = new RemoveInventoryItemsInternalHandler();
    const r = await handler.execute(makeCtx(client), { inventory_ids: [] });
    expect(r.result.removed).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('issues a DELETE WHERE user_id AND id IN', async () => {
    const { client, calls } = makeClient({ count: 2 });
    const handler = new RemoveInventoryItemsInternalHandler();
    const r = await handler.execute(makeCtx(client), { inventory_ids: ['a', 'b'] });
    expect(r.result.removed).toBe(2);
    expect(calls[0].op).toBe('delete');
    expect(calls[0].filters).toContainEqual({ kind: 'eq', col: 'user_id', val: USER });
    expect(calls[0].filters).toContainEqual({ kind: 'in', col: 'id', val: ['a', 'b'] });
  });
});

describe('RestoreInventoryQuantitiesInternalHandler', () => {
  it('reads current quantities then re-adds the deltas one by one', async () => {
    const { client, calls } = makeClient({
      selectRows: { inventory: [{ id: 'a', quantity: 3 }, { id: 'b', quantity: 0 }] },
    });
    const handler = new RestoreInventoryQuantitiesInternalHandler();
    const r = await handler.execute(makeCtx(client), {
      deltas: [
        { inventory_id: 'a', quantity: 2 },
        { inventory_id: 'b', quantity: 5 },
      ],
    });
    expect(r.result.restored).toBe(2);
    const updates = calls.filter((c) => c.op === 'update');
    expect(updates.map((u) => u.payload)).toEqual([{ quantity: 5 }, { quantity: 5 }]);
  });

  it('skips deltas whose row no longer exists', async () => {
    const { client } = makeClient({
      selectRows: { inventory: [{ id: 'a', quantity: 3 }] },
    });
    const handler = new RestoreInventoryQuantitiesInternalHandler();
    const r = await handler.execute(makeCtx(client), {
      deltas: [
        { inventory_id: 'a', quantity: 2 },
        { inventory_id: 'gone', quantity: 1 },
      ],
    });
    expect(r.result.restored).toBe(1);
  });

  it('returns 0 on empty deltas without hitting the DB', async () => {
    const { client, calls } = makeClient({});
    const r = await new RestoreInventoryQuantitiesInternalHandler().execute(makeCtx(client), {
      deltas: [],
    });
    expect(r.result.restored).toBe(0);
    expect(calls).toHaveLength(0);
  });
});

describe('RestoreInventoryItemSnapshotInternalHandler', () => {
  it('writes only the fields present in the snapshot', async () => {
    const { client, calls } = makeClient({});
    const handler = new RestoreInventoryItemSnapshotInternalHandler();
    const r = await handler.execute(makeCtx(client), {
      inventory_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      snapshot: { quantity: 12, expiry_date: '2030-01-01' },
    });
    expect(r.result.restored).toBe(true);
    const update = calls.find((c) => c.op === 'update');
    expect(update?.payload).toEqual({ quantity: 12, expiry_date: '2030-01-01' });
  });

  it('is a no-op when the snapshot is empty', async () => {
    const { client, calls } = makeClient({});
    const r = await new RestoreInventoryItemSnapshotInternalHandler().execute(makeCtx(client), {
      inventory_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      snapshot: {},
    });
    expect(r.result.restored).toBe(false);
    expect(calls).toHaveLength(0);
  });
});

describe('RestoreShoppingItemsInternalHandler', () => {
  it('re-inserts only snapshots for the current user', async () => {
    const { client, calls } = makeClient({});
    const handler = new RestoreShoppingItemsInternalHandler();
    const r = await handler.execute(makeCtx(client), {
      snapshots: [
        {
          id: 's1',
          user_id: USER,
          product_id: 'p1',
          quantity: 1,
          is_purchased: false,
          priority: null,
          estimated_price: null,
          store_section: null,
        },
        {
          id: 's2',
          user_id: 'other-user',
          product_id: 'p2',
          quantity: 1,
          is_purchased: false,
          priority: null,
          estimated_price: null,
          store_section: null,
        },
      ],
    });
    expect(r.result.restored).toBe(1);
    const insert = calls.find((c) => c.op === 'insert');
    expect((insert?.payload as any[])[0]).toEqual(
      expect.objectContaining({ id: 's1', user_id: USER, product_id: 'p1' })
    );
    expect(insert?.payload).toHaveLength(1);
  });

  it('returns 0 with no DB call when snapshots is empty', async () => {
    const { client, calls } = makeClient({});
    const r = await new RestoreShoppingItemsInternalHandler().execute(makeCtx(client), {
      snapshots: [],
    });
    expect(r.result.restored).toBe(0);
    expect(calls).toHaveLength(0);
  });
});

describe('RemoveMealPlanEntriesInternalHandler', () => {
  it('issues a DELETE WHERE id IN', async () => {
    const { client, calls } = makeClient({ count: 1 });
    const r = await new RemoveMealPlanEntriesInternalHandler().execute(makeCtx(client), {
      entry_ids: ['e1'],
    });
    expect(r.result.removed).toBe(1);
    expect(calls[0].filters).toContainEqual({ kind: 'in', col: 'id', val: ['e1'] });
  });

  it('returns 0 on empty input', async () => {
    const { client, calls } = makeClient({});
    const r = await new RemoveMealPlanEntriesInternalHandler().execute(makeCtx(client), {
      entry_ids: [],
    });
    expect(r.result.removed).toBe(0);
    expect(calls).toHaveLength(0);
  });
});
