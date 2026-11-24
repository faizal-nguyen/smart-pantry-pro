import { act, renderHook, waitFor } from '@testing-library/react';
import { useMenuEdit } from '../useMenuEdit';
import type { MenuEntryView } from '../useWeeklyMenu';
import { resumePendingMenuEdits, updateMenu } from '@/services/menuCommands';
import { undoStockCommand } from '@/services/stockCommands';

const refresh = jest.fn(async () => undefined);
jest.mock('@/lib/api', () => ({ ApiError: class extends Error {
  status: number; code?: string;
  constructor(message: string, options: { status: number; code?: string }) { super(message); this.status = options.status; this.code = options.code; }
} }));
jest.mock('../useWeeklyMenu', () => ({ useRefreshWeeklyMenu: () => refresh }));
jest.mock('@/services/stockCommands', () => ({ undoStockCommand: jest.fn(async () => ({ status: 'undone' })) }));
jest.mock('@/services/menuCommands', () => ({
  menuEditIntent: (operation: { op: string; entry_id: string; expected_version: number }) => `menu-edit:${operation.entry_id}:${operation.op}:${operation.expected_version}`,
  updateMenu: jest.fn(),
  resumePendingMenuEdits: jest.fn(async () => ({ confirmed: [], refused: 0, failures: [] })),
}));
const { ApiError } = jest.requireMock('@/lib/api') as { ApiError: new (message: string, options: { status: number; code?: string }) => Error };

const meal: MenuEntryView = { id: 'meal', day_of_week: 4, meal_type: 'dinner', recipe_reference: { id: 'dish', source: 'recipes_catalog' }, recipe_id: null,
  recipe_name: 'Repas du vendredi', servings: 4, prep_time: 10, cook_time: 20, version: 3, cooked_command_id: null, leftover_of: null };
const confirmed = (removed = 1) => ({ command_id: 'command-1', command_type: 'update_menu', status: 'confirmed', affected_tables: ['meal_plan_entries'],
  menu_edit: { before: [], after: [], removed: Array.from({ length: removed }, (_, index) => `gone-${index}`) } });
beforeEach(() => jest.clearAllMocks());

async function mounted() {
  const view = renderHook(() => useMenuEdit());
  await waitFor(() => expect(resumePendingMenuEdits).toHaveBeenCalled());
  return view;
}

test('each gesture sends one operation at the version shown, under its own intention', async () => {
  jest.mocked(updateMenu).mockResolvedValue(confirmed() as never);
  const { result } = await mounted();
  await act(async () => { await result.current.setServings(meal, 6); });
  expect(updateMenu).toHaveBeenLastCalledWith('menu-edit:meal:servings:3', [{ op: 'servings', entry_id: 'meal', expected_version: 3, servings: 6 }]);
  await act(async () => { await result.current.move(meal, '2026-11-30', { day_of_week: 1, meal_type: 'lunch' }, { ...meal, id: 'tuesday', version: 7 }); });
  expect(updateMenu).toHaveBeenLastCalledWith('menu-edit:meal:move:3', [{ op: 'move', entry_id: 'meal', expected_version: 3, date: '2026-12-01', meal_type: 'lunch', target_version: 7 }]);
  await act(async () => { await result.current.addLeftover(meal, '2026-11-30', { day_of_week: 5, meal_type: 'lunch' }, 2); });
  expect(updateMenu).toHaveBeenLastCalledWith('menu-edit:meal:leftover:3', [{ op: 'leftover', entry_id: 'meal', expected_version: 3, date: '2026-12-05', meal_type: 'lunch', servings: 2 }]);
  expect(result.current.lastChange).toEqual({ commandId: 'command-1', message: 'Reste prévu : samedi · déjeuner, 2 portions.', undone: false });
});

test('a removal says how many leftovers left with the meal, and « Annuler » takes it back once', async () => {
  jest.mocked(updateMenu).mockResolvedValue(confirmed(3) as never);
  const { result } = await mounted();
  await act(async () => { await result.current.remove(meal); });
  expect(result.current.lastChange?.message).toBe('« Repas du vendredi » retiré du menu, avec 2 restes.');
  await act(async () => { await result.current.undoLast(); });
  expect(undoStockCommand).toHaveBeenCalledWith('command-1');
  expect(result.current.lastChange).toEqual({ commandId: 'command-1', message: 'Modification annulée : le menu est revenu comme avant.', undone: true });
  await act(async () => { await expect(result.current.undoLast()).resolves.toBe(false); });
  expect(undoStockCommand).toHaveBeenCalledTimes(1);
});

test('a refusal rereads the menu and says why; a lost reply only says it is not confirmed', async () => {
  jest.mocked(updateMenu).mockRejectedValueOnce(new ApiError('changé', { status: 409, code: 'MENU_CHANGED' }));
  const { result } = await mounted();
  await act(async () => { await expect(result.current.setServings(meal, 5)).resolves.toBe(false); });
  expect(result.current.error).toBe('Ce repas a changé entre-temps : le menu a été relu.');
  expect(refresh).toHaveBeenCalledTimes(1);
  // A dropped connection reaches the client as ApiError status 0 (src/lib/apiErrors.ts): the edit may have passed.
  jest.mocked(updateMenu).mockRejectedValueOnce(new ApiError('Connexion impossible.', { status: 0, code: 'NETWORK_ERROR' }));
  await act(async () => { await result.current.setServings(meal, 5); });
  expect(result.current.error).toBe('La modification n’est pas confirmée : vérifie ta connexion. Elle sera vérifiée à la prochaine ouverture de Menus.');
  expect(refresh).toHaveBeenCalledTimes(1);
  // An error raised before sending keeps its own words.
  jest.mocked(updateMenu).mockRejectedValueOnce(new Error('Reconnecte-toi pour reprendre cette action.'));
  await act(async () => { await result.current.setServings(meal, 5); });
  expect(result.current.error).toBe('Reconnecte-toi pour reprendre cette action.');
});

test('one edit at a time: a second gesture during the first does nothing', async () => {
  let release: (value: unknown) => void = () => undefined;
  jest.mocked(updateMenu).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }) as never);
  const { result } = await mounted();
  let first: Promise<boolean> = Promise.resolve(false);
  act(() => { first = result.current.setServings(meal, 5); });
  await waitFor(() => expect(result.current.busyId).toBe('meal'));
  await act(async () => { await expect(result.current.remove(meal)).resolves.toBe(false); });
  expect(updateMenu).toHaveBeenCalledTimes(1);
  await act(async () => { release(confirmed()); await first; });
  expect(result.current.busyId).toBeNull();
});

test('on opening, edits a lost reply left pending are confirmed, refused or still pending', async () => {
  jest.mocked(resumePendingMenuEdits).mockResolvedValueOnce({ confirmed: [confirmed() as never], refused: 0, failures: [] });
  const done = renderHook(() => useMenuEdit());
  await waitFor(() => expect(done.result.current.lastChange?.message).toBe('Une modification précédente du menu vient d’être confirmée : le menu est à jour.'));
  expect(refresh).toHaveBeenCalled();
  done.unmount();
  jest.mocked(resumePendingMenuEdits).mockResolvedValueOnce({ confirmed: [], refused: 1, failures: [] });
  const refused = renderHook(() => useMenuEdit());
  await waitFor(() => expect(refused.result.current.error).toMatch(/n’a pas pu être appliquée/));
  refused.unmount();
  jest.mocked(resumePendingMenuEdits).mockResolvedValueOnce({ confirmed: [], refused: 0, failures: [new Error('hors ligne')] });
  const pending = renderHook(() => useMenuEdit());
  await waitFor(() => expect(pending.result.current.error).toMatch(/pas encore confirmée/));
});

test('the notice and the refusal can be put away', async () => {
  jest.mocked(updateMenu).mockResolvedValueOnce(confirmed() as never).mockRejectedValueOnce(new ApiError('changé', { status: 409, code: 'MENU_CHANGED' }));
  const { result } = await mounted();
  await act(async () => { await result.current.setServings(meal, 5); });
  await act(async () => { await result.current.setServings(meal, 6); });
  expect(result.current.lastChange).not.toBeNull();
  expect(result.current.error).not.toBeNull();
  act(() => result.current.dismiss());
  expect(result.current.lastChange).toBeNull();
  expect(result.current.error).toBeNull();
});

test('an edit holds the controls until the menu is reread, so a second tap carries the new version', async () => {
  let reread: () => void = () => undefined;
  jest.mocked(updateMenu).mockResolvedValueOnce(confirmed() as never);
  const { result } = await mounted();
  refresh.mockImplementationOnce(() => new Promise<undefined>(resolve => { reread = () => resolve(undefined); }));
  let first: Promise<boolean> = Promise.resolve(false);
  act(() => { first = result.current.setServings(meal, 5); });
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  expect(result.current.busyId).toBe('meal');
  await act(async () => { reread(); await first; });
  expect(result.current.busyId).toBeNull();
});

test('a reread that fails never turns a confirmed edit into an error, nor a refusal into an unhandled rejection', async () => {
  const { result } = await mounted();
  jest.mocked(updateMenu).mockResolvedValueOnce(confirmed() as never);
  refresh.mockRejectedValueOnce(new Error('relecture'));
  await act(async () => { await expect(result.current.setServings(meal, 5)).resolves.toBe(true); });
  expect(result.current.error).toBeNull();
  jest.mocked(updateMenu).mockRejectedValueOnce(new ApiError('changé', { status: 409, code: 'MENU_CHANGED' }));
  refresh.mockRejectedValueOnce(new Error('relecture'));
  await act(async () => { await expect(result.current.setServings(meal, 5)).resolves.toBe(false); });
});

test('an undo the menu no longer allows says so and drops « Annuler »; one already done is shown as done', async () => {
  jest.mocked(updateMenu).mockResolvedValue(confirmed() as never);
  const { result } = await mounted();
  await act(async () => { await result.current.setServings(meal, 5); });
  jest.mocked(undoStockCommand).mockRejectedValueOnce(new ApiError('changé', { status: 409, code: 'MENU_CHANGED' }));
  await act(async () => { await result.current.undoLast(); });
  expect(result.current.error).toBe('Le menu a changé depuis : cette modification ne peut plus être annulée.');
  expect(result.current.lastChange).toBeNull();
  await act(async () => { await result.current.setServings(meal, 6); });
  jest.mocked(undoStockCommand).mockRejectedValueOnce(new ApiError('cuisiné', { status: 409, code: 'MEAL_COOKED' }));
  await act(async () => { await result.current.undoLast(); });
  expect(result.current.error).toBe('Ce repas a été cuisiné depuis : cette modification ne peut plus être annulée.');
  await act(async () => { await result.current.setServings(meal, 7); });
  jest.mocked(undoStockCommand).mockRejectedValueOnce(new ApiError('déjà', { status: 409, code: 'ALREADY_UNDONE' }));
  await act(async () => { await result.current.undoLast(); });
  expect(result.current.lastChange).toMatchObject({ undone: true, message: 'Modification annulée : le menu est revenu comme avant.' });
  expect(result.current.error).toBeNull();
});

test('opening a dialog clears an old refusal, and keeps the notice', async () => {
  jest.mocked(updateMenu).mockResolvedValueOnce(confirmed() as never).mockRejectedValueOnce(new ApiError('changé', { status: 409, code: 'MENU_CHANGED' }));
  const { result } = await mounted();
  await act(async () => { await result.current.setServings(meal, 5); });
  await act(async () => { await result.current.setServings(meal, 6); });
  act(() => result.current.clearError());
  expect(result.current.error).toBeNull();
  expect(result.current.lastChange).not.toBeNull();
});
