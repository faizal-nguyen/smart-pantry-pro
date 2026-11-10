import {z} from 'zod';
import {calendarDate,calendarDaysUntil} from './calendar.js';
import {ingredientMatchRank,normalizeIngredientName} from './quantities.js';
import {conservationReviewRequired} from './stock-conservation.js';
import {produceReview} from './produce-review.js';

export const FOOD_GUIDANCE_VERSION='food-guidance-2026-11-10';
const SourceSchema=z.object({title:z.string(),url:z.string().url().startsWith('https://'),reviewed_on:z.literal('2026-11-10')});
const source=(title:string,url:string)=>({title,url,reviewed_on:'2026-11-10' as const});
export const FOOD_SOURCES={
 vegetables:source('Santé publique France — Fruits, légumes et fibres','https://www.mangerbouger.fr/l-essentiel/les-recommandations-sur-l-alimentation-l-activite-physique-et-la-sedentarite/augmenter/augmenter-les-fruits-et-legumes'),
 pulses:source('Santé publique France — Légumes secs','https://www.mangerbouger.fr/l-essentiel/les-recommandations-sur-l-alimentation-l-activite-physique-et-la-sedentarite/augmenter/augmenter-les-legumes-secs'),
 season:source('Santé publique France — Calendrier de saison','https://www.mangerbouger.fr/manger-mieux/bien-manger-sans-se-ruiner/calendrier-de-saison'),
 water:source('Santé publique France — Repères alimentaires','https://www.mangerbouger.fr/content/show/1597/file/L%E2%80%99essentiel%20des%20recommandations%20alimentaires.pdf'),
 ginger:source('NIH / NCCIH — Gingembre : données et sécurité','https://www.nccih.nih.gov/health/ginger'),
 plants:source('ANSES — Risques des plantes dans les compléments alimentaires','https://www.anses.fr/system/files/NUT2019SA0155.pdf'),
 supplements:source('Santé publique France — Compléments alimentaires','https://www.mangerbouger.fr/manger-mieux/se-faire-plaisir-en-mangeant-equilibre/manger-equilibre-ca-veut-dire-quoi-et-comment-y-arriver/faut-il-consommer-des-complements-alimentaires'),
 pollen:source('ANSES — Pollens et produits de la ruche : risque allergique','https://vigilanses.anses.fr/fr/node/1680'),
 moringa:source('Memorial Sloan Kettering — Moringa oleifera','https://www.mskcc.org/cancer-care/integrative-medicine/herbs/moringa-oleifera'),
 senna:source('EMA — Feuilles de séné','https://www.ema.europa.eu/en/medicines/herbal/sennae-folium'),
 ashwagandha:source('ANSES — Préparations de Withania somnifera','https://www.anses.fr/system/files/NUT2021SA0077_0.pdf'),
 dandelion:source('EMA — Racine de pissenlit','https://www.ema.europa.eu/en/documents/herbal-monograph/final-european-union-herbal-monograph-taraxacum-officinale-fh-wigg-radix_en.pdf'),
};
type Source=ReturnType<typeof source>;
interface FoodReference {
 id:string;label:string;aliases:string[];kind:'food'|'drink'|'plant';
 evidence:'nutrition'|'traditional'|'limited';benefit:string;limits:string;use:string;
 precautions:string[];sources:Source[];months?:number[];group?:'produce'|'pulses';
 daily:boolean;
}
const produce=(id:string,label:string,aliases:string[],months:number[],use:string):FoodReference=>({id,label,aliases,months,kind:'food',group:'produce',evidence:'nutrition',
 benefit:'Un apport de fibres et de variété dans les repas.',limits:'Aucun effet préventif ou thérapeutique propre à cet aliment n’est garanti.',use,precautions:[],sources:[FOOD_SOURCES.vegetables,FOOD_SOURCES.season],daily:true});
const plant=(id:string,label:string,aliases:string[],benefit:string,limits:string,precautions:string[],sources:Source[],evidence:FoodReference['evidence']='limited'):FoodReference=>({id,label,aliases,kind:'plant',evidence,benefit,limits,use:'Vérifier l’espèce, la partie de plante et l’usage alimentaire sur l’emballage avant toute utilisation.',precautions,sources,daily:false});

// Selected produce, cross-checked against each of the twelve official monthly pages.
const PRODUCE_REFERENCES:FoodReference[]=[
 produce("carrot","Carotte",["carotte"],[1,2,3,4,5,6,7,8,9,10,11,12],"Râpée, rôtie ou dans une soupe."),
 produce("broccoli","Brocoli",["brocoli"],[9,10,11],"À la vapeur ou rôti, selon ton goût."),
 produce("endive","Endive",["endive"],[1,2,3,4,10,11,12],"Crue en salade ou braisée."),
 produce("potimarron","Potimarron",["potimarron"],[10,11,12],"Rôti ou dans un velouté."),
 produce("pumpkin","Potiron",["potiron"],[1,9,10,11,12],"En soupe ou rôti."),
 produce("aubergine","Aubergine",["aubergine"],[6,7,8,9],"Rôtie ou mijotée, avec une quantité d’huile adaptée."),
 produce("tomato","Tomate",["tomate"],[6,7,8,9],"En salade ou cuite."),
 produce("courgette","Courgette",["courgette"],[5,6,7,8,9,10],"Poêlée, rôtie ou en soupe."),
 produce("leek","Poireau",["poireau"],[1,2,3,4,9,10,11,12],"En fondue ou en soupe."),
 produce("apple","Pomme",["pomme"],[1,2,3,4,8,9,10,11,12],"Entière, avec la peau si elle convient et après lavage."),
 produce("pear","Poire",["poire"],[1,2,3,8,9,10,11,12],"Entière, en dessert ou en salade."),
 produce("kiwi","Kiwi",["kiwi"],[1,2,3,11,12],"Un fruit entier pour varier les desserts."),
 produce("clementine","Clémentine",["clementine"],[1,2,11,12],"Un fruit entier plutôt qu’un jus."),
 produce("strawberry","Fraise",["fraise"],[5,6,7],"Fraîche après lavage, selon la saison."),
 produce("spinach","Épinard",["epinard"],[1,2,3,4,5,9,10,11,12],"Cuit ou cru selon le produit."),
 produce("cauliflower","Chou-fleur",["chou fleur"],[1,2,3,9,10,11,12],"Rôti, vapeur ou en purée."),
 produce("cucumber","Concombre",["concombre"],[5,6,7,8,9,10],"En salade après lavage."),
 produce("beet","Betterave",["betterave"],[1,2,3,4,10,11,12],"Crue râpée ou cuite."),
 produce("parsnip","Panais",["panais"],[1,2,3,10,11,12],"Rôti ou en soupe."),
 produce("onion","Oignon",["oignon"],[1,2,3,4,9,10,11,12],"Comme base aromatique du repas."),
];

// Curated public references, reviewed on the version date. No inferred medical profile.
export const FOOD_REFERENCES:readonly FoodReference[]=[
 {id:'black-radish',label:'Radis noir',aliases:['radis noir'],kind:'food',group:'produce',evidence:'nutrition',daily:true,
  benefit:'Un légume pour varier les repas et contribuer à l’apport de fibres.',limits:'Pas de promesse « détox », de nettoyage du foie ou de traitement digestif. Aliment, jus concentré et complément ne sont pas équivalents.',use:'En fines lamelles ou râpé ; tu peux aussi le cuire si tu le préfères moins piquant.',precautions:['Adapter la quantité à ta tolérance digestive.'],sources:[FOOD_SOURCES.vegetables,FOOD_SOURCES.supplements]},
 ...PRODUCE_REFERENCES,
 ...[['lentils','Lentilles',['lentilles','lentille']],['chickpeas','Pois chiches',['pois chiches','pois chiche']],['beans','Haricots secs',['haricots rouges','haricots blancs']],['urid','Urid dal',['urid dal','urad dal']],['split-beans','Févettes',['fevettes','fevette']]].map(([id,label,aliases]):FoodReference=>({id:id as string,label:label as string,aliases:aliases as string[],kind:'food',group:'pulses',evidence:'nutrition',daily:true,benefit:'Des fibres et des protéines végétales pour diversifier les repas.',limits:'Les repères portent sur l’alimentation habituelle, pas sur un effet médical immédiat.',use:'Bien cuire selon le produit ; augmenter progressivement si tu en manges peu.',precautions:[],sources:[FOOD_SOURCES.pulses]})),
 {id:'ginger',label:'Gingembre frais',aliases:['gingembre'],kind:'drink',evidence:'limited',daily:true,
  benefit:'Une boisson non sucrée peut participer à l’hydratation ; le gingembre apporte surtout sa saveur.',limits:'Les études sur certaines nausées ne démontrent pas l’efficacité d’une infusion maison et ne justifient pas une cure pour tous.',use:'Quelques fines lamelles dans de l’eau chaude, selon ton goût, sans dose thérapeutique.',precautions:['Éviter si cela provoque des brûlures digestives. Pour un complément ou un usage médicinal, demander conseil en cas de traitement ou de grossesse.'],sources:[FOOD_SOURCES.water,FOOD_SOURCES.ginger]},
 {id:'ginger-powder',label:'Gingembre en poudre',aliases:['gingembre'],kind:'food',evidence:'limited',daily:false,
  benefit:'Une épice pour varier les saveurs.',limits:'Une pincée culinaire n’équivaut pas aux préparations étudiées pour les nausées.',use:'Comme épice, selon le goût.',precautions:[],sources:[FOOD_SOURCES.ginger]},
 plant('damask-rose','Rose de Damas',['rose de damas'],'Un usage parfumant et une boisson de plaisir, si les pétales sont destinés à l’alimentation.','Aucun bénéfice thérapeutique spécifique retenu pour justifier une prise quotidienne.',['Ne pas utiliser des fleurs décoratives ou un produit cosmétique en tisane.'],[FOOD_SOURCES.supplements]),
 plant('moringa','Moringa — feuilles ou poudre',['moringa'],'Les feuilles sont utilisées comme aliment ; la composition dépend de la forme et du produit.','Les études humaines restent limitées : pas de promesse sur la glycémie, le cholestérol ou l’immunité. Une infusion n’a pas la composition de la poudre.',['Pas de routine automatique. Avis professionnel en cas de grossesse, allaitement ou traitements ; ne pas extrapoler aux racines ou aux extraits.'],[FOOD_SOURCES.moringa]),
 plant('pollen','Pollen d’abeilles',['pollen d abeille','pollen d abeilles'],'Un produit de la ruche ; ce n’est pas une tisane.','Pas de recommandation quotidienne pour « renforcer les défenses » sans indication établie.',['Risque de réaction allergique, parfois grave. Éviter notamment en cas d’allergie aux pollens ou de prédisposition allergique/asthme.'],[FOOD_SOURCES.pollen]),
 plant('cornflower','Bleuet — pétales',['bleuet petales','petales de bleuet'],'Des pétales éventuellement aromatiques, si le produit porte un usage alimentaire.','Ne pas leur attribuer les propriétés du fruit appelé bleuet au Canada, ni un effet prouvé sur la vue.',['L’usage cosmétique ou oculaire n’autorise pas l’ingestion. Vérifier qu’il s’agit bien de pétales de Centaurea cyanus destinés à l’alimentation.'],[FOOD_SOURCES.supplements]),
 plant('hibiscus','Hibiscus',['hibiscus'],'Une boisson acidulée non sucrée, si la plante est vendue pour infusion.','Les résultats sur certains extraits ne sont pas une prescription pour une tisane maison.',['Vérifier le produit et demander conseil pour un usage répété sous traitement, pendant la grossesse ou l’allaitement.'],[FOOD_SOURCES.water,FOOD_SOURCES.plants]),
 plant('senna','Feuilles de séné',['feuilles de sene','sene'],'Un laxatif stimulant à usage médicinal contre la constipation occasionnelle.','Pas une tisane quotidienne ni un produit « détox ». L’usage prolongé peut causer des troubles hydro-électrolytiques.',['Ne pas en faire une routine. Demander conseil à un pharmacien ; respecter les restrictions de la notice, notamment enfant, grossesse et allaitement.'],[FOOD_SOURCES.senna],'traditional'),
 plant('ashwagandha','Ashwagandha',['ashwagandha','ashwagandha d inde'],'Une plante utilisée traditionnellement, qui demande une évaluation du produit et de la situation.','Le caractère naturel ne garantit pas la sécurité ; les données ne permettent pas une routine universelle.',['L’ANSES identifie des risques et des populations sensibles. Avis professionnel avant usage, notamment en cas de grossesse, allaitement, maladie ou traitement.'],[FOOD_SOURCES.ashwagandha]),
 plant('dandelion','Pissenlit — racine',['pissenlit racine','racine de pissenlit'],'Usage traditionnel pour certains troubles digestifs mineurs.','Un usage traditionnel n’est pas une preuve clinique d’efficacité et ne signifie pas « nettoyer le foie ».',['Avis professionnel, notamment en cas de calculs ou maladie des voies biliaires, de grossesse ou d’allaitement.'],[FOOD_SOURCES.dandelion],'traditional'),
 plant('jericho','Rose de Jéricho',['rose de jericho'],'Aucun bénéfice alimentaire ou médical retenu ici.','L’identité botanique et la sécurité d’ingestion ne sont pas établies par le nom commercial.',['Ne pas proposer d’ingestion ni de cure automatique, notamment pour la grossesse ou la fertilité.'],[FOOD_SOURCES.supplements]),
];

const FactSchema=z.object({
 id:z.string(),knowledge_id:z.string(),name:z.string(),kind:z.enum(['food','drink','plant']),evidence:z.enum(['nutrition','traditional','limited']),
 benefit:z.string(),limits:z.string(),use:z.string(),precautions:z.array(z.string()),sources:z.array(SourceSchema),
 quantity:z.number(),unit:z.string().nullable(),stock_state:z.enum(['present','review','past_date']),checks:z.array(z.string()),
 season:z.enum(['in_season','out_of_season','not_documented']),season_months:z.array(z.number().int().min(1).max(12)),
});
export const FoodGuidanceSchema=z.object({
 version:z.literal(FOOD_GUIDANCE_VERSION),date:z.string(),reference_region:z.literal('France métropolitaine'),season:z.string(),
 inventory_complete:z.boolean(),facts_complete:z.boolean(),facts:z.array(FactSchema),daily_foods:z.array(FactSchema).max(2),daily_drink:FactSchema.nullable(),
 seasonal_calendar:z.array(z.object({name:z.string(),months:z.array(z.number().int().min(1).max(12))})),season_source:SourceSchema,
 seasonal_in_stock:z.array(FactSchema),seasonal_ideas:z.array(z.object({name:z.string(),source:SourceSchema})),uncovered_product_count:z.number(),
});
export type FoodGuidance=z.infer<typeof FoodGuidanceSchema>;
export type FoodFact=z.infer<typeof FactSchema>;
export interface FoodGuidanceLot {id:string;product_id:string;product_name:string;quantity:number;unit?:string|null;expiry_date?:string|null;quantity_quality?:string|null;date_kind?:string|null;notes?:string|null;location?:string|null;created_at?:string|null;updated_at?:string|null}

/** Matches actual product forms; ginger paste, capsules and rose-branded food are not herbal teas. */
function referenceFor(name:string):FoodReference|undefined {
 const normalized=normalizeIngredientName(name);
 if(/\b(pate|sauce|sirop|extrait|gelule|capsule|comprime|jus|confiture|compote|huile)\b/.test(normalized))return undefined;
 return FOOD_REFERENCES.find(ref=>{
  if(ref.id==='ginger'&&/poudre|moulu/.test(normalized))return false;
  if(ref.id==='ginger-powder'&&!/poudre|moulu/.test(normalized))return false;
  return ref.aliases.some(alias=>ingredientMatchRank(alias,name)>0);
 });
}

/** Pure read model shared by the API and isolated UI fixtures. No ingestion schedule or stock write. */
export function buildFoodGuidance(lots:readonly FoodGuidanceLot[],options:{now?:Date;dailyExcludedIds?:ReadonlySet<string>;focus?:string}={}):FoodGuidance {
 const now=options.now??new Date(),date=calendarDate(now)!;if(!date)throw new Error('Invalid guidance date');
 const month=Number(date.slice(5,7)),season=['Hiver','Hiver','Printemps','Printemps','Printemps','Été','Été','Été','Automne','Automne','Automne','Hiver'][month-1];
 const matched=lots.filter(l=>l.quantity>0).flatMap(lot=>{
  const ref=referenceFor(lot.product_name);if(!ref)return [];
  const checks:string[]=[];const days=calendarDaysUntil(lot.expiry_date,now);
  const review=conservationReviewRequired(lot.notes)||!!produceReview({...lot,product:{name:lot.product_name}},now);
  if(days!==null&&days<0)checks.push('Date dépassée : vérifier ce lot avant toute utilisation.');
  if(review)checks.push('Conservation ou présence de ce lot à vérifier.');
  if(!lot.expiry_date)checks.push('Date non renseignée : vérifier l’état et l’emballage.');
  if(lot.quantity_quality==='unknown'||lot.quantity_quality==='estimated')checks.push('Quantité déclarée ou estimée, sans garantie de portion disponible.');
  const fact:FoodFact={id:lot.id,knowledge_id:ref.id,name:lot.product_name,kind:ref.kind,evidence:ref.evidence,benefit:ref.benefit,limits:ref.limits,use:ref.use,precautions:ref.precautions,sources:ref.sources,quantity:lot.quantity,unit:lot.unit??null,
   season_months:ref.months&&ref.aliases.some(alias=>ingredientMatchRank(alias,lot.product_name)===1)?ref.months:[],
   stock_state:days!==null&&days<0?'past_date':review?'review':'present',checks,season:ref.months?.length&&ref.aliases.some(alias=>ingredientMatchRank(alias,lot.product_name)===1)?(ref.months.includes(month)?'in_season':'out_of_season'):'not_documented'};
  return [{fact,ref}];
 });
 const eligible=matched.filter(({fact,ref})=>ref.daily&&fact.stock_state==='present'&&!options.dailyExcludedIds?.has(fact.id)).filter((row,index,all)=>all.findIndex(other=>other.ref.id===row.ref.id)===index);
 const day=Math.floor(Date.parse(date+'T00:00:00Z')/86400000);
 const ordered=(rows:typeof matched)=>[...rows].sort((a,b)=>a.fact.name.localeCompare(b.fact.name,'fr')||a.fact.id.localeCompare(b.fact.id));
 const rotate=(rows:typeof matched)=>{const sorted=ordered(rows);return sorted.length?[...sorted.slice(day%sorted.length),...sorted.slice(0,day%sorted.length)]:[];};
 const produce=eligible.filter(r=>r.ref.group==='produce'),seasonal=produce.filter(r=>r.fact.season==='in_season');
 const first=rotate(seasonal.length?seasonal:produce)[0];
 const second=rotate(eligible.filter(r=>r.ref.group==='pulses'))[0]??rotate(produce.filter(r=>r!==first))[0];
 const daily=[first,second].flatMap(r=>r?[r.fact]:[]);
 const focus=normalizeIngredientName(options.focus??'');
 const facts=[...matched].sort((a,b)=>Number(focus&&normalizeIngredientName(b.fact.name).includes(focus))-Number(focus&&normalizeIngredientName(a.fact.name).includes(focus))||Number(b.fact.kind==='plant')-Number(a.fact.kind==='plant')||a.fact.name.localeCompare(b.fact.name,'fr')).map(r=>r.fact);
 const present=new Set(matched.map(r=>r.ref.id));
 const ideas=FOOD_REFERENCES.filter(r=>r.group==='produce'&&r.months?.includes(month)&&!present.has(r.id)).slice(0,3).map(r=>({name:r.label,source:FOOD_SOURCES.season}));
 return FoodGuidanceSchema.parse({version:FOOD_GUIDANCE_VERSION,date,reference_region:'France métropolitaine',season,seasonal_calendar:PRODUCE_REFERENCES.map(r=>({name:r.label,months:r.months})),season_source:FOOD_SOURCES.season,inventory_complete:true,facts_complete:facts.length<=100,facts:facts.slice(0,100),daily_foods:daily,daily_drink:rotate(eligible.filter(r=>r.ref.kind==='drink'))[0]?.fact??null,seasonal_in_stock:ordered(seasonal).map(r=>r.fact),seasonal_ideas:ideas,uncovered_product_count:lots.filter(l=>l.quantity>0&&!referenceFor(l.product_name)).length});
}
