import { Link,useLocation } from 'react-router-dom';
import { recipeDurationMinutes,recipeReferenceKey,type RecipeLifecycleState } from '@smart/shared';
import type { Recipe } from '@/hooks/useRecipes';
import {useAuthenticatedUser} from '@/hooks/useAuthenticatedUser';
import { useRecipeExposure } from '@/hooks/useRecipeLifecycle';
import { recipeDetailPath } from '@/lib/recipeLinks';
import RecipePreview from './RecipePreview';
import RecipeLibraryActions from './RecipeLibraryActions';
export default function RecipeLifeCard({recipe,state,reason,onOpen}:{recipe:Recipe;state?:RecipeLifecycleState;reason:string;onOpen?:(anchor:string)=>void}){
  const location=useLocation();
  const reference={id:recipe.id,source:recipe.source??'recipes' as const};
  const ref=useRecipeExposure(useAuthenticatedUser().id,reference),duration=recipeDurationMinutes(recipe);
  const anchor=`recipe-card-${reference.source}-${reference.id}`;
  return <li id={anchor} ref={ref} className="culinary-recipe-card kitchen-library-card recipe-life-card" data-recipe-key={recipeReferenceKey(reference)}>
    <Link state={{recipeLibraryUrl:location.pathname+location.search}} onClick={()=>onOpen?.(anchor)} to={recipeDetailPath(reference)} className="culinary-recipe-link"><RecipePreview imageUrl={recipe.image_url} title={recipe.name} decorative className="culinary-recipe-photo"/><div className="culinary-recipe-copy"><h3 className="kitchen-card-title">{recipe.name}</h3><p className="mt-1 text-sm">{reason}</p><p className="mt-1 text-sm text-muted-foreground">{duration===null?'Durée non renseignée':`${duration} min`}{state?.last_cooked_at?` · Préparée le ${new Date(state.last_cooked_at).toLocaleDateString('fr-FR')}`:''}</p></div></Link>
    <div className="p-3 recipe-life-actions"><RecipeLibraryActions recipe={reference} name={recipe.name}/>{state?.queued_at&&<Link className="inline-flex min-h-11 items-center text-sm underline" to={`/kitchen/meal-planning?recipe_name=${encodeURIComponent(recipe.name)}`}>Choisir une date au menu</Link>}</div>
  </li>;
}
