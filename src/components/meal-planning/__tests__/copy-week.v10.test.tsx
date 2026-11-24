import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CopyWeekDialog from '../CopyWeekDialog';
import { useWeeklyMenu, type MenuEntryView } from '@/hooks/useWeeklyMenu';

const RECIPE = '11111111-1111-4111-8111-111111111111';
const meal = (id: string, day: number, meal_type: MenuEntryView['meal_type'], extra: Partial<MenuEntryView> = {}): MenuEntryView => ({
  id, day_of_week: day, meal_type, recipe_id: null, recipe_reference: { id: RECIPE, source: 'recipes_catalog' }, recipe_name: id,
  servings: 4, prep_time: 0, cook_time: 0, version: 1, cooked_command_id: null, leftover_of: null, ...extra,
});
let weeks: Record<string, MenuEntryView[] | 'loading' | 'error' | 'stale-error'> = {};
const refetch = jest.fn();
jest.mock('@/hooks/useWeeklyMenu', () => ({ useWeeklyMenu: jest.fn((week: string) => {
  const state = weeks[week] ?? [];
  // stale-error: a failed reread, the older reading still in memory (TanStack keeps it).
  return { data: Array.isArray(state) || state === 'stale-error' ? { meal_plan_id: null, week_start_date: week, entries: Array.isArray(state) ? state : [] } : undefined,
    isLoading: state === 'loading', isError: state === 'error' || state === 'stale-error', refetch };
}) }));
const source = [meal('Curry', 0, 'dinner'), meal('Soupe', 1, 'dinner', { servings: 2 }), meal('Reste : Curry', 2, 'lunch', { recipe_reference: null, leftover_of: 'Curry' })];
const show = (extra: Partial<Parameters<typeof CopyWeekDialog>[0]> = {}) => {
  const props = { sourceWeek: '2026-11-30', entries: source, busy: false, onClose: jest.fn(), onConfirm: jest.fn(async () => true), ...extra };
  render(<CopyWeekDialog {...props} />);
  return props;
};
beforeEach(() => { jest.clearAllMocks(); weeks = {}; });

test('the next week is chosen first; into an empty week every meal with a recipe is copied, never a leftover', async () => {
  const props = show();
  expect(screen.getByRole('combobox', { name: 'Vers' })).toHaveDisplayValue('Semaine du 7 → 13 déc. (semaine suivante)');
  expect(useWeeklyMenu).toHaveBeenLastCalledWith('2026-12-07');
  expect(screen.getByRole('status')).toHaveTextContent('2 repas seront copiés. Les restes ne sont pas copiés.');
  fireEvent.click(screen.getByRole('button', { name: 'Copier 2 repas' }));
  expect(props.onConfirm).toHaveBeenCalledWith('2026-12-07', expect.objectContaining({ copied: 2 }));
  await waitFor(() => expect(props.onClose).toHaveBeenCalled());
});

test('meals already planned are listed and kept by default; replacing them is a choice; a cooked one is always kept', () => {
  weeks = { '2026-12-14': [meal('Gratin', 0, 'dinner', { version: 5 }), meal('Reste : Gratin', 3, 'lunch', { recipe_reference: null, leftover_of: 'Gratin' }),
    meal('Tarte', 1, 'dinner', { cooked_command_id: 'cooked' })] };
  const props = show();
  fireEvent.change(screen.getByRole('combobox', { name: 'Vers' }), { target: { value: '2026-12-14' } });
  const list = screen.getByRole('list', { name: 'Déjà prévu cette semaine-là' });
  const items = () => within(screen.getByRole('list', { name: 'Déjà prévu cette semaine-là' })).getAllByRole('listitem').map(item => item.textContent);
  expect(list).toBeInTheDocument();
  expect(items()).toEqual(['Lundi · dîner : « Gratin » déjà prévu, gardé', 'Mardi · dîner : « Tarte » déjà cuisiné, toujours gardé']);
  expect(screen.getByRole('radio', { name: 'Garder les repas déjà prévus' })).toBeChecked();
  expect(screen.getByRole('status')).toHaveTextContent('Aucun repas à copier : chaque créneau est déjà pris. 2 gardés.');
  expect(screen.getByRole('button', { name: 'Copier 0 repas' })).toBeDisabled();
  fireEvent.click(screen.getByRole('radio', { name: 'Les remplacer' }));
  expect(items()).toEqual(['Lundi · dîner : « Gratin » et son reste remplacés par « Curry »', 'Mardi · dîner : « Tarte » déjà cuisiné, toujours gardé']);
  expect(screen.getByRole('status')).toHaveTextContent('1 repas sera copié, 1 gardé.');
  fireEvent.click(screen.getByRole('button', { name: 'Copier 1 repas' }));
  expect(props.onConfirm).toHaveBeenCalledWith('2026-12-14', expect.objectContaining({
    operations: [expect.objectContaining({ date: '2026-12-14', expected_version: 5 })],
  }));
});

test('the target week is read before anything can be copied; a failed read can be retried', () => {
  weeks = { '2026-12-07': 'loading' };
  show();
  expect(screen.getByRole('status')).toHaveTextContent('Lecture de la semaine…');
  expect(screen.getByRole('button', { name: /^Copier/ })).toBeDisabled();
  weeks = { '2026-12-07': 'error' };
  fireEvent.change(screen.getByRole('combobox', { name: 'Vers' }), { target: { value: '2026-12-21' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Vers' }), { target: { value: '2026-12-07' } });
  expect(screen.getByRole('alert')).toHaveTextContent('Cette semaine n’a pas pu être lue.');
  fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
  expect(refetch).toHaveBeenCalled();
});

test('a refusal is said inside the dialog; while the copy runs, the button keeps focus and waits', () => {
  show({ busy: true, error: 'La semaine choisie a changé entre-temps : la copie a été recalculée. Vérifie-la, puis recommence.' });
  expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('La semaine choisie a changé');
  const button = screen.getByRole('button', { name: 'Copie en cours…' });
  expect(button).toHaveAttribute('aria-disabled', 'true');
  expect(button).not.toBeDisabled();
});

test('« Les remplacer » never carries over to another week chosen, and replacing says the leftovers go too', () => {
  weeks = { '2026-12-07': [meal('Gratin', 0, 'dinner')], '2026-12-14': [meal('Tarte', 1, 'dinner')] };
  show();
  fireEvent.click(screen.getByRole('radio', { name: 'Les remplacer' }));
  expect(screen.getByText('Un repas remplacé emporte ses restes, même dans une autre semaine. Un repas déjà cuisiné est toujours gardé.')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox', { name: 'Vers' }), { target: { value: '2026-12-14' } });
  expect(screen.getByRole('radio', { name: 'Garder les repas déjà prévus' })).toBeChecked();
});

test('a week whose reread failed cannot be copied into, even with an older reading in memory', () => {
  weeks = { '2026-12-07': 'stale-error' };
  show();
  expect(screen.getByRole('alert')).toHaveTextContent('Cette semaine n’a pas pu être lue.');
  expect(screen.getByRole('button', { name: 'Copier' })).toBeDisabled();
});
