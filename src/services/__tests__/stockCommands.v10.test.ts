import { ApiError, apiPost } from '@/lib/api';
import { dispatchAgentDbChanged } from '@/lib/agentEvents';
import { changedTables, commandForIntent, executeStockCommand, finishIntent, pendingIntent, pendingIntents, previewRecipeStock } from '../stockCommands';

let mockOwner: string | null = '00000000-0000-4000-8000-000000000001';
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: jest.fn(async () => ({ data: { session: mockOwner ? { user: { id: mockOwner } } : null } })) } } }));
jest.mock('@/lib/api', () => ({ apiPost: jest.fn(), apiGet: jest.fn(), ApiError: class extends Error {
  status: number; code: string;
  constructor(message: string,opts: { status: number; code: string }) { super(message); this.status = opts.status; this.code = opts.code; }
} }));
jest.mock('@/lib/agentEvents', () => ({ dispatchAgentDbChanged: jest.fn() }));
const payload = { items: [{ id: '50000000-0000-4000-8000-000000000001', expected_version: 0 }] };
const post = jest.mocked(apiPost);

beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear(); localStorage.clear(); mockOwner = '00000000-0000-4000-8000-000000000001';
  Object.defineProperty(crypto,'randomUUID',{ configurable: true, value: () => '40000000-0000-4000-8000-000000000001' });
});
describe('recoverable online stock intentions', () => {
  test('lost response retains the exact identity and payload across a retry', async () => {
    const first = await commandForIntent('transfer_shopping','transfer',payload);
    post.mockRejectedValueOnce(new Error('Network lost'));
    await expect(executeStockCommand(first)).rejects.toThrow('Network lost');
    expect(await pendingIntent('transfer')).toEqual(first);
    const retry = await commandForIntent('transfer_shopping','transfer',payload);
    expect(retry.command_id).toBe(first.command_id);
    post.mockResolvedValueOnce({ command_id: first.command_id, command_type: first.command_type, status: 'confirmed', affected_tables: ['inventory','shopping_list'] });
    await executeStockCommand(retry); await finishIntent('transfer');
    expect(await pendingIntent('transfer')).toBeNull();
    expect(dispatchAgentDbChanged).toHaveBeenCalledWith(['inventory','shopping_list']);
  });
  test('a rolled-back conflict permits a fresh intention; uncertain errors do not', async () => {
    const first = await commandForIntent('transfer_shopping','transfer',payload);
    post.mockRejectedValueOnce(new ApiError('Stock changed',{ status: 409, code: 'CONFLICT' }));
    await expect(executeStockCommand(first)).rejects.toThrow();
    expect(await pendingIntent('transfer')).toBeNull();
    const second = await commandForIntent('transfer_shopping','transfer',payload);
    post.mockRejectedValueOnce(new ApiError('Internal failure',{ status: 500, code: 'STOCK_WRITE_FAILED' }));
    await expect(executeStockCommand(second)).rejects.toThrow();
    expect(await pendingIntent('transfer')).toEqual(second);
  });
  test('a rate-limited command keeps its identity, so the retry replays the same receipt', async () => {
    const first = await commandForIntent('transfer_shopping','transfer',payload);
    post.mockRejectedValueOnce(new ApiError('Trop de demandes',{ status: 429, code: 'RATE_LIMITED' }));
    await expect(executeStockCommand(first)).rejects.toMatchObject({ status: 429 });
    expect(await pendingIntent('transfer')).toEqual(first);
    const retry = await commandForIntent('transfer_shopping','transfer',payload);
    expect(retry.command_id).toBe(first.command_id);
    post.mockResolvedValueOnce({ command_id: first.command_id, command_type: first.command_type, status: 'confirmed', affected_tables: ['inventory'] });
    await executeStockCommand(retry); await finishIntent('transfer');
    expect(await pendingIntent('transfer')).toBeNull();
  });
  test('changed input cannot silently replace an unresolved intention', async () => {
    await commandForIntent('transfer_shopping','transfer',payload);
    await expect(commandForIntent('transfer_shopping','transfer',{ items: [{ ...payload.items[0], expected_version: 1 }] })).rejects.toThrow('précédente');
    expect(post).not.toHaveBeenCalled();
  });
  test('closing the transient session does not discard a durable online intention', async () => {
    const first = await commandForIntent('transfer_shopping','transfer',payload);
    sessionStorage.clear();
    expect(await pendingIntent('transfer')).toEqual(first);
    expect(JSON.parse(localStorage.getItem(`v10-command:${mockOwner}:transfer`)!)).toEqual(first);
  });
  test('corrupt persisted intentions are explained without replacing their identity', async () => {
    const key = `v10-command:${mockOwner}:transfer`;
    localStorage.setItem(key,'corrupt');
    await expect(commandForIntent('transfer_shopping','transfer',payload)).rejects.toThrow('illisible');
    expect(localStorage.getItem(key)).toBe('corrupt');
    expect(post).not.toHaveBeenCalled();
  });
  test('a command begun by A cannot be executed or published as a B success', async () => {
    const first = await commandForIntent('transfer_shopping','transfer',payload);
    mockOwner = '00000000-0000-4000-8000-000000000002';
    post.mockImplementationOnce(async (_path,_data,options) => {
      expect(options?.expectedUserId).toBe('00000000-0000-4000-8000-000000000001');
      throw new ApiError('Account changed',{ status: 401, code: 'AUTH_CHANGED' });
    });
    await expect(executeStockCommand(first)).rejects.toMatchObject({ code: 'AUTH_CHANGED' });
    expect(await pendingIntent('transfer')).toBeNull();
    expect(dispatchAgentDbChanged).not.toHaveBeenCalled();
  });
  test('a late A response after account switch is rejected without a global invalidation', async () => {
    const first = await commandForIntent('transfer_shopping','transfer',payload);
    post.mockImplementationOnce(async () => { mockOwner = 'B'; return { command_id: first.command_id, status: 'confirmed', affected_tables: ['inventory'] }; });
    await expect(executeStockCommand(first)).rejects.toMatchObject({ code: 'AUTH_CHANGED' });
    expect(dispatchAgentDbChanged).not.toHaveBeenCalled();
  });
  test('pending intentions are listed by prefix for the signed-in account only', async () => {
    const first = await commandForIntent('transfer_shopping','shopping-list:check:a',payload);
    await commandForIntent('transfer_shopping','shopping-transfer',payload);
    localStorage.setItem('v10-command:00000000-0000-4000-8000-000000000002:shopping-list:check:b',JSON.stringify(first));
    expect(await pendingIntents('shopping-list:')).toEqual([{ intent: 'shopping-list:check:a', command: first }]);
    mockOwner = null;
    expect(await pendingIntents('shopping-list:')).toEqual([]);
  });
  test('preview uses the account guard and preserves server default servings', async () => {
    post.mockResolvedValueOnce({ servings: 4 });
    await previewRecipeStock({ id: '30000000-0000-4000-8000-000000000001', source: 'auto' });
    expect(post).toHaveBeenCalledWith('/v1/stock/preview',{ recipe: { id: '30000000-0000-4000-8000-000000000001', source: 'auto' } },{ expectedUserId: mockOwner });
  });
});

// V11-01 E1: the server lists the stock and journal tables for a cooking; the meal link changes too.
describe('tables reread after a command', () => {
  const result = (command_type: string, affected_tables: string[], meal_plan_entry_id?: string) => ({ command_type, affected_tables, meal_plan_entry_id });
  test('a cooking linked to a meal, and the undo of a cooking, reread the menu', () => {
    expect(changedTables(result('consume_recipe', ['inventory','cooking_journal','user_recipes'], 'meal'))).toEqual(['inventory','cooking_journal','user_recipes','meal_plan_entries']);
    expect(changedTables(result('undo_stock', ['inventory','shopping_list','cooking_journal','user_recipes']))).toContain('meal_plan_entries');
  });
  test('other commands keep the server’s tables', () => {
    expect(changedTables(result('consume_recipe', ['inventory','cooking_journal']))).toEqual(['inventory','cooking_journal']);
    expect(changedTables(result('undo_stock', ['shopping_list']))).toEqual(['shopping_list']);
    expect(changedTables(result('undo_stock', ['meal_plan_entries','cooking_journal']))).toEqual(['meal_plan_entries','cooking_journal']);
  });
});
