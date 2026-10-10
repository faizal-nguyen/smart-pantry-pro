import { allocateRecipeStock,calendarDaysUntil,convertQuantity,normalizeIngredientName,type ConstraintEvaluation,type NutritionEstimate,type NutritionProfileSettings,type StockLot } from '@smart/shared';
import { RecipePolicySanitizer } from '../recipeQuality/RecipePolicySanitizer.js';
import type { RecipeWithIngredients } from './types.js';

export interface IngredientProduct {
  id:string;name:string;nutrition_json?:{ source?:string;per100g?:{ energyKcal?:number;proteinG?:number;fiberG?:number };rawFieldVersion?:number };
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
export function evaluateAvailability(recipe:RecipeWithIngredients,lots:QualifiedLot[],servings:number,now:Date) {
  const qualified=qualifyLots(lots,now);
  const unknownBase=!(recipe.servings && Number.isFinite(recipe.servings) && recipe.servings>0);
  const result=unknownBase ? {
    allocations:[],
    missing:(recipe.recipe_ingredients ?? []).map((item,index)=>({ ingredient_index:index,ingredient_name:item.ingredient_name,quantity:null,unit:item.unit ?? null,reason:'QUANTITY_UNKNOWN' as const,is_essential:item.is_essential!==false })),
  } : allocateRecipeStock(recipe.recipe_ingredients ?? [],qualified.eligible,recipe.servings!,servings);
  const used=new Set(result.allocations.map(item=>item.inventory_id));
  const uncertainties:string[]=[];
  // Insufficient ingredients have no committed allocation. Their partial lots
  // still contribute to the missing-quantity estimate and must be qualified.
  const partialIngredients=result.missing.map(item=>recipe.recipe_ingredients?.[item.ingredient_index]).filter(Boolean);
  for (const lot of qualified.eligible.filter(item=>used.has(item.id) || partialIngredients.some(ingredient=>ingredient?.inventory_product_id ? ingredient.inventory_product_id===item.product_id : norm(ingredient?.ingredient_name ?? '')===norm(item.product_name)))) {
    if (!lot.expiry_date || !lot.date_kind || lot.date_kind==='unknown') uncertainties.push(`Date ou type de date à vérifier pour ${lot.product_name}.`);
    if (lot.quantity_quality!=='measured') uncertainties.push(`Quantité ${lot.quantity_quality==='estimated' ? 'estimée' : 'à qualifier'} pour ${lot.product_name}.`);
  }
  if (unknownBase) uncertainties.push('Portions de base de la recette inconnues ; quantités à confirmer avant de calculer les manquants.');
  if (!(recipe.recipe_ingredients?.length)) uncertainties.push('Liste d’ingrédients absente.');
  if (result.missing.some(item=>['QUANTITY_UNKNOWN','UNIT_UNKNOWN','UNIT_INCOMPATIBLE'].includes(item.reason))) uncertainties.push('Une quantité ou une conversion d’unité ne peut pas être vérifiée.');
  return { status:uncertainties.length ? 'verify' as const : result.missing.length ? 'missing' as const : 'available' as const,
    missing:result.missing,allocations:result.allocations,uncertainties:[...new Set(uncertainties)],excluded_lots:qualified.excluded,
    excluded_lot_reasons:qualified.reasons.filter(reason=>lots.some(lot=>lot.id===reason.id && (recipe.recipe_ingredients ?? []).some(ingredient=>ingredient.inventory_product_id===lot.product_id || norm(ingredient.ingredient_name)===norm(lot.product_name)))) };
}

export function estimateNutrition(recipe:RecipeWithIngredients,products:Map<string,IngredientProduct>):NutritionEstimate {
  const ingredients=recipe.recipe_ingredients ?? [];
  let count=0,estimated=false;
  const total={ energyKcal:0,proteinG:0,fiberG:0 },known={ energyKcal:0,proteinG:0,fiberG:0 };
  const sources:NutritionEstimate['sources']=[],limitations:string[]=[];
  for (const ingredient of ingredients) {
    const product=ingredient.inventory_product_id ? products.get(ingredient.inventory_product_id) : undefined;
    const envelope=product?.nutrition_json;
    if (!product || !envelope?.per100g || !['manual','openfoodfacts','estimated'].includes(envelope.source ?? '') || !(typeof ingredient.quantity==='number' && Number.isFinite(ingredient.quantity) && ingredient.quantity>0)) { limitations.push(`Données nutritionnelles absentes pour ${ingredient.ingredient_name}.`);continue; }
    let grams:number;
    try { grams=convertQuantity(ingredient.quantity,ingredient.unit,'g'); } catch { limitations.push(`Poids inconnu pour ${ingredient.ingredient_name} ; aucune conversion pièces/volume en grammes inventée.`);continue; }
    let contributed=false;
    for (const key of ['energyKcal','proteinG','fiberG'] as const) {
      const value=envelope.per100g[key];
      if (typeof value==='number' && Number.isFinite(value) && value>=0) { total[key]+=value*grams/100;known[key]++;contributed=true; }
    }
    if (contributed) {
      count++;estimated ||= envelope.source==='estimated';
      sources.push({ product_id:product.id,source:envelope.source,updated_at:envelope.source==='openfoodfacts' ? product.off_last_synced_at ?? product.updated_at ?? null : product.updated_at ?? null,base:'100g' });
    }
  }
  const base=recipe.servings && Number.isFinite(recipe.servings) && recipe.servings>0 ? recipe.servings : null;
  const complete=ingredients.length>0 && Object.values(known).every(value=>value===ingredients.length) && base!==null;
  if (!base) limitations.push('Portions de base inconnues ; estimation par portion indisponible.');
  limitations.push('Base déclarée pour 100 g ; rendement et différences cru/cuit non documentés. Les cibles quotidiennes ne sont pas comparées à un repas isolé.');
  return { status:!count ? 'unavailable' : !complete ? 'partial' : estimated ? 'estimated' : 'known',coverage:ingredients.length ? count/ingredients.length : 0,
    known_ingredients:count,total_ingredients:ingredients.length,
    per_serving:Object.fromEntries((['energyKcal','proteinG','fiberG'] as const).map(key=>[key,base && known[key]===ingredients.length && ingredients.length ? Math.round(total[key]/base*100)/100 : null])) as NutritionEstimate['per_serving'],
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
  if (profile.goals.includes('protein') || goal==='high_protein') { if (estimate.per_serving.proteinG===null) return null;values.push(Math.min(1,estimate.per_serving.proteinG/30)); }
  if (profile.goals.includes('more_fiber')) { if (estimate.per_serving.fiberG===null) return null;values.push(Math.min(1,estimate.per_serving.fiberG/10)); }
  return values.length ? values.reduce((sum,value)=>sum+value,0)/values.length : null;
}
