import { allocateRecipeStock,calendarDaysUntil,convertQuantity,ingredientMatchRank,normalizeIngredientName,type ConstraintEvaluation,type NutritionEstimate,type NutritionProfileSettings,type StockLot } from '@smart/shared';
import { RecipePolicySanitizer } from '../recipeQuality/RecipePolicySanitizer.js';
import type { RecipeWithIngredients } from './types.js';
import {NUTRIENTS,recipeNutritionSignature,SourcedRecipeNutritionSchema,type NutrientKey} from '@smart/shared';

export interface IngredientProduct {
  id:string;name:string;nutrition_json?:{ source?:string;per100g?:Partial<Record<NutrientKey,number>>;rawFieldVersion?:number };
  allergens_json?:{ source?:string;allergensTags?:string[];tracesTags?:string[];complete?:boolean };
  off_last_synced_at?:string|null;updated_at?:string|null;enrichment_status?:string;
}
export type QualifiedLot = StockLot & { date_kind?:'use_by'|'best_before'|'unknown';quantity_quality?:'measured'|'estimated'|'unknown';location?:string|null };
const norm = (text:string) => normalizeIngredientName(text).replace(/œ/g,'oe').replace(/[_-]/g,' ');
const contains = (text:string,term:string) => (` ${norm(text)} `).includes(` ${norm(term)} `);
// Ingredient identities stay separate from allergen families: excluding butter
// does not silently turn into excluding every dairy ingredient.
const ingredientAliases=[
  ['lait','milk'],['beurre','butter'],['creme','cream'],['fromage','cheese'],['yaourt','yogurt'],
  ['oeuf','oeufs','egg','eggs'],['riz','rice'],['farine','flour'],['ble','wheat'],
  ['pomme de terre','pommes de terre','potato','potatoes'],['poulet','chicken'],['boeuf','beef'],['porc','pork'],
  ['saumon','salmon'],['thon','tuna'],['crevette','crevettes','shrimp','prawn'],
  ['tomate','tomates','tomato','tomatoes'],['carotte','carottes','carrot','carrots'],['courgette','courgettes','zucchini'],
  ['brocoli','broccoli'],['epinard','epinards','spinach'],['oignon','oignons','onion','onions'],['ail','garlic'],
  ['celeri','celery'],['concombre','cucumber'],['champignon','champignons','mushroom','mushrooms'],
  ['arachide','arachides','cacahuete','peanut','peanuts'],['soja','soy'],['sesame','sesame seeds'],
];
const aliasesFor=(name:string)=>ingredientAliases.find(group=>group.some(alias=>norm(alias)===norm(name))) ?? [name];

// Explicit, versioned aliases of single foods, not a fuzzy resolver or a certification.
// Unknown preparations stay unknown. Positive allergens in supplier metadata always prevail.
const foods:Array<{ aliases:string[];allergens:string[];animal?:boolean;vegetable?:boolean }> = [
  { aliases:['lait','milk','beurre','butter','creme','cream','fromage','cheese','yaourt','yogurt','ghee','paneer'],allergens:['milk'],animal:true },
  { aliases:['oeuf','oeufs','egg','eggs'],allergens:['eggs'],animal:true },
  { aliases:['ble','wheat','farine','flour','farine de ble','wheat flour','orge','barley','seigle','rye','pain','bread','pates','pasta','spaghetti','semoule','couscous'],allergens:['gluten'] },
  { aliases:['arachide','arachides','cacahuete','peanut','peanuts'],allergens:['peanuts'] },
  { aliases:['amande','amandes','almond','noix','walnut','noisette','hazelnut','cajou','cashew','pistache','pistachio'],allergens:['nuts'] },
  { aliases:['soja','soy','tofu'],allergens:['soy'] },
  { aliases:['sesame','tahini'],allergens:['sesame'] },
  { aliases:['saumon','salmon','thon','tuna','poisson','fish','cabillaud','cod','anchois','anchovy'],allergens:['fish'],animal:true },
  { aliases:['crevette','crevettes','shrimp','prawn','crabe','crab','homard','lobster'],allergens:['crustaceans'],animal:true },
  { aliases:['moule','moules','mussel','huitre','oyster','calamar','squid'],allergens:['molluscs'],animal:true },
  { aliases:['celeri','celery'],allergens:['celery'],vegetable:true },
  { aliases:['moutarde','mustard'],allergens:['mustard'] },
  { aliases:['lupin','lupins'],allergens:['lupin'] },
  { aliases:['poulet','chicken','boeuf','beef','porc','pork','agneau','lamb','dinde','turkey','canard','duck','jambon','ham'],allergens:[],animal:true },
  { aliases:['riz','rice','pomme de terre','pommes de terre','potato','potatoes','quinoa','lentilles','lentil','pois chiches','chickpea','haricot','haricots','bean','sel','salt','eau','water','sucre','sugar','huile olive','huile d’olive','huile d olive','olive oil'],allergens:[] },
  { aliases:['tomate','tomates','tomato','tomatoes','carotte','carottes','carrot','courgette','zucchini','brocoli','broccoli','epinard','epinards','spinach','oignon','oignons','onion','ail','garlic','poivron','pepper','concombre','cucumber','champignon','mushroom'],allergens:[],vegetable:true },
  { aliases:['pomme','apple','banane','banana','citron','lemon','orange','poire','pear','fraise','strawberry'],allergens:[] },
];
const allergyAliases:Record<string,string> = { lait:'milk',dairy:'milk',milk:'milk',lactose:'milk',oeuf:'eggs',oeufs:'eggs',eggs:'eggs',egg:'eggs',ble:'gluten',wheat:'gluten',gluten:'gluten',arachides:'peanuts',arachide:'peanuts',peanut:'peanuts',peanuts:'peanuts','fruits a coque':'nuts',nuts:'nuts',soja:'soy',soy:'soy',sesame:'sesame',poisson:'fish',fish:'fish',crustaces:'crustaceans',shellfish:'crustaceans',crustaceans:'crustaceans',mollusques:'molluscs',molluscs:'molluscs',celeri:'celery',celery:'celery',moutarde:'mustard',mustard:'mustard',lupin:'lupin',sulfites:'sulphites',sulphites:'sulphites' };
const supplierAllergen = (tag:string) => allergyAliases[norm(tag.replace(/^[a-z]{2}:/,''))] ?? norm(tag.replace(/^[a-z]{2}:/,''));
function facts(name:string) { return foods.find(food => food.aliases.some(alias => norm(alias)===norm(name))); }
const compoundNames=['pain','bread','pates','pasta','spaghetti','couscous','fromage','cheese','yaourt','yogurt','moutarde','mustard','tofu','tahini'];
/** Whether excluding a term means something: a known food, or words of one of these
 * recipes' ingredients under the same alias matching as evaluateConstraints. */
export function namesIngredient(term:string,recipes:RecipeWithIngredients[]):boolean {
  return !!facts(term) || ingredientAliases.some(group=>group.some(alias=>norm(alias)===norm(term))) ||
    recipes.some(recipe=>(recipe.recipe_ingredients ?? []).some(item=>aliasesFor(term).some(alias=>contains(item.ingredient_name ?? '',alias))));
}
export function normalizeEquipment(name:string) {
  const value=norm(name);
  return ({ four:'oven',oven:'oven',plaque:'stove','plaque de cuisson':'stove',stove:'stove',mixeur:'blender',blender:'blender','micro ondes':'microwave',microwave:'microwave',poele:'pan',pan:'pan',casserole:'pot',pot:'pot' } as Record<string,string>)[value] ?? value;
}
export function vegetableCriterion(recipe:RecipeWithIngredients) {
  const names=[...new Set((recipe.recipe_ingredients ?? []).filter(item=>facts(item.ingredient_name)?.vegetable).map(item=>norm(item.ingredient_name)))];
  return { score:Math.min(1,names.length/3),names };
}
export function evaluateConstraints(recipe:RecipeWithIngredients,profile:NutritionProfileSettings,products:Map<string,IngredientProduct>):ConstraintEvaluation {
  const findings:ConstraintEvaluation['findings']=[];
  let incompatible=false,unknown=false;
  const add=(code:string,ingredient:string|null,message:string,banned=false) => { findings.push({ code,ingredient,message }); if (banned) incompatible=true;else unknown=true; };
  const ingredients=recipe.recipe_ingredients ?? [];
  if (!ingredients.length) add('INGREDIENTS_MISSING',null,'Liste d’ingrédients absente.');
  const restrictions=profile.allergies.length+profile.excludedIngredients.length+profile.diets.length>0;
  for (const ingredient of ingredients) {
    const name=ingredient.ingredient_name?.trim() ?? '';
    const product=ingredient.inventory_product_id ? products.get(ingredient.inventory_product_id) : undefined;
    const food=facts(name);
    const envelope=product?.allergens_json;
    const supplierKnown=['manual','openfoodfacts'].includes(envelope?.source ?? '');
    const declared=supplierKnown ? [...(envelope?.allergensTags ?? []),...(envelope?.tracesTags ?? [])].map(supplierAllergen) : [];
    for (const allergy of profile.allergies) {
      const code=allergyAliases[norm(allergy)];
      const named=code ? foods.some(value => value.allergens.includes(code) && value.aliases.some(alias => contains(name,alias))) : contains(name,allergy);
      if (named || (code && (food?.allergens.includes(code) || declared.includes(code)))) add('DECLARED_ALLERGY',name,'Un ingrédient ou une trace signalée est exclu par votre profil.',true);
    }
    for (const excluded of profile.excludedIngredients) if (aliasesFor(excluded).some(alias=>contains(name,alias))) add('EXCLUDED_INGREDIENT',name,'Cet ingrédient est explicitement exclu.',true);
    for (const diet of profile.diets) {
      if (diet==='halal' || diet==='kosher') { add('CERTIFICATION_UNKNOWN',name,'La conformité demandée n’est pas documentée.');continue; }
      if ((diet==='vegan' || diet==='vegetarian') && food?.animal) {
        if (diet==='vegan' || !['milk','eggs'].some(allergen=>food.allergens.includes(allergen))) add('DIET_INCOMPATIBLE',name,'Cet ingrédient ne correspond pas au régime déclaré.',true);
      }
      if (diet==='vegan' && contains(name,'miel')) add('DIET_INCOMPATIBLE',name,'Cet ingrédient ne correspond pas au régime déclaré.',true);
      if (diet==='gluten_free' && (food?.allergens.includes('gluten') || declared.includes('gluten'))) add('DIET_INCOMPATIBLE',name,'Présence de gluten signalée.',true);
      if (diet==='lactose_free' && (food?.allergens.includes('milk') || declared.includes('milk'))) add('DIET_INCOMPATIBLE',name,'L’absence de lactose n’est pas établie pour cet ingrédient.',true);
    }
    if (restrictions && (!name || ((!food || compoundNames.includes(norm(name))) && !(supplierKnown && envelope?.complete===true)))) add('INGREDIENT_UNRESOLVED',name || null,'Composition insuffisante pour vérifier les contraintes.');
    // An arbitrary user-entered allergy is not silently treated as a validated synonym.
    if (profile.allergies.some(allergy=>!allergyAliases[norm(allergy)] && !contains(name,allergy))) add('ALLERGY_UNRESOLVED',name,'Une allergie déclarée n’a pas de correspondance validée.');
  }
  const policy=new RecipePolicySanitizer().run({ name:recipe.name,description:null,instructions:[],ingredients:ingredients.map(item=>({ name:item.ingredient_name,quantity:item.quantity,unit:item.unit })) });
  if (policy.changes.length) add('FOOD_POLICY',null,'Une adaptation sans porcin ou sans alcool doit être revalidée avant suggestion.',true);
  return { status:incompatible ? 'incompatible' : unknown ? 'verify' : 'compatible',findings,registry_version:'v10-03-single-foods-1',
    limitations:profile.allergies.length ? ['Vérification des ingrédients connus uniquement ; les traces non renseignées et la contamination croisée ne sont pas certifiées.'] : [] };
}

export function qualifyLots(lots:QualifiedLot[],now:Date) {
  const eligible:QualifiedLot[]=[],excluded:string[]=[];
  const reasons:Array<{ id:string;date_kind:'use_by'|'best_before'|'unknown';message:string }>=[];
  for (const lot of lots) {
    if (!(lot.quantity>0)) continue;
    const days=calendarDaysUntil(lot.expiry_date,now);
    // Expired DDM / unknown dates require a human check too; no automatic stock promise.
    if (days!==null && days<0) {
      excluded.push(lot.id);
      const kind=lot.date_kind ?? 'unknown';
      reasons.push({ id:lot.id,date_kind:kind,message:kind==='use_by' ? `${lot.product_name} : DLC dépassée, lot exclu des idées automatiques.` : kind==='best_before' ? `${lot.product_name} : DDM dépassée, vérification nécessaire avant de compter ce lot.` : `${lot.product_name} : date dépassée de type inconnu, lot à vérifier.` });
    } else eligible.push(lot);
  }
  return { eligible,excluded,reasons };
}
/** In stock, but the amount does not convert or is not given. */
export const UNCLEAR_REASONS:string[]=['QUANTITY_UNKNOWN','UNIT_UNKNOWN','UNIT_INCOMPATIBLE'];
const matchesLot=(ingredient:{ ingredient_name:string;inventory_product_id?:string|null },lot:{ product_id:string;product_name:string })=>
  ingredient.inventory_product_id===lot.product_id || ingredientMatchRank(ingredient.ingredient_name,lot.product_name)>0;
export function evaluateAvailability(recipe:RecipeWithIngredients,lots:QualifiedLot[],servings:number,now:Date) {
  const qualified=qualifyLots(lots,now);
  const unknownBase=!(recipe.servings && Number.isFinite(recipe.servings) && recipe.servings>0);
  const result=unknownBase ? {
    allocations:[],
    missing:(recipe.recipe_ingredients ?? []).map((item,index)=>({ ingredient_index:index,ingredient_name:item.ingredient_name,quantity:null,unit:item.unit ?? null,reason:'QUANTITY_UNKNOWN' as const,is_essential:item.is_essential!==false })),
  } : allocateRecipeStock(recipe.recipe_ingredients ?? [],qualified.eligible,recipe.servings!,servings);
  const used=new Set(result.allocations.map(item=>item.inventory_id));
  // Only a recipe that cannot be computed is « à vérifier ». A lot of unknown date kind or
  // unmeasured quantity is the default of every lot added by hand, by the assistant or from a
  // photo: it is named, not a reason to hide the recipe (iPhone 2026-11-08: « Aucune idée
  // vérifiée » with 192 lots). Only the lots the recipe takes are named, once (Rasam listed
  // « Ail semoule, ail caramélisé » twice for one garlic).
  const blocking:string[]=[];
  if (unknownBase) blocking.push('Portions de base de la recette inconnues ; quantités à confirmer avant de calculer les manquants.');
  if (!(recipe.recipe_ingredients?.length)) blocking.push('Liste d’ingrédients absente.');
  const doubtful=new Set(qualified.eligible.filter(lot=>used.has(lot.id) && (!lot.expiry_date || !lot.date_kind || lot.date_kind==='unknown' || lot.quantity_quality!=='measured'))
    .map(lot=>lot.product_name).filter(Boolean));
  // In stock, but the amount does not convert or is not given: present, to check.
  const unclear=unknownBase ? [] : result.missing.filter(item=>item.is_essential && UNCLEAR_REASONS.includes(item.reason));
  const notes=[...(unclear.length ? [`En stock, quantité à vérifier : ${[...new Set(unclear.map(item=>item.ingredient_name))].join(', ')}.`] : []),
    ...(doubtful.size ? [`À vérifier dans ton stock (dates ou quantités) : ${[...doubtful].join(', ')}.`] : [])];
  // Optional garnishes stay listed but never make a recipe unavailable.
  return { status:blocking.length ? 'verify' as const : result.missing.some(item=>item.is_essential && !UNCLEAR_REASONS.includes(item.reason)) ? 'missing' as const : 'available' as const,
    missing:result.missing,allocations:result.allocations,uncertainties:[...blocking,...notes],excluded_lots:qualified.excluded,
    excluded_lot_reasons:qualified.reasons.filter(reason=>lots.some(lot=>lot.id===reason.id && (recipe.recipe_ingredients ?? []).some(ingredient=>matchesLot(ingredient,lot)))) };
}

export function estimateNutrition(recipe:RecipeWithIngredients,products:Map<string,IngredientProduct>):NutritionEstimate {
  const ingredients=recipe.recipe_ingredients ?? [];
  const snapshot=SourcedRecipeNutritionSchema.safeParse(recipe.nutrition_info);
  if (snapshot.success && snapshot.data.ingredient_signature===recipeNutritionSignature(ingredients,recipe.servings) &&
      snapshot.data.base_servings===recipe.servings && snapshot.data.ingredients.length<=ingredients.length && ingredients.length) {
    const value=snapshot.data,coverage=value.ingredients.length/ingredients.length;
    const allIngredients=coverage===1;
    const complete=allIngredients && [value.per_serving.energyKcal,value.per_serving.proteinG,value.per_serving.fiberG].every(item=>item!==null);
    return {status:complete ? 'estimated' : 'partial',coverage,known_ingredients:value.ingredients.length,total_ingredients:ingredients.length,
      per_serving:allIngredients ? value.per_serving : {energyKcal:null,proteinG:null,fiberG:null},upper_bounds:value.upper_bounds,
      sources:[{source:'ciqual2020',updated_at:'2020-07-07',base:'100g',url:value.reference_url}],
      limitations:[...value.assumptions,...value.missing_ingredients.map(name=>`Référence nutritionnelle manquante : ${name}.`),
        'Estimation à partir des ingrédients et des portions de cette version. Rendement de cuisson, pertes et variations des produits ne sont pas mesurés.',
        'Les valeurs précédées de « < » sont des limites supérieures, pas des mesures exactes. Le rétinol ne comprend pas le bêta-carotène.']};
  }
  let count=0,estimated=false;
  const total=Object.fromEntries(NUTRIENTS.map(({key})=>[key,0])) as Record<NutrientKey,number>;
  const known={...total};
  const sources:NutritionEstimate['sources']=[],limitations:string[]=[];
  for (const ingredient of ingredients) {
    const product=ingredient.inventory_product_id ? products.get(ingredient.inventory_product_id) : undefined;
    const envelope=product?.nutrition_json;
    if (!product || !envelope?.per100g || !['manual','openfoodfacts','estimated'].includes(envelope.source ?? '') || !(typeof ingredient.quantity==='number' && Number.isFinite(ingredient.quantity) && ingredient.quantity>0)) { limitations.push(`Données nutritionnelles absentes pour ${ingredient.ingredient_name}.`);continue; }
    let grams:number;
    try { grams=convertQuantity(ingredient.quantity,ingredient.unit,'g'); } catch { limitations.push(`Poids inconnu pour ${ingredient.ingredient_name} ; aucune conversion pièces/volume en grammes inventée.`);continue; }
    let contributed=false;
    for (const {key} of NUTRIENTS) {
      const value=envelope.per100g[key];
      if (typeof value==='number' && Number.isFinite(value) && value>=0) { total[key]+=value*grams/100;known[key]++;contributed=true; }
    }
    if (contributed) {
      count++;estimated ||= envelope.source==='estimated';
      sources.push({ product_id:product.id,source:envelope.source,updated_at:envelope.source==='openfoodfacts' ? product.off_last_synced_at ?? product.updated_at ?? null : product.updated_at ?? null,base:'100g' });
    }
  }
  const base=recipe.servings && Number.isFinite(recipe.servings) && recipe.servings>0 ? recipe.servings : null;
  const complete=ingredients.length>0 && ['energyKcal','proteinG','fiberG'].every(key=>known[key as NutrientKey]===ingredients.length) && base!==null;
  if (!base) limitations.push('Portions de base inconnues ; estimation par portion indisponible.');
  if (snapshot.success) limitations.push('Le calcul Ciqual enregistré ne correspond plus aux ingrédients ou aux portions actuels ; il doit être recalculé.');
  limitations.push('Base déclarée pour 100 g ; rendement et différences cru/cuit non documentés. Les cibles quotidiennes ne sont pas comparées à un repas isolé.');
  return { status:!count ? 'unavailable' : !complete ? 'partial' : estimated ? 'estimated' : 'known',coverage:ingredients.length ? count/ingredients.length : 0,
    known_ingredients:count,total_ingredients:ingredients.length,
    per_serving:Object.fromEntries(NUTRIENTS.map(({key})=>[key,base && known[key]===ingredients.length && ingredients.length ? Math.round(total[key]/base*100)/100 : null])) as NutritionEstimate['per_serving'],
    sources,limitations };
}
export function scoreExplicitTaste(recipe:RecipeWithIngredients,profile:NutritionProfileSettings) {
  const names=(recipe.recipe_ingredients ?? []).map(item=>item.ingredient_name);
  const liked=profile.likedIngredients.filter(term=>names.some(name=>contains(name,term)));
  const avoided=profile.avoidedIngredients.filter(term=>names.some(name=>contains(name,term)));
  const cuisines=profile.cuisines.filter(term=>contains(recipe.cuisine_category ?? '',term));
  return { score:Math.max(-1,Math.min(1,(liked.length+cuisines.length)*0.4-avoided.length*0.8)),
    available:profile.likedIngredients.length+profile.avoidedIngredients.length+profile.cuisines.length>0,
    reasons:[...liked.map(term=>`Ingrédient apprécié : ${term}.`),...cuisines.map(term=>`Cuisine appréciée : ${term}.`),...avoided.map(term=>`Ingrédient que vous préférez éviter : ${term}.`)] };
}
export function scoreNutritionGoal(estimate:NutritionEstimate,profile:NutritionProfileSettings,goal?:string):number|null {
  if (estimate.coverage!==1 || !['known','estimated'].includes(estimate.status)) return null;
  const values:number[]=[];
  // Documented culinary ranking rules, not health targets: grams per serving / fixed display scale.
  if (profile.goals.includes('protein') || goal==='high_protein') { if (estimate.per_serving.proteinG===null || estimate.upper_bounds?.includes('proteinG')) return null;values.push(Math.min(1,estimate.per_serving.proteinG/30)); }
  if (profile.goals.includes('more_fiber')) { if (estimate.per_serving.fiberG===null || estimate.upper_bounds?.includes('fiberG')) return null;values.push(Math.min(1,estimate.per_serving.fiberG/10)); }
  return values.length ? values.reduce((sum,value)=>sum+value,0)/values.length : null;
}
