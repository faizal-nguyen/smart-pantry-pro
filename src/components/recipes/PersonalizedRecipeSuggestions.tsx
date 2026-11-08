import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useRoutineMealIdeas } from '@/hooks/useRoutineMealIdeas';
import { postRecipeFeedback,pendingRecipeFeedback,type RecommendedRecipeView,type SuggestRecommendationsInput } from '@/services/recommendationsApi';
import type { RecommendationFeedback } from '@smart/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { dispatchAgentDbChanged } from '@/lib/agentEvents';
import RecipePreview from './RecipePreview';
import NutritionEstimateView from './NutritionEstimateView';
import { recipeDetailPath } from '@/lib/recipeLinks';
import { useCulinaryDesign } from '@/contexts/CulinaryDesignContext';
/** « Il te manque : Agneau, Yaourt et Coriandre. », the first three named. */
function missingLine(names:string[]):string {
  const shown=names.slice(0,3),rest=names.length-shown.length;
  const listed=rest>0 ? `${shown.join(', ')} et ${rest} ${rest===1 ? 'autre' : 'autres'}` : shown.length>1 ? `${shown.slice(0,-1).join(', ')} et ${shown[shown.length-1]}` : shown[0] ?? '';
  return `Il te manque : ${listed}.`;
}
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
export default function PersonalizedRecipeSuggestions({ input={ goal:'tonight' },onAddStock,onBrowse,featured=false }:{ input?:SuggestRecommendationsInput;onAddStock?:()=>void;onBrowse?:()=>void;featured?:boolean }) {
  const query=useRoutineMealIdeas(input);
  return <PersonalizedSuggestionsContent key={query.owner ?? 'anonymous'} query={query} featured={featured} onAddStock={onAddStock} onBrowse={onBrowse} dismissLabel={input.mealType && input.mealType!=='dinner' ? 'Pas pour ce repas' : 'Pas ce soir'}/>;
}
function PersonalizedSuggestionsContent({ query,onAddStock,onBrowse,dismissLabel,featured }:{ featured:boolean;query:ReturnType<typeof useRoutineMealIdeas>;onAddStock?:()=>void;onBrowse?:()=>void;dismissLabel:string }) {
  const design=useCulinaryDesign();
  const [explore,setExplore]=useState(false);
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
  // Nothing complete or almost: the closest recipes, with what is missing, rather than an empty box (iPhone 2026-11-08).
  const closest=query.data && !ideas.length ? [...query.data.recent_suggestions].sort((a,b)=>b.score_total-a.score_total).slice(0,3) : [];
  const render=(recipe:RecommendedRecipeView,mode:'idea'|'closest'|'verify'|'excluded',priority=false,compact=false)=><li key={`${recipe.reference.source}:${recipe.id}`} className="culinary-recipe-card">
    <Link to={recipeDetailPath(recipe.reference,recipe.servings)} className="culinary-recipe-image-link" aria-label={`Voir ${recipe.name}`}>
      <RecipePreview imageUrl={recipe.image_url} title={recipe.name} decorative priority={priority} className="culinary-recipe-photo" caption={recipe.reference.source==='user_recipes' && recipe.image_origin==='catalog' ? 'Photo du catalogue' : undefined} />
    </Link>
    <div className="culinary-recipe-copy">
      <h3 className="culinary-recipe-name"><Link to={recipeDetailPath(recipe.reference,recipe.servings)}>{recipe.name}</Link></h3>
      <p className="culinary-recipe-meta">{recipe.duration_minutes==null ? 'Durée à vérifier' : `${recipe.duration_minutes} min`} · {recipe.servings ? `${recipe.servings} ${recipe.servings===1 ? 'personne' : 'personnes'}` : 'Portions à vérifier'}</p>
      <p className="culinary-recipe-availability" data-available={recipe.availability.status==='available'}>{mode==='excluded' ? 'Écartée : voir le motif ci-dessous.' : mode==='verify' ? 'À vérifier avant de choisir' : mode==='closest' ? missingLine(recipe.missing_ingredients ?? []) : compact ? recipe.availability.status==='available' ? 'Ingrédients disponibles dans ton stock.' : 'Des ingrédients restent à acheter ou à vérifier.' : recipe.reason_codes[0]?.text ?? 'Disponibilité à vérifier.'}</p>
      {recipe.constraints.findings.map((finding,index)=><p className={recipe.constraints.status==='incompatible' ? 'culinary-recipe-warning text-destructive' : 'culinary-recipe-warning'} key={`visible:${index}`}>{finding.ingredient ? `${finding.ingredient} : ` : ''}{finding.message}</p>)}
      {compact && recipe.availability.uncertainties.map((text,index)=><p className="culinary-recipe-warning" key={`uncertainty:${index}`}>{text}</p>)}
      {!compact && ['partial','unavailable'].includes(recipe.nutrition.status) && <p className="culinary-recipe-nutrition">Nutrition {recipe.nutrition.status==='partial' ? 'partielle' : 'indisponible'} : estimation à vérifier.</p>}
      <Button className="culinary-recipe-cta min-h-11 w-full" variant={mode==='idea' ? 'default':'outline'} asChild><Link to={recipeDetailPath(recipe.reference,recipe.servings)}>Voir la recette</Link></Button>
      {compact ? <DialogTrigger asChild><Button className="culinary-recipe-more min-h-11" variant="link">Autres idées</Button></DialogTrigger> : <div className="culinary-recipe-evidence space-y-2">
        <RecommendationEvidenceDetails recipe={recipe} summaryShown />
        {mode==='idea' && <><Button className="min-h-11 w-full" variant="ghost" disabled={busy || (!!pending && (pending.recipe.id!==recipe.id || pending.recipe.source!==recipe.reference.source || pending.feedback!=='not_today'))} onClick={()=>void feedback(recipe,'not_today')}>{dismissLabel}</Button><details><summary className="min-h-11 cursor-pointer text-sm">Donner un retour sur cette recette</summary><p className="mb-2 text-sm text-muted-foreground">Après l’avoir essayée, indique ce que tu voudrais retrouver dans tes prochaines idées.</p><div className="flex flex-wrap gap-2" aria-label={`Retour sur ${recipe.name}`}>{feedbackLabels.map(([value,label])=><Button key={value} className="min-h-11 whitespace-normal" variant="outline" disabled={busy || (!!pending && (pending.recipe.id!==recipe.id || pending.recipe.source!==recipe.reference.source || pending.feedback!==value))} onClick={()=>void feedback(recipe,value)}>{label}</Button>)}</div></details></>}
      </div>}
    </div>
  </li>;
  const additionalGroups=<>
    {!query.isError && query.data && query.data.verify_suggestions.length>0 && <details open={!ideas.length}><summary className="min-h-11 cursor-pointer">Recettes à vérifier ({query.data.verify_suggestions.length})</summary><ul className="culinary-recipe-grid">{query.data.verify_suggestions.map(recipe=>render(recipe,'verify'))}</ul></details>}
    {!query.isError && query.data && query.data.excluded_suggestions.length>0 && <details><summary className="min-h-11 cursor-pointer">Recettes écartées : voir les raisons</summary><ul className="culinary-recipe-grid">{query.data.excluded_suggestions.map(recipe=>render(recipe,'excluded'))}</ul></details>}
    <p className="text-xs text-muted-foreground">Les contraintes déclarées passent avant le classement. Les compositions inconnues restent à vérifier, sans garantie sur les traces.</p>
    <Button className="min-h-11" variant="ghost" asChild><Link to="/settings?section=cooking">Modifier mon profil alimentaire</Link></Button>
  </>;
  const feedbackStatus = <>
    {pending && <div role="status" className="space-y-2"><p>Un retour reste à confirmer.</p><Button className="min-h-11" variant="outline" disabled={busy} onClick={()=>void feedback({ reference:pending.recipe } as RecommendedRecipeView,pending.feedback)}>Vérifier le retour conservé</Button></div>}
    {error && <p role="alert" className="text-destructive">{error}</p>}{confirmation && <p role="status">{confirmation}</p>}
  </>;
  return <Dialog open={featured && explore} onOpenChange={setExplore}><div className={featured ? 'culinary-featured' : 'space-y-3'} data-culinary-view={design}>
    {query.isLoading ? <div className="culinary-recipe-state" role="status">Recherche d’idées avec ton profil et ton stock…</div> : query.isError ? <div role="alert" className="culinary-recipe-state"><p>{query.error?.message ?? 'Les idées ne peuvent pas être vérifiées.'}</p><Button className="min-h-11" variant="outline" onClick={()=>void query.refetch()}>Réessayer les idées</Button></div> : !ideas.length ? <div className="culinary-recipe-state"><h3 className="kitchen-section-title">Trouvons ton prochain repas.</h3>{closest.length ? <><p>Rien de complet dans ton stock pour ce repas : voici les recettes les plus proches.</p><ul className="culinary-recipe-grid">{closest.map((recipe,index)=>render(recipe,'closest',index===0))}</ul></>
        : <p>Aucune idée pour ce repas avec ton stock. Tu peux regarder les recettes à vérifier ou ajouter tes ingrédients.</p>}{onAddStock && <Button className="min-h-11" variant="outline" onClick={onAddStock}>Ajouter des ingrédients</Button>}{onBrowse ? <Button className="min-h-11" variant="outline" onClick={onBrowse}>Parcourir les recettes</Button> : <Button className="min-h-11" variant="outline" asChild><Link to="/kitchen/recipes#recipe-search">Parcourir les recettes</Link></Button>}{featured && <DialogTrigger asChild><Button variant="link">Voir les recettes à vérifier</Button></DialogTrigger>}</div> : featured ? <ul className="culinary-featured-list">{render(ideas[0],'idea',true,true)}</ul> : <ul className="culinary-recipe-grid">{ideas.map((recipe,index)=>render(recipe,'idea',index===0))}</ul>}
    {!featured && additionalGroups}
    {(!featured || !explore) && feedbackStatus}
    {featured && <DialogContent className="routine-dialog culinary-ideas-dialog"><DialogHeader><DialogTitle>D’autres idées pour ton repas</DialogTitle><DialogDescription>Retrouve les propositions, leurs raisons, les vérifications et tes retours.</DialogDescription></DialogHeader><ul className="culinary-recipe-grid">{ideas.map(recipe=>render(recipe,'idea'))}</ul>{additionalGroups}{feedbackStatus}</DialogContent>}
  </div></Dialog>;
}
