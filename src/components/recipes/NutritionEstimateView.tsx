import type { NutritionEstimate } from '@smart/shared';

const sources:Record<string,string>={ manual:'saisie manuelle',openfoodfacts:'Open Food Facts',estimated:'estimation déclarée' };
const states:Record<NutritionEstimate['status'],string>={
  known:'calculée à partir des données déclarées',estimated:'calculée à partir de valeurs estimées',partial:'partielle',unavailable:'indisponible',
};
export default function NutritionEstimateView({ nutrition,showDetails=true }:{ nutrition:NutritionEstimate;showDetails?:boolean }) {
  const details=<div className="space-y-2">
    {nutrition.sources.length>0 && <p>Sources : {[...new Set(nutrition.sources.map(source=>{
      const date=source.updated_at ? new Date(source.updated_at) : null;
      return `${sources[source.source] ?? 'source déclarée'}${date && Number.isFinite(date.getTime()) ? ` (${date.toLocaleDateString('fr-FR')})` : ' (date inconnue)'}`;
    }))].join(', ')} · base déclarée pour 100 g.</p>}
    {nutrition.limitations.map((text,index)=><p key={index} className="text-muted-foreground">{text}</p>)}
  </div>;
  return <div className="space-y-2 text-sm">
    <p>Estimation nutritionnelle : {states[nutrition.status]} · {nutrition.known_ingredients}/{nutrition.total_ingredients} ingrédients couverts.</p>
    <p className="text-muted-foreground">Par portion (estimation)</p>
    <dl className="grid grid-cols-3 gap-2">
      {([['energyKcal','Énergie','kcal'],['proteinG','Protéines','g'],['fiberG','Fibres','g']] as const).map(([key,label,unit])=><div key={key}>
        <dt className="text-muted-foreground">{label}</dt><dd>{nutrition.per_serving[key]==null ? 'Non renseigné' : `${nutrition.per_serving[key]!.toLocaleString('fr-FR',{ maximumFractionDigits:2 })} ${unit}`}</dd>
      </div>)}
    </dl>
    {showDetails ? <details><summary className="min-h-11 cursor-pointer">Sources et limites</summary>{details}</details> : details}
  </div>;
}
