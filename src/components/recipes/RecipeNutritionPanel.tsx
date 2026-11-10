import type {NutritionEstimate} from '@smart/shared';
import {Button} from '@/components/ui/button';
import NutritionEstimateView from './NutritionEstimateView';

/** Nutrition is visible on the recipe, independent of the stock accordion. */
export default function RecipeNutritionPanel({nutrition,loading,error,onRetry,validServings}:{
 nutrition?:NutritionEstimate;loading:boolean;error:Error|null;onRetry:()=>unknown;validServings:boolean;
}) {
 return <section aria-labelledby="recipe-nutrition-title" className="my-4 space-y-3 rounded-lg border p-4">
  <h2 id="recipe-nutrition-title" className="text-lg font-semibold">Valeurs nutritionnelles</h2>
  {!validServings ? <p className="text-sm">Choisis entre 1 et 100 portions pour afficher l’estimation.</p>
   : error ? <div role="alert" className="space-y-2 text-sm"><p>L’estimation nutritionnelle n’a pas pu être relue.</p><Button variant="outline" onClick={()=>void onRetry()}>Réessayer la nutrition</Button></div>
   : loading || !nutrition ? <p role="status" className="text-sm">Chargement des valeurs nutritionnelles…</p>
   : <NutritionEstimateView nutrition={nutrition}/>}
 </section>;
}
