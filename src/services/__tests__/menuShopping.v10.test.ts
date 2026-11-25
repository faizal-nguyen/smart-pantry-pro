import { apiPost } from '@/lib/api';
import { commandForIntent, executeStockCommand, finishIntent, pendingIntent } from '../stockCommands';
import { confirmMenuShopping, fetchMenuShoppingPreview, menuShoppingIntent, resendMenuShopping } from '../menuShopping';

const OWNER = '00000000-0000-4000-8000-000000000001';
jest.mock('@/lib/api', () => ({ apiPost: jest.fn(), ApiError: class extends Error {
  status: number; code?: string;
  constructor(message: string, options: { status: number; code?: string }) { super(message); this.status = options.status; this.code = options.code; }
} }));
jest.mock('../stockCommands', () => ({
  commandForIntent: jest.fn(async (command_type: string, _intent: string, payload: unknown) => ({ command_id: 'command-1', command_type, payload_version: 1, payload })),
  executeStockCommand: jest.fn(async (command: { command_id: string; command_type: string }) => ({ command_id: command.command_id, command_type: command.command_type, status: 'confirmed', affected_tables: ['shopping_list'] })),
  finishIntent: jest.fn(), pendingIntent: jest.fn(async () => null),
}));

const preview = { week_start: '2026-11-30', as_of: '2026-11-24', menu_version: 'a'.repeat(32), context_revision: 7, lines: [], meals: [], uncomputable: [] };
const payload = { week_start: '2026-11-30', as_of: '2026-11-24', menu_version: 'a'.repeat(32), context_revision: 7,
  adds: [{ name: 'riz', quantity: 250, unit: 'g' }], reductions: [] };
beforeEach(() => jest.clearAllMocks());

describe('the week’s preview', () => {
  test('is read for the signed-in account and checked before it is shown', async () => {
    jest.mocked(apiPost).mockResolvedValueOnce(preview);
    await expect(fetchMenuShoppingPreview(OWNER, '2026-11-30')).resolves.toEqual(preview);
    expect(apiPost).toHaveBeenCalledWith('/v1/menus/shopping-preview', { week_start: '2026-11-30' }, { expectedUserId: OWNER, signal: undefined });
  });

  test.each([
    ['a malformed answer', { ...preview, menu_version: 'x' }],
    ['another week', { ...preview, week_start: '2026-12-07' }],
  ])('%s is refused as unavailable, never shown', async (_case, answer) => {
    jest.mocked(apiPost).mockResolvedValueOnce(answer);
    await expect(fetchMenuShoppingPreview(OWNER, '2026-11-30')).rejects.toMatchObject({ status: 503, code: 'INVALID_MENU_SHOPPING_PREVIEW' });
  });

  test('a day that is not a Monday is not sent', async () => {
    await expect(fetchMenuShoppingPreview(OWNER, '2026-12-01')).rejects.toThrow();
    expect(apiPost).not.toHaveBeenCalled();
  });
});

describe('the confirmation', () => {
  test('is saved under the week’s intention, sent, then closed', async () => {
    const result = await confirmMenuShopping('2026-11-30', payload);
    expect(commandForIntent).toHaveBeenCalledWith('menu_add_missing', 'menu-shopping:2026-11-30', payload);
    expect(executeStockCommand).toHaveBeenCalledWith(expect.objectContaining({ command_id: 'command-1', command_type: 'menu_add_missing' }));
    expect(finishIntent).toHaveBeenCalledWith(menuShoppingIntent('2026-11-30'));
    expect(result.command_id).toBe('command-1');
  });

  test('an unconfirmed reply keeps the intention to resend the very same command', async () => {
    jest.mocked(executeStockCommand).mockRejectedValueOnce(new Error('Réseau coupé'));
    await expect(confirmMenuShopping('2026-11-30', payload)).rejects.toThrow('Réseau coupé');
    expect(finishIntent).not.toHaveBeenCalled();
    const saved = { command_id: 'command-1', command_type: 'menu_add_missing', payload_version: 1, payload };
    jest.mocked(pendingIntent).mockResolvedValueOnce(saved as never);
    await resendMenuShopping('2026-11-30');
    expect(executeStockCommand).toHaveBeenLastCalledWith(saved);
    expect(finishIntent).toHaveBeenCalledWith('menu-shopping:2026-11-30');
  });

  test('with nothing pending, nothing is resent', async () => {
    await expect(resendMenuShopping('2026-11-30')).resolves.toBeNull();
    expect(executeStockCommand).not.toHaveBeenCalled();
  });

  test('another kind of saved action under the week’s intention is never sent', async () => {
    jest.mocked(pendingIntent).mockResolvedValueOnce({ command_id: 'x', command_type: 'shopping_add', payload_version: 1, payload: { items: [] } } as never);
    await expect(resendMenuShopping('2026-11-30')).rejects.toThrow();
    expect(executeStockCommand).not.toHaveBeenCalled();
  });
});

// V11-01 E4b: the shopping of a proposed week, before it is validated.
test('the preview may count the meals of a proposal, of the same week', async () => {
  jest.mocked(apiPost).mockResolvedValueOnce(preview);
  const proposal = [{ date: '2026-12-01', meal_type: 'dinner' as const, recipe: { id: '11111111-1111-4111-8111-111111111111', source: 'recipes_catalog' as const }, servings: 2 }];
  await fetchMenuShoppingPreview(OWNER, '2026-11-30', undefined, proposal);
  expect(apiPost).toHaveBeenCalledWith('/v1/menus/shopping-preview', { week_start: '2026-11-30', proposal }, { expectedUserId: OWNER, signal: undefined });
  await expect(fetchMenuShoppingPreview(OWNER, '2026-11-30', undefined, [{ ...proposal[0], date: '2026-12-09' }])).rejects.toThrow();
});
