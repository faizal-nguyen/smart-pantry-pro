import {
  DeleteRecipeHandler,
  ClearShoppingListHandler,
  ClearInventoryCategoryHandler,
  ImportRecipeFromUrlHandler,
  HighHandlerError,
} from '../high.js';
import type { ToolExecutionContext } from '../types.js';

const USER = '11111111-1111-1111-1111-111111111111';
const RECIPE = '22222222-2222-2222-2222-222222222222';

interface QueryCall {
  table: string;
  op: 'select' | 'delete' | 'insert' | 'update';
  filters: Array<{ kind: string; col?: string; val?: unknown }>;
}

function makeClient(plan: {
  routes?: Record<
    string,
    {
      selectMaybeSingle?: any;
      selectRows?: any[];
      deleteCount?: number;
      deleteError?: { message: string };
    }
  >;
}) {
  const calls: QueryCall[] = [];
  const builder = (table: string) => {
    const route = plan.routes?.[table] ?? {};
    let opKind: QueryCall['op'] = 'select';
    const filters: QueryCall['filters'] = [];

    const record = () => calls.push({ table, op: opKind, filters: [...filters] });

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
      maybeSingle: async () => {
        record();
        return { data: route.selectMaybeSingle ?? null, error: null };
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
              error: route.deleteError ?? null,
              count: route.deleteCount ?? 0,
            }).then(resolve, reject);
          },
        };
        return deleteChain;
      },
      then(resolve: any, reject?: any) {
        record();
        return Promise.resolve({ data: route.selectRows ?? [], error: null }).then(
          resolve,
          reject
        );
      },
    };
    return chain;
  };
  return { client: { from: (t: string) => builder(t) }, calls };
}

function makeCtx(client: any): ToolExecutionContext {
  return {
    userId: USER,
    userClient: client,
    adminClient: {} as any,
    productResolver: {} as any,
  };
}

describe('DeleteRecipeHandler', () => {
  it('throws RECIPE_NOT_FOUND when the row is missing', async () => {
    const { client } = makeClient({ routes: { recipes: { selectMaybeSingle: null } } });
    await expect(
      new DeleteRecipeHandler().execute(makeCtx(client), { recipe_id: RECIPE })
    ).rejects.toMatchObject({ code: 'RECIPE_NOT_FOUND' });
  });

  it('issues DELETE WHERE user_id AND id when found, returns deleted_recipe_id, non-reversible', async () => {
    const { client, calls } = makeClient({
      routes: { recipes: { selectMaybeSingle: { id: RECIPE } } },
    });
    const result = await new DeleteRecipeHandler().execute(makeCtx(client), {
      recipe_id: RECIPE,
    });
    expect(result.result).toEqual({ deleted_recipe_id: RECIPE });
    expect(result.reversibleAction).toBeUndefined();
    const del = calls.find((c) => c.op === 'delete');
    expect(del?.filters).toContainEqual({ kind: 'eq', col: 'user_id', val: USER });
    expect(del?.filters).toContainEqual({ kind: 'eq', col: 'id', val: RECIPE });
  });
});

describe('ClearShoppingListHandler', () => {
  it('deletes all rows for the user when no flag', async () => {
    const { client, calls } = makeClient({
      routes: { shopping_list: { deleteCount: 7 } },
    });
    const result = await new ClearShoppingListHandler().execute(makeCtx(client), {});
    expect(result.result.removed).toBe(7);
    const del = calls.find((c) => c.op === 'delete');
    expect(del?.filters).toContainEqual({ kind: 'eq', col: 'user_id', val: USER });
    expect(del?.filters.find((f) => f.col === 'is_purchased')).toBeUndefined();
  });

  it('restricts to is_purchased=true when purchased_only=true', async () => {
    const { client, calls } = makeClient({
      routes: { shopping_list: { deleteCount: 3 } },
    });
    const result = await new ClearShoppingListHandler().execute(makeCtx(client), {
      purchased_only: true,
    });
    expect(result.result.removed).toBe(3);
    const del = calls.find((c) => c.op === 'delete');
    expect(del?.filters).toContainEqual({ kind: 'eq', col: 'is_purchased', val: true });
  });
});

describe('ClearInventoryCategoryHandler', () => {
  it('returns 0 with no DELETE when no products in the category', async () => {
    const { client, calls } = makeClient({
      routes: {
        products: { selectRows: [] },
      },
    });
    const result = await new ClearInventoryCategoryHandler().execute(makeCtx(client), {
      category: 'epices',
    });
    expect(result.result).toEqual({ removed: 0, category: 'epices' });
    expect(calls.find((c) => c.op === 'delete')).toBeUndefined();
  });

  it('deletes inventory rows matching product_ids in the category', async () => {
    const { client, calls } = makeClient({
      routes: {
        products: { selectRows: [{ id: 'p1' }, { id: 'p2' }] },
        inventory: { deleteCount: 4 },
      },
    });
    const result = await new ClearInventoryCategoryHandler().execute(makeCtx(client), {
      category: 'fruits-legumes',
    });
    expect(result.result).toEqual({ removed: 4, category: 'fruits-legumes' });
    const del = calls.find((c) => c.table === 'inventory' && c.op === 'delete');
    expect(del?.filters).toContainEqual({ kind: 'eq', col: 'user_id', val: USER });
    expect(del?.filters).toContainEqual({ kind: 'in', col: 'product_id', val: ['p1', 'p2'] });
  });
});

describe('ImportRecipeFromUrlHandler', () => {
  function makeService(opts: {
    captureResult?: any;
    captureThrow?: Error;
    extractResult?: any;
    extractThrow?: Error;
    saveResult?: any;
    saveThrow?: Error;
  }) {
    return {
      capture: jest.fn(async () => {
        if (opts.captureThrow) throw opts.captureThrow;
        return (
          opts.captureResult ?? {
            import: { id: 'imp-1', recipe_id: null },
            duplicate: false,
          }
        );
      }),
      extract: jest.fn(async () => {
        if (opts.extractThrow) throw opts.extractThrow;
        return (
          opts.extractResult ?? {
            draft: { title: 'Pasta' },
            cost: { usd: 0.0123 },
          }
        );
      }),
      save: jest.fn(async () => {
        if (opts.saveThrow) throw opts.saveThrow;
        return opts.saveResult ?? { recipeId: 'r-new', import: {} };
      }),
    };
  }

  it('chains capture + extract + save and bubbles cost through extraCostUsd', async () => {
    const service = makeService({});
    const handler = new ImportRecipeFromUrlHandler(() => service as any);
    const result = await handler.execute(makeCtx({}), {
      url: 'https://example.com/recipe',
    });
    expect(service.capture).toHaveBeenCalledWith(USER, 'https://example.com/recipe');
    expect(service.extract).toHaveBeenCalledWith(USER, 'imp-1');
    expect(service.save).toHaveBeenCalled();
    expect(result.result).toEqual({
      recipe_id: 'r-new',
      import_id: 'imp-1',
      duplicate: false,
      draft_title: 'Pasta',
      cost_usd: 0.0123,
    });
    expect(result.extraCostUsd).toBe(0.0123);
  });

  it('returns early when capture is a duplicate that already has a recipe_id', async () => {
    const service = makeService({
      captureResult: { import: { id: 'imp-existing', recipe_id: 'r-existing' }, duplicate: true },
    });
    const handler = new ImportRecipeFromUrlHandler(() => service as any);
    const result = await handler.execute(makeCtx({}), {
      url: 'https://example.com/recipe',
    });
    expect(service.extract).not.toHaveBeenCalled();
    expect(service.save).not.toHaveBeenCalled();
    expect(result.result).toEqual({
      recipe_id: 'r-existing',
      import_id: 'imp-existing',
      duplicate: true,
    });
  });

  it('continues to extract+save when capture is a duplicate but the import has no recipe_id yet', async () => {
    const service = makeService({
      captureResult: { import: { id: 'imp-stuck', recipe_id: null }, duplicate: true },
    });
    const handler = new ImportRecipeFromUrlHandler(() => service as any);
    await handler.execute(makeCtx({}), { url: 'https://example.com/recipe' });
    expect(service.extract).toHaveBeenCalled();
    expect(service.save).toHaveBeenCalled();
  });

  it('wraps capture errors as IMPORT_FAILED', async () => {
    const service = makeService({ captureThrow: new Error('boom') });
    const handler = new ImportRecipeFromUrlHandler(() => service as any);
    await expect(
      handler.execute(makeCtx({}), { url: 'https://example.com/recipe' })
    ).rejects.toMatchObject({ code: 'IMPORT_FAILED' });
  });

  it('wraps extract errors as IMPORT_FAILED', async () => {
    const service = makeService({ extractThrow: new Error('whisper down') });
    const handler = new ImportRecipeFromUrlHandler(() => service as any);
    await expect(
      handler.execute(makeCtx({}), { url: 'https://example.com/recipe' })
    ).rejects.toMatchObject({ code: 'IMPORT_FAILED' });
  });

  it('wraps save errors as IMPORT_FAILED', async () => {
    const service = makeService({ saveThrow: new Error('rls') });
    const handler = new ImportRecipeFromUrlHandler(() => service as any);
    await expect(
      handler.execute(makeCtx({}), { url: 'https://example.com/recipe' })
    ).rejects.toMatchObject({ code: 'IMPORT_FAILED' });
  });
});

describe('HighHandlerError shape', () => {
  it('carries a typed code', () => {
    const err = new HighHandlerError('RECIPE_NOT_FOUND', 'msg');
    expect(err.code).toBe('RECIPE_NOT_FOUND');
  });
});
