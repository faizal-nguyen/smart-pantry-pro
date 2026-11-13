import { Link } from 'react-router-dom';
import { recipeReferenceKey } from '@smart/shared';
import {useAuthenticatedUser} from '@/hooks/useAuthenticatedUser';
import {useRecipeListReturn} from '@/hooks/useRecipeListReturn';
import { useRecipes } from '@/hooks/useRecipes';
import { useRecipeLifecycle } from '@/hooks/useRecipeLifecycle';
import { Button } from '@/components/ui/button';
import { recipeDetailPath } from '@/lib/recipeLinks';
import RecipeLifeCard from './RecipeLifeCard';
import RecipeLibraryActions from './RecipeLibraryActions';
export default function RecipeSoon(){
  const recipes=useRecipes(),life=useRecipeLifecycle();
  const queued=life.data?.recipes.filter(s=>s.queued_at).sort((a,b)=>b.queued_at!.localeCompare(a.queued_at!))??[];
  const rows=new Map(recipes.recipes.map(r=>[recipeReferenceKey({id:r.id,source:r.source??'recipes'}),r]));
  const savePosition=useRecipeListReturn({owner:useAuthenticatedUser().id,ready:!life.isLoading&&!recipes.loading,renderedKey:queued.map(s=>recipeReferenceKey(s.recipe)).join('|'),pages:1,hasNext:false,fetching:false,fetchNext:()=>undefined});
  if(life.isLoading||recipes.loading)return <p role="status">Lecture de tes envies…</p>;
  if(life.isError||recipes.error)return <div role="alert"><p>Ta sélection ne peut pas être relue.</p><Button onClick={()=>{void life.refetch();void recipes.fetchRecipes();}}>Réessayer</Button></div>;
  return <section className="space-y-4"><div><h2 className="text-xl font-semibold">À cuisiner bientôt{queued.length?` · ${queued.length}`:''}</h2><p className="text-sm text-muted-foreground">Tes envies, sans date imposée. Ouvre une fiche pour cuisiner, ajouter les manquants ou choisir une date.</p></div>
    {!queued.length?<div className="rounded-lg border p-5 space-y-3"><p>Quelle recette te fait envie ? Ajoute-la ici depuis sa fiche ou la bibliothèque.</p><Button asChild><Link to="/kitchen/recipes?tab=library">Parcourir ma bibliothèque</Link></Button></div>:<ul className="culinary-recipe-grid kitchen-library-grid">{queued.map(state=>{
      const key=recipeReferenceKey(state.recipe),recipe=rows.get(key);
      return recipe?<RecipeLifeCard key={key} recipe={recipe} state={state} onOpen={savePosition} reason="Tu as envie de la cuisiner."/>:<li key={key} className="rounded-lg border p-4 space-y-3"><Link className="underline" to={recipeDetailPath(state.recipe)}>Ouvrir la recette sélectionnée</Link><RecipeLibraryActions recipe={state.recipe} name="Cette recette"/></li>;
    })}</ul>}
  </section>;
}
