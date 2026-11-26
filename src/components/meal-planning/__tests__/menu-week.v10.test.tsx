import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { calendarWeekStart } from '@smart/shared';
import { ApiError } from '@/lib/apiError';
import MenuWeekGrid from '../MenuWeekGrid';
import MenuEntryCard, { type MenuCardActions } from '../MenuEntryCard';
import { WEEKLY_MENU_QUERY_KEY, type MenuEntryView } from '@/hooks/useWeeklyMenu';

jest.mock('@/hooks/useCalendarNow', () => ({ useCalendarNow: () => new Date('2026-11-06T12:00:00Z') }));
const mockCook = jest.fn(), mockUndo = jest.fn(), mockForget = jest.fn(), mockToastError = jest.fn();
jest.mock('@/lib/recipeActions', () => ({ fireRecipeAssistantAction: jest.fn(), cookRecipeWithStock: (...args: unknown[]) => mockCook(...args),
  forgetMealCooking: (...args: unknown[]) => mockForget(...args) }));
jest.mock('@/services/stockCommands', () => ({ undoStockCommand: (...args: unknown[]) => mockUndo(...args) }));
jest.mock('sonner', () => ({ toast: Object.assign(jest.fn(), { error: (...args: unknown[]) => mockToastError(...args) }) }));
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthSessionOptional: () => ({ user: { id: 'owner' } }) }));
// The card rereads the menu through useWeeklyMenu's module; its clients stay out of the test.
jest.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
jest.mock('@/lib/recipeSource', () => ({ fetchUnifiedRecipe: jest.fn() }));

const entry: MenuEntryView = {
  id: 'friday', day_of_week: 4, meal_type: 'dinner', recipe_id: 'catalog-dish',
  recipe_reference: { id: 'catalog-dish', source: 'recipes_catalog' },
  recipe_name: 'Repas du vendredi', servings: 3, prep_time: 10, cook_time: 20, version: 3, cooked_command_id: null, leftover_of: null,
};

const actionsFor = (entries: MenuEntryView[], extra: Partial<MenuCardActions> = {}): MenuCardActions =>
  ({ entries, busyId: null, onServings: jest.fn(), onMove: jest.fn(), onLeftover: jest.fn(), onRemove: jest.fn(), ...extra });

function withClient(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;
}

/** The base as the menu reads it: `mockCookedBy` is the meal's cooked_command_id. */
let mockCookedBy: string | null = null;
function MenuFromBase({ planned = entry }: { planned?: MenuEntryView }) {
  const { data } = useQuery({ queryKey: [...WEEKLY_MENU_QUERY_KEY, 'test'], queryFn: async () => ({ ...planned, cooked_command_id: mockCookedBy }) });
  return data ? <MenuEntryCard entry={data} actions={actionsFor([data])} /> : null;
}
beforeEach(() => { jest.clearAllMocks(); mockCookedBy = null; mockForget.mockResolvedValue(undefined); });

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
  render(withClient(<MenuWeekGrid weekStart="2026-11-02" entries={[entry, { ...entry, id: 'second', recipe_name: 'Deuxième plat' }]} onAddSlot={add} actions={actionsFor([entry])} />));
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

test('opening a planned recipe preserves its catalogue identity, selected portions and the meal', () => {
  render(withClient(<><MenuEntryCard entry={entry} actions={actionsFor([entry])} /><Location /></>));
  fireEvent.click(screen.getByRole('button', { name: 'Ouvrir Repas du vendredi' }));
  expect(screen.getByLabelText('Destination')).toHaveTextContent('/kitchen/recipes/catalog-dish?source=recipes_catalog&servings=3&meal=friday');
});

test('« Cuisinée » cooks this meal, shows it once the menu says so, and « Annuler » undoes the recorded cooking', async () => {
  mockCook.mockImplementation(async () => { mockCookedBy = 'command-1'; return { title: 'Repas enregistré et stock mis à jour', details: ['Retiré de ton stock : Riz 300 g.'], commandId: 'command-1' }; });
  mockUndo.mockImplementation(async () => { mockCookedBy = null; return {}; });
  render(withClient(<MenuFromBase />));
  fireEvent.click(await screen.findByRole('button', { name: 'Marquer Repas du vendredi comme cuisinée' }));
  const done = await screen.findByRole('button', { name: 'Repas du vendredi est cuisinée' });
  expect(done).toBeDisabled();
  fireEvent.click(done);
  expect(mockCook).toHaveBeenCalledTimes(1);
  expect(mockCook).toHaveBeenCalledWith(expect.objectContaining({ id: 'catalog-dish', source: 'recipes_catalog', servings: 3 }), { id: 'friday', version: 3 });
  fireEvent.click(screen.getByRole('button', { name: 'Annuler : Repas du vendredi n’est pas cuisinée' }));
  await waitFor(() => expect(mockUndo).toHaveBeenCalledWith('command-1'));
  expect(mockForget).toHaveBeenCalledWith('friday', 'command-1');
  expect(await screen.findByRole('button', { name: 'Marquer Repas du vendredi comme cuisinée' })).toBeEnabled();
});

test('a meal cooked elsewhere shows « Cuisinée » from the base, and its undo uses the recorded command', async () => {
  mockCookedBy = 'command-from-phone';
  mockUndo.mockResolvedValue({});
  render(withClient(<MenuFromBase />));
  expect(await screen.findByRole('button', { name: 'Repas du vendredi est cuisinée' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Annuler : Repas du vendredi n’est pas cuisinée' }));
  await waitFor(() => expect(mockUndo).toHaveBeenCalledWith('command-from-phone'));
  expect(mockCook).not.toHaveBeenCalled();
});

test('a refusal because the meal changed rereads the menu and says why', async () => {
  mockCook.mockImplementation(async () => { mockCookedBy = 'command-elsewhere'; throw new ApiError('Ce repas est déjà marqué cuisiné.', { status: 409, code: 'ALREADY_COOKED' }); });
  render(withClient(<MenuFromBase />));
  fireEvent.click(await screen.findByRole('button', { name: 'Marquer Repas du vendredi comme cuisinée' }));
  expect(await screen.findByRole('button', { name: 'Repas du vendredi est cuisinée' })).toBeDisabled();
  expect(mockToastError).toHaveBeenCalledWith('Action impossible', { description: 'Ce repas est déjà marqué cuisiné.' });
});

test('a meal removed from the menu is named as such, not as a missing product', async () => {
  mockCook.mockRejectedValue(new ApiError('Ce produit ou cet achat n’est plus disponible. Actualise la liste.', { status: 400, code: 'ITEM_NOT_FOUND' }));
  render(withClient(<MenuFromBase />));
  fireEvent.click(await screen.findByRole('button', { name: 'Marquer Repas du vendredi comme cuisinée' }));
  await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Action impossible', { description: 'Ce repas n’est plus au menu : le menu a été relu.' }));
});

test('an older entry without a recipe reference is cooked without a meal link, as before', async () => {
  const legacy: MenuEntryView = { ...entry, id: 'legacy', recipe_reference: null, recipe_id: 'legacy-dish', recipe_name: 'Ancien repas' };
  mockCook.mockResolvedValue({ title: 'Repas enregistré et stock mis à jour', details: [], commandId: 'command-2' });
  mockUndo.mockResolvedValue({});
  render(withClient(<><MenuEntryCard entry={legacy} actions={actionsFor([legacy])} /><Location /></>));
  fireEvent.click(screen.getByRole('button', { name: 'Marquer Ancien repas comme cuisinée' }));
  expect(await screen.findByRole('button', { name: 'Ancien repas est cuisinée' })).toBeDisabled();
  expect(mockCook).toHaveBeenCalledWith(expect.objectContaining({ id: 'legacy-dish', source: 'auto' }), null);
  fireEvent.click(screen.getByRole('button', { name: 'Annuler : Ancien repas n’est pas cuisinée' }));
  await waitFor(() => expect(mockUndo).toHaveBeenCalledWith('command-2'));
  expect(mockForget).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Ouvrir Ancien repas' }));
  expect(screen.getByLabelText('Destination')).toHaveTextContent('/kitchen/recipes/legacy-dish?source=auto&servings=3');
  expect(screen.getByLabelText('Destination')).not.toHaveTextContent('meal=');
});

// V11-01 E3b: the card's edits go to the page, which confirms them by update_menu.
test('servings step within the leftovers’ bounds, and each step is sent with the meal', () => {
  const rest: MenuEntryView = { ...entry, id: 'rest', day_of_week: 5, meal_type: 'lunch', recipe_reference: null, recipe_id: null,
    recipe_name: 'Reste : Repas du vendredi', servings: 3, leftover_of: 'friday' };
  const actions = actionsFor([entry, rest]);
  render(withClient(<MenuEntryCard entry={entry} actions={actions} />));
  // At a bound the step stays focusable (a disabled button would drop keyboard focus) but does nothing.
  const minus = screen.getByRole('button', { name: 'Une portion de moins pour Repas du vendredi' });
  expect(minus).toHaveAttribute('aria-disabled', 'true');
  expect(minus).not.toBeDisabled();
  fireEvent.click(minus);
  expect(actions.onServings).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Une portion de plus pour Repas du vendredi' }));
  expect(actions.onServings).toHaveBeenCalledWith(entry, 4);
});

test('« Autres actions » moves, plans leftovers or removes the meal; a busy meal waits', async () => {
  const actions = actionsFor([entry]);
  const view = render(withClient(<MenuEntryCard entry={entry} actions={actions} />));
  const open = () => fireEvent.keyDown(screen.getByRole('button', { name: 'Autres actions pour Repas du vendredi' }), { key: 'Enter', code: 'Enter' });
  open();
  // The dialog opens once the menu has closed (Radix gives focus back to the trigger first).
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Déplacer…' }));
  await waitFor(() => expect(actions.onMove).toHaveBeenCalledWith(entry));
  open();
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Prévoir des restes…' }));
  await waitFor(() => expect(actions.onLeftover).toHaveBeenCalledWith(entry));
  expect(actions.onMove).toHaveBeenCalledTimes(1);
  open();
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Retirer du menu' }));
  expect(actions.onRemove).toHaveBeenCalledWith(entry);
  view.unmount();
  // While any meal's edit runs, every card waits (one edit at a time), without dropping focus.
  const waiting = actionsFor([entry], { busyId: 'another-meal' });
  render(withClient(<MenuEntryCard entry={entry} actions={waiting} />));
  const more = screen.getByRole('button', { name: 'Autres actions pour Repas du vendredi' });
  const plus = screen.getByRole('button', { name: 'Une portion de plus pour Repas du vendredi' });
  expect(more).toHaveAttribute('aria-disabled', 'true');
  expect(plus).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(plus);
  fireEvent.keyDown(more, { key: 'Enter', code: 'Enter' });
  expect(waiting.onServings).not.toHaveBeenCalled();
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

test('a leftover names its meal, opens its recipe, is never cooked nor given leftovers of its own', async () => {
  const rest: MenuEntryView = { ...entry, id: 'rest', day_of_week: 5, meal_type: 'lunch', recipe_reference: null, recipe_id: null,
    recipe_name: 'Reste : Repas du vendredi', servings: 2, leftover_of: 'friday' };
  render(withClient(<><MenuEntryCard entry={rest} actions={actionsFor([entry, rest])} /><Location /></>));
  expect(screen.getByText('Reste du vendredi · dîner')).toBeVisible();
  expect(screen.queryByRole('button', { name: /comme cuisinée/ })).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('button', { name: 'Autres actions pour Reste : Repas du vendredi' }), { key: 'Enter', code: 'Enter' });
  expect(await screen.findByRole('menuitem', { name: 'Déplacer…' })).toBeInTheDocument();
  expect(screen.queryByRole('menuitem', { name: 'Prévoir des restes…' })).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape', code: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: 'Ouvrir Reste : Repas du vendredi' }));
  expect(screen.getByLabelText('Destination')).toHaveTextContent('/kitchen/recipes/catalog-dish?source=recipes_catalog&servings=2');
  expect(screen.getByLabelText('Destination')).not.toHaveTextContent('meal=');
});

// Radix: a dialog opened from a modal menu can leave `pointer-events: none` on the page once both close
// (seen in the browser, not in jsdom). The card's menu is not modal, and opens a dialog from its trigger.
test('the card’s menu never freezes the page, and asks for a dialog once focus is back on its trigger', async () => {
  let focusedOnMove: Element | null = null;
  const actions = actionsFor([entry], { onMove: jest.fn(() => { focusedOnMove = document.activeElement; }) });
  render(withClient(<MenuEntryCard entry={entry} actions={actions} />));
  const trigger = screen.getByRole('button', { name: 'Autres actions pour Repas du vendredi' });
  fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });
  await screen.findByRole('menu');
  expect(document.body.style.pointerEvents).not.toBe('none');
  fireEvent.click(screen.getByRole('menuitem', { name: 'Déplacer…' }));
  await waitFor(() => expect(actions.onMove).toHaveBeenCalledWith(entry));
  expect(focusedOnMove).toBe(trigger);
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  expect(document.body.style.pointerEvents).not.toBe('none');
});

// V11-01 E3d (D5): on the computer grid, a card is held by the pointer; its id travels under the app's own type.
test('a card held by the pointer carries its id under the app type, never its name as text; a decorative grip shows it', () => {
  const onStart = jest.fn(), onEnd = jest.fn();
  const { container, unmount } = render(withClient(<MenuEntryCard entry={entry} actions={actionsFor([entry])} drag={{ enabled: true, dragging: false, onStart, onEnd }} />));
  const card = container.querySelector('.kitchen-menu-entry') as HTMLElement;
  expect(card).toHaveAttribute('draggable', 'true');
  expect(container.querySelector('.kitchen-menu-grip')).toHaveAttribute('aria-hidden', 'true');
  const dataTransfer = { setData: jest.fn(), effectAllowed: 'all' };
  fireEvent.dragStart(card, { dataTransfer });
  expect(dataTransfer.setData).toHaveBeenCalledWith('application/x-smart-menu-entry', 'friday');
  expect(dataTransfer.setData).not.toHaveBeenCalledWith('text/plain', expect.anything());
  expect(dataTransfer.effectAllowed).toBe('move');
  expect(onStart).toHaveBeenCalledTimes(1);
  fireEvent.dragEnd(card);
  expect(onEnd).toHaveBeenCalledTimes(1);
  unmount();
  const plain = render(withClient(<MenuEntryCard entry={entry} actions={actionsFor([entry])} />));
  expect(plain.container.querySelector('.kitchen-menu-entry')).not.toHaveAttribute('draggable');
  expect(plain.container.querySelector('.kitchen-menu-grip')).toBeNull();
});
