import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { normalizeIngredientName,recipeDurationMinutes,resolveRecipeImageUrl } from '@smart/shared';
import { supabase } from '@/integrations/supabase/client';
import { useRecipes } from '@/hooks/useRecipes';
import { useRecipeFavorites } from '@/hooks/useRecipeFavorites';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRoutineCatalog } from '@/hooks/useRoutineCatalog';
import PersonalizedRecipeSuggestions from './PersonalizedRecipeSuggestions';
import RecipePreview from './RecipePreview';
import { recipeDetailPath } from '@/lib/recipeLinks';
import type { UserRecipe } from '@/hooks/useUserRecipes';
import { useEffect, useRef, useState } from 'react';
import { useCulinaryDesign } from '@/contexts/CulinaryDesignContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
export default function RoutineRecipeLibrary({ library,onAdd,isAdding }: { library:UserRecipe[];onAdd:(id:string,name:string)=>void;isAdding:boolean }) {
  const user=useAuthenticatedUser(), recipes=useRecipes(), favorites=useRecipeFavorites();
  const design=useCulinaryDesign();
  const [suggestionsOpen,setSuggestionsOpen]=useState(false);
  const searchRef=useRef<HTMLInputElement>(null),browseOnClose=useRef(false);
  const location=useLocation();
  useEffect(()=>{ if (location.hash==='#recipe-search') searchRef.current?.focus(); },[location.hash]);
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
    const merged=[...recipes.recipes.map(row=>({ id:row.id,source:row.source ?? 'recipes' as const,name:row.name,image:resolveRecipeImageUrl(row.image_url),imageOrigin:row.image_origin ?? null,duration:recipeDurationMinutes(row),servings:row.servings,own:row.user_id===user.id,catalog:false,hasIngredient:!ingredient || ingredients.data?.some(value=>value.recipe_id===row.id && (value.inventory_product_id===ingredient || normalizeIngredientName(value.ingredient_name)===normalizeIngredientName(ingredientName))) || containsIngredient(row.inlineIngredients) })),...catalog.filter(row=>!recipes.recipes.some(item=>item.source==='recipes_catalog' && item.id===row.id)).map(row=>({ id:row.id,source:'recipes_catalog' as const,name:row.title,image:resolveRecipeImageUrl(row.photo_url),imageOrigin:'catalog' as const,duration:recipeDurationMinutes(row),servings:row.servings,own:false,catalog:true,hasIngredient:!ingredient || containsIngredient(row.ingredients_json) }))];
    return merged.filter(row => row.hasIngredient && row.name.toLowerCase().includes(search.toLowerCase()) && (filter!=='personal' || row.own) && (filter!=='favorites' || favorites.isFavorite(row.id) || legacyFavorites.has(row.id)));
  })();
  return <section className="space-y-4" data-culinary-view={design}>
    <label id="recipe-search" className="block text-sm space-y-1 scroll-mt-4">Rechercher parmi toutes les recettes<Input ref={searchRef} type="search" className="h-11" placeholder="Un plat, une envie…" value={search} onChange={e=>update({ search:e.target.value })} /></label>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <details><summary className="min-h-11 cursor-pointer text-sm flex items-center">Filtrer{filter==='personal' ? ' · Mes recettes' : filter==='favorites' ? ' · Favoris' : ''}{ingredient ? ' · Ingrédient' : ''}</summary><div className="flex flex-wrap gap-2 pt-2" role="group" aria-label="Origine des recettes">{[['all','Toutes'],['personal','Mes recettes'],['favorites','Favoris']].map(([value,label])=><Button key={value} className="min-h-11" aria-pressed={filter===value} variant={filter===value ? 'secondary':'outline'} onClick={()=>update({ filter:value })}>{label}</Button>)}</div></details>
      <Dialog open={suggestionsOpen} onOpenChange={setSuggestionsOpen}><DialogTrigger asChild><Button variant="outline" className="min-h-11">Idées avec mon stock</Button></DialogTrigger><DialogContent className="routine-dialog max-w-3xl" onCloseAutoFocus={event=>{ if (browseOnClose.current) { event.preventDefault();browseOnClose.current=false;searchRef.current?.focus(); } }}><DialogHeader><DialogTitle>Idées avec ton stock</DialogTitle><DialogDescription>Des propositions pour ce repas, selon les informations connues.</DialogDescription></DialogHeader><PersonalizedRecipeSuggestions onBrowse={()=>{ browseOnClose.current=true;setSuggestionsOpen(false); }} /></DialogContent></Dialog>
    </div>
    {ingredient && <div className="rounded-lg border p-3"><p>Avec l’ingrédient : {ingredientName || 'produit sélectionné'}</p><Button className="min-h-11" variant="ghost" onClick={()=>setParams(previous=>{ const next=new URLSearchParams(previous);next.delete('ingredient');next.delete('ingredient_name');return next; },{ replace:true })}>Retirer ce filtre</Button>{ingredients.isFetching && <p role="status">Lecture des ingrédients…</p>}{ingredients.error && <p role="alert">{ingredients.error.message}<Button className="min-h-11" variant="outline" onClick={()=>void ingredients.refetch()}>Réessayer</Button></p>}</div>}
    {(recipes.error || favorites.error || catalogQuery.error) && <p role="alert">{recipes.error ? 'Impossible de charger une partie des recettes.' : favorites.error?.message ?? catalogQuery.error?.message}<Button className="min-h-11" variant="outline" onClick={()=>{ void recipes.fetchRecipes(); void favorites.refetch(); void catalogQuery.refetch(); }}>Réessayer</Button></p>}
    {recipes.loading || catalogQuery.isLoading ? <p role="status">Chargement des recettes…</p> : !rows.length ? <div className="rounded-lg bg-muted p-4 space-y-3"><p>Aucune recette pour cette recherche.</p>{(search || ingredient || filter!=='all') && <Button variant="outline" className="min-h-11" onClick={()=>setParams(previous=>{ const next=new URLSearchParams(previous);for (const key of ['search','ingredient','ingredient_name','filter']) next.delete(key);return next; },{ replace:true })}>Retirer les filtres et la recherche</Button>}<Button variant="outline" className="min-h-11" asChild><Link to="/kitchen/recipes?tab=import">Ajouter une recette</Link></Button></div> : <ul className="culinary-recipe-grid" aria-label="Bibliothèque de recettes">{rows.map((row,index)=><li key={`${row.source}:${row.id}`} className="culinary-recipe-card">
      <Link to={recipeDetailPath({ id:row.id,source:row.source })} className="culinary-recipe-link">
        <RecipePreview imageUrl={row.image} title={row.name} decorative priority={index===0} className="culinary-recipe-photo" caption={row.source==='user_recipes' && row.imageOrigin==='catalog' ? 'Photo du catalogue' : undefined} />
        <div className="culinary-recipe-copy"><h2 className="text-lg font-semibold break-words leading-snug">{row.name}</h2><p className="mt-1 text-sm text-muted-foreground">{row.duration==null ? 'Durée à vérifier' : `${row.duration} min`} · {row.servings ? `${row.servings} portions` : 'Portions à vérifier'}</p><span className="mt-1 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Voir la recette</span></div>
      </Link>
      <p className="text-xs text-muted-foreground">{row.own ? 'Mes recettes' : 'Catalogue'}</p>
      {row.catalog && <Button className="min-h-11 w-full" variant="outline" disabled={isAdding} onClick={()=>onAdd(row.id,row.name)}>Enregistrer dans mes recettes</Button>}
    </li>)}</ul>}
    {catalogQuery.hasNextPage && <Button className="min-h-11" variant="outline" disabled={catalogQuery.isFetchingNextPage} onClick={()=>void catalogQuery.fetchNextPage()}>Voir d’autres recettes du catalogue</Button>}
  </section>;
}
