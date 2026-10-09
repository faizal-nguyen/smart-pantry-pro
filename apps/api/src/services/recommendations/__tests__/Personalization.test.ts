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
    const memory={ getPreferenceSignals:jest.fn().mockResolvedValue({ likes:['Beurre'] }),getTopActiveMemories:jest.fn() };
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
  test('unknown dates and estimated quantities cannot promise verified freshness or sufficiency',()=>{
    const r=recipe('r','Riz','Riz','p');
    const result=evaluateAvailability(r,[lot('p',{ expiry_date:null,date_kind:'unknown',quantity_quality:'estimated' })],2,NOW);
    expect(result.status).toBe('verify');expect(result.uncertainties.join(' ')).toContain('estimée');
    expect(evaluateAvailability(r,[lot('p',{ unit:'unit' })],2,NOW).missing[0].reason).toBe('UNIT_INCOMPATIBLE');
  });
  test('unknown base portions, incompatible units and uncertain partial lots never become automatic shopping suggestions',async()=>{
    const scenarios=[
      { recipes:[{ ...recipe('r','Riz','Riz'),servings:null }],inventory:[] },
      { recipes:[recipe('r','Riz','Riz')],inventory:[lot('r',{ unit:'unit' })] },
      { recipes:[recipe('r','Riz','Riz')],inventory:[lot('r',{ quantity:.05,quantity_quality:'estimated' })] },
    ];
    for (const tables of scenarios) {
      const result=await suggest(tables,{ servings:4 });
      expect(result.cookable_now).toEqual([]);expect(result.almost_cookable).toEqual([]);
      expect(result.verify_suggestions![0].availability.status).toBe('verify');
    }
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
