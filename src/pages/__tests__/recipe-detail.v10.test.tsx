jest.mock('@/components/recipes/RecipeLifecycleProvider',()=>({__esModule:true,default:({children}:{children:React.ReactNode})=><>{children}</>}));
jest.mock('@/components/recipes/RecipePendingChoice',()=>({__esModule:true,default:()=>null}));
jest.mock('@/components/recipes/RecipeLibraryActions',()=>({__esModule:true,default:()=>null}));
jest.mock('@/hooks/useRecipeLifecycle',()=>({useRecipeExposure:()=>({current:null})}));
import {recipeNutritionSignature} from '@smart/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import RecipeDetail from '../RecipeDetail';
import { startCookingSession } from '@/services/cookingSessions';
import { useRecipeEvaluation } from '@/hooks/useRecipeEvaluation';
import { ApiError } from '@/lib/api';

const OWNER = '00000000-0000-4000-8000-000000000001';
const ID = '10000000-0000-4000-8000-000000000001';
const NEXT = '10000000-0000-4000-8000-000000000002';
let mockOwner = OWNER, mockBase: number | null = 4, mockFailure: Error | null = null, mockDetailFailure: Error | null = null;
let mockSavedNutrition:unknown;
const mockRetry = jest.fn();
jest.mock('@/hooks/useAuthenticatedUser', () => ({ useAuthenticatedUser: () => ({ id: mockOwner }) }));
jest.mock('@/hooks/useRecipeDetails', () => ({ useRecipeDetails: (_owner: string, ref: { id: string; source: string }) => ({
  data: { recipe: { ...ref, canonicalId: ref.id, user_id: OWNER, name: ref.id === NEXT ? 'Autre recette' : 'Riz personnel', servings: mockBase,
    nutrition_info:mockSavedNutrition, prep_time: 5, cook_time: 15, rest_time: 5, image_url: '/personal.jpg', instructions: 'Cuire le riz.' },
  ingredients: [{ id: 'ingredient', ingredient_name: 'Riz', quantity: 100, unit: 'g', is_essential: true }], instructions: ['Cuire le riz.'] },
  isFetching: false, error: mockDetailFailure, refetch: mockRetry,
}) }));
jest.mock('@/hooks/useRecipeEvaluation', () => ({ useRecipeEvaluation: jest.fn((ref: { id: string; source: string }, servings: number) => ({
  data: { reference: ref, servings, base_servings: mockBase, profile_version: 1, stock_version: 'stock', recipe_version: 'recipe', calculated_at: '2026-10-09T12:00:00Z',
    constraints: { status: 'verify', findings: [{ ingredient: 'Sauce', code: 'INGREDIENT_UNRESOLVED', message: 'Composition à vérifier.' }], limitations: [] },
    availability: { status: 'missing', missing: [{ ingredient_name: 'Riz', quantity: 50, unit: 'g', reason: 'NOT_IN_STOCK', is_essential: true },
      { ingredient_name: 'Sel', quantity: 1, unit: 'c. à café', reason: 'UNIT_INCOMPATIBLE', is_essential: true },
      { ingredient_name: 'Coriandre', quantity: 1, unit: 'botte', reason: 'NOT_IN_STOCK', is_essential: false }], uncertainties: [], excluded_lots: [] },
    nutrition: { status: 'partial', known_ingredients: 1, total_ingredients: 1, per_serving: { energyKcal: 100, proteinG: null, fiberG: 0 },
      sources: [{ product_id: 'rice', source: 'manual', base: '100g', updated_at: '2026-10-08T12:00:00Z' }], limitations: [] } },
  isLoading: false, isFetching: false, error: mockFailure, validServings: servings > 0 && servings <= 100, refetch: mockRetry,
})) }));
jest.mock('@/hooks/useRecipes', () => ({ useRecipes: () => ({ deleteRecipe: jest.fn(), fetchRecipes: jest.fn() }) }));
jest.mock('@/hooks/useImageManagement', () => ({ useImageManagement: () => ({ uploadImage: jest.fn() }) }));
jest.mock('@/hooks/useRecipeFavorites', () => ({ useRecipeFavorites: () => ({ isFavorite: () => false, toggle: jest.fn() }) }));
jest.mock('@/components/recipes/RecipeSourcePreview', () => ({ __esModule: true, default: () => null }));
jest.mock('@/services/recipeDetails', () => ({ saveRecipePhoto: jest.fn() }));
jest.mock('@/services/cookingSessions', () => ({ startCookingSession: jest.fn(async () => ({ id: 'session' })) }));
jest.mock('@/lib/recipeActions', () => ({ fireRecipeAssistantAction: jest.fn() }));
jest.mock('@/lib/api', () => ({ ApiError: class extends Error { status:number; constructor(message:string,options:{ status:number }){ super(message);this.status=options.status; } } }));
jest.mock('@/hooks/use-toast', () => ({ toast: jest.fn() }));
jest.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: mockOwner } } } }) },
  from: () => ({ insert: async () => ({ error: null }) }) } }));

function NextLink() { const navigate = useNavigate(); return <button onClick={() => navigate(`/kitchen/recipes/${NEXT}?source=recipes_catalog`)}>Autre fiche</button>; }
function show() { return render(<MemoryRouter initialEntries={[`/kitchen/recipes/${ID}?source=user_recipes&servings=2`]}><NextLink /><Routes>
  <Route path="/kitchen/recipes/:id" element={<RecipeDetail />} /><Route path="/kitchen/cooking/:id" element={<p>Session ouverte</p>} />
</Routes></MemoryRouter>); }
beforeEach(() => { jest.clearAllMocks(); mockOwner = OWNER; mockBase = 4; mockFailure = null; mockDetailFailure = null; mockSavedNutrition=undefined; });

test('the common evidence, selected portions and typed cooking reference appear together; no heuristic badge', async () => {
  show();
  expect(screen.getByText('À acheter : Riz · 50 g.')).toBeVisible();
  expect(screen.getByText('En stock, quantité à vérifier : Sel · 1 c. à café.')).toBeVisible();
  expect(screen.getByText('À acheter : Coriandre · 1 botte (facultatif).')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Ajouter 1 ingrédient manquant aux courses' })).toBeInTheDocument();
  expect(screen.getByText('Contraintes à vérifier.')).toBeVisible();
  expect(screen.getByRole('heading',{name:'Valeurs nutritionnelles'})).toBeVisible();
  expect(screen.getByText('100 kcal')).toBeVisible();
  expect(screen.getAllByText('Non renseigné').length).toBeGreaterThan(0); expect(screen.getByText('0 g')).toBeVisible();
  expect(screen.getByText(/saisie manuelle/)).toBeInTheDocument();
  expect(screen.queryByText(/Nutri.Score|Open Food Facts/)).not.toBeInTheDocument();
  expect(screen.getByText(/50 g Riz/)).toBeVisible();
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Portions à préparer' }), { target: { value: '8' } });
  expect(useRecipeEvaluation).toHaveBeenLastCalledWith({ id: ID, source: 'user_recipes' }, 8, expect.any(String), ID);
  expect(screen.getByText(/200 g Riz/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Commencer cette recette' }));
  await waitFor(() => expect(startCookingSession).toHaveBeenCalledWith(OWNER, { id: ID, source: 'user_recipes' }, ['Cuire le riz.'], 8));
});
test('a failed verification hides previous promises and offers retry while keeping ingredients and instructions', () => {
  mockFailure = new Error('Connexion interrompue.'); show();
  expect(screen.queryByText('Contraintes à vérifier.')).not.toBeInTheDocument();
  expect(screen.getByText('Cuire le riz.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Réessayer la vérification' })); expect(mockRetry).toHaveBeenCalled();
});
test('an unknown base cannot silently become four portions for a stock command, even after typing a target', () => {
  mockBase = null; show();
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });
  expect(screen.getByRole('button', { name: 'Commencer cette recette' })).toBeDisabled();
  expect(screen.getByRole('button', { name: /ingrédients? manquants? aux courses/ })).toBeDisabled();
  expect(screen.getByText('Cuire le riz.')).toBeVisible(); expect(startCookingSession).not.toHaveBeenCalled();
});
test('navigation and account changes reset the portions draft instead of mixing recipes or accounts', () => {
  const view = show(); fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '8' } });
  fireEvent.click(screen.getByRole('button', { name: 'Autre fiche' }));
  expect(screen.getByRole('spinbutton')).toHaveValue(4);
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '6' } });
  mockOwner = '00000000-0000-4000-8000-000000000002'; view.rerender(<MemoryRouter><NextLink /><Routes><Route path="/kitchen/recipes/:id" element={<RecipeDetail />} /></Routes></MemoryRouter>);
  expect(screen.getByRole('spinbutton')).toHaveValue(4);
});
test('a failed refresh retains the loaded recipe and masks old evaluation evidence', () => {
  mockDetailFailure = new Error('Lecture interrompue.'); show();
  expect(screen.getByRole('heading', { name: 'Riz personnel' })).toBeVisible();
  expect(screen.getByText(/La recette déjà chargée reste consultable/)).toBeVisible();
  expect(screen.queryByText('Contraintes à vérifier.')).not.toBeInTheDocument();
});
test('a recipe that is now inaccessible cannot keep showing its cached detail',()=>{
  mockDetailFailure=new ApiError('Cette recette est absente ou inaccessible.',{ status:404 });show();
  expect(screen.getByRole('heading',{ name:'Recette indisponible' })).toBeVisible();
  expect(screen.queryByRole('heading',{ name:'Riz personnel' })).not.toBeInTheDocument();
  expect(screen.queryByText('Cuire le riz.')).not.toBeInTheDocument();
});


test('a validated recipe snapshot stays visible when stock/profile evaluation is unavailable',()=>{
 mockFailure=new Error('Profil indisponible.');
 mockSavedNutrition={schema_version:1,source:'ciqual2020',computed_at:'2026-11-10T00:00:00Z',base_servings:4,
 ingredient_signature:recipeNutritionSignature([{ingredient_name:'Riz',quantity:100,unit:'g'}],4),
 per_serving:{energyKcal:240,proteinG:4,fiberG:1,carbsG:20,fatG:2},ingredients:[{ingredient_name:'Riz',food_code:'9100',food_name:'Riz blanc, cru',weight_g:100}],assumptions:[],reference_url:'https://ciqual.anses.fr/'};
 show();expect(screen.getByText('240 kcal')).toBeVisible();
 expect(screen.queryByText('L’estimation nutritionnelle n’a pas pu être relue.')).not.toBeInTheDocument();
 expect(screen.getByText('Profil indisponible.')).toBeVisible();
});
