import {MACRO_NUTRIENTS,MICRO_NUTRIENTS,type NutritionEstimate} from '@smart/shared';

const sources:Record<string,string>={ manual:'saisie manuelle',openfoodfacts:'Open Food Facts',estimated:'estimation déclarée',ciqual2020:'Anses — Ciqual 2020' };
const states:Record<NutritionEstimate['status'],string>={
  known:'calculée à partir des données déclarées',estimated:'calculée à partir de valeurs estimées',partial:'partielle',unavailable:'indisponible',
};
export default function NutritionEstimateView({ nutrition,showDetails=true }:{ nutrition:NutritionEstimate;showDetails?:boolean }) {
  const nutrients=(fields:readonly {key:keyof NutritionEstimate['per_serving'];label:string;unit:string}[])=><dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">{fields.map(({key,label,unit})=><div key={key}>
    <dt className="text-muted-foreground">{label}</dt><dd>{nutrition.per_serving[key]==null ? 'Non renseigné' : `${nutrition.upper_bounds?.includes(key) ? '< ' : ''}${(nutrition.upper_bounds?.includes(key) ? Math.ceil(nutrition.per_serving[key]!*10000)/10000 : nutrition.per_serving[key]!).toLocaleString('fr-FR',{maximumFractionDigits:nutrition.upper_bounds?.includes(key) ? 4 : 2})} ${unit}`}</dd>
  </div>)}</dl>;
  const details=<div className="space-y-2">
    {nutrition.sources.length>0 && <p>Sources : {[...new Set(nutrition.sources.map(source=>{
      const date=source.updated_at ? new Date(source.updated_at) : null;
      return `${sources[source.source] ?? 'source déclarée'}${date && Number.isFinite(date.getTime()) ? ` (${date.toLocaleDateString('fr-FR')})` : ' (date inconnue)'}`;
    }))].join(', ')} · base déclarée pour 100 g.</p>}
    {[...new Set(nutrition.sources.map(source=>source.url).filter((url):url is string=>!!url?.startsWith('https://')))].map(url=><a key={url} className="inline-flex min-h-11 items-center underline" href={url} target="_blank" rel="noopener noreferrer">Consulter la référence nutritionnelle</a>)}
    {nutrition.limitations.map((text,index)=><p key={index} className="text-muted-foreground">{text}</p>)}
  </div>;
  return <div className="space-y-2 text-sm">
    <p>Estimation nutritionnelle : {states[nutrition.status]} · {nutrition.known_ingredients}/{nutrition.total_ingredients} ingrédients couverts.</p>
    <p className="text-muted-foreground">Par portion (estimation)</p>
    {nutrients(MACRO_NUTRIENTS)}
    <details><summary className="min-h-11 cursor-pointer">Vitamines et minéraux</summary><p className="mb-2 text-muted-foreground">Les pertes à la cuisson ne sont pas mesurées ; ces valeurs restent des estimations.</p>{nutrients(MICRO_NUTRIENTS)}</details>
    {showDetails ? <details><summary className="min-h-11 cursor-pointer">Sources et limites</summary>{details}</details> : details}
  </div>;
}
