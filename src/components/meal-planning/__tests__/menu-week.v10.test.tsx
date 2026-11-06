import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { calendarWeekStart } from '@smart/shared';
import MenuWeekGrid from '../MenuWeekGrid';
import MenuEntryCard from '../MenuEntryCard';
import type { MenuEntryView } from '@/hooks/useWeeklyMenu';

jest.mock('@/hooks/useCalendarNow', () => ({ useCalendarNow: () => new Date('2026-11-06T12:00:00Z') }));
jest.mock('@/lib/recipeActions', () => ({ fireRecipeAssistantAction: jest.fn() }));

const entry: MenuEntryView = {
  id: 'friday', day_of_week: 4, meal_type: 'dinner', recipe_id: 'catalog-dish',
  recipe_reference: { id: 'catalog-dish', source: 'recipes_catalog' },
  recipe_name: 'Repas du vendredi', servings: 3, prep_time: 10, cook_time: 20,
};

test.each([
  ['2026-11-08T22:30:00Z', '2026-11-02'],
  ['2026-11-08T23:30:00Z', '2026-11-09'],
  ['2026-03-29T22:30:00Z', '2026-03-30'],
  ['2026-10-25T23:30:00Z', '2026-10-26'],
  ['2026-11-08', '2026-11-02'],
])('the Paris week for %s begins on %s', (date, monday) => {
  expect(calendarWeekStart(date)).toBe(monday);
});

test('an invalid calendar label has no week', () => {
  expect(calendarWeekStart('2026-02-30')).toBeNull();
});

test('Friday meals stay on Friday, duplicate slots remain reachable, and additions use Monday=0', () => {
  const add = jest.fn();
  render(<MemoryRouter><MenuWeekGrid weekStart="2026-11-02" entries={[entry, { ...entry, id: 'second', recipe_name: 'Deuxième plat' }]} onAddSlot={add} onRemoveEntry={jest.fn()} /></MemoryRouter>);
  const desktop = within(screen.getByRole('group', { name: 'Menus de la semaine' }));
  const friday = within(desktop.getByRole('region', { name: 'Vendredi' }));
  expect(friday.getByRole('button', { name: 'Ouvrir Repas du vendredi' })).toBeInTheDocument();
  expect(friday.getByRole('button', { name: 'Ouvrir Deuxième plat' })).toBeInTheDocument();
  expect(desktop.getByRole('region', { name: 'Jeudi' })).not.toHaveTextContent('Repas du vendredi');
  fireEvent.click(desktop.getByRole('button', { name: 'Ajouter une recette — Lundi dîner' }));
  expect(add).toHaveBeenCalledWith({ day_of_week: 0, meal_type: 'dinner', day_label: 'Lundi', meal_label: 'Dîner' });
  fireEvent.click(desktop.getByRole('button', { name: 'Ajouter une recette — Dimanche déjeuner' }));
  expect(add).toHaveBeenLastCalledWith({ day_of_week: 6, meal_type: 'lunch', day_label: 'Dimanche', meal_label: 'Déjeuner' });
});

function Location() {
  const location = useLocation();
  return <output aria-label="Destination">{location.pathname}{location.search}</output>;
}

test('opening a planned recipe preserves its catalogue identity and selected portions', () => {
  render(<MemoryRouter><MenuEntryCard entry={entry} onRemove={jest.fn()} /><Location /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Ouvrir Repas du vendredi' }));
  expect(screen.getByLabelText('Destination')).toHaveTextContent('/kitchen/recipes/catalog-dish?source=recipes_catalog&servings=3');
});
