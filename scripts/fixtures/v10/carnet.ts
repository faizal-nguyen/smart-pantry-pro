import { calendarDate } from '@smart/shared';

export const carnetScene = new URLSearchParams(location.search).get('scene') === 'carnet' || new URLSearchParams(location.search).get('scene')==='recipe-life';
export const fixtureStorageKey = new URLSearchParams(location.search).get('scene')==='recipe-life'?'v10-recipe-life-fixture':carnetScene ? 'v10-carnet-fixture-data' : 'v10-fixture-data';

/** A separate fictional household for judging the approved design, not production seeds. */
export function seedCarnetScene(data: Record<string, Record<string, unknown>[]>, owner: string, recipe: string) {
  const id = (prefix: number, n: number) => `${prefix}0000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  const today = new Date(`${calendarDate()}T12:00:00Z`);
  const date = (offset: number) => { const value=new Date(today);value.setUTCDate(value.getUTCDate()+offset);return value.toISOString().slice(0,10); };
  const names=['Courgettes','Yaourts','Épinards','Semoule','Pois chiches','Tomates','Oignons','Carottes','Huile d’olive','Épices'];
  data.products=names.map((name,index)=>({id:id(1,index+1),name,normalized_name:name.toLowerCase(),category:index===1 ? 'Produits laitiers':'Légumes',unit_type:index===1 ? 'pièce':'g'}));
  data.inventory=names.map((_,index)=>({id:id(2,index+1),user_id:owner,product_id:id(1,index+1),quantity:index===1 ? 4:800,unit:index===1 ? 'pièce':'g',stock_version:0,date_kind:'best_before',quantity_quality:'measured',location:index<3 ? 'Réfrigérateur':'Placard',expiry_date:date(index===0 ? 2:index===1 ? 3:index===2 ? 0:30),created_at:today.toISOString()}));
  data.recipes=[{id:recipe,user_id:owner,name:'Couscous de légumes rôtis',image_url:'/scripts/fixtures/v10/assets/couscous-demo.png',instructions:'Couper les légumes.\nLes rôtir au four avec les pois chiches.\nPréparer la semoule, puis assembler.',servings:2,prep_time:10,cook_time:15,difficulty:1,tags:['Végétarien'],is_public:false,created_at:today.toISOString(),updated_at:today.toISOString()}];
  data.recipe_ingredients=[0,3,4,5,6,7,8,9].map((productIndex,index)=>({id:id(4,index+1),recipe_id:recipe,ingredient_name:names[productIndex],quantity:productIndex===8 ? 10:productIndex===9 ? 2:100,unit:'g',inventory_product_id:id(1,productIndex+1),is_essential:true,order_index:index}));
  data.shopping_list=names.slice(0,5).map((_,index)=>({id:id(5,index+1),user_id:owner,product_id:id(1,index+1),quantity:1,unit:'pièce',stock_version:0,is_purchased:false,priority:1,created_at:today.toISOString(),updated_at:today.toISOString()}));
  data.mobile_routine_preferences=[{user_id:owner,introduction:'done',stock_view:'list',updated_at:today.toISOString()}];
  const dayIndex=(today.getUTCDay()+6)%7;
  data.weekly_meal_plans=[{id:id(8,1),user_id:owner,week_start_date:date(-dayIndex)}];
  data.meal_plan_entries=[{id:id(9,1),meal_plan_id:id(8,1),day_of_week:dayIndex,meal_type:'dinner',recipe_id:recipe,recipe_reference:{id:recipe,source:'recipes'},recipe_name:'Couscous de légumes',servings:2,prep_time:10,cook_time:15}];
}

export function seedRecipeLifeScene(data:Record<string,Record<string,unknown>[]>,owner:string){
 if(new URLSearchParams(location.search).get('scene')!=='recipe-life')return;
 const base=data.recipes[0],names=['Couscous de légumes rôtis','Soupe de saison','Pain maison','Riz sauté aux légumes','Blanquette de veau','Bœuf mijoté','Nouilles au poulet','Salade croquante'];
 const id=(n:number)=>`61000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 data.recipes=Array.from({length:460},(_,i)=>({...base,id:i===0?base.id:id(i),name:names[i%names.length]+(i>=names.length?` · variante ${i+1}`:''),cuisine_category:['Française','Chinoise','Marocaine','Italienne'][i%4],prep_time:10,cook_time:i%3===0?50:15,rest_time:0,created_at:`2026-10-01T12:00:00.000Z`,image_url:'/scripts/fixtures/v10/assets/'+(i%3===0?'couscous-demo.png':i%3===1?'soupe.svg':'riz.svg')}));
 const ingredients=[...data.recipe_ingredients];data.recipe_ingredients=data.recipes.flatMap((r,i)=>ingredients.map((ing,j)=>({...ing,id:`62000000-0000-4000-8000-${String(i*100+j).padStart(12,'0')}`,recipe_id:r.id})));
 data.recipe_interactions=[{id:id(9990),user_id:owner,recipe_reference:{id:data.recipes[4].id,source:'recipes'},metadata:{library_lifecycle:true,action:'queue'},created_at:'2026-11-01T12:00:00.000Z'}];
}
