jest.mock('@/components/recipes/RecipeLifecycleProvider',()=>({__esModule:true,default:({children}:{children:React.ReactNode})=><>{children}</>}));
jest.mock('@/components/recipes/RecipePendingChoice',()=>({__esModule:true,default:()=>null}));
jest.mock('@/components/recipes/RecipeInspiration',()=>({__esModule:true,default:()=> <div>Idées du test</div>}));
jest.mock('@/components/recipes/RecipeSoon',()=>({__esModule:true,default:()=> <div>Envies du test</div>}));
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Recipes from '../Recipes';
import { RecipeInbox } from '@/components/recipes/RecipeInbox';
import { draftRow, IMPORT, OWNER, socialImport } from '@/components/recipes/discovery/__tests__/fixtures';

const mockSave = jest.fn(), mockCurrent = jest.fn(), mockToastError = jest.fn();
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthenticatedUser: () => ({ id: '00000000-0000-4000-8000-000000000001' }) }));
jest.mock('@/hooks/useUserRecipes', () => ({ useUserRecipes: () => ({ recipes: [], isLoading: false, addFromCatalog: jest.fn(), isAddingFromCatalog: false }) }));
jest.mock('@/hooks/useRecipes', () => ({ useRecipes: () => ({ fetchRecipes: jest.fn() }) }));
jest.mock('@/hooks/useSocialRecipeImports', () => ({ useSocialRecipeImports: () => ({
  items: [jest.requireActual('@/components/recipes/discovery/__tests__/fixtures').socialImport], pendingCount: 1,
  isLoading: false, isError: false, error: null, hasMore: false, isFetching: false,
  fetchMore: jest.fn(), capture: jest.fn(), extract: jest.fn(), save: mockSave, archive: jest.fn(), unarchive: jest.fn(), getCurrentDraft: mockCurrent,
}) }));
jest.mock('@/hooks/use-toast', () => ({ toast: jest.fn() }));
jest.mock('@/services/recipe-import/api', () => ({ importsApi: { get: jest.fn() } }));
jest.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => mockToastError(...args), success: jest.fn() } }));
jest.mock('@/components/recipes/RoutineRecipeLibrary', () => ({ __esModule: true, default: () => <div>Bibliothèque</div> }));
jest.mock('@/components/recipes/discovery/DiscoveryDraftEditor', () => ({ __esModule: true, default: ({ owner, prepared }: { owner: string; prepared: { import: { id: string }; draft: { version: number } } }) => <div>Éditeur canonique {owner} {prepared.import.id} révision {prepared.draft.version}</div> }));
jest.mock('@/components/onboarding/RecipeImportOnboarding', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/recipes/BulkImportButton', () => ({ BulkImportButton: () => null }));
jest.mock('@/components/recipes/ClipboardSuggestion', () => ({ ClipboardSuggestion: () => null }));
jest.mock('@/components/recipes/InboxQuotaBadge', () => ({ InboxQuotaBadge: () => null }));

function show(children = <Recipes />) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/kitchen/recipes?tab=import']}>{children}</MemoryRouter></QueryClientProvider>);
}
beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); mockCurrent.mockResolvedValue({ import: socialImport, draft: draftRow }); });

test('Sauvegarder in the mounted import tab opens canonical review with its import and revision before any save', async () => {
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Sauvegarder' }));
  expect(await screen.findByText(`Éditeur canonique ${OWNER} ${IMPORT} révision 3`)).toBeVisible();
  expect(mockCurrent).toHaveBeenCalledWith(IMPORT);
  expect(mockSave).not.toHaveBeenCalled();
  expect(within(screen.getByRole('heading', { name: 'Recettes', level: 1 }).closest('header')!).getByRole('button', { name: 'Écrire une recette' })).toBeVisible();
  expect(screen.queryByText('Extraction depuis les vidéos et posts Instagram.')).not.toBeInTheDocument();
});

test('an inbox without a review host cannot directly save a draft from its Sauvegarder button', async () => {
  show(<RecipeInbox />);
  fireEvent.click(await screen.findByRole('button', { name: 'Sauvegarder' }));
  await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Ouvre cet import dans Cuisiner pour vérifier la recette avant l’ajout.'));
  expect(mockCurrent).not.toHaveBeenCalled();
  expect(mockSave).not.toHaveBeenCalled();
});
