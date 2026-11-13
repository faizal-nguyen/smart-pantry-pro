jest.mock('@/components/recipes/RecipeLifecycleProvider',()=>({__esModule:true,default:({children}:{children:React.ReactNode})=><>{children}</>}));
jest.mock('@/components/recipes/RecipePendingChoice',()=>({__esModule:true,default:()=>null}));
jest.mock('@/components/recipes/RecipeInspiration',()=>({__esModule:true,default:()=> <div>Idées du test</div>}));
jest.mock('@/components/recipes/RecipeSoon',()=>({__esModule:true,default:()=> <div>Envies du test</div>}));
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Recipes from '../Recipes';
import { OWNER, OTHER } from '@/components/recipes/discovery/__tests__/fixtures';

let mockOwner = OWNER;
const mockAddRecipe = jest.fn();
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthenticatedUser: () => ({ id: mockOwner }) }));
jest.mock('@/hooks/useUserRecipes', () => ({ useUserRecipes: () => ({ recipes: [], isLoading: false, addFromCatalog: jest.fn(), isAddingFromCatalog: false }) }));
jest.mock('@/hooks/useRecipes', () => ({ useRecipes: () => ({ addRecipeWithIngredients: mockAddRecipe, fetchRecipes: jest.fn() }) }));
jest.mock('@/hooks/useSocialRecipeImports', () => ({ useSocialRecipeImports: () => ({ pendingCount: 0 }) }));
jest.mock('@/hooks/use-toast', () => ({ toast: jest.fn() }));
jest.mock('@/components/recipes/RoutineRecipeLibrary', () => ({ __esModule: true, default: () => <div>Bibliothèque du test</div> }));
jest.mock('@/components/recipes/discovery/RecipeDiscovery', () => ({ __esModule: true, default: () => <div>Découverte montée</div> }));
jest.mock('@/components/recipes/discovery/DiscoveryDraftEditor', () => ({ __esModule: true, default: ({ owner, prepared }: { owner: string; prepared: { import: { id: string }; draft: { version: number } } }) => <div>Éditeur canonique {owner} {prepared.import.id} révision {prepared.draft.version}</div> }));
jest.mock('@/components/recipes/tabs/RecipeImportTab', () => ({ __esModule: true, default: ({ onVerifyDraft }: { onVerifyDraft: (payload: unknown) => void }) => {
  const fixture = jest.requireActual('@/components/recipes/discovery/__tests__/fixtures');
  return <button onClick={() => onVerifyDraft({ import: fixture.socialImport, draft: fixture.draftRow })}>Vérifier l’import du test</button>;
} }));
function show(route: string) { return render(<MemoryRouter initialEntries={[route]}><Recipes /></MemoryRouter>); }
beforeEach(() => { mockOwner = OWNER; jest.clearAllMocks(); });

test('the discover URL opens the mounted discovery surface while preserving library and import navigation', async () => {
  show('/kitchen/recipes?tab=discover');
  expect(await screen.findByText('Découverte montée')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Découvrir des sources' })).toBeVisible();
  expect(screen.getByRole('tab', { name: 'Bibliothèque' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Importer' })).toBeVisible();
});
test('historical import verification keeps import identity and revision instead of calling legacy direct persistence', async () => {
  show('/kitchen/recipes?tab=import');
  fireEvent.click(await screen.findByRole('button', { name: 'Vérifier l’import du test' }));
  expect(await screen.findByText(/Éditeur canonique.*révision 3/)).toBeVisible();
  expect(mockAddRecipe).not.toHaveBeenCalled();
});
test('an import belonging to the previous account cannot open its editor under a different account', async () => {
  mockOwner = OTHER;
  show('/kitchen/recipes?tab=import');
  fireEvent.click(await screen.findByRole('button', { name: 'Vérifier l’import du test' }));
  expect(screen.queryByText(/Éditeur canonique/)).not.toBeInTheDocument();
  expect(mockAddRecipe).not.toHaveBeenCalled();
});

test('the default opens personal inspiration while existing search links still open the full library',()=>{
 const view=show('/kitchen/recipes');expect(screen.getByText('Idées du test')).toBeVisible();view.unmount();
 show('/kitchen/recipes?search=soupe');expect(screen.getByText('Bibliothèque du test')).toBeVisible();
 fireEvent.mouseDown(screen.getByRole('tab',{name:'À cuisiner bientôt'}),{button:0,ctrlKey:false});expect(screen.getByText('Envies du test')).toBeVisible();
});
