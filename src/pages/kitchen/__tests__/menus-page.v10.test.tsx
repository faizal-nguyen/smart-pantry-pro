import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import MenusPage from '../MenusPage';
import { useWeeklyMenu } from '@/hooks/useWeeklyMenu';

jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthenticatedUser: () => ({ id: 'owner' }) }));
jest.mock('@/hooks/useCalendarNow', () => ({ useCalendarNow: () => new Date('2026-11-24T12:00:00Z') }));
jest.mock('@/hooks/useAskAssistant', () => ({ useAskAssistant: () => jest.fn() }));
jest.mock('@/hooks/useWeeklyMenu', () => ({ useWeeklyMenu: jest.fn(() => ({ data: { meal_plan_id: null, week_start_date: '', entries: [] }, isLoading: false, isError: false,
  refetch: jest.fn(), addEntry: { mutateAsync: jest.fn(), isPending: false }, removeEntry: { mutateAsync: jest.fn(), isPending: false, variables: undefined } })) }));
jest.mock('@/components/meal-planning/MenuWeekGrid', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/meal-planning/AddRecipeToMenuDialog', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/recipes/RecipesMenusSwitch', () => ({ __esModule: true, default: () => null }));

function Location() { const location = useLocation(); return <output aria-label="Adresse">{location.pathname}{location.search}</output>; }
const show = (path: string) => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/kitchen/meal-planning" element={<MenusPage />} /></Routes><Location /></MemoryRouter>);
beforeEach(() => jest.clearAllMocks());

// D8: the week is in the address, so the review and the way back keep it.
test('the week is read from the address and leads to that week’s shopping', () => {
  show('/kitchen/meal-planning?week=2026-11-30');
  expect(useWeeklyMenu).toHaveBeenLastCalledWith('2026-11-30');
  expect(screen.getByRole('link', { name: 'Courses de la semaine' })).toHaveAttribute('href', '/shopping/week?week=2026-11-30');
});

test('changing week writes it in the address, keeping the other parameters', () => {
  show('/kitchen/meal-planning?week=2026-11-30&recipe_name=Curry');
  fireEvent.click(screen.getByRole('button', { name: 'Semaine suivante' }));
  expect(screen.getByLabelText('Adresse')).toHaveTextContent('/kitchen/meal-planning?week=2026-12-07&recipe_name=Curry');
  expect(useWeeklyMenu).toHaveBeenLastCalledWith('2026-12-07');
  fireEvent.click(screen.getByRole('button', { name: 'Revenir à cette semaine' }));
  expect(useWeeklyMenu).toHaveBeenLastCalledWith('2026-11-23');
});

test('without a valid week in the address, the current week is shown', () => {
  show('/kitchen/meal-planning?week=2026-12-02');
  expect(useWeeklyMenu).toHaveBeenLastCalledWith('2026-11-23');
  expect(screen.getByRole('link', { name: 'Courses de la semaine' })).toHaveAttribute('href', '/shopping/week?week=2026-11-23');
});
