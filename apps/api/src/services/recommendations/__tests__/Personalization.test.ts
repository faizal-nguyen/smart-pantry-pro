import { emptyNutritionProfile,type NutritionProfileSettings } from '@smart/shared';
import { RecommendationEngine,type RecommendationExecutionContext } from '../RecommendationEngine.js';
import { evaluateConstraints,evaluateAvailability,estimateNutrition,scoreNutritionGoal,type IngredientProduct,type QualifiedLot } from '../PersonalizationScoring.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MemoryService } from '../../assistant/MemoryService.js';
import type { RecommendationEventWriter } from '../RecommendationEventWriter.js';
import { NutritionProfileService,legacyServerProfile } from '../NutritionProfileService.js';
import type { RecipeWithIngredients,RecommendationContext } from '../types.js';
const USER='00000000-0000-4000-8000-000000000001',OTHER='00000000-0000-4000-8000-000000000002';
const NOW=new Date('2026-10-09T12:00:00Z');
const profile=(values:Partial<NutritionProfileSettings>={})=>({ ...emptyNutritionProfile(),consent:true,...values });
const stored=(settings=profile(),version=1)=>({ user_id:USER,version,schema_version:1,settings,origin:'explicit',updated_at:NOW.toISOString() });
function recipe(id:string,name:string,ingredient:string,pid=id):RecipeWithIngredients {
  return { id,name,created_at:NOW.toISOString(),source:'recipes',description:null,prep_time:5,cook_time:10,rest_time:0,servings:2,image_url:null,cuisine_category:null,meal_type:'dinner',tags:null,difficulty:2,
    recipe_ingredients:[{ id:id+':0',ingredient_name:ingredient,quantity:200,unit:'g',inventory_product_id:pid,is_essential:true }] };
}
const lot=(pid:string,values:Partial<QualifiedLot>={}):QualifiedLot=>({ id:'lot:'+pid,product_id:pid,product_name:pid,quantity:1,unit:'kg',stock_version:0,expiry_date:'2026-10-20',date_kind:'best_before',quantity_quality:'measured',...values });
type MockResponse={ data:unknown;error:unknown };
interface MockQuery extends PromiseLike<MockResponse> {
  select():MockQuery;eq(column:string,value:unknown):MockQuery;is():MockQuery;
  in():MockQuery;ilike():MockQuery;order():MockQuery;limit():MockQuery;
  maybeSingle():Promise<MockResponse>;
}
function clientFor(tables:Record<string,unknown>,errors:Record<string,unknown>={}) {
  const filters:Array<{table:string;column:string;value:unknown}>=[];
  return { filters,from:(table:string)=>{
    const chain:MockQuery={ select:()=>chain,eq:(column:string,value:unknown)=>{ filters.push({ table,column,value });return chain; },is:()=>chain,in:()=>chain,ilike:()=>chain,order:()=>chain,limit:()=>chain,
      maybeSingle:async()=>({ data:tables[table] ?? null,error:errors[table] ?? null }),then:(resolve,reject)=>Promise.resolve({ data:tables[table] ?? [],error:errors[table] ?? null }).then(resolve,reject) };
    return chain;
  } };
}
async function suggest(tables:Record<string,unknown>,input:RecommendationContext={},extras:Partial<RecommendationExecutionContext>={}) {
  return new RecommendationEngine().suggestForUser({ userId:USER,userClient:clientFor({ nutrition_profiles:stored(),...tables }) as unknown as SupabaseClient,now:NOW,...extras },input);
}

describe('V10-03 hard constraints on ingredients and provenance',()=>{
  test('a milk-free title cannot override butter, including aliases and supplier traces',()=>{
    const butter=recipe('r','Sans lait','Beurre');
    expect(evaluateConstraints(butter,profile({ allergies:['lait'] }),new Map()).status).toBe('incompatible');
    const rice=recipe('r','Riz','Riz','p');
    expect(evaluateConstraints(rice,profile({ allergies:['arachides'] }),new Map([['p',{ id:'p',name:'Riz',allergens_json:{ source:'openfoodfacts',tracesTags:['en:peanuts'] } }]])).status).toBe('incompatible');
  });
  test('unknown blends, compound bread, unvalidated allergies and certification remain verify',()=>{
    for (const ingredient of ['Sauce maison','Pain']) expect(evaluateConstraints(recipe('r','Plat',ingredient),profile({ allergies:['lait'] }),new Map()).status).toBe('verify');
    expect(evaluateConstraints(recipe('r','Plat','Riz'),profile({ allergies:['allergène personnalisé'] }),new Map()).status).toBe('verify');
    expect(evaluateConstraints(recipe('r','Plat','Riz'),profile({ diets:['halal'] }),new Map()).status).toBe('verify');
  });
  test('diet, explicit exclusions and global food policy apply before scoring',()=>{
    expect(evaluateConstraints(recipe('r','Plat','Poulet'),profile({ diets:['vegan'] }),new Map()).status).toBe('incompatible');
    expect(evaluateConstraints(recipe('r','Plat','Riz'),profile({ excludedIngredients:['riz'] }),new Map()).status).toBe('incompatible');
    expect(evaluateConstraints(recipe('r','Plat','Zucchini'),profile({ excludedIngredients:['courgette'] }),new Map()).status).toBe('incompatible');
    expect(evaluateConstraints(recipe('r','Plat','Fromage'),profile({ excludedIngredients:['beurre'] }),new Map()).findings.some(item=>item.code==='EXCLUDED_INGREDIENT')).toBe(false);
    expect(evaluateConstraints(recipe('r','Plat','Jambon'),profile(),new Map()).status).toBe('incompatible');
  });
  test('missing profile schema and malformed legacy constraints fail closed',async()=>{
    await expect(new NutritionProfileService(clientFor({}, { nutrition_profiles:{ code:'42P01' } }) as unknown as SupabaseClient).read(USER)).rejects.toMatchObject({ code:'MIGRATION_REQUIRED',status:503 });
    expect(()=>legacyServerProfile({ allergies:Array.from({ length:31 },()=> 'lait') })).toThrow('PROFILE_UNAVAILABLE');
    expect(legacyServerProfile({ dietary_restrictions:['Végétarien','sans gluten'] }).diets).toEqual(['vegetarian','gluten_free']);
  });
  test('an old assistant inference is not consulted to relax an explicit allergy',async()=>{
    const memory={ readPolicySafe:jest.fn().mockResolvedValue(null),getPreferenceSignals:jest.fn().mockResolvedValue({ likes:['Beurre'] }),getTopActiveMemories:jest.fn() };
    const result=await suggest({ nutrition_profiles:stored(profile({ allergies:['lait'] })),recipes:[recipe('r','Sans lait','Beurre')],inventory:[lot('r')] },{}, { memoryService:memory as unknown as MemoryService });
    expect(result.cookable_now).toEqual([]);expect(result.excluded_suggestions![0].constraints.status).toBe('incompatible');
    expect(memory.getPreferenceSignals).not.toHaveBeenCalled();
  });
  test('ambiguous legacy preferences require confirmation while known exclusions already apply',async()=>{
    const result=await suggest({ nutrition_profiles:null,user_meal_preferences:{ dietary_restrictions:['Végétarien','régime historique inconnu'] },recipes:[recipe('rice','Riz','Riz'),recipe('chicken','Poulet','Poulet')],inventory:[lot('rice'),lot('chicken')] });
    expect(result.cookable_now).toEqual([]);
    expect(result.verify_suggestions![0].constraints.limitations.join(' ')).toContain('Confirmez');
    expect(result.excluded_suggestions![0].id).toBe('chicken');
  });
});

describe('V10-03 original lots, portions and honest nutrition',()=>{
  test('DLC excluded, DDM verification distinct, eligible lots reserve only once',()=>{
    const r=recipe('r','Riz','Riz','p');
    const lots=[lot('p',{ id:'expired',expiry_date:'2026-10-08',date_kind:'use_by' }),lot('p',{ id:'ddm',expiry_date:'2026-10-08' }),lot('p',{ id:'a',quantity:.1 }),lot('p',{ id:'b',quantity:.1 })];
    const result=evaluateAvailability(r,lots,2,NOW);
    expect(result.status).toBe('available');expect(result.allocations.map(item=>item.inventory_id)).toEqual(['a','b']);
    expect(result.excluded_lot_reasons!.map(item=>item.message).join(' ')).toContain('DDM dépassée');
    expect(result.excluded_lot_reasons![0].date_kind).toBe('use_by');
    expect(evaluateAvailability(r,lots,4,NOW).missing[0]).toMatchObject({ quantity:200,unit:'g' });
  });
  test('an optional garnish never blocks a recipe, while an absent essential is missing rather than to verify',async()=>{
    const r=recipe('r','Riz','Riz','p');
    r.recipe_ingredients!.push({ id:'r:1',ingredient_name:'Coriandre',quantity:1,unit:'botte',inventory_product_id:null,is_essential:false });
    const result=evaluateAvailability(r,[lot('p')],2,NOW);
    expect(result.status).toBe('available');expect(result.missing.map(item=>item.ingredient_name)).toEqual(['Coriandre']);
    expect((await suggest({ recipes:[r],inventory:[lot('p')] })).cookable_now.map(item=>item.id)).toEqual(['r']);
    r.recipe_ingredients!.push({ id:'r:2',ingredient_name:'Gingembre',quantity:2,unit:'cm',inventory_product_id:null,is_essential:true });
    expect(evaluateAvailability(r,[lot('p')],2,NOW)).toMatchObject({ status:'missing',uncertainties:[] });
  });
  test('unknown dates and estimated quantities are named without promising freshness or sufficiency',()=>{
    const r=recipe('r','Riz','Riz','p');
    const result=evaluateAvailability(r,[lot('p',{ expiry_date:null,date_kind:'unknown',quantity_quality:'estimated' })],2,NOW);
    // iPhone 2026-11-08: this used to send every recipe to « à vérifier », since it is the default of most lots.
    expect(result.status).toBe('available');expect(result.uncertainties).toEqual(['Date à vérifier : p.','Quantité à vérifier dans ton stock : p.']);
    expect(evaluateAvailability(r,[lot('p',{ unit:'unit' })],2,NOW).missing[0].reason).toBe('UNIT_INCOMPATIBLE');
  });
  test('unknown base portions stay to verify; an unconvertible unit or an estimated partial lot is named',async()=>{
    const scenarios=[
      { recipes:[{ ...recipe('r','Riz','Riz'),servings:null }],inventory:[] },
      { recipes:[recipe('r','Riz','Riz')],inventory:[lot('r',{ unit:'unit' })] },
      { recipes:[recipe('r','Riz','Riz')],inventory:[{ ...lot('r',{ quantity:.05,quantity_quality:'estimated' }),products:{ name:'riz',unit_type:'kg' } }] },
    ];
    const [portions,unit,partial]=await Promise.all(scenarios.map(tables=>suggest(tables,{ servings:4 })));
    expect(portions.cookable_now).toEqual([]);expect(portions.almost_cookable).toEqual([]);
    expect(portions.verify_suggestions![0].availability.status).toBe('verify');
    // In stock in a unit that does not convert: present, its amount to check.
    expect(unit.cookable_now[0]).toMatchObject({ missing_count:0,unknown_ingredients:['Riz'] });
    // 50 g estimated for 400 g: 350 g to buy, and the estimate is named.
    expect(partial.almost_cookable[0].availability.missing[0]).toMatchObject({ reason:'INSUFFICIENT_QUANTITY',quantity:350 });
    expect(partial.almost_cookable[0].availability.uncertainties).toContain('Quantité à vérifier dans ton stock : riz.');
    const noPortions=await suggest(scenarios[0]);
    expect(noPortions.verify_suggestions![0].servings).toBeNull();
    expect(noPortions.verify_suggestions![0].availability.missing[0].quantity).toBeNull();
  });
  test('per-portion estimate uses real mass and provenance; absent macros and piece weights stay null',()=>{
    const r=recipe('r','Riz','Riz','p');
    const products=new Map<string,IngredientProduct>([['p',{ id:'p',name:'Riz',nutrition_json:{ source:'manual',per100g:{ energyKcal:350,proteinG:8,fiberG:4 } },updated_at:'2026-10-01' }]]);
    const estimate=estimateNutrition(r,products);
    expect(estimate).toMatchObject({ status:'known',coverage:1,per_serving:{ energyKcal:350,proteinG:8,fiberG:4 } });
    expect(estimate.sources[0]).toMatchObject({ source:'manual',base:'100g',updated_at:'2026-10-01' });
    r.recipe_ingredients![0].unit='unit';
    expect(estimateNutrition(r,products)).toMatchObject({ status:'unavailable',per_serving:{ energyKcal:null,proteinG:null,fiberG:null } });
    expect(scoreNutritionGoal(estimateNutrition(r,products),profile({ goals:['protein'] }))).toBeNull();
  });
  test('no fabricated novelty or nutrition score on empty history/data',async()=>{
    const result=await suggest({ recipes:[recipe('r','Riz','Riz')],inventory:[lot('r')] });
    expect(result.cookable_now[0].score_parts).toMatchObject({ novelty:null,nutritionFit:null });
    expect(result.cookable_now[0].unavailable_criteria).toEqual(expect.arrayContaining(['nutrition','variety']));
  });
});

describe('V10-03 one server pipeline, changes and contextual feedback',()=>{
  test('all origins are resolved, with personal ingredients checked before canonical ones',async()=>{
    const catalog={ id:'catalog',title:'Base sans lait',servings:2,prep_time:5,cook_time:0,ingredients_json:[{ name:'Beurre',quantity:100,unit:'g' }],created_at:'',updated_at:'' };
    const adapted={ id:'adapted',user_id:USER,recipe_id:'catalog',is_from_catalog:true,catalog_recipe:catalog,custom_ingredients_json:[{ name:'Riz',quantity:100,unit:'g',inventory_product_id:'p' }],created_at:'',updated_at:'' };
    const result=await suggest({ nutrition_profiles:stored(profile({ allergies:['lait'] })),recipes:[recipe('own','Mon riz','Riz','p')],user_recipes:[adapted],recipes_catalog:[catalog,{ ...catalog,id:'other' }],inventory:[lot('p')] });
    expect(result.cookable_now.map(item=>item.reference.source).sort()).toEqual(['recipes','user_recipes']);
    expect(result.cookable_now.find(item=>item.id==='adapted')!.constraints.status).toBe('compatible');
    expect(result.excluded_suggestions![0].reference).toEqual({ id:'other',source:'recipes_catalog' });
  });
  test('stock reduction, total time including rest, and allergy edits change the result',async()=>{
    const r=recipe('r','Riz','Riz');
    expect((await suggest({ recipes:[r],inventory:[lot('r')] })).cookable_now).toHaveLength(1);
    expect((await suggest({ recipes:[r],inventory:[lot('r',{ quantity:.05 })] })).almost_cookable[0].availability.missing[0].quantity).toBe(150);
    expect((await suggest({ recipes:[{ ...r,rest_time:10 }],inventory:[lot('r')] },{ timeLimitMinutes:20 })).cookable_now).toHaveLength(0);
    expect((await suggest({ nutrition_profiles:stored(profile({ allergies:['lait'] }),2),recipes:[recipe('r','Plat','Beurre')],inventory:[lot('r')] })).excluded_suggestions).toHaveLength(1);
  });
  test('declared tastes, vegetables and craving affect real ranking without changing durable settings',async()=>{
    const rice=recipe('r','Riz','Riz'),carrot={ ...recipe('c','Carottes','Carotte'),meal_style:'warm' };
    const tables={ recipes:[rice,carrot],inventory:[lot('r'),lot('c')] };
    const liked=await suggest({ ...tables,nutrition_profiles:stored(profile({ likedIngredients:['carotte'],goals:['vegetables'] })) },{ craving:'warm' });
    expect(liked.cookable_now[0].id).toBe('c');
    expect(liked.cookable_now[0].reason_codes.map(item=>item.code)).toEqual(expect.arrayContaining(['KNOWN_VEGETABLES','DECLARED_TASTE','CRAVING']));
    expect(liked.profile_version).toBe(1);
  });
  test('missing nutrition never receives a normalization bonus over the same well-documented recipe',async()=>{
    const withData=recipe('a','Avec données','Riz','p'),without=recipe('b','Sans données','Riz','unknown');
    const result=await suggest({ nutrition_profiles:stored(profile({ goals:['protein'] })),recipes:[withData,without],inventory:[lot('p'),lot('unknown')],products:[{ id:'p',name:'Riz',nutrition_json:{ source:'manual',per100g:{ energyKcal:300,proteinG:30,fiberG:5 } } }] });
    expect(result.cookable_now.find(item=>item.id==='a')!.score_total).toBeGreaterThan(result.cookable_now.find(item=>item.id==='b')!.score_total);
    expect(result.cookable_now.find(item=>item.id==='b')!.score_parts.nutritionFit).toBeNull();
  });
  test('feedback is distinct: repeat boosts, dislike excludes, too_long lowers, not_today expires',async()=>{
    const base={ recipes:[recipe('r','Riz','Riz')],inventory:[lot('r')] };
    const interaction=(feedback:string,age=0)=>({ recipe_id:'r',recipe_reference:{ id:'r',source:'recipes' },feedback,interaction_type:'dismissed',created_at:new Date(NOW.getTime()-age*86400000).toISOString() });
    const neutral=(await suggest(base)).cookable_now[0].score_total;
    expect((await suggest({ ...base,recipe_interactions:[interaction('repeat')] })).cookable_now[0].score_total).toBeGreaterThan(neutral);
    expect((await suggest({ ...base,recipe_interactions:[interaction('dislike')] })).excluded_suggestions).toHaveLength(1);
    expect((await suggest({ ...base,recipe_interactions:[interaction('too_long')] })).cookable_now[0].score_total).toBeLessThan(neutral);
    expect((await suggest({ ...base,recipe_interactions:[interaction('not_today')] })).verify_suggestions![0].reason_codes.some(item=>item.code==='FEEDBACK')).toBe(true);
    expect((await suggest({ ...base,recipe_interactions:[interaction('not_today',1.01)] })).cookable_now).toHaveLength(1);
  });
  test('authoritative profile and stock change cache identity; cache key contains no raw dietary text',async()=>{
    const tables:Record<string,unknown>={ nutrition_profiles:stored(),recipes:[recipe('r','Riz','Riz')],inventory:[lot('r')] };
    const writer={ readCache:jest.fn(async(_user:string,_key:string)=>({ hit:null,expired:false })),writeCache:jest.fn(),recordEvent:jest.fn(async(_input:{ requestText:unknown })=> 'event') };
    const ctx={ userId:USER,userClient:clientFor(tables) as unknown as SupabaseClient,now:NOW,eventWriter:writer as unknown as RecommendationEventWriter };
    const engine=new RecommendationEngine();
    await engine.suggestForUser(ctx,{ query:'allergie lait' });
    tables.nutrition_profiles=stored(profile({ allergies:['lait'] }),2);
    await engine.suggestForUser(ctx,{ query:'allergie lait' });
    const keys=writer.readCache.mock.calls.map(call=>call[1]);
    expect(keys[0]).not.toEqual(keys[1]);expect(keys[0]).not.toContain('lait');
    expect(writer.recordEvent.mock.calls[0][0]).toMatchObject({ requestText:null });
  });
  test('profile service detects a foreign row even with a forged test client',async()=>{
    await expect(new NutritionProfileService(clientFor({ nutrition_profiles:{ ...stored(),user_id:OTHER } }) as unknown as SupabaseClient).read(USER)).rejects.toMatchObject({ code:'PROFILE_UNAVAILABLE' });
  });
});

describe('constraints said in the current request',()=>{
  const tables=()=>({ recipes:[recipe('cream','Poulet à la crème','Crème'),recipe('rice','Riz','Riz')],inventory:[lot('cream'),lot('rice')] });
  const proposed=(result:Awaited<ReturnType<typeof suggest>>)=>[...result.cookable_now,...result.almost_cookable].map(item=>item.id);
  test('« Et sans crème ? » leaves out recipes with cream and reports the exclusion',async()=>{
    const result=await suggest(tables(),{ requestText:'Et sans crème ?' });
    expect(proposed(result)).toEqual(['rice']);
    expect(result.excluded_suggestions!.map(item=>item.id)).toEqual(['cream']);
    expect(result.request_constraints).toEqual({ exclude_ingredients:['crème'],diets:[] });
    expect(result.has_constraints).toBe(true);
  });
  test('exclusions passed by the tool apply when the sentence no longer says them',async()=>{
    const result=await suggest(tables(),{ requestText:'Et en moins de 20 minutes ?',excludedIngredients:['Crème'] });
    expect(proposed(result)).toEqual(['rice']);
    expect(result.request_constraints).toEqual({ exclude_ingredients:['crème'],diets:[] });
  });
  test('a diet said for tonight applies',async()=>{
    const result=await suggest({ recipes:[recipe('pasta','Pâtes','Farine'),recipe('rice','Riz','Riz')],inventory:[lot('pasta'),lot('rice')] },{ requestText:'Un plat sans gluten ce soir' });
    expect(proposed(result)).toEqual(['rice']);
    expect(result.request_constraints).toEqual({ exclude_ingredients:[],diets:['gluten_free'] });
  });
  test('a phrase naming no food (« sans os ») neither filters nor demotes recipes',async()=>{
    const sauce={ recipes:[recipe('sauce','Plat maison','Sauce maison')],inventory:[lot('sauce')] };
    const result=await suggest(sauce,{ requestText:'Poulet sans os' });
    expect(proposed(result)).toEqual(['sauce']);
    expect(result.request_constraints).toBeUndefined();
    // With a real exclusion the unknown blend is only « to verify », never certified.
    const cream=await suggest(sauce,{ requestText:'sans crème ça serait mieux' });
    expect(cream.request_constraints).toEqual({ exclude_ingredients:['crème'],diets:[] });
    expect(cream.verify_suggestions!.map(item=>item.id)).toEqual(['sauce']);
  });
  test('without a request constraint nothing changes',async()=>{
    const result=await suggest(tables(),{ requestText:'Propose-moi un dîner' });
    expect(proposed(result).sort()).toEqual(['cream','rice']);
    expect(result.request_constraints).toBeUndefined();
  });
  test('a result shaped by the request is neither cached nor stored with its terms',async()=>{
    const writer={ readCache:jest.fn(async()=>({ hit:null,expired:false })),writeCache:jest.fn(),recordEvent:jest.fn(async()=>'event') };
    await suggest(tables(),{ requestText:'sans arachides',excludedIngredients:['crème'] },{ eventWriter:writer as unknown as RecommendationEventWriter });
    expect(writer.writeCache).not.toHaveBeenCalled();
    expect(writer.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ requestText:null }));
  });
});

// iPhone 2026-11-08: « Aucune idée vérifiée » with 192 lots. Lots added by hand, by the assistant or
// from a photo keep date_kind and quantity_quality 'unknown', and that alone sent every recipe to « à vérifier ».
describe('home ideas with everyday lots',()=>{
  // As the inventory table returns them: the product name comes from the products relation.
  const everyday=(pid:string,values:Partial<QualifiedLot>={})=>({ ...lot(pid,{ date_kind:'unknown',quantity_quality:'unknown',...values }),products:{ name:pid,unit_type:'kg' } });
  test('an unknown date kind or unmeasured quantity keeps the recipe cookable and names what to check',async()=>{
    const result=await suggest({ recipes:[recipe('r','Riz','Riz','riz')],inventory:[everyday('riz')] });
    expect(result.cookable_now.map(item=>item.id)).toEqual(['r']);
    expect(result.cookable_now[0].availability.uncertainties).toEqual(['Date à vérifier : riz.','Quantité à vérifier dans ton stock : riz.']);
  });
  test('an ingredient in stock in a unit that does not convert counts as present, to check',async()=>{
    const r=recipe('r','Riz à l’ail','Riz','riz');
    r.recipe_ingredients!.push({ id:'r:1',ingredient_name:'Ail',quantity:2,unit:'gousse',inventory_product_id:'ail',is_essential:true });
    const result=await suggest({ recipes:[r],inventory:[lot('riz'),lot('ail',{ unit:'g',quantity:100 })] });
    expect(result.cookable_now.map(item=>item.id)).toEqual(['r']);
    expect(result.cookable_now[0]).toMatchObject({ missing_count:0,unknown_ingredients:['Ail'] });
    expect(result.cookable_now[0].availability.uncertainties).toContain('En stock, quantité à vérifier : Ail.');
  });
  test('two ingredients to buy make it almost cookable, whatever the lots say',async()=>{
    const r=recipe('r','Riz sauté','Riz','riz');
    for (const [index,name] of ['Poivron','Gingembre'].entries()) r.recipe_ingredients!.push({ id:`r:${index+1}`,ingredient_name:name,quantity:100,unit:'g',inventory_product_id:name,is_essential:true });
    const result=await suggest({ recipes:[r],inventory:[everyday('riz')] });
    expect(result.almost_cookable.map(item=>item.id)).toEqual(['r']);
    expect(result.almost_cookable[0].missing_ingredients).toEqual(['Poivron','Gingembre']);
  });
  test('a date soon counts for anti-waste even when its kind is unknown',async()=>{
    const result=await suggest({ recipes:[recipe('r','Riz','Riz','riz')],inventory:[everyday('riz',{ expiry_date:'2026-10-11' })] });
    expect(result.cookable_now[0].reasons).toContain('Utilise riz, date renseignée dans 2 jour(s).');
  });
  test('at dinner, lunch and « main » recipes are candidates, dinner ones first; desserts are not',async()=>{
    const typed=(id:string,meal_type:string)=>({ ...recipe(id,id,'Riz','riz'),meal_type });
    const result=await suggest({ recipes:[typed('lunch','lunch'),typed('dessert','dessert'),typed('main','main'),typed('dinner','dinner'),typed('dîner','dîner')],inventory:[lot('riz',{ quantity:10 })] },
      { mealType:'dinner',limitPerBucket:5 });
    expect(result.cookable_now.map(item=>item.id).slice(0,2).sort()).toEqual(['dinner','dîner']);
    expect(result.cookable_now.map(item=>item.id).sort()).toEqual(['dinner','dîner','lunch','main']);
  });
});

// iPhone 2026-11-08, still empty after #95: an old user_meal_preferences row (no allergy, no diet,
// the table defaults 30 + 45 min) sent every recipe to « à vérifier » and hid those over 75 min.
describe('old preferences without restrictions',()=>{
  const old={ allergies:[],dietary_restrictions:[],max_prep_time:30,max_cook_time:45,family_size:2,equipment_available:['four','plaques','frigo','micro-ondes'],cooking_skill_level:'intermediate' };
  const long={ ...recipe('long','Biryani','Riz','riz'),prep_time:30,cook_time:60 };
  test('have nothing to confirm: the recipes are ideas, and the long one is ranked, not hidden',async()=>{
    const result=await suggest({ nutrition_profiles:null,user_meal_preferences:old,recipes:[recipe('quick','Riz','Riz','riz'),long],inventory:[lot('riz',{ quantity:10 })] });
    expect(result.cookable_now.map(item=>item.id)).toEqual(['quick','long']);
    expect(result.verify_suggestions).toEqual([]);
  });
  test('a time picked for this meal still filters',async()=>{
    const result=await suggest({ nutrition_profiles:null,user_meal_preferences:old,recipes:[recipe('quick','Riz','Riz','riz'),long],inventory:[lot('riz',{ quantity:10 })] },{ timeLimitMinutes:30 });
    expect(result.cookable_now.map(item=>item.id)).toEqual(['quick']);
  });
  test('an old allergy still asks to confirm the profile',async()=>{
    const result=await suggest({ nutrition_profiles:null,user_meal_preferences:{ ...old,allergies:['arachide'] },recipes:[recipe('quick','Riz','Riz','riz')],inventory:[lot('riz')] });
    expect(result.cookable_now).toEqual([]);
    expect(result.verify_suggestions![0].constraints.limitations.join(' ')).toContain('Confirmez');
  });
});
