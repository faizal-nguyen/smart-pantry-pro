import { render,screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import KitchenWeekPreview from '../KitchenWeekPreview';
const mockMenu=jest.fn();
jest.mock('@/hooks/useWeeklyMenu',()=>({useWeeklyMenu:(week:string)=>mockMenu(week)}));
beforeEach(()=>mockMenu.mockReturnValue({data:{entries:[{day_of_week:4,meal_type:'dinner',recipe_name:'Mon repas enregistré'}]},isLoading:false,isError:false,refetch:jest.fn()}));
test('shows the owned scheduled dinner and genuine empty days of the current Paris week',()=>{
  render(<MemoryRouter><KitchenWeekPreview now={new Date('2026-11-06T12:00:00Z')} mealType="dinner" /></MemoryRouter>);
  expect(mockMenu).toHaveBeenCalledWith('2026-11-02');
  expect(screen.getByText('Mon repas enregistré')).toBeVisible();
  expect(screen.getAllByText('Choisir un repas')).toHaveLength(2);
  expect(screen.getByRole('link',{name:'Voir mes menus'})).toHaveAttribute('href','/kitchen/meal-planning');
});
test('uses the Paris week when UTC is still Sunday',()=>{
  render(<MemoryRouter><KitchenWeekPreview now={new Date('2026-11-08T23:30:00Z')} mealType="lunch" /></MemoryRouter>);
  // Paris has crossed into Monday while UTC is still Sunday.
  expect(mockMenu).toHaveBeenCalledWith('2026-11-09');
  expect(screen.getAllByText('Choisir un repas')).toHaveLength(3);
});
test('an unavailable plan is an error, never three supposedly empty meal slots',()=>{
  mockMenu.mockReturnValue({data:undefined,isError:true,isLoading:false,refetch:jest.fn()});
  render(<MemoryRouter><KitchenWeekPreview now={new Date('2026-11-06T12:00:00Z')} mealType="dinner" /></MemoryRouter>);
  expect(screen.getByRole('alert')).toHaveTextContent('Menus indisponibles');
  expect(screen.queryByText('Choisir un repas')).not.toBeInTheDocument();
});

test('a Sunday preview contains only the current week, not invented empty slots for next week',()=>{
  render(<MemoryRouter><KitchenWeekPreview now={new Date('2026-11-08T12:00:00Z')} mealType="dinner" /></MemoryRouter>);
  expect(mockMenu).toHaveBeenCalledWith('2026-11-02');
  expect(screen.getAllByText('Choisir un repas')).toHaveLength(1);
});
