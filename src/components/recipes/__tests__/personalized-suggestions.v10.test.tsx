import { fireEvent,render,screen,within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import PersonalizedRecipeSuggestions from '../PersonalizedRecipeSuggestions';
import AssistantRecipeProposals from '@/components/assistant/AssistantRecipeProposals';
import type { RecommendationResultView,RecommendedRecipeView } from '@/services/recommendationsApi';
let mockResult:RecommendationResultView;
let mockProfileVersion=1;
let mockNow=new Date('1970-01-01T12:00:00Z');
jest.mock('@/hooks/useCalendarNow',()=>({ useCalendarNow:()=>mockNow }));
const mockPostFeedback=jest.fn();
jest.mock('@/services/recommendationsApi',()=>({ ...jest.requireActual('@/services/recommendationsApi'),postRecipeFeedback:(...args:unknown[])=>mockPostFeedback(...args) }));
const owner='00000000-0000-4000-8000-000000000001';
jest.mock('@/hooks/useRoutineMealIdeas',()=>({ useRoutineMealIdeas:()=>({ owner,data:mockResult,isLoading:false,isError:false,refetch:jest.fn() }) }));
jest.mock('@/hooks/useNutritionProfile',()=>({ useNutritionProfile:()=>({ data:{ profile:{ version:mockProfileVersion } },isLoading:false,error:null }) }));
jest.mock('@/lib/api',()=>({ apiPost:jest.fn(),apiGet:jest.fn(),apiPatch:jest.fn(),ApiError:class extends Error {} }));
jest.mock('@/integrations/supabase/client',()=>({ supabase:{ auth:{ getSession:jest.fn() } } }));
function candidate(id:string):RecommendedRecipeView { return { id,name:`Recette ${id}`,image_url:`/${id}.jpg`,servings:2,score_total:70,reasons:['Durée enregistrée 15 min.'],reference:{ id,source:'recipes' },duration_minutes:15,profile_version:1,stock_version:'fixture',calculated_at:'2026-10-09T12:00:00Z',
  constraints:{ status:'compatible',findings:[],registry_version:'fixture',limitations:[] },
  availability:{ status:'available',missing:[],allocations:[],uncertainties:[],excluded_lots:[] },
  nutrition:{ status:'unavailable',coverage:0,known_ingredients:0,total_ingredients:1,per_serving:{ energyKcal:null,proteinG:null,fiberG:null },sources:[],limitations:['Données absentes, aucune estimation inventée.'] },
  reason_codes:[{ code:'TIME_FITS',text:'Durée enregistrée 15 min.' }],unavailable_criteria:['nutrition','variety'] }; }
beforeEach(()=>{ jest.restoreAllMocks();mockPostFeedback.mockClear();localStorage.clear();mockNow=new Date('1970-01-01T12:00:00Z');mockProfileVersion=1;mockResult={ cookable_now:[candidate('a'),candidate('b'),candidate('c'),candidate('d')],almost_cookable:[],recent_suggestions:[],verify_suggestions:[],excluded_suggestions:[],total_user_recipes:4,pipeline_version:3,profile_version:1,calculated_at:'2026-10-09T12:00:00Z',has_constraints:false }; });
function wrap(element:React.ReactNode) { return <QueryClientProvider client={new QueryClient()}><MemoryRouter>{element}</MemoryRouter></QueryClientProvider>; }
test('at most three ideas show calculated reasons, unavailable nutrition and an editable profile link',()=>{
  render(wrap(<PersonalizedRecipeSuggestions/>));
  expect(screen.getAllByRole('heading',{ level:3 })).toHaveLength(3);
  fireEvent.click(screen.getAllByText('Pourquoi cette recette ?')[0]);
  expect(screen.getAllByText('Durée enregistrée 15 min.')).toHaveLength(3);
  expect(screen.getAllByText(/Estimation nutritionnelle : indisponible/)).toHaveLength(3);
  expect(screen.getByRole('link',{ name:'Modifier mon profil alimentaire' })).toHaveAttribute('href','/settings?section=cooking');
});
test('assistant history preserves the same evidence and distinct verification/exclusion groups',()=>{
  const verify={ ...candidate('unknown'),constraints:{ ...candidate('unknown').constraints,status:'verify',findings:[{ code:'INGREDIENT_UNRESOLVED',ingredient:'Sauce',message:'Composition à vérifier.' }] } };
  render(wrap(<AssistantRecipeProposals metadata={{ recipe_proposals:{ ...mockResult,cookable_now:[candidate('a')],verify_suggestions:[verify],excluded_suggestions:[{ ...candidate('excluded'),constraints:{ ...verify.constraints,status:'incompatible' } }] } }}/>));
  expect(screen.getByText('À vérifier')).toBeInTheDocument();expect(screen.getByText('Écartées : raisons')).toBeInTheDocument();
  expect(screen.getAllByText(/Estimation nutritionnelle : indisponible/)).toHaveLength(3);
  expect(screen.getAllByRole('link',{ name:'Corriger mon profil' })).toHaveLength(3);
});
test('an older profile or historical card without evidence cannot offer personalized quick actions or a stock guarantee',()=>{
  mockProfileVersion=2;
  render(wrap(<AssistantRecipeProposals metadata={{ recipe_proposals:{ ...mockResult,cookable_now:[candidate('a'),{ id:'legacy',name:'Ancienne recette',missing_count:0 }] } }}/>));
  expect(screen.getByText(/Le profil a changé/)).toBeInTheDocument();
  expect(screen.queryByText('Tout en stock')).not.toBeInTheDocument();
  expect(screen.queryByRole('group',{ name:/Actions pour/ })).not.toBeInTheDocument();
});
test('photos remain available for ideas, verification and exclusions with the source and chosen portions',()=>{
  mockResult={ ...mockResult,cookable_now:[candidate('a')],verify_suggestions:[{ ...candidate('b'),reference:{ id:'b',source:'user_recipes' } }],excluded_suggestions:[{ ...candidate('c'),reference:{ id:'c',source:'recipes_catalog' } }] };
  const { container }=render(wrap(<PersonalizedRecipeSuggestions/>));
  for (const [id,source] of [['a','recipes'],['b','user_recipes'],['c','recipes_catalog']]) {
    const image=container.querySelector(`img[src="/${id}.jpg"]`)!;
    expect(image).toBeInTheDocument();
    expect(image.closest('a')).toHaveAttribute('href',`/kitchen/recipes/${id}?source=${source}&servings=2`);
  }
});
test('before choosing, dismissal is temporary and durable feedback requires opening its dedicated entry',async()=>{
  const post=mockPostFeedback.mockResolvedValue({ id:'confirmed' });
  render(wrap(<PersonalizedRecipeSuggestions/>));
  for (const control of screen.getAllByRole('button',{ name:'À refaire',hidden:true })) expect(control).not.toBeVisible();
  fireEvent.click(screen.getAllByRole('button',{ name:'Pas ce soir' })[0]);
  await screen.findByText(/Ce choix concerne seulement ce repas/);
  expect(post).toHaveBeenCalledWith(owner,expect.objectContaining({ recipe:{ id:'a',source:'recipes' },feedback:'not_today' }));
  fireEvent.click(screen.getAllByText('Donner un retour sur cette recette')[0]);
  expect(screen.getAllByRole('button',{ name:'À refaire',hidden:true })[0]).toBeVisible();
});

test('featured layout keeps dietary warnings visible and alternatives accessible without changing recipe identities',()=>{
  const first=candidate('a');
  first.constraints={ ...first.constraints,findings:[{ code:'INGREDIENT_UNRESOLVED',ingredient:'Sauce',message:'Composition à vérifier.' }] };
  mockResult={ ...mockResult,cookable_now:[first,candidate('b')] };
  const { container }=render(wrap(<PersonalizedRecipeSuggestions featured/>));
  expect(screen.getByText('Sauce : Composition à vérifier.')).toBeVisible();
  expect(within(container.querySelector('.culinary-featured-list') as HTMLElement).getByRole('link',{name:'Voir la recette'})).toHaveAttribute('href','/kitchen/recipes/a?source=recipes&servings=2');
  expect(screen.queryByRole('heading',{name:'Recette b'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Autres idées'}));
  expect(screen.getByRole('dialog',{name:'D’autres idées pour ton repas'})).toBeVisible();
  expect(screen.getByRole('heading',{name:'Recette b'})).toBeVisible();
  expect(screen.getByRole('link',{name:'Voir Recette b'})).toHaveAttribute('href','/kitchen/recipes/b?source=recipes&servings=2');
});

test('feedback from the compact presentation is confirmed inside its open dialog',async()=>{
  mockPostFeedback.mockResolvedValue({id:'confirmed'});
  render(wrap(<PersonalizedRecipeSuggestions featured/>));
  fireEvent.click(screen.getByRole('button',{name:'Autres idées'}));
  const dialog=screen.getByRole('dialog');
  fireEvent.click(within(dialog).getAllByRole('button',{name:'Pas ce soir'})[0]);
  expect(await within(dialog).findByText(/Ce choix concerne seulement ce repas/)).toBeVisible();
});

// iPhone 2026-11-08: « Aucune idée vérifiée » left the home page with nothing to cook.
test('nothing complete in stock: the closest recipes show, with what is missing', () => {
  const close = (id: string, missing: string[]) => ({ ...candidate(id), missing_count: missing.length, missing_ingredients: missing,
    availability: { ...candidate(id).availability, status: 'missing' as const } });
  mockResult = { ...mockResult, cookable_now: [], almost_cookable: [],
    recent_suggestions: [close('biryani', ['Agneau', 'Yaourt', 'Coriandre', 'Cardamome', 'Safran']), close('curry', ['Lait de coco', 'Pâte de curry', 'Citronnelle', 'Basilic'])] };
  render(wrap(<PersonalizedRecipeSuggestions featured />));
  expect(screen.getByText('Rien de complet dans ton stock pour ce repas : voici les recettes les plus proches.')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 3, name: 'Recette biryani' })).toBeInTheDocument();
  expect(screen.getByText('Il te manque : Agneau, Yaourt, Coriandre et 2 autres.')).toBeInTheDocument();
  expect(screen.queryByText(/Aucune idée vérifiée/)).not.toBeInTheDocument();
});
test('nothing at all: the empty state stays, without a closest list', () => {
  mockResult = { ...mockResult, cookable_now: [], almost_cookable: [], recent_suggestions: [] };
  render(wrap(<PersonalizedRecipeSuggestions featured />));
  expect(screen.getByText(/Aucune idée pour ce repas/)).toBeInTheDocument();
});

test('a featured idea says what is missing, and at most one doubt', () => {
  const almost = { ...candidate('rasam'), name: 'Rasam', missing_count: 2, missing_ingredients: ['Tamarin', 'Coriandre'],
    availability: { ...candidate('rasam').availability, status: 'missing' as const,
      uncertainties: ['À vérifier dans ton stock (dates ou quantités) : Ail, Tomates.', 'Une autre remarque.'] } };
  mockResult = { ...mockResult, cookable_now: [], almost_cookable: [almost] };
  render(wrap(<PersonalizedRecipeSuggestions featured />));
  expect(screen.getByText('Il te manque : Tamarin et Coriandre.')).toBeInTheDocument();
  expect(screen.getByText('À vérifier dans ton stock (dates ou quantités) : Ail, Tomates.')).toBeInTheDocument();
  expect(screen.queryByText('Une autre remarque.')).not.toBeInTheDocument();
  expect(screen.queryByText('Des ingrédients restent à acheter ou à vérifier.')).not.toBeInTheDocument();
});

test('browsing the featured alternatives keeps missing ingredients visible and writes no feedback',()=>{
  const almost={ ...candidate('b'),score_total:30,missing_ingredients:['Riz gluant'],availability:{ ...candidate('b').availability,status:'missing' as const } };
  mockResult={ ...mockResult,cookable_now:[candidate('a')],almost_cookable:[almost] };
  render(wrap(<PersonalizedRecipeSuggestions featured/>));
  expect(screen.getByRole('heading',{name:'Recette a'})).toBeVisible();
  const next=screen.getByRole('button',{name:'Autre idée'});
  next.focus();
  fireEvent.click(next);
  expect(next).toHaveFocus();
  expect(screen.getByRole('status')).toHaveTextContent('Recette b');
  expect(screen.getByRole('heading',{name:'Recette b'})).toBeVisible();
  expect(screen.getByText('Il te manque : Riz gluant.')).toBeVisible();
  expect(screen.queryByText('Tout est dans ton stock.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Autre idée'}));
  expect(screen.getByRole('heading',{name:'Recette a'})).toBeVisible();
  expect(mockPostFeedback).not.toHaveBeenCalled();
});

test('daily selection follows Paris midnight and manual selection resets when candidates change',()=>{
  mockNow=new Date('1970-01-01T22:59:00Z');
  const { rerender }=render(wrap(<PersonalizedRecipeSuggestions featured/>));
  expect(screen.getByRole('heading',{name:'Recette a'})).toBeVisible();
  mockNow=new Date('1970-01-01T23:00:00Z');
  rerender(wrap(<PersonalizedRecipeSuggestions featured/>));
  expect(screen.getByRole('heading',{name:'Recette b'})).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Autre idée'}));
  expect(screen.getByRole('heading',{name:'Recette c'})).toBeVisible();
  mockResult={ ...mockResult,cookable_now:[candidate('only')] };
  rerender(wrap(<PersonalizedRecipeSuggestions featured/>));
  expect(screen.getByRole('heading',{name:'Recette only'})).toBeVisible();
  expect(screen.queryByRole('button',{name:'Autre idée'})).not.toBeInTheDocument();
});

test('an in-stock container with an unknown amount never promises enough for the recipe',()=>{
  const rasam=candidate('rasam');
  rasam.availability={ ...rasam.availability,missing:[{ ingredient_index:0,ingredient_name:'Poudre de rasam',quantity:1,unit:'c. à café',reason:'UNIT_UNKNOWN',is_essential:true }],uncertainties:['En stock, quantité à vérifier : Poudre de rasam.'] };
  mockResult={ ...mockResult,cookable_now:[rasam] };
  render(wrap(<PersonalizedRecipeSuggestions featured/>));
  expect(screen.getByText('Ingrédients présents · quantités à vérifier.')).toBeVisible();
  expect(screen.queryByText('Tout est dans ton stock.')).not.toBeInTheDocument();
});
