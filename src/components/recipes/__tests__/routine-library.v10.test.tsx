import { render,screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import RoutineRecipeLibrary from '../RoutineRecipeLibrary';
const A='00000000-0000-4000-8000-000000000001';
jest.mock('@/hooks/useAuthenticatedUser',()=>({ useAuthenticatedUser:()=>({ id:A }) }));
jest.mock('@/hooks/useRecipeFavorites',()=>({ useRecipeFavorites:()=>({ data:[],isFavorite:()=>false,refetch:jest.fn() }) }));
jest.mock('@/hooks/useRecipes',()=>({ useRecipes:()=>({ recipes:[{ id:'legacy',name:'Pain maison',prep_time:10,cook_time:20,servings:4,user_id:A },{ id:'wrapper',name:'Soupe personnelle',prep_time:0,cook_time:0,servings:2,user_id:A,inlineIngredients:[{ name:'Tomate' }] }],loading:false,fetchRecipes:jest.fn() }) }));
jest.mock('@/hooks/useRoutineCatalog',()=>({ useRoutineCatalog:()=>({ data:{ pages:[{ rows:[{ id:'catalog',title:'Riz simple',prep_time:5,cook_time:15,servings:2,ingredients_json:[{ name:'Riz',amount:'100',unit:'g' }] }] }] },refetch:jest.fn() }) }));
jest.mock('@/integrations/supabase/client',()=>({ supabase:{ from:()=>{
  const query={ select:()=>query,in:()=>query,abortSignal:async()=>({ data:[{ recipe_id:'legacy',ingredient_name:'Farine',inventory_product_id:'flour' }],error:null }) };return query;
} } }));
function show(route='/kitchen/recipes') {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions:{ queries:{ retry:false } } })}><MemoryRouter initialEntries={[route]}><RoutineRecipeLibrary library={[]} onAdd={jest.fn()} isAdding={false}/></MemoryRouter></QueryClientProvider>);
}
test('legacy, custom wrapper and actual catalogue are reachable without invented times',()=>{
  show();expect(screen.getByRole('heading',{ name:'Pain maison' })).toBeVisible();expect(screen.getByRole('heading',{ name:'Soupe personnelle' })).toBeVisible();expect(screen.getByRole('heading',{ name:'Riz simple' })).toBeVisible();expect(screen.getByText(/Durée à vérifier/)).toBeVisible();
});
test('the ingredient shortcut finds a recipe by its ingredient rather than requiring it in the title',async()=>{
  show('/kitchen/recipes?ingredient=flour&ingredient_name=Farine');
  await screen.findByRole('heading',{ name:'Pain maison' });
  expect(screen.queryByRole('heading',{ name:'Riz simple' })).not.toBeInTheDocument();
});
