import { render,screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import KitchenWeekPreview from '../KitchenWeekPreview';
import type { MenuRead } from '@/components/kitchen/today/TonightBlock';

const planned = { data: { meal_plan_id: 'plan', week_start_date: '2026-11-02', entries: [{ id: 'e', day_of_week: 4, meal_type: 'dinner', recipe_id: null, recipe_name: 'Mon repas enregistré', servings: 2, prep_time: 0, cook_time: 0, version: 0, cooked_command_id: null, leftover_of: null }] }, isLoading: false, isError: false } as MenuRead;
const renderWeek = (now: string, mealType: 'dinner' | 'lunch', menu: MenuRead = planned) =>
  render(<MemoryRouter><KitchenWeekPreview now={new Date(now)} mealType={mealType} menu={menu} /></MemoryRouter>);

test('shows the owned scheduled dinner and genuine empty days of the current Paris week',()=>{
  renderWeek('2026-11-06T12:00:00Z', 'dinner');
  expect(screen.getByText('Mon repas enregistré')).toBeVisible();
  expect(screen.getAllByText('Choisir un repas')).toHaveLength(2);
  expect(screen.getByRole('link',{name:'Voir mes menus'})).toHaveAttribute('href','/kitchen/meal-planning');
});
test('uses the Paris day when UTC is still Sunday',()=>{
  // Paris has crossed into Monday while UTC is still Sunday: three days from Monday are shown.
  renderWeek('2026-11-08T23:30:00Z', 'lunch', { data: { meal_plan_id: null, week_start_date: '2026-11-09', entries: [] }, isLoading: false, isError: false });
  expect(screen.getAllByText('Choisir un repas')).toHaveLength(3);
});
test('an unavailable plan is never three supposedly empty slots, and the alert belongs to the home',()=>{
  renderWeek('2026-11-06T12:00:00Z', 'dinner', { data: undefined, isError: true, isLoading: false });
  expect(screen.getByText('Semaine indisponible pour le moment.')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.queryByText('Choisir un repas')).not.toBeInTheDocument();
});

test('a Sunday preview contains only the current week, not invented empty slots for next week',()=>{
  renderWeek('2026-11-08T12:00:00Z', 'dinner');
  expect(screen.getAllByText('Choisir un repas')).toHaveLength(1);
});
