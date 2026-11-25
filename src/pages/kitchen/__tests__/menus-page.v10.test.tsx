import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import MenusPage from '../MenusPage';
import { useWeeklyMenu, type MenuEntryView } from '@/hooks/useWeeklyMenu';
import type { MenuCardActions } from '@/components/meal-planning/MenuEntryCard';
import { downloadTextFile } from '@/lib/downloadFile';
import { useMenuEdit } from '@/hooks/useMenuEdit';

jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthenticatedUser: () => ({ id: 'owner' }) }));
jest.mock('@/hooks/useCalendarNow', () => ({ useCalendarNow: () => new Date('2026-11-24T12:00:00Z') }));
jest.mock('@/hooks/useAskAssistant', () => ({ useAskAssistant: () => jest.fn() }));
const meal: MenuEntryView = { id: 'meal', day_of_week: 2, meal_type: 'dinner', recipe_reference: { id: 'dish', source: 'recipes_catalog' }, recipe_id: null,
  recipe_name: 'Repas du mercredi', servings: 4, prep_time: 10, cook_time: 20, version: 1, cooked_command_id: null, leftover_of: null };
let weekEntries: Record<string, MenuEntryView[]> = {};
jest.mock('@/hooks/useWeeklyMenu', () => ({ useWeeklyMenu: jest.fn((week: string) => ({ data: { meal_plan_id: 'plan', week_start_date: week, entries: weekEntries[week] ?? [meal] }, isLoading: false, isError: false,
  refetch: jest.fn(), addEntry: { mutateAsync: jest.fn(), isPending: false } })) }));
const edit = { busyId: null as string | null, lastChange: null as null | { commandId: string; message: string; undone: boolean }, error: null as string | null,
  setServings: jest.fn(async () => true), move: jest.fn(async () => true), addLeftover: jest.fn(async () => true), remove: jest.fn(async () => true), copyWeek: jest.fn(async () => true), undoLast: jest.fn(async () => true), dismiss: jest.fn(), clearError: jest.fn() };
jest.mock('@/hooks/useMenuEdit', () => ({ useMenuEdit: jest.fn(() => edit) }));
jest.mock('@/lib/downloadFile', () => ({ downloadTextFile: jest.fn() }));
let gridActions: MenuCardActions | null = null;
jest.mock('@/components/meal-planning/MenuWeekGrid', () => ({ __esModule: true, default: (props: { actions: MenuCardActions }) => { gridActions = props.actions; return null; } }));
jest.mock('@/components/meal-planning/AddRecipeToMenuDialog', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/recipes/RecipesMenusSwitch', () => ({ __esModule: true, default: () => null }));

function Location() { const location = useLocation(); return <output aria-label="Adresse">{location.pathname}{location.search}</output>; }
const show = (path: string) => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/kitchen/meal-planning" element={<MenusPage />} /></Routes><Location /></MemoryRouter>);
beforeEach(() => { jest.clearAllMocks(); Object.assign(edit, { busyId: null, lastChange: null, error: null }); gridActions = null; weekEntries = {}; });

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

// V11-01 E3b: the card's edits go through useMenuEdit; the page says what was done and offers to undo it.
test('a confirmed edit is announced with « Annuler », which takes it back', () => {
  edit.lastChange = { commandId: 'command-1', message: '« Repas du mercredi » retiré du menu.', undone: false };
  show('/kitchen/meal-planning?week=2026-11-30');
  expect(screen.getByText('« Repas du mercredi » retiré du menu.').closest('[role="status"]')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Annuler : « Repas du mercredi » retiré du menu.' }));
  expect(edit.undoLast).toHaveBeenCalled();
});

test('an undone edit no longer offers « Annuler », and a refusal is shown as an alert', () => {
  edit.lastChange = { commandId: 'command-1', message: 'Modification annulée : le menu est revenu comme avant.', undone: true };
  edit.error = 'Ce repas a changé entre-temps : le menu a été relu.';
  show('/kitchen/meal-planning?week=2026-11-30');
  expect(screen.queryByRole('button', { name: /^Annuler/ })).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Ce repas a changé entre-temps : le menu a été relu.');
});

test('the card’s actions reach the edits with the week shown, and open each dialog once', async () => {
  show('/kitchen/meal-planning?week=2026-11-30');
  expect(gridActions?.entries).toEqual([meal]);
  act(() => gridActions!.onServings(meal, 5));
  expect(edit.setServings).toHaveBeenCalledWith(meal, 5);
  act(() => gridActions!.onRemove(meal));
  expect(edit.remove).toHaveBeenCalledWith(meal);
  act(() => gridActions!.onMove(meal));
  fireEvent.click(screen.getByRole('radio', { name: 'Vendredi' }));
  fireEvent.click(screen.getByRole('button', { name: 'Déplacer' }));
  expect(edit.move).toHaveBeenCalledWith(meal, '2026-11-30', { day_of_week: 4, meal_type: 'dinner' }, null);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  act(() => gridActions!.onLeftover(meal));
  fireEvent.click(await screen.findByRole('button', { name: 'Prévoir ce reste' }));
  expect(edit.addLeftover).toHaveBeenCalledWith(meal, '2026-11-30', { day_of_week: 2, meal_type: 'snack' }, 2);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

test('a dialog closed without change gives focus back to the card’s menu; a confirmed one, to « Annuler »', async () => {
  const { rerender } = show('/kitchen/meal-planning?week=2026-11-30');
  const opener = document.createElement('button');
  document.body.appendChild(opener);
  opener.focus();
  act(() => gridActions!.onMove(meal));
  fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape', code: 'Escape' });
  await waitFor(() => expect(opener).toHaveFocus());
  act(() => gridActions!.onLeftover(meal));
  edit.addLeftover.mockImplementationOnce(async () => {
    edit.lastChange = { commandId: 'command-2', message: 'Reste prévu : mercredi · collation, 2 portions.', undone: false };
    return true;
  });
  fireEvent.click(await screen.findByRole('button', { name: 'Prévoir ce reste' }));
  rerender(<MemoryRouter initialEntries={['/kitchen/meal-planning?week=2026-11-30']}><Routes><Route path="/kitchen/meal-planning" element={<MenusPage />} /></Routes></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Annuler : Reste prévu : mercredi · collation, 2 portions.' })).toHaveFocus());
  opener.remove();
});

test('a removal confirmed puts focus on « Annuler », the card being gone', async () => {
  edit.remove.mockImplementationOnce(async () => {
    edit.lastChange = { commandId: 'command-3', message: '« Repas du mercredi » retiré du menu.', undone: false };
    return true;
  });
  const { rerender } = show('/kitchen/meal-planning?week=2026-11-30');
  await act(async () => { gridActions!.onRemove(meal); });
  rerender(<MemoryRouter initialEntries={['/kitchen/meal-planning?week=2026-11-30']}><Routes><Route path="/kitchen/meal-planning" element={<MenusPage />} /></Routes></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Annuler : « Repas du mercredi » retiré du menu.' })).toHaveFocus());
});

// V11-01 E3d (D5): a drop on the computer grid is the same move as « Déplacer… », then « Annuler ».
test('a meal dropped on another slot sends the same move as « Déplacer… », and focus goes to « Annuler »', async () => {
  const other: MenuEntryView = { ...meal, id: 'other', day_of_week: 4, recipe_name: 'Repas du vendredi', version: 3 };
  weekEntries = { '2026-11-30': [meal, other] };
  edit.move.mockImplementationOnce(async () => {
    edit.lastChange = { commandId: 'command-4', message: '« Repas du mercredi » et « Repas du vendredi » échangés.', undone: false };
    return true;
  });
  const { rerender } = show('/kitchen/meal-planning?week=2026-11-30');
  await act(async () => { gridActions!.onDrop!(meal, { day_of_week: 4, meal_type: 'dinner' }, other); });
  expect(edit.move).toHaveBeenCalledWith(meal, '2026-11-30', { day_of_week: 4, meal_type: 'dinner' }, other);
  rerender(<MemoryRouter initialEntries={['/kitchen/meal-planning?week=2026-11-30']}><Routes><Route path="/kitchen/meal-planning" element={<MenusPage />} /></Routes></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Annuler : « Repas du mercredi » et « Repas du vendredi » échangés.' })).toHaveFocus());
});

test('the notice stays in view at the bottom of the screen and can be closed', () => {
  edit.lastChange = { commandId: 'command-1', message: '« Repas du mercredi » : 5 portions.', undone: false };
  edit.error = 'Ce repas a changé entre-temps : le menu a été relu.';
  show('/kitchen/meal-planning?week=2026-11-30');
  const notice = screen.getByText('« Repas du mercredi » : 5 portions.').closest('[role="status"]')!;
  expect(notice.closest('.kitchen-menu-notices')).not.toBeNull();
  expect(screen.getByRole('alert').closest('.kitchen-menu-notices')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Fermer le message' }));
  expect(edit.dismiss).toHaveBeenCalled();
});

const page = () => <MemoryRouter initialEntries={['/kitchen/meal-planning?week=2026-11-30']}><Routes><Route path="/kitchen/meal-planning" element={<MenusPage />} /></Routes></MemoryRouter>;

test('a dialog says a refusal inside itself, then confirms against the meal as reread', async () => {
  const { rerender } = render(page());
  act(() => gridActions!.onMove(meal));
  expect(edit.clearError).toHaveBeenCalled();
  edit.move.mockImplementationOnce(async () => { edit.error = 'Ce repas a changé entre-temps : le menu a été relu.'; return false; });
  fireEvent.click(await screen.findByRole('radio', { name: 'Vendredi' }));
  fireEvent.click(screen.getByRole('button', { name: 'Déplacer' }));
  await waitFor(() => expect(edit.move).toHaveBeenCalledTimes(1));
  weekEntries = { '2026-11-30': [{ ...meal, version: 2 }] };
  rerender(page());
  expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('Ce repas a changé entre-temps');
  fireEvent.click(screen.getByRole('button', { name: 'Déplacer' }));
  await waitFor(() => expect(edit.move).toHaveBeenCalledTimes(2));
  expect(edit.move).toHaveBeenLastCalledWith({ ...meal, version: 2 }, '2026-11-30', { day_of_week: 4, meal_type: 'dinner' }, null);
});

test('a dialog closes when its meal leaves the week shown (another week, or removed elsewhere)', async () => {
  weekEntries = { '2026-11-30': [meal], '2026-12-07': [] };
  render(page());
  act(() => gridActions!.onMove(meal));
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('button', { name: 'Semaine suivante', hidden: true }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(edit.move).not.toHaveBeenCalled();
});

test('after « Annuler », focus goes to « Fermer » rather than being lost', async () => {
  edit.lastChange = { commandId: 'command-1', message: '« Repas du mercredi » : 5 portions.', undone: false };
  const { rerender } = render(page());
  edit.undoLast.mockImplementationOnce(async () => { edit.lastChange = { commandId: 'command-1', message: 'Modification annulée : le menu est revenu comme avant.', undone: true }; return true; });
  fireEvent.click(screen.getByRole('button', { name: 'Annuler : « Repas du mercredi » : 5 portions.' }));
  await waitFor(() => expect(edit.undoLast).toHaveBeenCalled());
  rerender(page());
  await waitFor(() => expect(screen.getByRole('button', { name: 'Fermer le message' })).toHaveFocus());
});

// V11-01 E3c: copy the week and add it to a calendar.
test('the week’s tools appear only when the week has meals', () => {
  weekEntries = { '2026-11-30': [] };
  show('/kitchen/meal-planning?week=2026-11-30');
  expect(screen.queryByRole('button', { name: 'Copier vers…' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Ajouter au calendrier' })).not.toBeInTheDocument();
});

test('a confirmed copy opens the week it went to, where « Annuler » can take it back', async () => {
  weekEntries = { '2026-11-30': [meal], '2026-12-07': [] };
  show('/kitchen/meal-planning?week=2026-11-30');
  fireEvent.click(screen.getByRole('button', { name: 'Copier vers…' }));
  expect(edit.clearError).toHaveBeenCalled();
  fireEvent.click(await screen.findByRole('button', { name: 'Copier 1 repas' }));
  await waitFor(() => expect(edit.copyWeek).toHaveBeenCalledWith('2026-12-07', expect.objectContaining({ copied: 1 })));
  await waitFor(() => expect(screen.getByLabelText('Adresse')).toHaveTextContent('week=2026-12-07'));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

test('a refused copy stays on the week shown, its dialog open with the reason', async () => {
  weekEntries = { '2026-11-30': [meal], '2026-12-07': [] };
  edit.copyWeek.mockImplementationOnce(async () => { edit.error = 'La semaine choisie a changé entre-temps : la copie a été recalculée. Vérifie-la, puis recommence.'; return false; });
  const { rerender } = render(page());
  fireEvent.click(screen.getByRole('button', { name: 'Copier vers…' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Copier 1 repas' }));
  await waitFor(() => expect(edit.copyWeek).toHaveBeenCalled());
  rerender(page());
  expect(within(screen.getByRole('dialog')).getByRole('alert')).toHaveTextContent('La semaine choisie a changé');
  expect(useWeeklyMenu).toHaveBeenCalledWith('2026-11-30');
});

test('« Ajouter au calendrier » hands the week to the browser as an .ics file, and says what to do with it', async () => {
  weekEntries = { '2026-11-30': [meal] };
  show('/kitchen/meal-planning?week=2026-11-30');
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter au calendrier' }));
  expect(downloadTextFile).toHaveBeenCalledWith('menus-semaine-2026-11-30.ics', expect.stringContaining('SUMMARY:Dîner : Repas du mercredi'), 'text/calendar');
  expect(await screen.findByText('Fichier « menus-semaine-2026-11-30.ics » prêt : ouvre-le pour ajouter 1 repas à ton calendrier.')).toBeInTheDocument();
});

test('a second export is announced again: the note is emptied, then written', async () => {
  jest.useFakeTimers();
  weekEntries = { '2026-11-30': [meal] };
  show('/kitchen/meal-planning?week=2026-11-30');
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter au calendrier' }));
  act(() => { jest.runAllTimers(); });
  fireEvent.click(screen.getByRole('button', { name: 'Ajouter au calendrier' }));
  expect(screen.queryByText(/^Fichier « menus-semaine/)).not.toBeInTheDocument();
  act(() => { jest.runAllTimers(); });
  expect(screen.getByText(/^Fichier « menus-semaine/)).toBeInTheDocument();
  jest.useRealTimers();
});

// V11-01 E4b: « Proposer la semaine » from Menus, and the notice of the meals it added.
test('« Proposer la semaine » is offered while the week has empty slots to come, even with no meal yet', () => {
  weekEntries = { '2026-11-30': [], '2026-11-16': [] };
  show('/kitchen/meal-planning?week=2026-11-30');
  const links = screen.getAllByRole('link', { name: 'Proposer la semaine' });
  expect(links[0]).toHaveAttribute('href', '/kitchen/meal-planning/proposition?week=2026-11-30');
  fireEvent.click(screen.getByRole('button', { name: 'Semaine précédente' }));
  fireEvent.click(screen.getByRole('button', { name: 'Semaine précédente' }));
  // A week already over: nothing to propose.
  expect(screen.queryByRole('link', { name: 'Proposer la semaine' })).not.toBeInTheDocument();
});

test('the meals a proposal added are announced on Menus with « Annuler », once', async () => {
  const notice = { commandId: 'command-7', message: '2 repas ajoutés au menu de la semaine du 30 nov. → 6 déc.', undone: false };
  render(<MemoryRouter initialEntries={[{ pathname: '/kitchen/meal-planning', search: '?week=2026-11-30', state: { menuNotice: notice } }]}>
    <Routes><Route path="/kitchen/meal-planning" element={<MenusPage />} /></Routes><Location /></MemoryRouter>);
  expect(useMenuEdit).toHaveBeenCalledWith(notice);
  // Read once: a reload does not announce it again.
  await waitFor(() => expect(screen.getByLabelText('Adresse')).toHaveTextContent('/kitchen/meal-planning?week=2026-11-30'));
});

test('a menu that could not be read offers no proposal', () => {
  jest.mocked(useWeeklyMenu).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: jest.fn(), addEntry: { mutateAsync: jest.fn(), isPending: false } } as never);
  show('/kitchen/meal-planning?week=2026-11-30');
  expect(screen.queryByRole('link', { name: 'Proposer la semaine' })).not.toBeInTheDocument();
});
