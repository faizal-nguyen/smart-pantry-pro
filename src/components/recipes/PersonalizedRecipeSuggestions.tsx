import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useRoutineMealIdeas } from '@/hooks/useRoutineMealIdeas';
import { postRecipeFeedback,pendingRecipeFeedback,type RecommendedRecipeView,type SuggestRecommendationsInput } from '@/services/recommendationsApi';
import type { RecommendationFeedback } from '@smart/shared';
import { Button } from '@/components/ui/button';
import { dispatchAgentDbChanged } from '@/lib/agentEvents';
const feedbackLabels=[['repeat','À refaire'],['dislike','Je n’aime pas'],['too_long','Trop long'],['not_today','Pas aujourd’hui']] as const;
const criteria:Record<string,string>={ nutrition:'nutrition',variety:'variété',expiry:'date proche',taste:'goûts',time:'durée',equipment:'matériel',skill:'niveau',feedback:'retours',meal_type:'type de repas',light_goal:'objectif léger sans mesure disponible' };
const nutritionSources:Record<string,string>={ manual:'saisie manuelle',openfoodfacts:'Open Food Facts' };
export function RecommendationEvidenceDetails({ recipe }:{ recipe:RecommendedRecipeView }) {
  const { nutrition,availability }=recipe;
  return <details className="text-sm"><summary className="min-h-11 cursor-pointer">Pourquoi cette recette ?</summary><div className="space-y-2 pb-2">
    <ul className="list-disc pl-5 space-y-1">{recipe.reason_codes.map((reason,index)=><li key={`${reason.code}:${index}`}>{reason.text}</li>)}</ul>
    {availability.missing.length>0 && <ul className="space-y-1">{availability.missing.map((item,index)=><li key={index}>À acheter ou vérifier : {item.ingredient_name}{item.quantity!=null ? ` · ${item.quantity} ${item.unit ?? ''}` : ''}.</li>)}</ul>}
    {availability.excluded_lot_reasons?.map(item=><p key={item.id}>{item.message}</p>)}
    {availability.uncertainties.map((text,index)=><p key={index}>{text}</p>)}
    {recipe.constraints.findings.map((finding,index)=><p key={`constraint:${index}`}>{finding.ingredient ? `${finding.ingredient} : ` : ''}{finding.message}</p>)}
    <p>Estimation nutritionnelle : {nutrition.status==='unavailable' ? 'indisponible' : nutrition.status==='partial' ? 'partielle' : 'calculée à partir des données déclarées'} · {nutrition.known_ingredients}/{nutrition.total_ingredients} ingrédients couverts.</p>
    {nutrition.per_serving.energyKcal!=null && <p>Par portion : {nutrition.per_serving.energyKcal} kcal{nutrition.per_serving.proteinG!=null ? ` · ${nutrition.per_serving.proteinG} g de protéines` : ''}{nutrition.per_serving.fiberG!=null ? ` · ${nutrition.per_serving.fiberG} g de fibres` : ''} (estimation).</p>}
    {nutrition.sources.length>0 && <p>Sources : {[...new Set(nutrition.sources.map(source=>`${nutritionSources[source.source] ?? 'source déclarée'}${source.updated_at ? ` (${new Date(source.updated_at).toLocaleDateString('fr-FR')})` : ' (date inconnue)'}`))].join(', ')} · base déclarée pour 100 g.</p>}
    {nutrition.limitations.map((text,index)=><p key={`nutrition:${index}`} className="text-muted-foreground">{text}</p>)}
    {recipe.constraints.limitations.map((text,index)=><p key={`limit:${index}`} className="text-muted-foreground">{text}</p>)}
    {recipe.unavailable_criteria.length>0 && <p className="text-muted-foreground">Critères non calculés : {recipe.unavailable_criteria.map(item=>criteria[item] ?? item).join(', ')}.</p>}
    <p className="text-xs text-muted-foreground">Profil version {recipe.profile_version} · calcul {new Date(recipe.calculated_at).toLocaleTimeString('fr-FR')}.</p>
  </div></details>;
}
export default function PersonalizedRecipeSuggestions({ input={ goal:'tonight' },onAddStock }:{ input?:SuggestRecommendationsInput;onAddStock?:()=>void }) {
  const query=useRoutineMealIdeas(input);
  return <PersonalizedSuggestionsContent key={query.owner ?? 'anonymous'} query={query} onAddStock={onAddStock}/>;
}
function PersonalizedSuggestionsContent({ query,onAddStock }:{ query:ReturnType<typeof useRoutineMealIdeas>;onAddStock?:()=>void }) {
  const client=useQueryClient();
  const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[confirmation,setConfirmation]=useState<string|null>(null);
  let pending=null;
  try { pending=query.owner ? pendingRecipeFeedback(query.owner) : null; } catch { /* Preserve the intent; its replay will show the validation failure. */ }
  const feedback=async(recipe:RecommendedRecipeView,kind:RecommendationFeedback['feedback'])=>{
    if (!query.owner || busy) return;
    setBusy(true);setError(null);setConfirmation(null);
    try {
      await postRecipeFeedback(query.owner,{ recipe:recipe.reference,feedback:kind,event_id:query.data?.event_id ?? null });
      setConfirmation('Retour enregistré. Les idées ont été actualisées.');
      await client.invalidateQueries({ queryKey:['routine-meal-ideas',query.owner] });
      dispatchAgentDbChanged(['recipe_interactions']);
    } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); }
  };
  const ideas=query.data ? [...query.data.cookable_now,...query.data.almost_cookable].sort((a,b)=>b.score_total-a.score_total).slice(0,3) : [];
  const render=(recipe:RecommendedRecipeView,mode:'idea'|'verify'|'excluded')=><li key={`${recipe.reference.source}:${recipe.id}`} className="rounded-xl border bg-card p-4 space-y-2 min-w-0">
    <h3 className="font-semibold break-words">{recipe.name}</h3><p className="text-sm">{recipe.duration_minutes==null ? 'Durée à vérifier' : `${recipe.duration_minutes} min`} · {recipe.servings ?? 'Portions à vérifier'}{recipe.servings ? ' portion(s)' : ''}</p>
    <p className="text-sm">{mode==='excluded' ? 'Écartée des suggestions' : mode==='verify' ? 'À vérifier avant de choisir' : recipe.availability.status==='available' ? 'Quantités et lots renseignés disponibles' : 'Des ingrédients manquent ou restent à vérifier'}</p>
    <RecommendationEvidenceDetails recipe={recipe} /><Button className="min-h-11 w-full" variant={mode==='idea' ? 'default':'outline'} asChild><Link to={`/kitchen/recipes/${recipe.reference.id}`}>Voir la recette</Link></Button>
    {mode==='idea' && <div className="grid grid-cols-2 gap-2" aria-label={`Retour sur ${recipe.name}`}>{feedbackLabels.map(([value,label])=><Button key={value} className="min-h-11 text-xs whitespace-normal" variant="outline" disabled={busy || (!!pending && (pending.recipe.id!==recipe.id || pending.feedback!==value))} onClick={()=>void feedback(recipe,value)}>{label}</Button>)}</div>}
  </li>;
  return <div className="space-y-3">
    <Button className="min-h-11" variant="outline" asChild><Link to="/settings?section=cooking">Modifier mon profil alimentaire</Link></Button>
    {query.isLoading ? <p role="status">Lecture du profil, des recettes et des lots…</p> : query.isError ? <div role="alert" className="rounded-lg border p-4 space-y-2"><p>{query.error?.message ?? 'Les idées ne peuvent pas être vérifiées.'}</p><Button className="min-h-11" variant="outline" onClick={()=>void query.refetch()}>Réessayer les idées</Button></div> : !ideas.length ? <div className="rounded-lg border p-4 space-y-2"><p>Aucune idée suffisamment documentée pour ce contexte. Consultez les recettes à vérifier ou corrigez votre stock et votre profil.</p>{onAddStock && <Button className="min-h-11" variant="outline" onClick={onAddStock}>Ajouter des ingrédients</Button>}<Button className="min-h-11" variant="outline" asChild><Link to="/kitchen/recipes">Parcourir mes recettes</Link></Button></div> : <ul className="grid md:grid-cols-3 gap-3">{ideas.map(recipe=>render(recipe,'idea'))}</ul>}
    {query.data && query.data.verify_suggestions.length>0 && <details open={!ideas.length}><summary className="min-h-11 cursor-pointer">Recettes à vérifier ({query.data.verify_suggestions.length})</summary><ul className="grid md:grid-cols-3 gap-3">{query.data.verify_suggestions.map(recipe=>render(recipe,'verify'))}</ul></details>}
    {query.data && query.data.excluded_suggestions.length>0 && <details><summary className="min-h-11 cursor-pointer">Recettes écartées : voir les raisons</summary><ul className="grid md:grid-cols-3 gap-3">{query.data.excluded_suggestions.map(recipe=>render(recipe,'excluded'))}</ul></details>}
    {pending && <div role="status" className="space-y-2"><p>Un retour reste à confirmer.</p><Button className="min-h-11" variant="outline" disabled={busy} onClick={()=>void feedback({ reference:pending.recipe } as RecommendedRecipeView,pending.feedback)}>Vérifier le retour conservé</Button></div>}
    {error && <p role="alert" className="text-destructive">{error}</p>}{confirmation && <p role="status">{confirmation}</p>}
    <p className="text-xs text-muted-foreground">Les contraintes déclarées passent avant le classement. Les compositions inconnues restent à vérifier, sans garantie sur les traces.</p>
  </div>;
}
