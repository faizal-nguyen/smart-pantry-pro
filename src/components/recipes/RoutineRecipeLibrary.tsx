import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { normalizeIngredientName } from '@smart/shared';
import { supabase } from '@/integrations/supabase/client';
import { useRecipes } from '@/hooks/useRecipes';
import { useRecipeFavorites } from '@/hooks/useRecipeFavorites';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRoutineCatalog } from '@/hooks/useRoutineCatalog';
import PersonalizedRecipeSuggestions from './PersonalizedRecipeSuggestions';
import type { UserRecipe } from '@/hooks/useUserRecipes';
export default function RoutineRecipeLibrary({ library,onAdd,isAdding }: { library:UserRecipe[];onAdd:(id:string,name:string)=>void;isAdding:boolean }) {
  const user=useAuthenticatedUser(), recipes=useRecipes(), favorites=useRecipeFavorites();
  const [params,setParams]=useSearchParams(), search=params.get('search') ?? '', filter=params.get('filter') ?? 'all';
  const ingredient=params.get('ingredient'), ingredientName=params.get('ingredient_name') ?? '';
  const catalogQuery=useRoutineCatalog(search);
  const ingredients=useQuery({ queryKey:['routine-library-ingredients',user.id,recipes.recipes.map(row=>row.id)],enabled:!!ingredient && recipes.recipes.length>0,queryFn:async({ signal })=>{
    const { data,error }=await supabase.from('recipe_ingredients').select('recipe_id,ingredient_name,inventory_product_id').in('recipe_id',recipes.recipes.map(row=>row.id)).abortSignal(signal);
    if (error) throw new Error('Les ingrédients des recettes ne peuvent pas être lus.');return data ?? [];
  } });
  const containsIngredient=(values:unknown) => Array.isArray(values) && values.some(value=>value && typeof value==='object' && normalizeIngredientName(String(value.ingredient_name ?? value.name ?? ''))===normalizeIngredientName(ingredientName));
  const catalog=catalogQuery.data?.pages.flatMap(page=>page.rows) ?? [];
  const update=(patch:Record<string,string>) => setParams(prev => { const next=new URLSearchParams(prev); for (const [key,value] of Object.entries(patch)) next.set(key,value); return next; },{ replace:true });
  const legacyFavorites=new Set(library.filter(row=>(row.personal_rating ?? 0)>=4).map(row=>row.id));
  const rows=(() => {
    const merged=[...recipes.recipes.map(row=>({ id:row.id,name:row.name,prep:row.prep_time,cook:row.cook_time,servings:row.servings,own:row.user_id===user.id,catalog:false,hasIngredient:!ingredient || ingredients.data?.some(value=>value.recipe_id===row.id && (value.inventory_product_id===ingredient || normalizeIngredientName(value.ingredient_name)===normalizeIngredientName(ingredientName))) || containsIngredient(row.inlineIngredients) })),...catalog.filter(row=>!recipes.recipes.some(item=>item.id===row.id)).map(row=>({ id:row.id,name:row.title,prep:row.prep_time ?? 0,cook:row.cook_time ?? 0,servings:row.servings,own:false,catalog:true,hasIngredient:!ingredient || containsIngredient(row.ingredients_json) }))];
    return merged.filter(row => row.hasIngredient && row.name.toLowerCase().includes(search.toLowerCase()) && (filter!=='personal' || row.own) && (filter!=='favorites' || favorites.isFavorite(row.id) || legacyFavorites.has(row.id)));
  })();
  return <section className="space-y-4"><section aria-label="Idées personnalisées" className="space-y-3"><h2 className="text-xl font-semibold">Idées selon mon profil et mon stock</h2><PersonalizedRecipeSuggestions /></section><label className="block text-sm space-y-1">Rechercher parmi toutes les recettes<Input type="search" className="h-11" placeholder="Nom de recette…" value={search} onChange={e=>update({ search:e.target.value })} /></label><div className="flex flex-wrap gap-2" role="group" aria-label="Origine des recettes">{[['all','Toutes'],['personal','Mes recettes'],['favorites','Favoris']].map(([value,label])=><Button key={value} className="min-h-11" aria-pressed={filter===value} variant={filter===value ? 'default':'outline'} onClick={()=>update({ filter:value })}>{label}</Button>)}</div>
    {ingredient && <div className="rounded-lg border p-3"><p>Avec l’ingrédient : {ingredientName || 'produit sélectionné'}</p><Button className="min-h-11" variant="ghost" onClick={()=>setParams(previous=>{ const next=new URLSearchParams(previous);next.delete('ingredient');next.delete('ingredient_name');return next; },{ replace:true })}>Retirer ce filtre</Button>{ingredients.isFetching && <p role="status">Lecture des ingrédients…</p>}{ingredients.error && <p role="alert">{ingredients.error.message}<Button className="min-h-11" variant="outline" onClick={()=>void ingredients.refetch()}>Réessayer</Button></p>}</div>}
    {(recipes.error || favorites.error || catalogQuery.error) && <p role="alert">{recipes.error ? 'Impossible de charger une partie des recettes.' : favorites.error?.message ?? catalogQuery.error?.message}<Button className="min-h-11" variant="outline" onClick={()=>{ void recipes.fetchRecipes(); void favorites.refetch(); void catalogQuery.refetch(); }}>Réessayer</Button></p>}
    {recipes.loading ? <p role="status">Chargement des recettes…</p> : !rows.length ? <p>Aucune recette pour ces filtres. Ajoutez une recette ou changez la recherche.</p> : <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">{rows.map(row=><li key={row.id} className="rounded-xl border bg-card p-4 space-y-2"><h2 className="font-semibold break-words">{row.name}</h2><p className="text-sm text-muted-foreground">{row.own ? 'Mes recettes' : 'Catalogue'} · {row.prep+row.cook || 'Durée à vérifier'}{row.prep+row.cook>0 ? ' min' : ''} · {row.servings || 'Portions à vérifier'}{row.servings ? ' portion(s)' : ''}</p><Button className="min-h-11 w-full" asChild><Link to={`/kitchen/recipes/${row.id}`}>Voir et commencer</Link></Button>{row.catalog && <Button className="min-h-11 w-full" variant="outline" disabled={isAdding} onClick={()=>onAdd(row.id,row.name)}>Enregistrer dans mes recettes</Button>}</li>)}</ul>}
    {catalogQuery.hasNextPage && <Button className="min-h-11" variant="outline" disabled={catalogQuery.isFetchingNextPage} onClick={()=>void catalogQuery.fetchNextPage()}>Voir d’autres recettes du catalogue</Button>}
  </section>;
}
