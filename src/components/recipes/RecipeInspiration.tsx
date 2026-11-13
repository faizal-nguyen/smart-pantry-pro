import {useAuthenticatedUser} from '@/hooks/useAuthenticatedUser';
import {useRecipeListReturn} from '@/hooks/useRecipeListReturn';
import { useRecipes } from '@/hooks/useRecipes';
import { useRecipeLifecycle } from '@/hooks/useRecipeLifecycle';
import { selectRecipeShelves } from '@/lib/recipeRediscovery';
import { Button } from '@/components/ui/button';
import PersonalizedRecipeSuggestions from './PersonalizedRecipeSuggestions';
import RecipeLifeCard from './RecipeLifeCard';
export default function RecipeInspiration(){
  const recipes=useRecipes(),life=useRecipeLifecycle();
  const shelves=life.data?selectRecipeShelves(recipes.recipes,life.data):{rediscover:[],weekend:[]};
  const savePosition=useRecipeListReturn({owner:useAuthenticatedUser().id,ready:!life.isLoading&&!recipes.loading,renderedKey:[...shelves.rediscover,...shelves.weekend].map(r=>r.id).join('|'),pages:1,hasNext:false,fetching:false,fetchNext:()=>undefined});
  const render=(title:string,description:string,rows:typeof recipes.recipes)=><section className="space-y-3" aria-label={title}><div><h2 className="text-xl font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div><ul className="culinary-recipe-grid kitchen-library-grid">{rows.map(recipe=>{
    const state=life.stateFor({id:recipe.id,source:recipe.source??'recipes'});
    const reason=state?.last_cooked_at?'Une recette à retrouver.':state?.last_viewed_at?'Tu avais regardé cette recette.':'À découvrir dans ta bibliothèque.';
    return <RecipeLifeCard key={`${recipe.source}:${recipe.id}`} recipe={recipe} state={state} onOpen={savePosition} reason={reason}/>;
  })}</ul></section>;
  return <div className="space-y-8">
    <section className="space-y-3" aria-label="Pour ton prochain repas"><h2 className="text-xl font-semibold">Pour ton prochain repas</h2><p className="text-sm text-muted-foreground">Des idées selon ton stock, tes goûts et le temps disponible.</p><PersonalizedRecipeSuggestions featured/></section>
    {(life.isLoading||recipes.loading)&&<p role="status">Lecture de tes recettes et de ton historique…</p>}
    {(life.isError||recipes.error)&&<div role="alert"><p>Les recettes à redécouvrir ne peuvent pas être relues.</p><Button variant="outline" onClick={()=>{void life.refetch();void recipes.fetchRecipes();}}>Réessayer</Button></div>}
    {!life.isError&&!recipes.error&&!!shelves.rediscover.length&&render('À redécouvrir','Des recettes peu montrées, pour explorer ce que tu as déjà enregistré.',shelves.rediscover)}
    {!life.isError&&!recipes.error&&!!shelves.weekend.length&&render('Pour le week-end','Des préparations plus longues à prévoir. Vérifie le stock sur la fiche.',shelves.weekend)}
    {!life.isLoading&&!recipes.loading&&!life.isError&&!recipes.error&&!shelves.rediscover.length&&<p>Parcours la bibliothèque ou retrouve tes envies dans « À cuisiner bientôt ». Les prochaines découvertes apparaîtront parmi les fiches compatibles avec ton profil.</p>}
    <Button className="min-h-11" variant="outline" disabled={life.isFetching} onClick={()=>void life.refetch()}>Renouveler les découvertes</Button>
  </div>;
}
