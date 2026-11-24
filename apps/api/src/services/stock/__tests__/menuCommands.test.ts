import type { SupabaseClient } from '@supabase/supabase-js';
import { emptyNutritionProfile, StockCommandSchema } from '@smart/shared';
import { StockCommandError, StockCommandService } from '../StockCommandService.js';

const USER = '00000000-0000-4000-8000-000000000001';
const ID = '40000000-0000-4000-8000-000000000001';
const ROW = '50000000-0000-4000-8000-000000000001';
const MEAL = '60000000-0000-4000-8000-000000000001';
const menu = (payload: Record<string, unknown> = {}) => ({ command_id: ID, command_type: 'menu_add_missing', payload_version: 1, payload: {
  week_start: '2026-11-30', as_of: '2026-11-24', menu_version: 'a'.repeat(32), context_revision: 7,
  adds: [{ name: 'farine', quantity: 50, unit: 'g', target: { id: ROW, expected_version: 2 } }], reductions: [], ...payload } });
const cooked = { command_id: ID, command_type: 'consume_recipe', payload_version: 1, payload: {
  recipe: { id: '30000000-0000-4000-8000-000000000001', source: 'auto' }, servings: 4, recipe_version: 'v', outside_inventory: [],
  meal_plan_entry_id: MEAL, entry_version: 0 } };

function client(capability: number, error?: { message: string }) {
  const from = jest.fn(() => {
    const response = Promise.resolve({ data: null, error: null });
    const query = { select: () => query, eq: () => query, maybeSingle: () => response };
    return query;
  });
  const rpc = jest.fn(async (name: string) => name === 'stock_routine_capabilities' ? { data: capability, error: null }
    : { data: error ? null : { command_id: ID, command_type: 'menu_add_missing', status: 'confirmed', affected_tables: ['shopping_list'] }, error: error ?? null });
  return { supabase: { from, rpc } as unknown as SupabaseClient, rpc };
}

describe('week shopping and planned-meal commands', () => {
  test('menu_add_missing carries the three tokens and bounded lists, never an account', () => {
    expect(StockCommandSchema.safeParse(menu()).success).toBe(true);
    expect(StockCommandSchema.safeParse(menu({ adds: [], reductions: [{ id: ROW, expected_version: 3, quantity: 100, unit: 'g' }] })).success).toBe(true);
    expect(StockCommandSchema.safeParse(menu({ adds: [], reductions: [] })).success).toBe(false);
    expect(StockCommandSchema.safeParse(menu({ menu_version: 'stale' })).success).toBe(false);
    expect(StockCommandSchema.safeParse(menu({ user_id: USER })).success).toBe(false);
    expect(StockCommandSchema.safeParse(menu({ adds: [{ name: 'farine', product_id: ROW, quantity: 1, unit: 'g' }] })).success).toBe(false);
  });

  test('a cooked meal is named with its version, both or neither', () => {
    expect(StockCommandSchema.safeParse(cooked).success).toBe(true);
    expect(StockCommandSchema.safeParse({ ...cooked, payload: { ...cooked.payload, entry_version: undefined } }).success).toBe(false);
  });

  test('a database below capability 5 keeps the request instead of writing it', async () => {
    for (const operation of [menu(), cooked]) {
      const mocked = client(4);
      await expect(new StockCommandService(mocked.supabase).execute(USER, operation)).rejects.toMatchObject({ code: 'MIGRATION_REQUIRED', status: 503 });
      expect(mocked.rpc).not.toHaveBeenCalledWith('execute_stock_command', expect.anything());
    }
    const ready = client(5);
    await new StockCommandService(ready.supabase).execute(USER, menu());
    expect(ready.rpc).toHaveBeenLastCalledWith('execute_stock_command', expect.objectContaining({ p_allocations: [] }));
  });

  test.each(['STOCK_CHANGED', 'ALREADY_COOKED', 'MEAL_COOKED', 'MENU_CHANGED'])('%s is a conflict to reread, not a failure', async code => {
    await expect(new StockCommandService(client(5, { message: code }).supabase).execute(USER, menu()))
      .rejects.toMatchObject({ code, status: 409 });
  });
});

// V11-01 E3: the editable menu.
describe('update_menu', () => {
  const RECIPE = { id: '30000000-0000-4000-8000-000000000001', source: 'auto' as const };
  const edit = (...operations: unknown[]) => ({ command_id: ID, command_type: 'update_menu', payload_version: 1, payload: { operations } });
  const set = { op: 'set', date: '2026-12-01', meal_type: 'dinner', recipe: RECIPE, servings: 4, expected_version: null };
  const move = { op: 'move', entry_id: MEAL, expected_version: 2, date: '2026-12-02', meal_type: 'lunch', target_version: 5 };

  test('each operation names the version of the meals it touches; servings are whole, from 1 to 100', () => {
    expect(StockCommandSchema.safeParse(edit(set, move,
      { op: 'servings', entry_id: MEAL, expected_version: 2, servings: 6 },
      { op: 'remove', entry_id: MEAL, expected_version: 3 },
      { op: 'leftover', entry_id: MEAL, expected_version: 3, date: '2026-12-03', meal_type: 'lunch', servings: 2 })).success).toBe(true);
    for (const invalid of [
      edit(), edit(...Array.from({ length: 31 }, () => set)),
      edit({ ...set, servings: 0 }), edit({ ...set, servings: 2.5 }), edit({ ...set, servings: 101 }),
      edit({ ...set, expected_version: undefined }), edit({ ...move, target_version: undefined }),
      edit({ op: 'remove', entry_id: MEAL }), edit({ ...set, meal_type: 'brunch' }), edit({ ...set, date: '1/12/2026' }),
      edit({ op: 'swap', entry_id: MEAL, expected_version: 1 }), edit({ ...set, user_id: USER }),
    ]) expect(StockCommandSchema.safeParse(invalid).success).toBe(false);
  });

  test('a database below capability 6 keeps the request instead of writing it', async () => {
    const old = client(5);
    await expect(new StockCommandService(old.supabase).execute(USER, edit(set))).rejects.toMatchObject({ code: 'MIGRATION_REQUIRED', status: 503 });
    expect(old.rpc).not.toHaveBeenCalledWith('execute_stock_command', expect.anything());
    const ready = client(6);
    await new StockCommandService(ready.supabase).execute(USER, edit(set));
    expect(ready.rpc).toHaveBeenLastCalledWith('execute_stock_command', expect.objectContaining({ p_allocations: [] }));
  });

  test.each([
    ['LEFTOVER_CAPACITY', 'Les restes dépasseraient les portions du repas d’origine.'],
    ['LEFTOVER_ORDER', 'Un reste doit rester après son repas d’origine.'],
  ])('%s is a refusal to explain, never a failure', async (code, message) => {
    await expect(new StockCommandService(client(6, { message: code }).supabase).execute(USER, edit(set)))
      .rejects.toMatchObject({ code, status: 409, message });
  });
});

// V11-01 E4a: a proposed week is validated as one update_menu naming the profile and expiry it was computed with.
describe('update_menu from a proposed week', () => {
  const RECIPE = { id: '30000000-0000-4000-8000-000000000001', source: 'auto' as const };
  const set = { op: 'set', date: '2026-12-01', meal_type: 'dinner', recipe: RECIPE, servings: 4, expected_version: null };
  const later = () => new Date(Date.now() + 10 * 60_000).toISOString();
  const validate = (proposal: { profile_version: number; expires_at: string }) =>
    ({ command_id: ID, command_type: 'update_menu', payload_version: 1, payload: { operations: [set], proposal } });

  /** A user-scoped client: an optional receipt, the account's nutrition profile version (none: version 0). */
  function proposalClient({ receipt = null, profileVersion = null }: { receipt?: unknown; profileVersion?: number | null } = {}) {
    const from = jest.fn((table: string) => {
      const row = table === 'stock_commands' ? receipt
        : table === 'nutrition_profiles' && profileVersion != null ? { user_id: USER, version: profileVersion, schema_version: 1,
          settings: emptyNutritionProfile(), updated_at: null, origin: 'explicit' } : null;
      const query = { select: () => query, eq: () => query, maybeSingle: () => Promise.resolve({ data: row, error: null }) };
      return query;
    });
    const rpc = jest.fn(async (name: string) => name === 'stock_routine_capabilities' ? { data: 6, error: null }
      : { data: { command_id: ID, command_type: 'update_menu', status: 'confirmed', affected_tables: ['meal_plan_entries'] }, error: null });
    return { supabase: { from, rpc } as unknown as SupabaseClient, rpc };
  }

  test('an expired proposal is refused before any write, with a reason to compute it again', async () => {
    const mocked = proposalClient();
    await expect(new StockCommandService(mocked.supabase).execute(USER, validate({ profile_version: 0, expires_at: new Date(Date.now() - 1000).toISOString() })))
      .rejects.toMatchObject({ code: 'PROPOSAL_EXPIRED', status: 409, message: 'Cette proposition a expiré : recalcule-la avant de la valider.' });
    expect(mocked.rpc).not.toHaveBeenCalledWith('execute_stock_command', expect.anything());
  });

  test('a proposal computed on another profile is refused; on the same one it is written', async () => {
    const changed = proposalClient({ profileVersion: 4 });
    await expect(new StockCommandService(changed.supabase).execute(USER, validate({ profile_version: 3, expires_at: later() })))
      .rejects.toMatchObject({ code: 'PROFILE_CHANGED', status: 409, message: 'Ton profil a changé depuis la proposition : recalcule-la avant de la valider.' });
    expect(changed.rpc).not.toHaveBeenCalledWith('execute_stock_command', expect.anything());
    const same = proposalClient({ profileVersion: 4 });
    await new StockCommandService(same.supabase).execute(USER, validate({ profile_version: 4, expires_at: later() }));
    expect(same.rpc).toHaveBeenLastCalledWith('execute_stock_command', expect.anything());
  });

  test('a command sent again after a lost reply returns its receipt, even once the proposal expired', async () => {
    const command = validate({ profile_version: 0, expires_at: new Date(Date.now() - 1000).toISOString() });
    const result = { command_id: ID, command_type: 'update_menu', status: 'confirmed', affected_tables: ['meal_plan_entries'] };
    const mocked = proposalClient({ receipt: { command_type: 'update_menu', payload: command.payload, result } });
    await expect(new StockCommandService(mocked.supabase).execute(USER, command)).resolves.toEqual(result);
    expect(mocked.rpc).not.toHaveBeenCalledWith('execute_stock_command', expect.anything());
  });
});

test('a profile that cannot be read is a temporary unavailability, never a failed write', async () => {
  const RECIPE = { id: '30000000-0000-4000-8000-000000000001', source: 'auto' as const };
  const command = { command_id: ID, command_type: 'update_menu', payload_version: 1, payload: {
    operations: [{ op: 'set', date: '2026-12-01', meal_type: 'dinner', recipe: RECIPE, servings: 4, expected_version: null }],
    proposal: { profile_version: 1, expires_at: new Date(Date.now() + 600_000).toISOString() } } };
  const from = jest.fn((table: string) => {
    const query = { select: () => query, eq: () => query, maybeSingle: () => Promise.resolve(table === 'nutrition_profiles'
      ? { data: null, error: { message: 'connection reset', code: '08006' } } : { data: null, error: null }) };
    return query;
  });
  const rpc = jest.fn(async (name: string) => name === 'stock_routine_capabilities' ? { data: 6, error: null } : { data: null, error: null });
  // The stock commands route answers only a StockCommandError with its own code: anything else is a failed write.
  const failure = await new StockCommandService({ from, rpc } as unknown as SupabaseClient).execute(USER, command).catch(error => error);
  expect(failure).toBeInstanceOf(StockCommandError);
  expect(failure).toMatchObject({ code: 'PROFILE_UNAVAILABLE', status: 503, message: 'Ton profil ne peut pas être lu pour le moment : réessaie dans un instant.' });
  expect(rpc).not.toHaveBeenCalledWith('execute_stock_command', expect.anything());
});
