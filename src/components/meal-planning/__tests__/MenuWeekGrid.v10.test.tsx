import { fireEvent, render, screen, within } from '@testing-library/react';
import MenuWeekGrid from '../MenuWeekGrid';
import type { MenuEntryView } from '@/hooks/useWeeklyMenu';

// The grid only decides where an entry goes; the card itself is out of scope.
jest.mock('../MenuEntryCard', () => ({ __esModule: true, default: ({ entry }: { entry: MenuEntryView }) => <p>{entry.recipe_name}</p> }));

const entry = (day_of_week: number, recipe_name: string): MenuEntryView => ({
  id: `entry-${day_of_week}`, day_of_week, meal_type: 'dinner', recipe_id: null,
  recipe_name, servings: 2, prep_time: 10, cook_time: 20,
});

const renderGrid = (entries: MenuEntryView[], onAddSlot = jest.fn()) => {
  render(<MenuWeekGrid entries={entries} onAddSlot={onAddSlot} onRemoveEntry={jest.fn()} />);
  return onAddSlot;
};

// plan_recipe stores isodow-1 and the assistant tools document 0=Monday:
// the grid must use the same Monday-based offset.
test('a stored day_of_week of 0 is shown on Monday and 6 on Sunday', () => {
  renderGrid([entry(0, 'Gratin du lundi'), entry(6, 'Rôti du dimanche')]);
  expect(within(screen.getByRole('gridcell', { name: 'Lundi — Dîner' })).getByText('Gratin du lundi')).toBeInTheDocument();
  expect(within(screen.getByRole('gridcell', { name: 'Dimanche — Dîner' })).getByText('Rôti du dimanche')).toBeInTheDocument();
});

test('adding on Monday sends offset 0 and on Sunday offset 6', () => {
  const onAddSlot = renderGrid([]);
  fireEvent.click(screen.getAllByRole('button', { name: 'Ajouter une recette — Lundi dîner' })[0]);
  fireEvent.click(screen.getAllByRole('button', { name: 'Ajouter une recette — Dimanche dîner' })[0]);
  expect(onAddSlot.mock.calls.map(([slot]) => [slot.day_label, slot.day_of_week])).toEqual([['Lundi', 0], ['Dimanche', 6]]);
});
