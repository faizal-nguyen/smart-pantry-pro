import type { RecipeEvaluation } from '@smart/shared';
import { Button } from '@/components/ui/button';
import NutritionEstimateView from './NutritionEstimateView';

export default function RecipeEvaluationPanel({ evaluation,loading,refreshing,error,onRetry,validServings }:{
  evaluation?:RecipeEvaluation;loading:boolean;refreshing:boolean;error:Error|null;onRetry:()=>unknown;validServings:boolean;
}) {
  if (!validServings) return <p role="status" className="mb-4 text-sm">Renseigne entre 1 et 100 portions pour vérifier les quantités et la fiche.</p>;
  if (error) return <div role="alert" className="mb-4 rounded-lg border p-4 space-y-2">
    <p>{error.message}</p><p className="text-sm text-muted-foreground">Stock, contraintes et nutrition ne peuvent pas être confirmés pour le moment.</p>
    <Button variant="outline" className="min-h-11" onClick={()=>void onRetry()}>Réessayer la vérification</Button>
  </div>;
  if (loading || refreshing || !evaluation) return <p role="status" className="mb-4 text-sm">Vérification du profil, des ingrédients et des lots…</p>;
  const { constraints,availability }=evaluation;
  const nutritionLabel={ known:'estimation disponible',estimated:'valeurs estimées',partial:'estimation partielle',unavailable:'information indisponible' }[evaluation.nutrition.status];
  return <section className="mb-4 space-y-2 border-y py-3 text-sm" aria-label="Vérification de la recette">
      <p className="font-medium">{availability.status==='available' ? `Quantités renseignées en stock pour ${evaluation.servings} portions.` : availability.status==='missing' ? 'Des ingrédients manquent.' : 'Stock à vérifier.'}</p>
      <ul className="space-y-1">{availability.missing.map((item,index)=><li key={index}>
        À acheter ou vérifier : {item.ingredient_name}{item.quantity!=null ? ` · ${item.quantity.toLocaleString('fr-FR')} ${item.unit ?? ''}` : ' · quantité à vérifier'}.
      </li>)}</ul>
      {availability.uncertainties.map((text,index)=><p key={index}>{text}</p>)}
      {availability.excluded_lot_reasons?.map(reason=><p key={reason.id}>{reason.message}</p>)}
      <p className={constraints.status==='incompatible' ? 'font-medium text-destructive' : ''} role={constraints.status==='incompatible' ? 'alert' : undefined}>
        {constraints.status==='incompatible' ? 'Incompatible avec ton profil alimentaire.' : constraints.status==='verify' ? 'Contraintes à vérifier.' : 'Aucune incompatibilité identifiée dans les informations connues.'}
      </p>
      {constraints.findings.map((finding,index)=><p key={index}>{finding.ingredient ? `${finding.ingredient} : ` : ''}{finding.message}</p>)}
      <details><summary className="min-h-11 cursor-pointer">Nutrition · {nutritionLabel}</summary>
        <NutritionEstimateView nutrition={evaluation.nutrition} />
      </details>
      <details><summary className="min-h-11 cursor-pointer">Détails de la vérification</summary>
        {constraints.limitations.map((text,index)=><p key={index} className="text-muted-foreground">{text}</p>)}
        <p className="text-xs text-muted-foreground">Profil version {evaluation.profile_version} · calcul {new Date(evaluation.calculated_at).toLocaleString('fr-FR')}.</p>
      </details>
  </section>;
}
