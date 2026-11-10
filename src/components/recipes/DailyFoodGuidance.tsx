import type {FoodFact} from '@smart/shared';
import {useFoodGuidance} from '@/hooks/useFoodGuidance';
import {useAskAssistant} from '@/hooks/useAskAssistant';
import {Button} from '@/components/ui/button';
import {Link} from 'react-router-dom';

const evidence={nutrition:'Repère nutritionnel',traditional:'Usage traditionnel',limited:'Preuves limitées'};
function FactDetails({fact}:{fact:FoodFact}){
 return <div className="space-y-2 text-sm"><p>{fact.benefit}</p><p>{fact.use}</p><p className="text-muted-foreground">{fact.limits}</p>
  {fact.precautions.length>0&&<ul className="list-disc pl-5">{fact.precautions.map(p=><li key={p}>{p}</li>)}</ul>}
  {fact.checks.length>0&&<p className="text-muted-foreground">{fact.checks.join(' ')}</p>}
  <p className="text-xs text-muted-foreground">{evidence[fact.evidence]} · références revues le 10/11/2026</p>
  <ul>{fact.sources.map(s=><li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="kitchen-inline-link">{s.title}</a></li>)}</ul>
 </div>;
}
export default function DailyFoodGuidance({now}:{now:Date}){
 const query=useFoodGuidance(now),ask=useAskAssistant();
 if(query.isLoading)return <section className="kitchen-food-guidance" aria-label="Mieux manger aujourd’hui"><p role="status">Lecture du stock pour les conseils du jour…</p></section>;
 if(query.error||!query.data)return <section className="kitchen-food-guidance"><h2 className="kitchen-section-title">Mieux manger aujourd’hui</h2><p role="alert">{query.error?.message??'Les conseils liés à ton stock sont indisponibles.'}</p><Button variant="outline" onClick={()=>void query.refetch()}>Réessayer les conseils</Button></section>;
 const data=query.data,plants=data.facts.filter(f=>f.kind==='plant');
 return <section className="kitchen-food-guidance" aria-labelledby="food-guidance-title">
  <div><h2 id="food-guidance-title" className="kitchen-section-title">Mieux manger aujourd’hui</h2><p className="mt-2 text-sm text-muted-foreground">{data.season} · {data.reference_region} · idées alimentaires pour adultes, selon ton stock.</p></div>
  <div className="kitchen-food-guidance-grid">
   <div className="kitchen-food-guidance-card"><h3 className="font-semibold">À mettre au menu</h3>
    {data.daily_foods.length?<ul className="space-y-4">{data.daily_foods.map(f=><li key={f.id}><h4 className="font-medium">{f.name}{f.season==='in_season'?' · de saison':''}</h4><p className="mt-1 text-sm">{f.use}</p><p className="mt-1 text-sm text-muted-foreground">{f.benefit}</p><details><summary className="cursor-pointer text-sm">Pourquoi et sources</summary><FactDetails fact={f}/></details><Button variant="link" className="whitespace-normal h-auto px-0 text-left" onClick={()=>ask(`Trouve des recettes avec ${f.name}, adaptées à mon stock, et donne de vrais liens vers des recettes de qualité.`)}>Trouver une recette avec {f.name}</Button></li>)}</ul>:<p className="text-sm">Aucune idée alimentaire ne peut être validée avec les lots et contraintes connus. Vérifie ton stock et ton profil.</p>}
   </div>
   <div className="kitchen-food-guidance-card"><h3 className="font-semibold">Une pause boisson, si tu en as envie</h3>
    {data.daily_drink?<><h4 className="font-medium">{data.daily_drink.name}</h4><p className="text-sm">{data.daily_drink.use}</p><p className="text-sm text-muted-foreground">{data.daily_drink.benefit}</p><details><summary className="cursor-pointer text-sm">Précautions et sources</summary><FactDetails fact={data.daily_drink}/></details></>:<p className="text-sm">L’eau reste la boisson de référence. Aucune infusion alimentaire ne peut être suggérée automatiquement avec les lots connus.</p>}
    <p className="text-sm text-muted-foreground">Une suggestion de plaisir et d’hydratation, sans cure ni prise obligatoire.</p>
   </div>
  </div>
  <details><summary className="cursor-pointer">De saison : dans ton stock et à découvrir</summary><div className="space-y-3 pb-3 text-sm">
   <p><span className="font-medium">Déjà en stock :</span> {data.seasonal_in_stock.length?data.seasonal_in_stock.map(f=>f.name).join(', '):'Aucun aliment de saison documenté parmi les lots proposés.'}</p>
   <p><span className="font-medium">À découvrir, hors de ton stock :</span> {data.seasonal_ideas.length?data.seasonal_ideas.map(f=>f.name).join(', '):'Aucune idée supplémentaire dans le calendrier documenté.'}</p>
   {data.seasonal_ideas[0]&&<a className="kitchen-inline-link" href={data.seasonal_ideas[0].source.url} target="_blank" rel="noopener noreferrer">Voir le calendrier de saison</a>}
   <p className="text-muted-foreground">Repères indicatifs : origine et disponibilité peuvent varier. Un aliment surgelé ou en conserve peut aussi contribuer à une alimentation variée.</p>
  </div></details>
  {plants.length>0&&<details><summary className="cursor-pointer">Tes plantes, tisanes et pollen : usages et précautions ({plants.length})</summary><div className="space-y-3 pb-3"><p className="text-sm">Ces produits ne sont pas ajoutés à une rotation quotidienne. L’usage alimentaire, la forme et les précautions comptent.</p>{plants.map(f=><details key={f.id} className="kitchen-food-plant"><summary className="cursor-pointer">{f.name}{f.stock_state!=='present'?' · lot à vérifier':''}</summary><FactDetails fact={f}/></details>)}</div></details>}
  <p className="text-xs text-muted-foreground">Vérifie fraîcheur, quantité et emballage avant de préparer.</p>
  <Button className="whitespace-normal h-auto" variant="outline" onClick={()=>ask('Parmi les aliments, plantes, tisanes et pollen de mon stock, lesquels puis-je utiliser, pourquoi, avec quelles preuves et précautions ? Cite tes sources et ne propose pas une cure quotidienne de chaque plante.')}>Comprendre les bienfaits de mon stock</Button>
  <Link className="kitchen-inline-link" to="/settings?section=cooking">Mon profil alimentaire</Link>
 </section>;
}
