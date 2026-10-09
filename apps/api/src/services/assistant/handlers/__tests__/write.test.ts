import { StockCommandService, StockCommandError } from '../../../stock/StockCommandService.js';
/**
 * Write-handler tests. Mocks supabase-js builder + a stub
 * ProductResolver. Goal: validate the SQL shape, the reversible_action
 * payload, and the failure branches (ambiguous products, insufficient
 * stock, missing recipe, etc.).
 */
import {
  AddInventoryItemsHandler,
  AddShoppingItemsHandler,
  MarkShoppingItemsBoughtHandler,
  UnmarkShoppingItemsBoughtHandler,
  AddRecipeToMealPlanHandler,
  ConsumeInventoryItemsHandler,
  UpdateInventoryItemHandler,
  RemoveShoppingItemsHandler,
  WriteHandlerError,
} from '../write.js';
import type { ToolExecutionContext } from '../types.js';
import type { ProductRow } from '../../ProductResolver.js';

const USER = '11111111-1111-1111-1111-111111111111';

function fakeProduct(id: string, name: string): ProductRow {
  return {
    id,
    name,
    category: 'autres',
    unit_type: 'unit',
    barcode: null,
    image_url: null,
    normalized_name: name.toLowerCase(),
    source: 'user_manual',
    created_by: null,
    created_at: '',
    updated_at: '',
  };
}

interface QueryCall {
  table: string;
  op: 'select' | 'insert' | 'update' | 'delete';
  payload?: Record<string, unknown> | unknown[];
  filters: Array<{ kind: string; col?: string; val?: unknown }>;
}

interface RouteData {
  /** Static rows returned for any select on this table. */
  selectRows?: any[];
  /** Single-row select result. */
  selectMaybeSingle?: any;
  /** Rows returned by an INSERT … SELECT. */
  insertReturning?: any[];
  /** Single row returned by INSERT … SELECT.single(). */
  insertReturningSingle?: any;
  /** UPDATE error to surface. */
  updateError?: { code?: string; message: string };
  /** DELETE count + error. */
  deleteResult?: { error?: { message: string } | null; count?: number };
}

function makeClient(plan: { routes: Record<string, RouteData> }) {
  const calls: QueryCall[] = [];

  const builder = (table: string) => {
    const route = plan.routes[table] ?? {};
    const filters: QueryCall['filters'] = [];
    let opKind: QueryCall['op'] = 'select';
    let payload: any;

    const recordCall = () => calls.push({ table, op: opKind, payload, filters: [...filters] });

    const chain: any = {
      select(_cols: string) {
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
      insert(p: any, _opts?: any) {
        opKind = 'insert';
        payload = p;
        recordCall();
        // Build the post-insert chain. supabase-js allows .insert(p) to
        // be either awaited directly OR followed by .select().single().
        const insertChain: any = {
          select() {
            return {
              single: async () => ({
                data: route.insertReturningSingle ?? null,
                error: null,
              }),
              ...{
                async then(resolve: (v: any) => unknown, reject?: (v: any) => unknown) {
                  return Promise.resolve({
                    data: route.insertReturning ?? [],
                    error: null,
                  }).then(resolve, reject);
                },
              },
            };
          },
          then(resolve: (v: any) => unknown, reject?: (v: any) => unknown) {
            return Promise.resolve({
              data: null,
              error: null,
              count: 0,
            }).then(resolve, reject);
          },
        };
        return insertChain;
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
          then(resolve: (v: any) => unknown, reject?: (v: any) => unknown) {
            recordCall();
            return Promise.resolve({
              data: null,
              error: route.updateError ?? null,
            }).then(resolve, reject);
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
          then(resolve: (v: any) => unknown, reject?: (v: any) => unknown) {
            recordCall();
            return Promise.resolve({
              data: null,
              error: route.deleteResult?.error ?? null,
              count: route.deleteResult?.count ?? 0,
            }).then(resolve, reject);
          },
        };
        return deleteChain;
      },
      maybeSingle: async () => {
        recordCall();
        return { data: route.selectMaybeSingle ?? null, error: null };
      },
      then(resolve: (v: any) => unknown, reject?: (v: any) => unknown) {
        recordCall();
        return Promise.resolve({
          data: route.selectRows ?? [],
          error: null,
        }).then(resolve, reject);
      },
    };
    return chain;
  };

  return { client: { from: (table: string) => builder(table) }, calls };
}

interface ResolverPlan {
  matched?: ProductRow[];
  ambiguous?: Array<{ name: string; candidates: ProductRow[] }>;
  created?: ProductRow[];
}

function makeResolver(plan: ResolverPlan = {}) {
  return {
    async resolveBatch(_userId: string, inputs: Array<{ name: string }>) {
      return inputs.map((input) => {
        const created = plan.created?.find((p) => p.name.toLowerCase().includes(input.name.toLowerCase()));
        if (created) return { kind: 'created' as const, product: created };
        const ambig = plan.ambiguous?.find((a) =>
          a.name.toLowerCase() === input.name.toLowerCase()
        );
        if (ambig) {
          return {
            kind: 'ambiguous' as const,
            candidates: ambig.candidates.map((c) => ({ product: c, score: 0.8 })),
          };
        }
        const product = plan.matched?.find((p) =>
          p.name.toLowerCase().includes(input.name.toLowerCase())
        );
        if (product) {
          return {
            kind: 'matched' as const,
            product,
            confidence: 1,
            via: 'exact' as const,
          };
        }
        // default: treat as created with the input name
        return {
          kind: 'created' as const,
          product: fakeProduct('p-' + input.name, input.name),
        };
      });
    },
    async resolve() {
      throw new Error('not used');
    },
  };
}

function makeCtx(client: any, resolverPlan: ResolverPlan = {}): ToolExecutionContext {
  return {
    userId: USER,
    commandId: "40000000-0000-4000-8000-000000000001",
    userClient: client,
    adminClient: {} as any,
    productResolver: makeResolver(resolverPlan) as any,
  };
}

// ---- LOW : add_inventory_items --------------------------------------

describe('AddInventoryItemsHandler', () => {
  it('inserts resolved items + reversible_action with row ids', async () => {
    const tomate = fakeProduct('p-tomate', 'Tomate');
    const { client, calls } = makeClient({
      routes: {
        inventory: {
          insertReturning: [
            { id: 'inv-1', product_id: 'p-tomate', quantity: 2 },
          ],
        },
      },
    });
    const handler = new AddInventoryItemsHandler();
    const result = await handler.execute(
      makeCtx(client, { matched: [tomate] }),
      { items: [{ name: 'Tomate', quantity: 2 }] }
    );
    expect(result.result.added).toEqual([
      {
        inventory_id: 'inv-1',
        product_id: 'p-tomate',
        product_name: 'Tomate',
        quantity: 2,
      },
    ]);
    expect(result.result.ambiguous).toEqual([]);
    expect(result.reversibleAction).toEqual({
      tool: '_remove_inventory_items',
      args: { inventory_ids: ['inv-1'] },
    });
    const insert = calls.find((c) => c.op === 'insert');
    expect(insert?.table).toBe('inventory');
    expect(insert?.payload).toEqual([
      {
        user_id: USER,
        product_id: 'p-tomate',
        quantity: 2,
        expiry_date: null,
        unit: "unit",
      },
    ]);
  });

  it('reports ambiguous items and skips them, leaving reversible=null when nothing was inserted', async () => {
    const { client } = makeClient({
      routes: {
        inventory: { insertReturning: [] },
      },
    });
    const handler = new AddInventoryItemsHandler();
    const result = await handler.execute(
      makeCtx(client, {
        ambiguous: [
          {
            name: 'yaourt',
            candidates: [fakeProduct('a', 'yaourt grec'), fakeProduct('b', 'yaourt nature')],
          },
        ],
      }),
      { items: [{ name: 'yaourt', quantity: 1 }] }
    );
    expect(result.result.added).toEqual([]);
    expect(result.result.ambiguous).toHaveLength(1);
    expect(result.result.ambiguous[0].candidates.map((c) => c.product_name)).toEqual([
      'yaourt grec',
      'yaourt nature',
    ]);
    expect(result.reversibleAction).toBeNull();
  });
});

// ---- LOW : add_shopping_items ---------------------------------------

describe('AddShoppingItemsHandler', () => {
  it('inserts items and reverses via the catalog tool remove_shopping_items', async () => {
    const lait = fakeProduct('p-lait', 'Lait');
    const { client } = makeClient({
      routes: {
        shopping_list: {
          insertReturning: [{ id: 's-1', product_id: 'p-lait', quantity: 1 }],
        },
      },
    });
    const result = await new AddShoppingItemsHandler().execute(
      makeCtx(client, { matched: [lait] }),
      { items: [{ name: 'Lait', quantity: 1 }] }
    );
    expect(result.result.added[0]).toMatchObject({
      shopping_item_id: 's-1',
      product_name: 'Lait',
    });
    expect(result.reversibleAction).toEqual({
      tool: 'remove_shopping_items',
      args: { shopping_item_ids: ['s-1'] },
    });
  });
});

// ---- LOW : mark / unmark --------------------------------------------

describe('MarkShoppingItemsBoughtHandler', () => {
  it('marks bought, reversible via unmark', async () => {
    const { client, calls } = makeClient({
      routes: {
        shopping_list: { selectRows: [{ id: 'a', is_purchased: false }] },
      },
    });
    const result = await new MarkShoppingItemsBoughtHandler().execute(
      makeCtx(client),
      { shopping_item_ids: ['a'] }
    );
    expect(result.result.updated).toBe(1);
    expect(result.reversibleAction).toEqual({
      tool: 'unmark_shopping_items_bought',
      args: { shopping_item_ids: ['a'] },
    });
    expect(calls.find((c) => c.op === 'update')?.payload).toEqual({ is_purchased: true });
  });

  it('throws SHOPPING_NOT_FOUND when no ids match', async () => {
    const { client } = makeClient({
      routes: { shopping_list: { selectRows: [] } },
    });
    await expect(
      new MarkShoppingItemsBoughtHandler().execute(makeCtx(client), {
        shopping_item_ids: ['no-such'],
      })
    ).rejects.toMatchObject({ code: 'SHOPPING_NOT_FOUND' });
  });
});

describe('UnmarkShoppingItemsBoughtHandler', () => {
  it('reverses via mark', async () => {
    const { client } = makeClient({
      routes: { shopping_list: { selectRows: [{ id: 'b', is_purchased: true }] } },
    });
    const result = await new UnmarkShoppingItemsBoughtHandler().execute(
      makeCtx(client),
      { shopping_item_ids: ['b'] }
    );
    expect(result.reversibleAction).toEqual({
      tool: 'mark_shopping_items_bought',
      args: { shopping_item_ids: ['b'] },
    });
  });
});

// Stock handlers use the same service as explicit UI commands. Real RPC effects are tested separately.
const receipt = {
  command_id: '40000000-0000-4000-8000-000000000001', command_type: 'consume_inventory', status: 'confirmed' as const,
  affected_tables: ['inventory'], meal_plan_id: 'plan-1', meal_plan_entry_id: 'entry-1',
  changes: [{ id: 'inv-1', before_quantity: 5, after_quantity: 3, unit: 'kg', stock_version: 3 }],
};
beforeEach(() => {
  jest.restoreAllMocks();
  jest.spyOn(StockCommandService.prototype,'getResult').mockResolvedValue(null);
  jest.spyOn(StockCommandService.prototype,'preview').mockResolvedValue({
    recipe: { id: '22222222-2222-4222-8222-222222222222', source: 'user_recipes', canonicalId: 'canonical', name: 'Pasta', servings: 4, version: 'v', ingredients: [] },
    servings: 4, lots: [], allocations: [], missing: [],
  });
  jest.spyOn(StockCommandService.prototype,'execute').mockResolvedValue(receipt);
});

describe('AddRecipeToMealPlanHandler', () => {
  it('plans the exact library identity and date through one server command', async () => {
    const recipeId = '22222222-2222-4222-8222-222222222222';
    const { client,calls } = makeClient({ routes: {} });
    const result = await new AddRecipeToMealPlanHandler().execute(makeCtx(client),{
      recipe_id: recipeId, week_start: '2026-05-04', day_of_week: 1, meal_type: 'dinner',
    });
    expect(StockCommandService.prototype.execute).toHaveBeenCalledWith(USER,expect.objectContaining({
      command_type: 'plan_recipe', payload: { recipe: { id: recipeId, source: 'user_recipes' }, servings: 4, date: '2026-05-05', meal_type: 'dinner' },
    }));
    expect(result.result.entry_id).toBe('entry-1');
    expect(result.reversibleAction).toBeNull();
    expect(calls).toEqual([]);
  });
  it('returns a committed receipt before resolving a recipe changed since the original request', async () => {
    jest.mocked(StockCommandService.prototype.getResult).mockResolvedValueOnce(receipt);
    await new AddRecipeToMealPlanHandler().execute(makeCtx({}),{ recipe_id: 'recipe', week_start: '2026-05-04', day_of_week: 0, meal_type: 'lunch' });
    expect(StockCommandService.prototype.preview).not.toHaveBeenCalled();
    expect(StockCommandService.prototype.execute).not.toHaveBeenCalled();
  });
  it('surfaces a private or absent recipe without a fabricated menu entry', async () => {
    jest.mocked(StockCommandService.prototype.preview).mockRejectedValueOnce(new StockCommandError('RECIPE_NOT_FOUND',404));
    await expect(new AddRecipeToMealPlanHandler().execute(makeCtx({}),{ recipe_id: 'private', week_start: '2026-05-04', day_of_week: 0, meal_type: 'dinner' })).rejects.toMatchObject({ code: 'RECIPE_NOT_FOUND' });
    expect(StockCommandService.prototype.execute).not.toHaveBeenCalled();
  });
});
describe('ConsumeInventoryItemsHandler', () => {
  it('passes units and expected versions to the atomic command and records its inverse identity', async () => {
    const { client,calls } = makeClient({ routes: { inventory: { selectRows: [{ id: 'inv-1', quantity: 5, unit: 'kg', stock_version: 2 }] } } });
    const result = await new ConsumeInventoryItemsHandler().execute(makeCtx(client),{ items: [{ inventory_id: 'inv-1', quantity: 200, unit: 'g' }] });
    expect(StockCommandService.prototype.execute).toHaveBeenCalledWith(USER,expect.objectContaining({
      command_type: 'consume_inventory', payload: { items: [{ id: 'inv-1', quantity: 200, unit: 'g', expected_version: 2 }] },
    }));
    expect(result.result.consumed[0].new_quantity).toBe(3);
    expect(result.reversibleAction).toEqual({ tool: '_undo_stock_command', args: { original_command_id: receipt.command_id } });
    expect(calls.some(call => call.op === 'update')).toBe(false);
  });
  it('rejects the whole batch if stock is insufficient, rather than reporting partial success', async () => {
    jest.mocked(StockCommandService.prototype.execute).mockRejectedValueOnce(new StockCommandError('INSUFFICIENT_QUANTITY'));
    const { client } = makeClient({ routes: { inventory: { selectRows: [{ id: 'inv-1', quantity: 5, unit: 'kg', stock_version: 2 }] } } });
    await expect(new ConsumeInventoryItemsHandler().execute(makeCtx(client),{ items: [{ inventory_id: 'inv-1', quantity: 99 }] })).rejects.toMatchObject({ code: 'INSUFFICIENT_QUANTITY' });
  });
  it('replays the committed result without rereading or repeating the stock decrement', async () => {
    jest.mocked(StockCommandService.prototype.getResult).mockResolvedValueOnce(receipt);
    const result = await new ConsumeInventoryItemsHandler().execute(makeCtx({}),{ items: [{ inventory_id: 'inv-1', quantity: 2 }] });
    expect(result.result.consumed).toEqual([{ inventory_id: 'inv-1', new_quantity: 3, consumed_quantity: 2 }]);
    expect(StockCommandService.prototype.execute).not.toHaveBeenCalled();
  });
});
describe('UpdateInventoryItemHandler', () => {
  it('corrects with an expected version and records an inverse command, never an absolute snapshot', async () => {
    const { client,calls } = makeClient({ routes: { inventory: { selectMaybeSingle: { quantity: 5, unit: 'kg', stock_version: 2, location: 'Placard', expiry_date: null } } } });
    const result = await new UpdateInventoryItemHandler().execute(makeCtx(client),{ inventory_id: 'inv-1', quantity: 3, location: 'Frigo' });
    expect(StockCommandService.prototype.execute).toHaveBeenCalledWith(USER,expect.objectContaining({ payload: { items: [{ id: 'inv-1', quantity: 3, unit: 'kg', expected_version: 2, location: 'Frigo' }] } }));
    expect(result.reversibleAction?.tool).toBe('_undo_stock_command');
    expect(calls.some(call => call.op === 'update')).toBe(false);
  });
  it('rejects a missing row or an empty correction', async () => {
    const { client } = makeClient({ routes: {} });
    await expect(new UpdateInventoryItemHandler().execute(makeCtx(client),{ inventory_id: 'missing', quantity: 3 })).rejects.toMatchObject({ code: 'INVENTORY_NOT_FOUND' });
    await expect(new UpdateInventoryItemHandler().execute(makeCtx(client),{ inventory_id: 'missing' })).rejects.toMatchObject({ code: 'EMPTY_UPDATE' });
  });
});

// ---- MEDIUM : remove_shopping_items ---------------------------------

describe('RemoveShoppingItemsHandler', () => {
  it('snapshots rows before delete and reverses via _restore_shopping_items', async () => {
    const snap = {
      id: 's1',
      user_id: USER,
      product_id: 'p1',
      quantity: 2,
      is_purchased: false,
      priority: 1,
      estimated_price: null,
      store_section: null,
    };
    const { client, calls } = makeClient({
      routes: {
        shopping_list: {
          selectRows: [snap],
        },
      },
    });
    const result = await new RemoveShoppingItemsHandler().execute(makeCtx(client), {
      shopping_item_ids: ['s1'],
    });
    expect(result.result).toEqual({ removed: 1, removed_ids: ['s1'] });
    expect(result.reversibleAction).toEqual({
      tool: '_restore_shopping_items',
      args: { snapshots: [snap] },
    });
    expect(calls.find((c) => c.op === 'delete')).toBeDefined();
  });

  it('returns no-op when no rows match the ids', async () => {
    const { client } = makeClient({ routes: { shopping_list: { selectRows: [] } } });
    const result = await new RemoveShoppingItemsHandler().execute(makeCtx(client), {
      shopping_item_ids: ['nope'],
    });
    expect(result.result).toEqual({ removed: 0, removed_ids: [] });
    expect(result.reversibleAction).toBeNull();
  });
});

// ---- WriteHandlerError shape ----------------------------------------

describe('WriteHandlerError', () => {
  it('carries a typed code', () => {
    const err = new WriteHandlerError('PRODUCT_AMBIGUOUS', 'oops');
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('PRODUCT_AMBIGUOUS');
  });
});

// ---- PRP-226 PR4 : reco cache invalidation hooks --------------------

describe('PRP-226 PR4 — recommendation cache invalidation', () => {
  function makeCtxWithWriter(client: any, resolverPlan: ResolverPlan = {}) {
    const invalidations: string[] = [];
    const ctx = {
      ...makeCtx(client, resolverPlan),
      eventWriter: {
        async invalidateUserCache(userId: string) {
          invalidations.push(userId);
          return 1;
        },
      } as unknown as ToolExecutionContext['eventWriter'],
    } as ToolExecutionContext;
    return { ctx, invalidations };
  }

  it('add_inventory_items drops the cache after a successful insert', async () => {
    const tomate = fakeProduct('p-tomate', 'Tomate');
    const { client } = makeClient({
      routes: {
        inventory: {
          insertReturning: [{ id: 'inv-1', product_id: 'p-tomate', quantity: 2 }],
        },
      },
    });
    const { ctx, invalidations } = makeCtxWithWriter(client, { matched: [tomate] });
    await new AddInventoryItemsHandler().execute(ctx, {
      items: [{ name: 'Tomate', quantity: 2 }],
    });
    expect(invalidations).toEqual([USER]);
  });

  it('add_inventory_items skips the cache invalidation when nothing was inserted', async () => {
    const { client } = makeClient({ routes: { inventory: { insertReturning: [] } } });
    const { ctx, invalidations } = makeCtxWithWriter(client, {
      ambiguous: [
        { name: 'yaourt', candidates: [fakeProduct('a', 'yaourt grec')] },
      ],
    });
    await new AddInventoryItemsHandler().execute(ctx, {
      items: [{ name: 'yaourt', quantity: 1 }],
    });
    expect(invalidations).toEqual([]);
  });

  it('stock-command invalidation is handled inside the database transaction', async () => {
    const { client } = makeClient({
      routes: {
        inventory: { selectRows: [{ id: 'inv-1', quantity: 5, unit: 'kg', stock_version: 0 }] },
      },
    });
    const { ctx, invalidations } = makeCtxWithWriter(client);
    await new ConsumeInventoryItemsHandler().execute(ctx, {
      items: [{ inventory_id: 'inv-1', quantity: 2 }],
    });
    expect(invalidations).toEqual([]);
  });

  it('refused stock commands do not advertise an invalidation or partial success', async () => {
    jest.mocked(StockCommandService.prototype.execute).mockRejectedValueOnce(new StockCommandError('INSUFFICIENT_QUANTITY'));
    const { client } = makeClient({ routes: { inventory: { selectRows: [{ id: 'inv-1', quantity: 1, unit: 'kg', stock_version: 0 }] } } });
    const { ctx,invalidations } = makeCtxWithWriter(client);
    await expect(new ConsumeInventoryItemsHandler().execute(ctx,{ items: [{ inventory_id: 'inv-1', quantity: 99 }] })).rejects.toMatchObject({ code: 'INSUFFICIENT_QUANTITY' });
    expect(invalidations).toEqual([]);
  });

  it('no eventWriter on ctx → no crash, no invalidation (PR2 behaviour)', async () => {
    const tomate = fakeProduct('p-tomate', 'Tomate');
    const { client } = makeClient({
      routes: {
        inventory: {
          insertReturning: [{ id: 'inv-1', product_id: 'p-tomate', quantity: 1 }],
        },
      },
    });
    // makeCtx returns a ctx without eventWriter — handler must stay green.
    const result = await new AddInventoryItemsHandler().execute(
      makeCtx(client, { matched: [tomate] }),
      { items: [{ name: 'Tomate', quantity: 1 }] },
    );
    expect(result.result.added).toHaveLength(1);
  });
});
