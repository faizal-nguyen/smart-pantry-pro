import { fireEvent,render,screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import PersonalizedRecipeSuggestions from '../PersonalizedRecipeSuggestions';
import AssistantRecipeProposals from '@/components/assistant/AssistantRecipeProposals';
import type { RecommendationResultView,RecommendedRecipeView } from '@/services/recommendationsApi';
let mockResult:RecommendationResultView;
let mockProfileVersion=1;
const owner='00000000-0000-4000-8000-000000000001';
jest.mock('@/hooks/useRoutineMealIdeas',()=>({ useRoutineMealIdeas:()=>({ owner,data:mockResult,isLoading:false,isError:false,refetch:jest.fn() }) }));
jest.mock('@/hooks/useNutritionProfile',()=>({ useNutritionProfile:()=>({ data:{ profile:{ version:mockProfileVersion } },isLoading:false,error:null }) }));
jest.mock('@/lib/api',()=>({ apiPost:jest.fn(),apiGet:jest.fn(),apiPatch:jest.fn(),ApiError:class extends Error {} }));
jest.mock('@/integrations/supabase/client',()=>({ supabase:{ auth:{ getSession:jest.fn() } } }));
function candidate(id:string):RecommendedRecipeView { return { id,name:`Recette ${id}`,servings:2,score_total:70,reasons:['Durée enregistrée 15 min.'],reference:{ id,source:'recipes' },duration_minutes:15,profile_version:1,stock_version:'fixture',calculated_at:'2026-10-09T12:00:00Z',
  constraints:{ status:'compatible',findings:[],registry_version:'fixture',limitations:[] },
  availability:{ status:'available',missing:[],allocations:[],uncertainties:[],excluded_lots:[] },
  nutrition:{ status:'unavailable',coverage:0,known_ingredients:0,total_ingredients:1,per_serving:{ energyKcal:null,proteinG:null,fiberG:null },sources:[],limitations:['Données absentes, aucune estimation inventée.'] },
  reason_codes:[{ code:'TIME_FITS',text:'Durée enregistrée 15 min.' }],unavailable_criteria:['nutrition','variety'] }; }
beforeEach(()=>{ localStorage.clear();mockProfileVersion=1;mockResult={ cookable_now:[candidate('a'),candidate('b'),candidate('c'),candidate('d')],almost_cookable:[],recent_suggestions:[],verify_suggestions:[],excluded_suggestions:[],total_user_recipes:4,pipeline_version:3,profile_version:1,calculated_at:'2026-10-09T12:00:00Z',has_constraints:false }; });
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
  expect(screen.queryByText('Stock renseigné au calcul')).not.toBeInTheDocument();
  expect(screen.queryByRole('group',{ name:/Actions pour/ })).not.toBeInTheDocument();
});
