import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import KitchenDashboard from '../kitchen/KitchenDashboard';
import type { MenuEntryView } from '@/hooks/useWeeklyMenu';
import { MENU_WAIT_MS } from '@/components/kitchen/today/TonightBlock';

const OWNER = '00000000-0000-4000-8000-000000000001';
const RECIPE = '30000000-0000-4000-8000-000000000001';
let nowValue = new Date('2026-11-25T10:00:00+01:00'); // Wednesday: day 2

interface MenuState { data?: { meal_plan_id: string | null; week_start_date: string; entries: MenuEntryView[] }; isLoading: boolean; isError: boolean }
const menu: MenuState = { isLoading: false, isError: false };
const menuRefetch = jest.fn();
const menuWeeks: string[] = [];
interface DetailsState { data?: { recipe: { name: string; image_url: string | null } }; isLoading: boolean; isError: boolean; error: unknown; isFetching?: boolean; fetchStatus?: 'idle' | 'fetching' | 'paused' }
let details: DetailsState = { isLoading: false, isError: false, error: null };
const detailsRefetch = jest.fn();
const detailsCalls: unknown[] = [];
const detailsOwners: string[] = [];
const stock = { inventory: [] as unknown[], loading: false, error: null as Error | null, refetch: jest.fn() };
const shopping = { getPurchasedCount: () => 0, pendingTransfer: null as unknown, error: null as Error | null, refetch: jest.fn().mockResolvedValue(undefined) };
let share: unknown = null;

jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthenticatedUser: () => ({ id: '00000000-0000-4000-8000-000000000001' }) }));
jest.mock('@/hooks/useInventory', () => ({ useInventory: () => stock }));
jest.mock('@/hooks/useShoppingList', () => ({ useShoppingList: () => shopping }));
jest.mock('@/hooks/useRoutinePreferences', () => ({ useRoutinePreferences: () => ({ data: { introduction: 'done' }, update: jest.fn() }) }));
jest.mock('@/hooks/useCalendarNow', () => ({ useCalendarNow: () => nowValue }));
jest.mock('@/hooks/useNutritionProfile', () => ({ useNutritionProfile: () => ({ data: null, error: null }) }));
jest.mock('@/hooks/useWeeklyMenu', () => ({ useWeeklyMenu: (week: string) => { menuWeeks.push(week); return { ...menu, refetch: menuRefetch }; } }));
jest.mock('@/hooks/useRecipeDetails', () => ({ useRecipeDetails: (owner: string, reference: unknown) => { detailsOwners.push(owner); detailsCalls.push(reference); return { ...details, refetch: detailsRefetch }; } }));
jest.mock('@/services/shareCaptures', () => ({ readShareCapture: () => share }));
// No cooking in progress in these tests; the real module pulls the Supabase and API clients.
jest.mock('@/services/cookingSessions', () => ({ CookingSessionSchema: { safeParse: () => ({ success: false }) } }));
jest.mock('@/components/recipes/PersonalizedRecipeSuggestions', () => ({ __esModule: true, default: ({ featured }: { featured?: boolean }) => <div data-testid="suggestions">{featured ? 'Suggestion mise en avant' : 'Liste des suggestions'}</div> }));
jest.mock('@/components/recipes/DailyFoodGuidance', () => ({ __esModule: true, default: ({ heading }: { heading?: boolean }) => <div>Contenu du conseil {heading === false ? 'sans titre' : 'avec titre'}</div> }));
jest.mock('@/components/recipes/MealContextPanel', () => ({ __esModule: true, default: ({ value, onChange }: { value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) => <>
  <button onClick={() => onChange({ ...value, occasion: 'lunch' })}>Régler sur midi</button>
  <button onClick={() => onChange({ ...value, occasion: 'snack' })}>Régler sur la pause</button>
</> }));
jest.mock('@/components/inventory/QuickStockDialog', () => ({ __esModule: true, default: () => null }));
jest.mock('@smart/shared', () => ({ ...jest.requireActual('@smart/shared'), produceReview: (lot: { id: string }) => (lot.id.startsWith('produce') ? { days: 4, interval: 3 } : null) }));

const entry = (id: string, day: number, meal_type: MenuEntryView['meal_type'], patch: Partial<MenuEntryView> = {}): MenuEntryView => ({
  id, day_of_week: day, meal_type, recipe_id: RECIPE, recipe_reference: { id: RECIPE, source: 'recipes' }, recipe_name: 'Couscous de légumes',
  servings: 4, prep_time: 10, cook_time: 15, version: 0, cooked_command_id: null, leftover_of: null, ...patch,
});
const planned = (...entries: MenuEntryView[]) => Object.assign(menu, { isLoading: false, isError: false, data: { meal_plan_id: 'plan', week_start_date: '2026-11-23', entries } });
const resolved = () => { details = { isLoading: false, isError: false, error: null, data: { recipe: { name: 'Couscous de légumes', image_url: 'https://example.test/couscous.jpg' } } }; };
const tonight = () => screen.getByRole('region', { name: /^Ton repas|^Ta pause|^Idée pour ton repas/ });
const toggle = (summary: string) => {
  const fold = screen.getByText(summary).closest('details')!;
  fold.open = true;
  fireEvent(fold, new Event('toggle'));
};
const renderHome = () => render(<MemoryRouter><KitchenDashboard /></MemoryRouter>);

beforeEach(() => {
  localStorage.clear();
  Object.assign(menu, { isLoading: false, isError: false, data: { meal_plan_id: null, week_start_date: '2026-11-23', entries: [] } });
  details = { isLoading: false, isError: false, error: null };
  detailsCalls.length = 0;
  detailsOwners.length = 0;
  menuWeeks.length = 0;
  Object.assign(stock, { inventory: [], loading: false, error: null });
  Object.assign(shopping, { getPurchasedCount: () => 0, pendingTransfer: null, error: null });
  share = null;
  nowValue = new Date('2026-11-25T10:00:00+01:00');
  jest.clearAllMocks();
});

describe('home: the planned meal of today', () => {
  test('a planned and resolved dinner leads, with its photo and a link keeping source, servings and meal', () => {
    planned(entry('dinner', 2, 'dinner'), entry('tomorrow', 3, 'dinner'));
    resolved();
    renderHome();
    const card = tonight();
    expect(card).toHaveAccessibleName('Ton repas de ce soir');
    expect(within(card).getByText('Prévu ce soir')).toBeInTheDocument();
    const href = `/kitchen/recipes/${RECIPE}?source=recipes&servings=4&meal=dinner`;
    expect(within(card).getByRole('link', { name: 'Couscous de légumes' })).toHaveAttribute('href', href);
    expect(within(card).getByRole('link', { name: 'Voir la recette de ce soir' })).toHaveAttribute('href', href);
    expect(within(card).getByRole('link', { name: 'Voir Couscous de légumes' })).toHaveAttribute('href', href);
    expect(within(card).getByText('25 min · 4 personnes')).toBeInTheDocument();
    expect(detailsCalls[0]).toEqual({ id: RECIPE, source: 'recipes' });
    expect(detailsOwners[0]).toBe(OWNER); // read by the same authorised reader as the recipe page, for this account
    expect(new Set(menuWeeks)).toEqual(new Set(['2026-11-23'])); // the Paris week, read once for the whole home
    expect(screen.queryByText('Suggestion mise en avant')).not.toBeInTheDocument();
  });

  test('other ideas are folded and read only once opened', () => {
    planned(entry('dinner', 2, 'dinner'));
    resolved();
    renderHome();
    expect(screen.queryByTestId('suggestions')).not.toBeInTheDocument();
    toggle('Autres idées');
    expect(screen.getByTestId('suggestions')).toHaveTextContent('Liste des suggestions');
  });

  test('while the recipe is checked, the title shows without photo nor link', () => {
    planned(entry('dinner', 2, 'dinner'));
    details = { isLoading: true, isError: false, error: null };
    renderHome();
    const card = tonight();
    expect(within(card).getByRole('heading', { name: 'Couscous de légumes' })).toBeInTheDocument();
    expect(within(card).getByRole('status')).toHaveTextContent('Vérification de la recette…');
    expect(within(card).queryByRole('link', { name: /Couscous|Voir la recette/ })).not.toBeInTheDocument();
    expect(within(card).queryByRole('img')).not.toBeInTheDocument();
  });

  test('a recipe no longer reachable keeps its title without link and offers to change the meal', () => {
    planned(entry('dinner', 2, 'dinner'));
    details = { isLoading: false, isError: true, error: Object.assign(new Error('absente'), { code: 'RECIPE_NOT_FOUND' }) };
    renderHome();
    const card = tonight();
    expect(within(card).getByText('Cette recette n’est plus accessible.')).toBeInTheDocument();
    expect(within(card).queryByRole('link', { name: /Voir/ })).not.toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Changer le repas' })).toHaveAttribute('href', '/kitchen/meal-planning');
  });

  test('a recipe that cannot be read now offers a retry and to change the meal', () => {
    planned(entry('dinner', 2, 'dinner'));
    details = { isLoading: false, isError: true, error: Object.assign(new Error('indisponible'), { code: 'RECIPE_DETAILS_UNAVAILABLE' }) };
    renderHome();
    const card = tonight();
    expect(within(card).getByText('La recette ne peut pas être relue pour le moment.')).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: 'Réessayer' }));
    expect(detailsRefetch).toHaveBeenCalled();
    expect(within(card).getByRole('link', { name: 'Changer le repas' })).toBeInTheDocument();
  });

  test('a meal without a recipe keeps its title and offers to change it, reading nothing', () => {
    planned(entry('dinner', 2, 'dinner', { recipe_id: null, recipe_reference: null, recipe_name: 'Pizza du vendredi' }));
    renderHome();
    const card = tonight();
    expect(within(card).getByRole('heading', { name: 'Pizza du vendredi' })).toBeInTheDocument();
    expect(within(card).getByText('Ce repas n’est relié à aucune recette.')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Changer le repas' })).toBeInTheDocument();
    expect(detailsCalls.every(call => call === undefined)).toBe(true);
  });

  test('a leftover opens the recipe of its meal, without a meal to mark as cooked', () => {
    planned(entry('origin', 1, 'dinner'), entry('left', 2, 'dinner', { recipe_id: null, recipe_reference: null, recipe_name: 'Reste : Couscous de légumes', servings: 2, leftover_of: 'origin' }));
    resolved();
    renderHome();
    const card = tonight();
    expect(within(card).getByText('Reste de Couscous de légumes')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Voir la recette de ce soir' })).toHaveAttribute('href', `/kitchen/recipes/${RECIPE}?source=recipes&servings=2`);
  });

  test('a meal already cooked says so', () => {
    planned(entry('dinner', 2, 'dinner', { cooked_command_id: 'cooked' }));
    resolved();
    renderHome();
    expect(within(tonight()).getByText('Déjà cuisiné.')).toBeInTheDocument();
  });

  test('set on lunch, the lunch slot of today is the meal', () => {
    planned(entry('dinner', 2, 'dinner'), entry('lunch', 2, 'lunch', { recipe_name: 'Salade de lentilles' }));
    resolved();
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: 'Régler sur midi' }));
    const card = tonight();
    expect(card).toHaveAccessibleName('Ton repas de ce midi');
    expect(within(card).getByText('Prévu ce midi')).toBeInTheDocument();
    expect(within(card).getByRole('heading', { name: /Salade de lentilles/ })).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Voir la recette de ce midi' })).toBeInTheDocument();
  });

  test('set on a pause, the wording names the pause, never « repas de pour la pause »', () => {
    planned(entry('pause', 2, 'snack', { recipe_name: 'Compote maison' }));
    resolved();
    const { container } = renderHome();
    fireEvent.click(screen.getByRole('button', { name: 'Régler sur la pause' }));
    const card = tonight();
    expect(card).toHaveAccessibleName('Ta pause');
    expect(within(card).getByText('Prévu pour la pause')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Voir la recette de la pause' })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/de pour la pause/);
  });

  test('while the menus are read for a pause, the status names it correctly', () => {
    Object.assign(menu, { isLoading: true, data: undefined });
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: 'Régler sur la pause' }));
    expect(within(tonight()).getByRole('status')).toHaveTextContent('Chargement de ta pause…');
  });

  test('offline, the card says the recipe will be checked when the network returns', () => {
    planned(entry('dinner', 2, 'dinner'));
    details = { isLoading: false, isError: false, error: null, fetchStatus: 'paused' };
    renderHome();
    const card = tonight();
    expect(within(card).getByRole('status')).toHaveTextContent('Hors ligne : la recette sera vérifiée au retour du réseau.');
    expect(within(card).getByRole('link', { name: 'Changer le repas' })).toBeInTheDocument();
  });

  test('while a retry reads again, the button says so and cannot be pressed twice', () => {
    planned(entry('dinner', 2, 'dinner'));
    details = { isLoading: false, isError: true, isFetching: true, error: Object.assign(new Error('indisponible'), { code: 'RECIPE_DETAILS_UNAVAILABLE' }) };
    renderHome();
    expect(within(tonight()).getByRole('button', { name: 'Nouvelle lecture…' })).toBeDisabled();
  });

  test('a recipe already read stays shown when a background read fails, unless it is now inaccessible', () => {
    planned(entry('dinner', 2, 'dinner'));
    details = { isLoading: false, isError: true, error: Object.assign(new Error('réseau'), { code: 'RECIPE_DETAILS_UNAVAILABLE' }), data: { recipe: { name: 'Couscous de légumes', image_url: null } } };
    const view = renderHome();
    expect(within(tonight()).getByRole('link', { name: 'Voir la recette de ce soir' })).toBeInTheDocument();
    details = { ...details, error: Object.assign(new Error('absente'), { code: 'RECIPE_NOT_FOUND' }) };
    view.rerender(<MemoryRouter><KitchenDashboard /></MemoryRouter>);
    expect(within(tonight()).queryByRole('link', { name: 'Voir la recette de ce soir' })).not.toBeInTheDocument();
    expect(within(tonight()).getByText('Cette recette n’est plus accessible.')).toBeInTheDocument();
  });

  test('a leftover of a meal from another week says so, rather than « no recipe »', () => {
    planned(entry('left', 2, 'dinner', { recipe_id: null, recipe_reference: null, recipe_name: 'Reste : Gratin', leftover_of: 'last-week' }));
    renderHome();
    expect(within(tonight()).getByText('Reste d’un repas d’une autre semaine : ouvre-le depuis tes menus.')).toBeInTheDocument();
  });

  test('a meal without a name keeps a readable title', () => {
    planned(entry('dinner', 2, 'dinner', { recipe_id: null, recipe_reference: null, recipe_name: '' }));
    renderHome();
    expect(within(tonight()).getByRole('heading', { name: 'Repas sans nom' })).toBeInTheDocument();
  });

  test('without a planned meal, the suggestion leads as before', () => {
    renderHome();
    expect(tonight()).toHaveAccessibleName('Idée pour ton repas');
    expect(screen.getByTestId('suggestions')).toHaveTextContent('Suggestion mise en avant');
  });

  test('the menus are read once for the Paris week, even when UTC is still Sunday', () => {
    nowValue = new Date('2026-11-08T23:30:00Z'); // Monday 00:30 in Paris
    renderHome();
    expect(new Set(menuWeeks)).toEqual(new Set(['2026-11-09']));
  });

  test('menus slow to answer do not hold the suggestion back for long', () => {
    jest.useFakeTimers();
    try {
      Object.assign(menu, { isLoading: true, data: undefined });
      renderHome();
      expect(screen.queryByTestId('suggestions')).not.toBeInTheDocument();
      act(() => { jest.advanceTimersByTime(MENU_WAIT_MS); });
      expect(screen.getByTestId('suggestions')).toHaveTextContent('Suggestion mise en avant');
    } finally {
      jest.useRealTimers();
    }
  });

  test('while the menus are read, a status shows and no suggestion is mounted yet', () => {
    Object.assign(menu, { isLoading: true, data: undefined });
    renderHome();
    expect(within(tonight()).getByRole('status')).toHaveTextContent('Chargement de ton repas de ce soir…');
    expect(screen.queryByTestId('suggestions')).not.toBeInTheDocument();
  });
});

describe('home: one alert, then the rest in order', () => {
  test('failed menus are said once at the top, the suggestion stays, the week holds no alert', () => {
    Object.assign(menu, { isError: true, data: undefined });
    renderHome();
    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent('Certaines données n’ont pas pu être lues : tes menus.');
    expect(screen.getByTestId('suggestions')).toHaveTextContent('Suggestion mise en avant');
    expect(within(screen.getByRole('complementary', { name: 'Cette semaine' })).queryByRole('alert')).not.toBeInTheDocument();
  });

  test('menus and stock failing make one alert naming both, whose retry reads menus, stock and shopping', () => {
    Object.assign(menu, { isError: true, data: undefined });
    stock.error = new Error('stock');
    renderHome();
    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent('Certaines données n’ont pas pu être lues : tes menus et ton stock.');
    fireEvent.click(within(alerts[0]).getByRole('button', { name: 'Réessayer' }));
    expect(menuRefetch).toHaveBeenCalled();
    expect(stock.refetch).toHaveBeenCalled();
    expect(shopping.refetch).toHaveBeenCalled();
  });

  test('a failure nothing can read again is said, without a useless retry', () => {
    localStorage.setItem(`v10-routine:${OWNER}:cooking-sessions`, '{not json');
    renderHome();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Certaines données n’ont pas pu être lues : tes cuisines en cours.');
    expect(within(alert).queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument();
  });

  test('things to check are folded with their count, after the stock to use soon', () => {
    share = { status: 'pending' };
    stock.inventory = [{ id: 'produce-1', quantity: 1, expiry_date: null, product: { name: 'Salade' } }];
    renderHome();
    expect(screen.getByRole('heading', { level: 2, name: 'À vérifier (2)' })).toBeInTheDocument();
    const fold = screen.getByText('À vérifier (2)').closest('details')!;
    expect(fold).not.toHaveAttribute('open');
    expect(within(fold).getByRole('link', { name: 'Reprendre le partage' })).toBeInTheDocument();
    expect(within(fold).getByRole('link', { name: 'Vérifier mon stock' })).toBeInTheDocument();
  });

  test('the daily advice is folded under its title and read only once opened', () => {
    renderHome();
    expect(screen.queryByText(/Contenu du conseil/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Mieux manger aujourd’hui' })).toBeInTheDocument();
    toggle('Mieux manger aujourd’hui');
    expect(screen.getByText('Contenu du conseil sans titre')).toBeInTheDocument();
  });

  test('blocks follow the order: resume, alert, tonight, stock to use, things to check, advice', () => {
    Object.assign(shopping, { getPurchasedCount: () => 2 });
    Object.assign(menu, { isError: true, data: undefined });
    share = { status: 'pending' };
    renderHome();
    const order = [
      screen.getByRole('heading', { name: 'Tes achats attendent leur rangement' }),
      screen.getByRole('alert'),
      tonight(),
      screen.getByRole('heading', { name: 'À utiliser bientôt' }),
      screen.getByText('À vérifier (1)'),
      screen.getByText('Mieux manger aujourd’hui'),
    ];
    for (let index = 1; index < order.length; index += 1) {
      expect(order[index - 1].compareDocumentPosition(order[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });
});
