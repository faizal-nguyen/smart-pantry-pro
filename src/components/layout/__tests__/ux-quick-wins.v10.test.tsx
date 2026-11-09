import { render, screen } from '@testing-library/react';
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router-dom';
import MobileNavigation from '@/components/navigation/MobileNavigation';
import { NAVIGATION_CONFIG, SPECIAL_NAVIGATION_ITEMS } from '@/components/navigation/NavigationHub';
import RecipesMenusSwitch from '@/components/recipes/RecipesMenusSwitch';
import RouteError from '@/components/RouteError';
import { AssistantHistoryNoticeView } from '@/components/assistant/AssistantHistoryNotice';

jest.mock('@/services/assistantApi', () => ({ getAssistantMemoryPolicy: jest.fn() }));
const mockReport = jest.fn();
jest.mock('@/lib/reportClientError', () => ({ reportClientError: (...args: unknown[]) => mockReport(...args) }));

const config = { mainNavigation: NAVIGATION_CONFIG, specialNavigation: SPECIAL_NAVIGATION_ITEMS, allNavigation: [...NAVIGATION_CONFIG, ...SPECIAL_NAVIGATION_ITEMS] };
const nav = (path: string) => render(<MemoryRouter initialEntries={[path]}><MobileNavigation navigationConfig={config} currentProfile={null} onNavigate={jest.fn()} /></MemoryRouter>);

// Audit 2026-11-07 (UX P1 1): Menus and the assistant were only in the avatar menu.
describe('five tabs, menus inside recipes', () => {
  test('the bottom bar has Aujourd’hui, Recettes, Stock, Courses and Assistant', () => {
    nav('/kitchen');
    expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual(['Aujourd’hui', 'Recettes', 'Stock', 'Courses', 'Assistant']);
  });
  test('the menus keep the Recettes tab current', () => {
    nav('/kitchen/meal-planning');
    expect(screen.getByRole('button', { name: 'Recettes' })).toHaveAttribute('aria-current', 'page');
  });
  test('the assistant tab is current on the assistant page', () => {
    nav('/assistant');
    expect(screen.getByRole('button', { name: 'Assistant' })).toHaveAttribute('aria-current', 'page');
  });
  test('the recipes and menus pages share a switch', () => {
    render(<MemoryRouter initialEntries={['/kitchen/meal-planning']}><RecipesMenusSwitch /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Menus' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Recettes' })).toHaveAttribute('href', '/kitchen/recipes');
  });
});

// Audit 2026-11-07 (UX P1 4): a crash showed React Router's English « Unexpected Application Error ».
test('a page that crashes shows a French screen that reloads', () => {
  const Boom = () => { throw new Error('boom'); };
  const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const router = createMemoryRouter([{ path: '/', element: <Boom />, errorElement: <RouteError /> }]);
  render(<RouterProvider router={router} />);
  expect(screen.getByRole('heading', { name: 'Cette page n’a pas pu s’afficher.' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Recharger' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Retour à l’accueil' })).toHaveAttribute('href', '/kitchen');
  expect(screen.queryByText(/Unexpected Application Error/)).not.toBeInTheDocument();
  expect(mockReport).toHaveBeenCalledWith('route', expect.objectContaining({ message: 'boom' }));
  spy.mockRestore();
});

// Audit 2026-11-07 (UX P1 2): with history off the assistant forgot silently.
describe('history off', () => {
  test('says the conversation will be forgotten, and where to keep it', () => {
    render(<MemoryRouter><AssistantHistoryNoticeView saveHistory={false} /></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent('Historique désactivé : cette conversation sera oubliée quand tu quitteras la page.');
    expect(screen.getByRole('link', { name: 'Activer l’historique' })).toHaveAttribute('href', '/settings?section=assistant-memory');
  });
  test('says nothing when history is on or unknown', () => {
    const { container } = render(<MemoryRouter><AssistantHistoryNoticeView saveHistory={true} /><AssistantHistoryNoticeView saveHistory={undefined} /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });
});
