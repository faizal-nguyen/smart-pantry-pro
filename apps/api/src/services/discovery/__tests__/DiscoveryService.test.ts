import type { SupabaseClient } from '@supabase/supabase-js';
import { emptyNutritionProfile } from '@smart/shared';
import { DiscoveryService } from '../DiscoveryService.js';
import { NutritionProfileService } from '../../recommendations/NutritionProfileService.js';

const owner = '00000000-0000-4000-8000-000000000001';
const foreign = '00000000-0000-4000-8000-000000000002';
const uuid = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const now = new Date('2026-10-12T10:00:00Z');
type Row = Record<string, unknown>;
type Trace = { table: string; equals: [string, unknown][]; inIds: unknown[]; range?: [number, number] };

function database(tables: Record<string, Row[]>, options: { batch?: string[]; leakingTable?: string } = {}) {
  const traces: Trace[] = [];
  const rpc = jest.fn(async (_name: string, { p_command }: { p_command: { op: string; payload: { itemIds?: string[] } } }) => ({
    error: null,
    data: p_command.op === 'selection' ? { item_ids: options.batch ?? p_command.payload.itemIds, selected_at: now.toISOString() } : {},
  }));
  const from = (table: string) => {
    const trace: Trace = { table, equals: [], inIds: [] };
    traces.push(trace);
    let inColumn: string | undefined;
    const builder = {
      select: (_fields: string) => builder,
      eq: (column: string, value: unknown) => { trace.equals.push([column, value]); return builder; },
      in: (column: string, values: unknown[]) => { inColumn = column; trace.inIds = values; return builder; },
      order: (_column: string, _options: unknown) => builder,
      range: async (start: number, end: number) => {
        trace.range = [start, end];
        const data = (tables[table] ?? []).filter(row =>
          trace.equals.every(([column, value]) => options.leakingTable === table && column === 'user_id' || row[column] === value) &&
          (!inColumn || trace.inIds.includes(row[inColumn]))).slice(start, end + 1);
        return { data, error: null };
      },
    };
    return builder;
  };
  return { client: { from, rpc } as unknown as SupabaseClient, traces, rpc };
}
function item(n: number, creator = uuid(900), importId: string | null = null): Row {
  return { id: uuid(n), user_id: owner, creator_id: creator, source_url: `https://example.org/recipe/${n}`,
    title: `Plat ${n}`, description: null, published_at: null, created_at: now.toISOString(), version: 1,
    status: 'new', import_id: importId, snoozed_until: null };
}
function creator(id: string): Row {
  return { id, user_id: owner, name: 'Créateur', paused: false, version: 1 };
}
beforeEach(() => {
  jest.spyOn(NutritionProfileService.prototype, 'read').mockResolvedValue({
    profile: { user_id: owner, version: 0, schema_version: 1, settings: emptyNutritionProfile(), updated_at: null, origin: 'empty' },
    legacyServerPresent: false,
  });
});
afterEach(() => jest.restoreAllMocks());

test('a feed beyond the first REST page keeps candidates and bounds all related query URLs', async () => {
  const items = Array.from({ length: 230 }, (_, index) => item(index + 1, uuid(900), uuid(index + 1000)));
  const db = database({ recipe_discovery_creators: [creator(uuid(900))], recipe_discovery_items: items,
    social_recipe_imports: items.map(row => ({ id: row.import_id, user_id: owner, recipe_id: null })),
    recipe_discovery_latest_feedback: items.map(row => ({ id: row.id, item_id: row.id, user_id: owner, kind: 'repeat' })),
  }, { batch: [uuid(230)] });
  const feed = await new DiscoveryService(db.client, owner, () => now).feed();
  expect(feed.items.map(row => row.id)).toEqual([uuid(230)]);
  expect(feed.items[0].lastFeedback).toBe('repeat');
  expect(db.traces.filter(trace => trace.table === 'recipe_discovery_items').map(trace => trace.range)).toEqual([[0, 199], [200, 399]]);
  for (const table of ['social_recipe_imports', 'imported_recipe_drafts', 'recipe_discovery_latest_feedback']) {
    expect(db.traces.filter(trace => trace.table === table).map(trace => trace.inIds.length)).toEqual([50, 50, 50, 50, 30]);
  }
  expect(db.traces.every(trace => trace.equals.some(([key, value]) => key === 'user_id' && value === owner))).toBe(true);
});

test('the persisted batch order survives hydration instead of falling back to table order', async () => {
  const db = database({ recipe_discovery_creators: [creator(uuid(900)), creator(uuid(901)), creator(uuid(902))],
    recipe_discovery_items: [item(1), item(2), item(3, uuid(901)), item(4, uuid(902))],
  }, { batch: [uuid(3), uuid(1), uuid(4)] });
  const feed = await new DiscoveryService(db.client, owner, () => now).feed();
  const selection = db.rpc.mock.calls.find(([, args]) => args.p_command.op === 'selection');
  expect(selection?.[1].p_command.payload.itemIds).toEqual([uuid(1), uuid(3), uuid(4), uuid(2)]);
  expect(feed.items.map(row => row.id)).toEqual([uuid(3), uuid(1), uuid(4)]);
});

test('rehydrating a single receipt targets that item rather than loading the full feed', async () => {
  const db = database({ recipe_discovery_items: Array.from({ length: 230 }, (_, index) => item(index + 1)) });
  expect((await new DiscoveryService(db.client, owner).item(uuid(230))).id).toBe(uuid(230));
  const queries = db.traces.filter(trace => trace.table === 'recipe_discovery_items');
  expect(queries).toHaveLength(1);
  expect(queries[0].equals).toContainEqual(['id', uuid(230)]);
});

test('a malformed related response cannot turn another account recipe into an owned receipt', async () => {
  const db = database({ recipe_discovery_items: [item(1, uuid(900), uuid(1001))],
    social_recipe_imports: [{ id: uuid(1001), user_id: foreign, recipe_id: uuid(5000) }],
  }, { leakingTable: 'social_recipe_imports' });
  await expect(new DiscoveryService(db.client, owner).item(uuid(1))).rejects.toMatchObject({ code: 'DISCOVERY_UNAVAILABLE', status: 503 });
});

test('an invalid persisted selection cannot expose an unbounded feed', async () => {
  const db = database({ recipe_discovery_creators: [creator(uuid(900))],
    recipe_discovery_items: Array.from({ length: 6 }, (_, index) => item(index + 1)),
  }, { batch: Array.from({ length: 6 }, (_, index) => uuid(index + 1)) });
  await expect(new DiscoveryService(db.client, owner, () => now).feed()).rejects.toMatchObject({ code: 'INVALID_DISCOVERY_RECEIPT', status: 503 });
});
