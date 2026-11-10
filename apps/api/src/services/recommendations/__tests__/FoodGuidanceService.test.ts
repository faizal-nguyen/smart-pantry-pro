import {emptyNutritionProfile} from '@smart/shared';
import {FoodGuidanceService} from '../FoodGuidanceService.js';
import {NutritionProfileService} from '../NutritionProfileService.js';
const OWNER='00000000-0000-4000-8000-000000000001';
const row=(id:string,name:string)=>({id,product_id:id,quantity:1,unit:'piece',notes:'Texte privé du stock',created_at:'2026-11-09T00:00:00Z',products:{id,name}});
afterEach(()=>jest.restoreAllMocks());
test('reads every page with the session owner, applies exclusions privately, and performs no write',async()=>{
 const settings=emptyNutritionProfile();settings.excludedIngredients=['carotte','endive'];
 jest.spyOn(NutritionProfileService.prototype,'read').mockResolvedValue({profile:{user_id:OWNER,version:1,schema_version:1,settings,updated_at:null,origin:'explicit'},legacyServerPresent:false} as never);
 const pages=[Array.from({length:200},(_,i)=>row('other-'+i,'Produit inconnu '+i)),[row('carrot','Carotte'),row('radish','Radis noir'),row('pollen','Pollen d’abeilles')]];
 const q={select:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),order:jest.fn().mockReturnThis(),range:jest.fn().mockImplementation(async()=>({data:pages.shift(),error:null}))};
 const client={from:jest.fn(()=>q),rpc:jest.fn()};
 const result=await new FoodGuidanceService().read(OWNER,client as never,{now:new Date('2026-11-10T12:00:00Z'),focus:'radis noir'});
 expect(q.range).toHaveBeenNthCalledWith(1,0,199);expect(q.range).toHaveBeenNthCalledWith(2,200,399);
 expect(q.eq.mock.calls.every(args=>args[0]==='user_id'&&args[1]===OWNER)).toBe(true);
 expect(result.facts[0].name).toBe('Radis noir');expect(result.facts.some(f=>f.name==='Carotte')).toBe(true);
 expect(result.daily_foods.some(f=>f.name==='Carotte')).toBe(false);
 expect(result.seasonal_ideas.some(i=>i.name==='Endive')).toBe(false);expect(result.seasonal_calendar.some(i=>i.name==='Carotte')).toBe(false);
 expect(JSON.stringify(result)).not.toMatch(/Texte privé|excludedIngredients|profile/);expect(client.rpc).not.toHaveBeenCalled();
});
test('a failed page does not produce an apparently complete stock report',async()=>{
 jest.spyOn(NutritionProfileService.prototype,'read').mockResolvedValue({profile:{settings:emptyNutritionProfile()}} as never);
 const q={select:jest.fn().mockReturnThis(),eq:jest.fn().mockReturnThis(),order:jest.fn().mockReturnThis(),range:jest.fn().mockResolvedValue({error:new Error('private diagnostic')})};
 await expect(new FoodGuidanceService().read(OWNER,{from:()=>q} as never)).rejects.toThrow('private diagnostic');
});
