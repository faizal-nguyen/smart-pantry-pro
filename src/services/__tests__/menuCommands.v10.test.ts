import { commandForIntent, executeStockCommand, finishIntent, pendingIntents } from '../stockCommands';
import { menuEditIntent, resumePendingMenuEdits, updateMenu } from '../menuCommands';

jest.mock('@/lib/api', () => ({ ApiError: class extends Error {
  status: number; code?: string;
  constructor(message: string, options: { status: number; code?: string }) { super(message); this.status = options.status; this.code = options.code; }
} }));
jest.mock('../stockCommands', () => ({
  commandForIntent: jest.fn(async (command_type: string, _intent: string, payload: unknown) => ({ command_id: 'command-1', command_type, payload_version: 1, payload })),
  executeStockCommand: jest.fn(async (command: { command_id: string; command_type: string }) => ({ command_id: command.command_id, command_type: command.command_type, status: 'confirmed', affected_tables: ['meal_plan_entries'] })),
  finishIntent: jest.fn(), pendingIntents: jest.fn(async () => []),
}));
const MEAL = '60000000-0000-4000-8000-000000000001';
const remove = [{ op: 'remove' as const, entry_id: MEAL, expected_version: 3 }];
beforeEach(() => jest.clearAllMocks());

test('a gesture names its meal, version and values: a double tap reuses its command, another value does not', () => {
  const plus = { op: 'servings' as const, entry_id: MEAL, expected_version: 3, servings: 5 };
  expect(menuEditIntent(plus)).toBe(menuEditIntent({ ...plus }));
  expect(menuEditIntent(plus).startsWith(`menu-edit:${MEAL}:3:`)).toBe(true);
  // After a lost reply on « + », « − » at the same version is another gesture, not a blocked one.
  expect(menuEditIntent({ ...plus, servings: 3 })).not.toBe(menuEditIntent(plus));
  expect(menuEditIntent({ ...plus, expected_version: 4 })).not.toBe(menuEditIntent(plus));
});

test('an edit is saved under its gesture, sent, then closed', async () => {
  const result = await updateMenu(menuEditIntent(remove[0]), remove);
  expect(commandForIntent).toHaveBeenCalledWith('update_menu', menuEditIntent(remove[0]), { operations: remove });
  expect(finishIntent).toHaveBeenCalledWith(menuEditIntent(remove[0]));
  expect(result.command_id).toBe('command-1');
});

test('an unconfirmed reply keeps the gesture, which the next opening sends again under its identity', async () => {
  jest.mocked(executeStockCommand).mockRejectedValueOnce(new Error('Réseau coupé'));
  await expect(updateMenu(menuEditIntent(remove[0]), remove)).rejects.toThrow('Réseau coupé');
  expect(finishIntent).not.toHaveBeenCalled();
  const saved = { command_id: 'command-1', command_type: 'update_menu', payload_version: 1, payload: { operations: remove } };
  jest.mocked(pendingIntents).mockResolvedValueOnce([{ intent: menuEditIntent(remove[0]), command: saved as never }]);
  const outcome = await resumePendingMenuEdits();
  expect(pendingIntents).toHaveBeenCalledWith('menu-edit:');
  expect(executeStockCommand).toHaveBeenLastCalledWith(saved);
  expect(outcome).toMatchObject({ confirmed: [expect.objectContaining({ command_id: 'command-1' })], refused: 0, failures: [] });
});

test('a resumed edit the menu no longer allows is counted as refused, and its gesture dropped', async () => {
  const { ApiError } = jest.requireMock('@/lib/api') as { ApiError: new (message: string, options: { status: number; code?: string }) => Error };
  jest.mocked(pendingIntents).mockResolvedValueOnce([{ intent: 'menu-edit:x', command: { command_id: 'c', command_type: 'update_menu', payload_version: 1, payload: { operations: remove } } as never }]);
  jest.mocked(executeStockCommand).mockRejectedValueOnce(new ApiError('changé', { status: 409, code: 'MENU_CHANGED' }));
  await expect(resumePendingMenuEdits()).resolves.toMatchObject({ confirmed: [], refused: 1, failures: [] });
});
