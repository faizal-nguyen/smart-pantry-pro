import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {recipeNutritionSignature,SourcedRecipeNutritionSchema} from '@smart/shared';
import {estimateNutrition,scoreNutritionGoal} from '../PersonalizationScoring.js';
import {emptyNutritionProfile} from '@smart/shared';
import type {RecipeWithIngredients} from '../types.js';
const recipe=():RecipeWithIngredients=>({id:'recipe',name:'Exemple',description:null,prep_time:5,cook_time:10,servings:2,image_url:null,
  cuisine_category:'Française',meal_type:'dinner',tags:[],created_at:'2026-11-09',recipe_ingredients:[{id:'ingredient',ingredient_name:'Carottes',quantity:200,unit:'g',inventory_product_id:null,is_essential:true}]});
function snapshot(r:RecipeWithIngredients){return {schema_version:1,source:'ciqual2020',computed_at:'2026-11-09T20:00:00Z',ingredient_signature:recipeNutritionSignature(r.recipe_ingredients,r.servings),base_servings:2,
  per_serving:{energyKcal:40,proteinG:1,fiberG:3,carbsG:8,fatG:0.2,vitaminCMg:5},upper_bounds:['fatG'],
  ingredients:[{ingredient_name:'Carottes',food_code:'20009',food_name:'Carotte, crue',weight_g:200}],missing_ingredients:[],assumptions:['Valeurs des ingrédients avant cuisson.'],reference_url:'https://ciqual.anses.fr/'};}
test('a source-backed snapshot keeps macros, vitamins, bounds and provenance without inventing unknown values',()=>{
  const r=recipe();r.nutrition_info=snapshot(r);const result=estimateNutrition(r,new Map());
  expect(result.status).toBe('estimated');expect(result.coverage).toBe(1);
  expect(result.per_serving).toMatchObject({carbsG:8,fatG:0.2,vitaminCMg:5});
  expect(result.per_serving.vitaminB12Ug).toBeUndefined();
  expect(result.upper_bounds).toEqual(['fatG']);expect(result.sources[0]).toMatchObject({source:'ciqual2020',url:'https://ciqual.anses.fr/'});
});
test('changing amounts or base portions invalidates the snapshot, including personal adaptations',()=>{
  for(const change of ['amount','portions']){const r=recipe();r.nutrition_info=snapshot(r);if(change==='amount')r.recipe_ingredients[0].quantity=300;else r.servings=4;
    const result=estimateNutrition(r,new Map());expect(result.per_serving.energyKcal).toBeNull();expect(result.status).toBe('unavailable');expect(result.limitations.join(' ')).toMatch(/ne correspond plus/);}
});
test('legacy unsourced totals and invalid values cannot become certified nutrition',()=>{
  const r=recipe();r.nutrition_info={totalNutrition:{energy_kcal:10000}};expect(estimateNutrition(r,new Map()).status).toBe('unavailable');
  expect(SourcedRecipeNutritionSchema.safeParse({...snapshot(r),per_serving:{energyKcal:-1,proteinG:1,fiberG:1}}).success).toBe(false);
  expect(SourcedRecipeNutritionSchema.safeParse({...snapshot(r),reference_url:'javascript:alert(1)'}).success).toBe(false);
});
test('an upper protein bound is not used as proof of a high-protein meal',()=>{
  const r=recipe();r.nutrition_info={...snapshot(r),upper_bounds:['proteinG']};
  expect(scoreNutritionGoal(estimateNutrition(r,new Map()),emptyNutritionProfile(),'high_protein')).toBeNull();
});

test('all 53 approved recipe snapshots validate against their persisted identities and quantities',()=>{
 const collection=JSON.parse(readFileSync(resolve(process.cwd(),'data/recipes/classics-approved-2026-11-09.json'),'utf8'));
 expect(collection.recipes).toHaveLength(53);
 const ids=new Set<number>();
 for(const row of collection.recipes){ids.add(row.selection_id);const parsed=SourcedRecipeNutritionSchema.parse(row.nutrition_info);
 expect(parsed.ingredient_signature).toBe(recipeNutritionSignature(row.ingredients,row.servings));
 expect(parsed.ingredients.map(i=>i.ingredient_name)).toEqual(row.ingredients.map((i:{ingredient_name:string})=>i.ingredient_name));
 expect(row.tags).toEqual(expect.arrayContaining(['sans-porc','sans-alcool']));
 }
 expect(ids.size).toBe(53);
});
