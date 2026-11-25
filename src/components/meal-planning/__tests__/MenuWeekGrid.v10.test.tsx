import { act, fireEvent, render, screen, within } from '@testing-library/react';
import MenuWeekGrid from '../MenuWeekGrid';
import type { MenuEntryView } from '@/hooks/useWeeklyMenu';

// The grid only decides where an entry goes; the card itself is out of scope.
jest.mock('../MenuEntryCard', () => ({ __esModule: true, default: ({ entry, drag }: { entry: MenuEntryView; drag?: { enabled: boolean; onStart: () => void; onEnd: () => void } }) =>
  <p draggable={drag?.enabled || undefined} onDragStart={() => drag?.onStart()} onDragEnd={() => drag?.onEnd()}>{entry.recipe_name}</p> }));

const entry = (day_of_week: number, recipe_name: string): MenuEntryView => ({
  id: `entry-${day_of_week}`, day_of_week, meal_type: 'dinner', recipe_id: null,
  recipe_name, servings: 2, prep_time: 10, cook_time: 20, version: 0, cooked_command_id: null, leftover_of: null,
});

const renderGrid = (entries: MenuEntryView[], onAddSlot = jest.fn()) => {
  render(<MenuWeekGrid weekStart="2026-11-02" entries={entries} onAddSlot={onAddSlot} actions={{ entries, busyId: null, onServings: jest.fn(), onMove: jest.fn(), onLeftover: jest.fn(), onRemove: jest.fn() }} />);
  return onAddSlot;
};

// plan_recipe stores isodow-1 and the assistant tools document 0=Monday:
// the grid must use the same Monday-based offset.
test('a stored day_of_week of 0 is shown on Monday and 6 on Sunday', () => {
  renderGrid([entry(0, 'Gratin du lundi'), entry(6, 'Rôti du dimanche')]);
  expect(within(within(screen.getByRole('group', { name: 'Menus de la semaine' })).getByRole('group', { name: 'Lundi — Dîner' })).getByText('Gratin du lundi')).toBeInTheDocument();
  expect(within(within(screen.getByRole('group', { name: 'Menus de la semaine' })).getByRole('group', { name: 'Dimanche — Dîner' })).getByText('Rôti du dimanche')).toBeInTheDocument();
});

test('adding on Monday sends offset 0 and on Sunday offset 6', () => {
  const onAddSlot = renderGrid([]);
  fireEvent.click(screen.getAllByRole('button', { name: 'Ajouter une recette — Lundi dîner' })[0]);
  fireEvent.click(screen.getAllByRole('button', { name: 'Ajouter une recette — Dimanche dîner' })[0]);
  expect(onAddSlot.mock.calls.map(([slot]) => [slot.day_label, slot.day_of_week])).toEqual([['Lundi', 0], ['Dimanche', 6]]);
});

// V11-01 E3d (D5): on the computer grid, a meal dropped on a slot moves there, or swaps; a slot says it first.
describe('drag and drop on the computer grid', () => {
  const meal = (id: string, day_of_week: number, meal_type: MenuEntryView['meal_type'], extra: Partial<MenuEntryView> = {}): MenuEntryView => ({
    id, day_of_week, meal_type, recipe_id: null, recipe_name: id, servings: 4, prep_time: 0, cook_time: 0, version: 1, cooked_command_id: null, leftover_of: null, ...extra });
  const curry = meal('Curry', 1, 'dinner');
  const rest = meal('Reste : Curry', 2, 'lunch', { leftover_of: 'Curry', servings: 2 });
  const gratin = meal('Gratin', 5, 'dinner');
  const week = [curry, rest, gratin];
  const dataTransfer = () => ({ dropEffect: 'none', setData: jest.fn(), effectAllowed: 'move' });
  function setup(busyId: string | null = null) {
    const onDrop = jest.fn();
    const grid = (entries: MenuEntryView[], busy: string | null = busyId, weekStart = '2026-11-02') =>
      <MenuWeekGrid weekStart={weekStart} entries={entries} onAddSlot={jest.fn()} actions={{ entries, busyId: busy, onServings: jest.fn(), onMove: jest.fn(), onLeftover: jest.fn(), onRemove: jest.fn(), onDrop } as never} />;
    const view = render(grid(week));
    const desktop = () => screen.getByRole('group', { name: 'Menus de la semaine' });
    return { onDrop, desktop: desktop(), rerender: (entries: MenuEntryView[], busy: string | null = busyId, weekStart?: string) => view.rerender(grid(entries, busy, weekStart)),
      slot: (name: string) => within(desktop()).getByRole('group', { name }), card: (name: string) => within(desktop()).getByText(name) };
  }
  /** The meal is held once the browser has taken its drag image (the state follows on the next task). */
  async function hold(card: HTMLElement) {
    fireEvent.dragStart(card, { dataTransfer: dataTransfer() });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  }

  test('only the cards of the computer grid can be held, and none while an edit runs', () => {
    const { desktop } = setup();
    expect(within(desktop).getByText('Curry')).toHaveAttribute('draggable', 'true');
    expect(within(screen.getByRole('group', { name: 'Menus de la semaine sur petit écran' })).getByText('Curry')).not.toHaveAttribute('draggable');
  });

  test('a free slot accepts the meal and says so; the drop moves it there', async () => {
    const { onDrop, slot, card } = setup();
    await hold(card('Gratin'));
    // The empty slots' buttons let the drag reach their slot while a meal is held.
    expect(screen.getByRole('group', { name: 'Menus de la semaine' })).toHaveAttribute('data-holding', 'true');
    const target = slot('Lundi — Dîner');
    expect(fireEvent.dragOver(target, { dataTransfer: dataTransfer() })).toBe(false);
    expect(within(target).getByText('Déposer ici')).toBeInTheDocument();
    expect(target).toHaveAttribute('data-drop', 'move');
    fireEvent.drop(target, { dataTransfer: dataTransfer() });
    expect(onDrop).toHaveBeenCalledWith(gratin, { day_of_week: 0, meal_type: 'dinner' }, null);
    expect(within(target).queryByText('Déposer ici')).toBeNull();
    expect(screen.getByRole('group', { name: 'Menus de la semaine' })).not.toHaveAttribute('data-holding');
  });

  test('an occupied slot announces the swap; the drop names the meal swapped', async () => {
    const { onDrop, slot, card } = setup();
    await hold(card('Gratin'));
    // Swapped with the curry, the curry would come after its own leftover: refused, and said.
    expect(fireEvent.dragOver(slot('Mardi — Dîner'), { dataTransfer: dataTransfer() })).toBe(true);
    expect(within(slot('Mardi — Dîner')).getByText('« Curry » doit venir avant ses restes : l’échange est impossible.')).toBeInTheDocument();
    const target = slot('Mercredi — Déjeuner');
    expect(fireEvent.dragOver(target, { dataTransfer: dataTransfer() })).toBe(false);
    expect(within(target).getByText('Échanger avec « Reste : Curry »')).toBeInTheDocument();
    expect(within(slot('Mardi — Dîner')).queryByText(/l’échange est impossible/)).toBeNull();
    fireEvent.drop(target, { dataTransfer: dataTransfer() });
    expect(onDrop).toHaveBeenCalledWith(gratin, { day_of_week: 2, meal_type: 'lunch' }, rest);
  });

  test('a slot the order of leftovers forbids says why, refuses the drop and sends nothing', async () => {
    const { onDrop, slot, card } = setup();
    await hold(card('Reste : Curry'));
    const target = slot('Lundi — Dîner');
    expect(fireEvent.dragOver(target, { dataTransfer: dataTransfer() })).toBe(true);
    expect(within(target).getByText('Ce reste doit venir après son repas d’origine.')).toBeInTheDocument();
    expect(target).toHaveAttribute('data-drop', 'blocked');
    fireEvent.drop(target, { dataTransfer: dataTransfer() });
    expect(onDrop).not.toHaveBeenCalled();
  });

  test('a meal let go anywhere else changes nothing; its own slot says nothing', async () => {
    const { onDrop, slot, card } = setup();
    await hold(card('Curry'));
    const own = slot('Mardi — Dîner');
    expect(fireEvent.dragOver(own, { dataTransfer: dataTransfer() })).toBe(true);
    expect(own).not.toHaveAttribute('data-drop');
    fireEvent.dragEnd(card('Curry'));
    expect(screen.getByRole('group', { name: 'Menus de la semaine' })).not.toHaveAttribute('data-holding');
    fireEvent.drop(slot('Lundi — Dîner'), { dataTransfer: dataTransfer() });
    expect(onDrop).not.toHaveBeenCalled();
  });

  // Review of E3d: the grid never stays held, and the meal sent is the one the week shows now.
  test('a held meal that leaves the week, moves elsewhere, or a week changed, lets the grid go', async () => {
    const { rerender, card } = setup();
    const grid = () => screen.getByRole('group', { name: 'Menus de la semaine' });
    await hold(card('Gratin'));
    expect(grid()).toHaveAttribute('data-holding', 'true');
    rerender([curry, rest]);
    expect(grid()).not.toHaveAttribute('data-holding');
    rerender(week);
    await hold(card('Gratin'));
    rerender([curry, rest, { ...gratin, day_of_week: 6 }]);
    expect(grid()).not.toHaveAttribute('data-holding');
    await hold(card('Curry'));
    rerender(week, null, '2026-11-09');
    expect(grid()).not.toHaveAttribute('data-holding');
  });

  test('a drop sends the meal at its current version; while another edit runs, nothing is held and nothing dropped', async () => {
    const { onDrop, rerender, slot, card } = setup();
    await hold(card('Gratin'));
    rerender([curry, rest, { ...gratin, version: 7 }]);
    fireEvent.dragOver(slot('Lundi — Dîner'), { dataTransfer: dataTransfer() });
    fireEvent.drop(slot('Lundi — Dîner'), { dataTransfer: dataTransfer() });
    expect(onDrop).toHaveBeenCalledWith(expect.objectContaining({ id: 'Gratin', version: 7 }), { day_of_week: 0, meal_type: 'dinner' }, null);
    await hold(card('Gratin'));
    rerender(week, 'Curry');
    expect(screen.getByRole('group', { name: 'Menus de la semaine' })).not.toHaveAttribute('data-holding');
    fireEvent.drop(slot('Lundi — Dîner'), { dataTransfer: dataTransfer() });
    expect(onDrop).toHaveBeenCalledTimes(1);
  });

  test('while an edit runs, nothing is held', () => {
    const { desktop } = setup('Curry');
    expect(within(desktop).getByText('Gratin')).not.toHaveAttribute('draggable');
  });
});
