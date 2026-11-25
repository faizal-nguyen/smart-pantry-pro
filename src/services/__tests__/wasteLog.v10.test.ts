import { WasteLogError, deleteWasteEvent, readWasteLog } from '../wasteLog';

const OWNER = '00000000-0000-4000-8000-000000000001';
type Answer = { data: unknown[] | null; error: { message: string } | null };
let mockPages: Answer[] = [];
let mockDeleteError: { message: string } | null = null;
const mockCalls: { filters: [string, unknown][]; ranges: [number, number][]; orders: string[]; deletes: number } = { filters: [], ranges: [], orders: [], deletes: 0 };

jest.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
  let page = 0;
  let deleting = false;
  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => { mockCalls.filters.push([column, value]); return builder; },
    order: (column: string) => { mockCalls.orders.push(column); return builder; },
    range: (from: number, to: number) => { mockCalls.ranges.push([from, to]); page = mockCalls.ranges.length - 1; return builder; },
    delete: () => { deleting = true; mockCalls.deletes += 1; return builder; },
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(deleting ? { data: null, error: mockDeleteError } : mockPages[page] ?? { data: [], error: null }).then(resolve, reject),
  };
  return builder;
} } }));

const row = (id: string) => ({ id, occurred_at: '2026-11-24T10:00:00Z' });

beforeEach(() => {
  mockPages = [];
  mockDeleteError = null;
  Object.assign(mockCalls, { filters: [], ranges: [], orders: [], deletes: 0 });
});

describe('waste log read', () => {
  test('pages are read until a short one, newest first, for the account only', async () => {
    mockPages = [{ data: [row('a'), row('b')], error: null }, { data: [row('c')], error: null }];
    // Same instant: by id, newest id first, as the query asks the server.
    await expect(readWasteLog(OWNER, { pageSize: 2 })).resolves.toEqual([row('c'), row('b'), row('a')]);
    // The offset follows the rows received; an empty page ends the read.
    expect(mockCalls.ranges).toEqual([[0, 1], [2, 3], [3, 4]]);
    expect(mockCalls.filters).toEqual([['user_id', OWNER], ['user_id', OWNER], ['user_id', OWNER]]);
    expect(mockCalls.orders.slice(0, 2)).toEqual(['occurred_at', 'id']);
  });

  test('the log is returned newest first whatever order the pages came in, an unreadable date last', async () => {
    mockPages = [{ data: [
      { id: 'old', occurred_at: '2026-10-01T10:00:00Z' }, { id: 'bad', occurred_at: 'not-a-date' },
      { id: 'b', occurred_at: '2026-11-24T10:00:00Z' }, { id: 'a', occurred_at: '2026-11-24T10:00:00Z' },
      { id: 'new', occurred_at: '2026-11-25T08:00:00Z' },
    ], error: null }];
    const ids = (await readWasteLog(OWNER)).map(item => item.id);
    expect(ids).toEqual(['new', 'b', 'a', 'old', 'bad']);
  });

  test('a failed later page fails the whole read: no partial total', async () => {
    mockPages = [{ data: [row('a'), row('b')], error: null }, { data: null, error: { message: 'boom' } }];
    await expect(readWasteLog(OWNER, { pageSize: 2 })).rejects.toEqual(new WasteLogError('read'));
  });

  test('a server that caps its pages below the asked size is still read to the end', async () => {
    mockPages = [{ data: [row('a')], error: null }, { data: [row('b')], error: null }, { data: [row('c')], error: null }];
    await expect(readWasteLog(OWNER, { pageSize: 3 })).resolves.toHaveLength(3);
    expect(mockCalls.ranges).toEqual([[0, 2], [1, 3], [2, 4], [3, 5]]);
  });

  test('a full page of rows already seen means the range is ignored: the read fails rather than loops', async () => {
    mockPages = [{ data: [row('a'), row('b')], error: null }, { data: [row('a'), row('b')], error: null }];
    await expect(readWasteLog(OWNER, { pageSize: 2 })).rejects.toEqual(new WasteLogError('read'));
  });

  test('a row seen on two pages counts once', async () => {
    mockPages = [{ data: [row('a'), row('b')], error: null }, { data: [row('b')], error: null }];
    await expect(readWasteLog(OWNER, { pageSize: 2 })).resolves.toEqual([row('b'), row('a')]);
  });

  test('exactly the limit is read, one more row is refused', async () => {
    mockPages = [{ data: [row('a'), row('b')], error: null }, { data: [], error: null }];
    await expect(readWasteLog(OWNER, { pageSize: 2, maxRows: 2 })).resolves.toHaveLength(2);
    mockPages = [{ data: [row('a'), row('b')], error: null }, { data: [row('c')], error: null }];
    Object.assign(mockCalls, { ranges: [] });
    await expect(readWasteLog(OWNER, { pageSize: 2, maxRows: 2 })).rejects.toEqual(new WasteLogError('too-many'));
  });

  test('a deletion is limited to the account, and its failure is reported', async () => {
    await deleteWasteEvent(OWNER, 'a');
    expect(mockCalls.deletes).toBe(1);
    expect(mockCalls.filters).toEqual([['id', 'a'], ['user_id', OWNER]]);
    mockDeleteError = { message: 'refused' };
    await expect(deleteWasteEvent(OWNER, 'a')).rejects.toEqual(new WasteLogError('delete'));
  });
});
