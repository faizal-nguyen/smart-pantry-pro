jest.mock('../PersonalizedRecipeSuggestions',()=>({ __esModule:true,default:({ onBrowse }:{ onBrowse?:()=>void })=><button onClick={onBrowse}>Parcourir les recettes</button> }));
import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import RoutineRecipeLibrary from '../RoutineRecipeLibrary';
const A='00000000-0000-4000-8000-000000000001';
jest.mock('@/hooks/useAuthenticatedUser',()=>({ useAuthenticatedUser:()=>({ id:A }) }));
jest.mock('@/hooks/useRecipeFavorites',()=>({ useRecipeFavorites:()=>({ data:[],isFavorite:()=>false,refetch:jest.fn() }) }));
jest.mock('@/hooks/useRecipes',()=>({ useRecipes:()=>({ recipes:[{ id:'legacy',source:'recipes',name:'Pain maison',image_url:'/legacy.jpg',prep_time:10,cook_time:20,rest_time:15,servings:4,user_id:A },{ id:'wrapper',source:'user_recipes',name:'Soupe personnelle',image_url:'/personal.jpg',prep_time:null,cook_time:null,servings:null,user_id:A,inlineIngredients:[{ name:'Tomate' }] }],loading:false,fetchRecipes:jest.fn() }) }));
jest.mock('@/hooks/useRoutineCatalog',()=>({ useRoutineCatalog:()=>({ data:{ pages:[{ rows:[{ id:'catalog',title:'Riz simple',photo_url:'/catalog.jpg',prep_time:5,cook_time:15,servings:2,ingredients_json:[{ name:'Riz',amount:'100',unit:'g' }] }] }] },refetch:jest.fn() }) }));
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
test('the three origins expose their photos and exact source links; image failure preserves navigation',()=>{
  show();
  for (const [name,url,id,source] of [['Pain maison','/legacy.jpg','legacy','recipes'],['Soupe personnelle','/personal.jpg','wrapper','user_recipes'],['Riz simple','/catalog.jpg','catalog','recipes_catalog']]) {
    const row=screen.getByRole('heading',{ name }).closest('li')!;
    const image=row.querySelector('img')!;
    expect(image).toHaveAttribute('src',url);
    expect(image).toHaveAttribute('loading',source==='recipes' ? 'eager' : 'lazy');
    expect(row.querySelector('a')).toHaveAttribute('href',`/kitchen/recipes/${id}?source=${source}`);
    fireEvent.error(image);
    expect(row).toHaveTextContent('Photo indisponible');
    expect(row.querySelector('a')).toHaveAttribute('href',`/kitchen/recipes/${id}?source=${source}`);
  }
  expect(screen.getByText(/45 min/)).toBeVisible();
});
test('suggestions open on demand and their browse action returns focus to the search',async()=>{
  show();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{ name:'Idées avec mon stock' }));
  expect(screen.getByRole('dialog')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{ name:'Parcourir les recettes' }));
  await waitFor(()=>expect(screen.getByRole('searchbox')).toHaveFocus());
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
test('an empty search offers an effective reset rather than returning to the same filtered list',async()=>{
  show('/kitchen/recipes?search=introuvable&filter=personal');
  expect(screen.queryByRole('heading',{ name:'Pain maison' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{ name:'Retirer les filtres et la recherche' }));
  expect(screen.getByRole('searchbox')).toHaveValue('');
  expect(screen.getByRole('heading',{ name:'Riz simple' })).toBeVisible();
});
