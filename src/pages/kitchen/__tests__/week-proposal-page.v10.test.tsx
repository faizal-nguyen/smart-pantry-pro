import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { WeekProposal } from '@smart/shared';
import WeekProposalPage from '../WeekProposalPage';
import type { MenuEntryView } from '@/hooks/useWeeklyMenu';
import { fetchWeekProposal } from '@/services/weekProposal';
import { fetchMenuShoppingPreview } from '@/services/menuShopping';

// V11-01 E4b: « Proposer la semaine », its own page: settings, proposal, courses, validation.
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthenticatedUser: () => ({ id: 'owner' }) }));
// Tuesday 1 December 2026: Monday is past.
jest.mock('@/hooks/useCalendarNow', () => ({ useCalendarNow: () => new Date('2026-12-01T10:00:00Z') }));
jest.mock('@/lib/api', () => ({ ApiError: class extends Error {
  status: number; code?: string;
  constructor(message: string, options: { status: number; code?: string }) { super(message); this.status = options.status; this.code = options.code; }
} }));
let entries: MenuEntryView[] = [];
let menuState: 'ready' | 'loading' | 'error' = 'ready';
const refetchMenu = jest.fn(async () => ({ data: { meal_plan_id: 'plan', week_start_date: '2026-11-30', entries } }));
jest.mock('@/hooks/useWeeklyMenu', () => ({ useWeeklyMenu: jest.fn(() => ({ data: menuState === 'ready' ? { meal_plan_id: 'plan', week_start_date: '2026-11-30', entries } : undefined,
  isLoading: menuState === 'loading', isError: menuState === 'error', refetch: refetchMenu })) }));
jest.mock('@/services/weekProposal', () => ({ fetchWeekProposal: jest.fn() }));
jest.mock('@/services/menuShopping', () => ({ fetchMenuShoppingPreview: jest.fn() }));
const edit = { busyId: null as string | null, error: null as string | null, addProposal: jest.fn(), clearError: jest.fn() };
jest.mock('@/hooks/useMenuEdit', () => ({ useMenuEdit: () => edit }));

const R = (id: string) => ({ id, source: 'recipes_catalog' as const });
const later = new Date(Date.now() + 20 * 60_000).toISOString();
const filled = (date: string, id: string, extra: Record<string, unknown> = {}) => ({ date, meal_type: 'dinner' as const, status: 'proposed' as const,
  recipe: { reference: R(id), name: `Recette ${id}`, image_url: null, duration_minutes: 30, servings: 2 }, reasons: ['Prête en 30 min.'],
  availability: 'in_stock' as const, missing: [], ...extra });
const proposal = (slots: WeekProposal['slots'], expires_at = later): WeekProposal => ({ proposal_id: 'b'.repeat(32), week_start: '2026-11-30',
  calculated_at: new Date().toISOString(), expires_at, menu_version: 'a'.repeat(32), context_revision: 1, profile_version: 3, slots });
const answer = proposal([
  filled('2026-12-01', 'a'),
  filled('2026-12-02', 'b', { availability: 'to_buy', missing: [{ name: 'coriandre', quantity: 1, unit: 'botte', status: 'to_buy' }] }),
  { date: '2026-12-03', meal_type: 'dinner', status: 'empty', cause: 'NO_COMPATIBLE_RECIPE' },
]);

function Menus() { const location = useLocation(); return <output aria-label="Menus">{location.pathname}{location.search} {JSON.stringify(location.state)}</output>; }
const show = (week = '2026-11-30') => render(<MemoryRouter initialEntries={[`/kitchen/meal-planning/proposition?week=${week}`]}><Routes>
  <Route path="/kitchen/meal-planning/proposition" element={<WeekProposalPage />} />
  <Route path="/kitchen/meal-planning" element={<Menus />} />
</Routes></MemoryRouter>);
beforeEach(() => { jest.clearAllMocks(); sessionStorage.clear(); entries = []; menuState = 'ready'; Object.assign(edit, { busyId: null, error: null }); });

test('the empty dinners from today are offered; the proposal comes slot by slot, with what each lacks or why it stayed empty', async () => {
  entries = [{ id: 'm', day_of_week: 4, meal_type: 'dinner', recipe_reference: R('x'), recipe_id: null, recipe_name: 'Prévu', servings: 2,
    prep_time: 0, cook_time: 0, version: 1, cooked_command_id: null, leftover_of: null }];
  jest.mocked(fetchWeekProposal).mockResolvedValueOnce(answer);
  show();
  expect(screen.getByRole('link', { name: 'Menus' })).toHaveAttribute('href', '/kitchen/meal-planning?week=2026-11-30');
  expect(screen.getByText('5 créneaux vides d’ici dimanche.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Proposer 5 repas' }));
  expect(fetchWeekProposal).toHaveBeenCalledWith('owner', { week_start: '2026-11-30',
    slots: ['2026-12-01', '2026-12-02', '2026-12-03', '2026-12-05', '2026-12-06'].map(date => ({ date, meal_type: 'dinner' })) }, expect.any(AbortSignal));
  const list = await screen.findByRole('list', { name: 'Ta proposition' });
  // The slots themselves: the reasons inside a card are lists of their own.
  const items = [...list.querySelectorAll<HTMLElement>(':scope > li')];
  expect(items.map(item => within(item).getByRole('heading').textContent)).toEqual(['Mardi · dîner', 'Mercredi · dîner', 'Jeudi · dîner']);
  expect(items[0]).toHaveTextContent('Recette a');
  expect(items[0]).toHaveTextContent('Tout est en stock pour ce repas.');
  expect(items[1]).toHaveTextContent('À acheter : coriandre.');
  expect(items[2]).toHaveTextContent('Aucune recette ne respecte ton profil et ces réglages.');
  expect(screen.getByRole('button', { name: 'Ajouter 2 repas au menu' })).toBeEnabled();
});

test('« Laisser vide » leaves a slot out of the validation; « Remettre » brings it back', async () => {
  jest.mocked(fetchWeekProposal).mockResolvedValueOnce(answer);
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Proposer 6 repas' }));
  await screen.findByRole('list', { name: 'Ta proposition' });
  fireEvent.click(screen.getByRole('button', { name: 'Laisser vide : Mardi · dîner' }));
  expect(screen.getByRole('button', { name: 'Ajouter 1 repas au menu' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Remettre « Recette a »' }));
  expect(screen.getByRole('button', { name: 'Ajouter 2 repas au menu' })).toBeEnabled();
});

test('validating adds the choices in one command, then opens Menus with the notice to undo it', async () => {
  jest.mocked(fetchWeekProposal).mockResolvedValueOnce(answer);
  const notice = { commandId: 'command-1', message: '2 repas ajoutés au menu de la semaine du 30 nov. → 6 déc.', undone: false };
  edit.addProposal.mockResolvedValueOnce({ notice, failure: null });
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Proposer 6 repas' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Ajouter 2 repas au menu' }));
  await waitFor(() => expect(edit.addProposal).toHaveBeenCalledWith('2026-11-30', 'b'.repeat(32), [
    { op: 'set', date: '2026-12-01', meal_type: 'dinner', recipe: R('a'), servings: 2, expected_version: null },
    { op: 'set', date: '2026-12-02', meal_type: 'dinner', recipe: R('b'), servings: 2, expected_version: null },
  ], { profile_version: 3, expires_at: later }));
  expect(await screen.findByLabelText('Menus')).toHaveTextContent(`/kitchen/meal-planning?week=2026-11-30 ${JSON.stringify({ menuNotice: notice })}`);
  expect(sessionStorage.getItem('v11-week-proposal:owner:2026-11-30')).toBeNull();
});

test('a refused validation says why and recomputes, without the slot taken since', async () => {
  jest.mocked(fetchWeekProposal).mockResolvedValueOnce(answer).mockResolvedValueOnce(proposal([{ ...filled('2026-12-02', 'b'), status: 'kept' }]));
  edit.addProposal.mockImplementationOnce(async () => { edit.error = 'Un créneau a été pris entre-temps : recalcule la proposition, tes autres choix sont gardés.'; return { notice: null, failure: 'refused' }; });
  const view = show();
  fireEvent.click(screen.getByRole('button', { name: 'Proposer 6 repas' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Ajouter 2 repas au menu' }));
  await waitFor(() => expect(edit.addProposal).toHaveBeenCalled());
  // The menu reread: Tuesday's dinner was planned elsewhere meanwhile.
  entries = [{ id: 'm', day_of_week: 1, meal_type: 'dinner', recipe_reference: R('x'), recipe_id: null, recipe_name: 'Prévu', servings: 2,
    prep_time: 0, cook_time: 0, version: 1, cooked_command_id: null, leftover_of: null }];
  view.rerender(<MemoryRouter initialEntries={['/kitchen/meal-planning/proposition?week=2026-11-30']}><Routes>
    <Route path="/kitchen/meal-planning/proposition" element={<WeekProposalPage />} /></Routes></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Un créneau a été pris entre-temps');
  fireEvent.click(screen.getByRole('button', { name: 'Recalculer' }));
  await waitFor(() => expect(fetchWeekProposal).toHaveBeenLastCalledWith('owner', expect.objectContaining({ slots: [],
    keep: [expect.objectContaining({ date: '2026-12-02' })] }), expect.any(AbortSignal)));
});

test('an expired proposal cannot be added: it is recomputed with its choices', async () => {
  jest.mocked(fetchWeekProposal).mockResolvedValueOnce(proposal([filled('2026-12-01', 'a')], new Date(Date.now() - 1000).toISOString()))
    .mockResolvedValueOnce(proposal([{ ...filled('2026-12-01', 'a'), status: 'kept' }]));
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Proposer 6 repas' }));
  expect(await screen.findByText('Cette proposition a expiré : recalcule-la, tes choix sont gardés.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Ajouter 1 repas au menu' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Recalculer' }));
  await waitFor(() => expect(fetchWeekProposal).toHaveBeenCalledTimes(2));
  expect(await screen.findByRole('button', { name: 'Ajouter 1 repas au menu' })).toBeEnabled();
});

test('the shopping of the proposal is read on demand, with its meals, and is only shown', async () => {
  jest.mocked(fetchWeekProposal).mockResolvedValueOnce(answer);
  jest.mocked(fetchMenuShoppingPreview).mockResolvedValueOnce({ week_start: '2026-11-30', as_of: '2026-12-01', menu_version: 'a'.repeat(32), context_revision: 1,
    lines: [{ key: 'k', state: 'to_add', name: 'coriandre', product_id: null, quantity: 1, unit: 'botte', meals: [] }], meals: [], uncomputable: [] });
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Proposer 6 repas' }));
  await screen.findByRole('list', { name: 'Ta proposition' });
  fireEvent.click(screen.getByText('Voir les courses de cette proposition'));
  await waitFor(() => expect(fetchMenuShoppingPreview).toHaveBeenCalledWith('owner', '2026-11-30', expect.any(AbortSignal), [
    { date: '2026-12-01', meal_type: 'dinner', recipe: R('a'), servings: 2 }, { date: '2026-12-02', meal_type: 'dinner', recipe: R('b'), servings: 2 }]));
  expect(await screen.findByText('coriandre — 1 botte')).toBeInTheDocument();
  // Only shown: nothing to tick there (the list is written from « Courses de la semaine »).
  expect(within(screen.getByRole('region', { name: 'À acheter' })).queryByRole('checkbox')).not.toBeInTheDocument();
});

test('a week already over proposes nothing', () => {
  show('2026-11-23');
  expect(screen.getByText('Cette semaine est passée : choisis une semaine à venir depuis Menus.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Proposer/ })).not.toBeInTheDocument();
  act(() => undefined);
});

// Review of E4b.
test('nothing is proposed before the menu is read, nor when it could not be', () => {
  menuState = 'loading';
  const view = show();
  expect(screen.getByText('Lecture du menu de la semaine…')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^Proposer/ })).not.toBeInTheDocument();
  view.unmount();
  menuState = 'error';
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Relire le menu' }));
  expect(refetchMenu).toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: /^Proposer/ })).not.toBeInTheDocument();
});

test('a proposal refused because the week changed rereads the menu', async () => {
  const { ApiError } = jest.requireMock('@/lib/api') as { ApiError: new (message: string, options: { status: number; code?: string }) => Error };
  jest.mocked(fetchWeekProposal).mockRejectedValueOnce(new ApiError('Ce repas a changé dans le menu entre-temps.', { status: 409, code: 'MENU_CHANGED' }));
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Proposer 6 repas' }));
  await waitFor(() => expect(refetchMenu).toHaveBeenCalled());
});

test('an addition whose reply was lost is sent again as it was, never recomputed', async () => {
  jest.mocked(fetchWeekProposal).mockResolvedValueOnce(answer);
  edit.addProposal.mockImplementationOnce(async () => { edit.error = 'La modification n’est pas confirmée : vérifie ta connexion.'; return { notice: null, failure: 'unconfirmed' }; })
    .mockResolvedValueOnce({ notice: { commandId: 'c', message: 'ok', undone: false }, failure: null });
  const view = show();
  fireEvent.click(screen.getByRole('button', { name: 'Proposer 6 repas' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Ajouter 2 repas au menu' }));
  await waitFor(() => expect(edit.addProposal).toHaveBeenCalledTimes(1));
  view.rerender(<MemoryRouter initialEntries={['/kitchen/meal-planning/proposition?week=2026-11-30']}><Routes>
    <Route path="/kitchen/meal-planning/proposition" element={<WeekProposalPage />} /></Routes></MemoryRouter>);
  expect(screen.queryByRole('button', { name: 'Recalculer' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Réessayer l’ajout' }));
  await waitFor(() => expect(edit.addProposal).toHaveBeenCalledTimes(2));
  expect(edit.addProposal.mock.calls[1]).toEqual(edit.addProposal.mock.calls[0]);
});

test('recomputing rereads the menu and drops the slots of days passed since', async () => {
  // Proposed last night for Monday 30 November; today is Tuesday.
  jest.mocked(fetchWeekProposal).mockResolvedValueOnce(proposal([filled('2026-11-30', 'old'), filled('2026-12-01', 'a')], new Date(Date.now() - 1000).toISOString()))
    .mockResolvedValueOnce(proposal([{ ...filled('2026-12-01', 'a'), status: 'kept' }]));
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Proposer 6 repas' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Recalculer' }));
  await waitFor(() => expect(fetchWeekProposal).toHaveBeenCalledTimes(2));
  expect(refetchMenu).toHaveBeenCalled();
  expect(jest.mocked(fetchWeekProposal).mock.calls[1][1].keep).toEqual([expect.objectContaining({ date: '2026-12-01' })]);
});

test('focus stays on the card: « Laisser vide » gives it to « Remettre », and back', async () => {
  jest.mocked(fetchWeekProposal).mockResolvedValueOnce(answer);
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Proposer 6 repas' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Laisser vide : Mardi · dîner' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Remettre « Recette a »' })).toHaveFocus());
  fireEvent.click(screen.getByRole('button', { name: 'Remettre « Recette a »' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Laisser vide : Mardi · dîner' })).toHaveFocus());
});
