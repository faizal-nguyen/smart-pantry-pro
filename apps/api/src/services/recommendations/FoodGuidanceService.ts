import {buildFoodGuidance,type FoodGuidanceLot,type FoodGuidance} from '@smart/shared';
import type {SupabaseClient} from '@supabase/supabase-js';
import {NutritionProfileService} from './NutritionProfileService.js';
import {evaluateConstraints} from './PersonalizationScoring.js';
import type {IngredientProduct} from './PersonalizationScoring.js';

interface Row extends Omit<FoodGuidanceLot,'product_name'> {
 products:({id:string;name:string;allergens_json?:IngredientProduct['allergens_json']}|null)[]|{id:string;name:string;allergens_json?:IngredientProduct['allergens_json']}|null;
}
/** Reads all retained lots under the caller's owner scope. Never sends profile fields in the result. */
export class FoodGuidanceService {
 async read(userId:string,client:SupabaseClient,options:{now?:Date;focus?:string}={}):Promise<FoodGuidance>{
  if(!userId)throw new Error('Owner required');
  const profile=await new NutritionProfileService(client).read(userId);
  const lots:FoodGuidanceLot[]=[],dailyExcludedIds=new Set<string>();
  for(let offset=0;;offset+=200){
   const {data,error}=await client.from('inventory').select('id,product_id,quantity,unit,expiry_date,date_kind,quantity_quality,notes,location,created_at,updated_at,products(id,name,allergens_json)').eq('user_id',userId).order('id').range(offset,offset+199);
   if(error)throw error;
   for(const row of (data??[]) as unknown as Row[]){
    const p=Array.isArray(row.products)?row.products[0]:row.products;if(!p?.name)throw new Error('Stock product unavailable');
    const lot={...row,product_name:p.name};lots.push(lot);
    const products=new Map<string,IngredientProduct>([[p.id,p as IngredientProduct]]);
    const constraints=evaluateConstraints({name:p.name,recipe_ingredients:[{id:row.id,ingredient_name:p.name,quantity:1,unit:'unit',inventory_product_id:p.id,is_essential:true}]},profile.profile.settings,products);
    if(constraints.status!=='compatible')dailyExcludedIds.add(row.id);
   }
   if((data?.length??0)<200)break;
   if(offset>=4800)throw new Error('Stock pagination incomplete');
  }
  const guidance=buildFoodGuidance(lots,{...options,dailyExcludedIds});
  const compatibleIdea=(name:string)=>evaluateConstraints({name,recipe_ingredients:[{id:name,ingredient_name:name,quantity:1,unit:'unit',inventory_product_id:null,is_essential:true}]},profile.profile.settings,new Map()).status==='compatible';
  // Seasonal purchase ideas obey the same private constraints as daily stock picks.
  guidance.seasonal_ideas=guidance.seasonal_ideas.filter(idea=>compatibleIdea(idea.name));
  guidance.seasonal_calendar=guidance.seasonal_calendar.filter(idea=>compatibleIdea(idea.name));
  return guidance;
 }
}
