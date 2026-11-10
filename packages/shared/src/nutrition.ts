import type {NutritionEstimate} from './personalization.js';
import {z} from 'zod';
import {normalizeIngredientName,type StockIngredient} from './quantities.js';

export const MACRO_NUTRIENTS=[
  {key:'energyKcal',label:'Énergie',unit:'kcal'}, {key:'proteinG',label:'Protéines',unit:'g'},
  {key:'carbsG',label:'Glucides',unit:'g'}, {key:'fatG',label:'Lipides',unit:'g'},
  {key:'saturatedFatG',label:'Acides gras saturés',unit:'g'}, {key:'sugarG',label:'Sucres',unit:'g'},
  {key:'fiberG',label:'Fibres',unit:'g'}, {key:'saltG',label:'Sel',unit:'g'},
] as const;
export const MICRO_NUTRIENTS=[
  {key:'retinolUg',label:'Rétinol (vitamine A)',unit:'µg'}, {key:'vitaminCMg',label:'Vitamine C',unit:'mg'},
  {key:'vitaminDUg',label:'Vitamine D',unit:'µg'}, {key:'vitaminEMg',label:'Vitamine E',unit:'mg'},
  {key:'folateUg',label:'Folates (vitamine B9)',unit:'µg'}, {key:'vitaminB12Ug',label:'Vitamine B12',unit:'µg'},
  {key:'calciumMg',label:'Calcium',unit:'mg'}, {key:'ironMg',label:'Fer',unit:'mg'},
  {key:'magnesiumMg',label:'Magnésium',unit:'mg'}, {key:'potassiumMg',label:'Potassium',unit:'mg'},
] as const;
export const NUTRIENTS=[...MACRO_NUTRIENTS,...MICRO_NUTRIENTS] as const;
export type NutrientKey=typeof NUTRIENTS[number]['key'];
const scalar=z.number().finite().nonnegative().nullable();
export const NutritionValuesSchema=z.object({
  energyKcal:scalar,proteinG:scalar,fiberG:scalar,
  carbsG:scalar.optional(),fatG:scalar.optional(),saturatedFatG:scalar.optional(),sugarG:scalar.optional(),saltG:scalar.optional(),
  retinolUg:scalar.optional(),vitaminCMg:scalar.optional(),vitaminDUg:scalar.optional(),vitaminEMg:scalar.optional(),
  folateUg:scalar.optional(),vitaminB12Ug:scalar.optional(),calciumMg:scalar.optional(),ironMg:scalar.optional(),
  magnesiumMg:scalar.optional(),potassiumMg:scalar.optional(),
});
export type NutritionValues=z.infer<typeof NutritionValuesSchema>;
export const NutrientKeySchema=z.enum(NUTRIENTS.map(item=>item.key) as [NutrientKey,...NutrientKey[]]);

/** The snapshot ceases to apply as soon as quantities, identities or portions change. */
export function recipeNutritionSignature(ingredients:StockIngredient[],servings:number|null|undefined):string {
  return JSON.stringify({servings:servings ?? null,ingredients:ingredients.map(item=>JSON.stringify([
    normalizeIngredientName(item.ingredient_name),item.quantity ?? null,normalizeIngredientName(item.unit ?? ''),
  ])).sort()});
}
export const SourcedRecipeNutritionSchema=z.object({
  schema_version:z.literal(1),source:z.literal('ciqual2020'),computed_at:z.string().datetime(),
  ingredient_signature:z.string().min(1),base_servings:z.number().finite().positive(),
  per_serving:NutritionValuesSchema,upper_bounds:z.array(NutrientKeySchema).default([]),
  ingredients:z.array(z.object({ingredient_name:z.string(),food_code:z.string(),food_name:z.string(),weight_g:z.number().finite().nonnegative()})).min(1).max(100),
  missing_ingredients:z.array(z.string()).default([]),assumptions:z.array(z.string()),
  reference_url:z.string().url().startsWith('https://'),
});


/** A recipe's saved composition does not depend on stock or dietary profiles. */
export function nutritionFromRecipeSnapshot(snapshotValue:unknown,ingredients:StockIngredient[],baseServings:number|null|undefined):NutritionEstimate|null {
  const snapshot=SourcedRecipeNutritionSchema.safeParse(snapshotValue);
  if (snapshot.success && snapshot.data.ingredient_signature===recipeNutritionSignature(ingredients,baseServings) &&
      snapshot.data.base_servings===baseServings && snapshot.data.ingredients.length<=ingredients.length && ingredients.length) {
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
  return null;
}
