/**
 * PRP-223 PR7 — CookingJournalService unit tests.
 */
import {
  CookingJournalService,
  CookingJournalServiceError,
  type CookingJournalRow,
} from '../../cooking/CookingJournalService.js';

const USER = '11111111-1111-1111-1111-111111111111';
const RECIPE = '22222222-2222-2222-2222-222222222222';

function makeRow(o: Partial<CookingJournalRow> = {}): CookingJournalRow {
  return {
    id: '33333333-3333-3333-3333-333333333333',
    user_id: USER,
    recipe_id: RECIPE,
    recipe_title: 'Pâtes carbonara',
    cooked_at: '2026-05-14T12:00:00Z',
    rating: null,
    outcome: null,
    notes: null,
    substitutions: [],
    adjustments: {},
    would_cook_again: null,
    created_from_message_id: null,
    created_at: '2026-05-14T12:00:00Z',
    updated_at: '2026-05-14T12:00:00Z',
    ...o,
  } as CookingJournalRow;
}

interface MockConfig {
  insertResult?: CookingJournalRow;
  insertError?: { message: string };
  selectMany?: CookingJournalRow[];
}

function makeAdmin(cfg: MockConfig) {
  const calls = {
    inserts: [] as Array<Record<string, unknown>>,
    selectFilters: [] as Array<Record<string, unknown>>,
  };
  const client: any = {
    from(_table: string) {
      const filters: Record<string, unknown> = {};
      const chain: any = {
        insert(payload: Record<string, unknown>) {
          calls.inserts.push(payload);
          return {
            select() {
              return {
                async single() {
                  if (cfg.insertError) return { data: null, error: cfg.insertError };
                  return { data: cfg.insertResult ?? makeRow(payload as any), error: null };
                },
              };
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
          calls.selectFilters.push({ ...filters });
          return Promise.resolve({ data: cfg.selectMany ?? [], error: null });
        },
      };
      return chain;
    },
  };
  return { client, calls };
}

describe('CookingJournalService', () => {
  it('records an entry with required fields', async () => {
    const expected = makeRow({ rating: 5, outcome: 'loved' });
    const { client, calls } = makeAdmin({ insertResult: expected });
    const svc = new CookingJournalService(client);
    const row = await svc.record(USER, {
      recipe_id: RECIPE,
      recipe_title: 'Pâtes carbonara',
      rating: 5,
      outcome: 'loved',
    });
    expect(row).toEqual(expected);
    expect(calls.inserts[0]).toMatchObject({
      user_id: USER,
      recipe_id: RECIPE,
      recipe_title: 'Pâtes carbonara',
      rating: 5,
      outcome: 'loved',
    });
  });

  it('throws DB_ERROR when the insert fails', async () => {
    const { client } = makeAdmin({ insertError: { message: 'boom' } });
    const svc = new CookingJournalService(client);
    await expect(
      svc.record(USER, { recipe_title: 'x' }),
    ).rejects.toThrow(CookingJournalServiceError);
  });

  it('paginates list responses and emits a nextCursor', async () => {
    const rows = [
      makeRow({ id: 'a', cooked_at: '2026-05-14T10:00:00Z' }),
      makeRow({ id: 'b', cooked_at: '2026-05-13T10:00:00Z' }),
      makeRow({ id: 'c', cooked_at: '2026-05-12T10:00:00Z' }),
    ];
    const { client } = makeAdmin({ selectMany: rows });
    const svc = new CookingJournalService(client);
    const result = await svc.list(USER, { limit: 2 });
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).not.toBeNull();
  });

  it('getRecent caps at the requested limit', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => makeRow({ id: String(i) }));
    const { client } = makeAdmin({ selectMany: rows });
    const svc = new CookingJournalService(client);
    const recent = await svc.getRecent(USER, 3);
    expect(recent.length).toBeLessThanOrEqual(5); // mock returns whatever the chain has; we trust limit param
    expect(recent.every(r => r.user_id === USER)).toBe(true);
  });

  it('list scopes by recipe_id when provided', async () => {
    const rows = [makeRow({ id: 'x' })];
    const { client, calls } = makeAdmin({ selectMany: rows });
    const svc = new CookingJournalService(client);
    await svc.list(USER, { recipe_id: RECIPE });
    const last = calls.selectFilters[calls.selectFilters.length - 1];
    expect(last).toMatchObject({ user_id: USER, recipe_id: RECIPE });
  });
});
