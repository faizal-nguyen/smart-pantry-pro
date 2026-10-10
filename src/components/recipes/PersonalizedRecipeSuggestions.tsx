import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useRoutineMealIdeas } from '@/hooks/useRoutineMealIdeas';
import { postRecipeFeedback,pendingRecipeFeedback,type RecommendedRecipeView,type SuggestRecommendationsInput } from '@/services/recommendationsApi';
import type { RecommendationFeedback } from '@smart/shared';
import { Button } from '@/components/ui/button';
import { dispatchAgentDbChanged } from '@/lib/agentEvents';
import RecipePreview from './RecipePreview';
import NutritionEstimateView from './NutritionEstimateView';
import { recipeDetailPath } from '@/lib/recipeLinks';
import { useCulinaryDesign } from '@/contexts/CulinaryDesignContext';
const feedbackLabels=[['repeat','À refaire'],['dislike','Je n’aime pas'],['too_long','Trop long']] as const;
const criteria:Record<string,string>={ nutrition:'nutrition',variety:'variété',expiry:'date proche',taste:'goûts',time:'durée',equipment:'matériel',skill:'niveau',feedback:'retours',meal_type:'type de repas',light_goal:'objectif léger sans mesure disponible' };
export function RecommendationEvidenceDetails({ recipe,summaryShown=false }:{ recipe:RecommendedRecipeView;summaryShown?:boolean }) {
  const { nutrition,availability }=recipe;
  return <details className="text-sm"><summary className="min-h-11 cursor-pointer">Pourquoi cette recette ?</summary><div className="space-y-2 pb-2">
    <ul className="list-disc pl-5 space-y-1">{recipe.reason_codes.slice(summaryShown ? 1 : 0).map((reason,index)=><li key={`${reason.code}:${index}`}>{reason.text}</li>)}</ul>
    {availability.missing.length>0 && <ul className="space-y-1">{availability.missing.map((item,index)=><li key={index}>À acheter ou vérifier : {item.ingredient_name}{item.quantity!=null ? ` · ${item.quantity} ${item.unit ?? ''}` : ''}.</li>)}</ul>}
    {availability.excluded_lot_reasons?.map(item=><p key={item.id}>{item.message}</p>)}
    {availability.uncertainties.map((text,index)=><p key={index}>{text}</p>)}
    {!summaryShown && recipe.constraints.findings.map((finding,index)=><p key={`constraint:${index}`}>{finding.ingredient ? `${finding.ingredient} : ` : ''}{finding.message}</p>)}
    <NutritionEstimateView nutrition={nutrition} showDetails={false} />
    {recipe.constraints.limitations.map((text,index)=><p key={`limit:${index}`} className="text-muted-foreground">{text}</p>)}
    {recipe.unavailable_criteria.length>0 && <p className="text-muted-foreground">Critères non calculés : {recipe.unavailable_criteria.map(item=>criteria[item] ?? item).join(', ')}.</p>}
    <p className="text-xs text-muted-foreground">Profil version {recipe.profile_version} · calcul {new Date(recipe.calculated_at).toLocaleTimeString('fr-FR')}.</p>
  </div></details>;
}
export default function PersonalizedRecipeSuggestions({ input={ goal:'tonight' },onAddStock,onBrowse }:{ input?:SuggestRecommendationsInput;onAddStock?:()=>void;onBrowse?:()=>void }) {
  const query=useRoutineMealIdeas(input);
  return <PersonalizedSuggestionsContent key={query.owner ?? 'anonymous'} query={query} onAddStock={onAddStock} onBrowse={onBrowse} dismissLabel={input.mealType && input.mealType!=='dinner' ? 'Pas pour ce repas' : 'Pas ce soir'}/>;
}
function PersonalizedSuggestionsContent({ query,onAddStock,onBrowse,dismissLabel }:{ query:ReturnType<typeof useRoutineMealIdeas>;onAddStock?:()=>void;onBrowse?:()=>void;dismissLabel:string }) {
  const design=useCulinaryDesign();
  const client=useQueryClient();
  const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[confirmation,setConfirmation]=useState<string|null>(null);
  let pending=null;
  try { pending=query.owner ? pendingRecipeFeedback(query.owner) : null; } catch { /* Preserve the intent; its replay will show the validation failure. */ }
  const feedback=async(recipe:RecommendedRecipeView,kind:RecommendationFeedback['feedback'])=>{
    if (!query.owner || busy) return;
    setBusy(true);setError(null);setConfirmation(null);
    try {
      await postRecipeFeedback(query.owner,{ recipe:recipe.reference,feedback:kind,event_id:query.data?.event_id ?? null });
      setConfirmation(kind==='not_today' ? 'Ce choix concerne seulement ce repas. Il est enregistré.' : 'Ton retour est enregistré.');
      await client.invalidateQueries({ queryKey:['routine-meal-ideas',query.owner] });
      dispatchAgentDbChanged(['recipe_interactions']);
    } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); }
  };
  const ideas=query.data ? [...query.data.cookable_now,...query.data.almost_cookable].sort((a,b)=>b.score_total-a.score_total).slice(0,3) : [];
  const render=(recipe:RecommendedRecipeView,mode:'idea'|'verify'|'excluded',priority=false)=><li key={`${recipe.reference.source}:${recipe.id}`} className="culinary-recipe-card">
    <Link to={recipeDetailPath(recipe.reference,recipe.servings)} className="culinary-recipe-link">
      <RecipePreview imageUrl={recipe.image_url} title={recipe.name} decorative priority={priority} className="culinary-recipe-photo" caption={recipe.reference.source==='user_recipes' && recipe.image_origin==='catalog' ? 'Photo du catalogue' : undefined} />
      <div className="culinary-recipe-copy"><h3 className="text-lg font-semibold break-words leading-snug">{recipe.name}</h3><p className="mt-1 text-sm text-muted-foreground">{recipe.duration_minutes==null ? 'Durée à vérifier' : `${recipe.duration_minutes} min`} · {recipe.servings ? `${recipe.servings} portions` : 'Portions à vérifier'}</p></div>
    </Link>
    <p className="text-sm">{mode==='excluded' ? 'Écartée : voir le motif ci-dessous.' : mode==='verify' ? 'À vérifier avant de choisir' : recipe.reason_codes[0]?.text ?? (recipe.availability.status==='available' ? 'Les quantités renseignées sont en stock.' : 'Des ingrédients manquent ou restent à vérifier.')}</p>
    {mode!=='idea' && recipe.reason_codes[0] && <p className="text-sm text-muted-foreground">{recipe.reason_codes[0].text}</p>}
    {recipe.constraints.findings.map((finding,index)=><p className={recipe.constraints.status==='incompatible' ? 'text-sm text-destructive' : 'text-sm'} key={`visible:${index}`}>{finding.ingredient ? `${finding.ingredient} : ` : ''}{finding.message}</p>)}
    {['partial','unavailable'].includes(recipe.nutrition.status) && <p className="text-xs text-muted-foreground">Nutrition {recipe.nutrition.status==='partial' ? 'partielle' : 'indisponible'} : estimation à vérifier.</p>}
    <RecommendationEvidenceDetails recipe={recipe} summaryShown /><Button className="min-h-11 w-full" variant={mode==='idea' ? 'default':'outline'} asChild><Link to={recipeDetailPath(recipe.reference,recipe.servings)}>Voir la recette</Link></Button>
    {mode==='idea' && <><Button className="min-h-11 w-full" variant="ghost" disabled={busy || (!!pending && (pending.recipe.id!==recipe.id || pending.recipe.source!==recipe.reference.source || pending.feedback!=='not_today'))} onClick={()=>void feedback(recipe,'not_today')}>{dismissLabel}</Button><details><summary className="min-h-11 cursor-pointer text-sm">Donner un retour sur cette recette</summary><p className="mb-2 text-sm text-muted-foreground">Après l’avoir essayée, indique ce que tu voudrais retrouver dans tes prochaines idées.</p><div className="flex flex-wrap gap-2" aria-label={`Retour sur ${recipe.name}`}>{feedbackLabels.map(([value,label])=><Button key={value} className="min-h-11 whitespace-normal" variant="outline" disabled={busy || (!!pending && (pending.recipe.id!==recipe.id || pending.recipe.source!==recipe.reference.source || pending.feedback!==value))} onClick={()=>void feedback(recipe,value)}>{label}</Button>)}</div></details></>}
  </li>;
  return <div className="space-y-3" data-culinary-view={design}>
    {query.isLoading ? <p role="status">Recherche d’idées avec ton profil et ton stock…</p> : query.isError ? <div role="alert" className="rounded-lg border p-4 space-y-2"><p>{query.error?.message ?? 'Les idées ne peuvent pas être vérifiées.'}</p><Button className="min-h-11" variant="outline" onClick={()=>void query.refetch()}>Réessayer les idées</Button></div> : !ideas.length ? <div className="rounded-lg border p-4 space-y-2"><p>Aucune idée vérifiée pour ce repas. Tu peux regarder les recettes à vérifier ou ajouter tes ingrédients.</p>{onAddStock && <Button className="min-h-11" variant="outline" onClick={onAddStock}>Ajouter des ingrédients</Button>}{onBrowse ? <Button className="min-h-11" variant="outline" onClick={onBrowse}>Parcourir les recettes</Button> : <Button className="min-h-11" variant="outline" asChild><Link to="/kitchen/recipes#recipe-search">Parcourir les recettes</Link></Button>}</div> : <ul className="culinary-recipe-grid">{ideas.map((recipe,index)=>render(recipe,'idea',index===0))}</ul>}
    {!query.isError && query.data && query.data.verify_suggestions.length>0 && <details open={!ideas.length}><summary className="min-h-11 cursor-pointer">Recettes à vérifier ({query.data.verify_suggestions.length})</summary><ul className="culinary-recipe-grid">{query.data.verify_suggestions.map(recipe=>render(recipe,'verify'))}</ul></details>}
    {!query.isError && query.data && query.data.excluded_suggestions.length>0 && <details><summary className="min-h-11 cursor-pointer">Recettes écartées : voir les raisons</summary><ul className="culinary-recipe-grid">{query.data.excluded_suggestions.map(recipe=>render(recipe,'excluded'))}</ul></details>}
    {pending && <div role="status" className="space-y-2"><p>Un retour reste à confirmer.</p><Button className="min-h-11" variant="outline" disabled={busy} onClick={()=>void feedback({ reference:pending.recipe } as RecommendedRecipeView,pending.feedback)}>Vérifier le retour conservé</Button></div>}
    {error && <p role="alert" className="text-destructive">{error}</p>}{confirmation && <p role="status">{confirmation}</p>}
    <p className="text-xs text-muted-foreground">Les contraintes déclarées passent avant le classement. Les compositions inconnues restent à vérifier, sans garantie sur les traces.</p>
    <Button className="min-h-11" variant="ghost" asChild><Link to="/settings?section=cooking">Modifier mon profil alimentaire</Link></Button>
  </div>;
}
