import type {SupabaseClient} from '@supabase/supabase-js';
import {RecipeLifecycleService} from '../RecipeLifecycleService.js';
import {RecommendationEngine} from '../RecommendationEngine.js';
const OWNER='11111111-1111-4111-8111-111111111111',OTHER='22222222-2222-4222-8222-222222222222';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const recipe={id:id(1),source:'user_recipes' as const};
let readable:jest.SpyInstance;
beforeEach(()=>{readable=jest.spyOn(RecommendationEngine.prototype,'readRecipeForUser').mockResolvedValue({id:recipe.id} as never);jest.spyOn(RecommendationEngine.prototype,'libraryConstraintsForUser').mockResolvedValue([]);});
afterEach(()=>jest.restoreAllMocks());
function fixture(rows:Record<string,unknown>[]=[]){
 const tables:Record<string,Record<string,unknown>[]>={recipe_interactions:rows,cooking_journal_entries:[]};
 const visited:string[]=[];let fail=false;
 const client={from:(table:string)=>{
  visited.push(table);const filters:((r:Record<string,unknown>)=>boolean)[]=[];let start=0,end=Infinity;let inserts:Record<string,unknown>[]|null=null;
  const q={select:()=>q,lte:(k:string,v:string)=>{filters.push(r=>String(r[k])<=v);return q;},eq:(k:string,v:unknown)=>{filters.push(r=>r[k]===v);return q;},in:(k:string,v:unknown[])=>{filters.push(r=>v.includes(r[k]));return q;},contains:(k:string,v:Record<string,unknown>)=>{filters.push(r=>Object.entries(v).every(([key,value])=>(r[k] as Record<string,unknown>)?.[key]===value));return q;},is:(k:string,v:unknown)=>{filters.push(r=>(r[k]??null)===v);return q;},order:()=>q,range:(a:number,b:number)=>{start=a;end=b;return q;},insert:(data:Record<string,unknown>[])=>{inserts=data;return q;},then:(resolve:(value:unknown)=>unknown)=>{
   if(fail)return Promise.resolve({data:null,error:{code:'DOWN'}}).then(resolve);
   if(inserts){if(inserts.some(r=>tables[table].some(old=>old.id===r.id)))return Promise.resolve({data:null,error:{code:'23505'}}).then(resolve);tables[table].push(...inserts.map(r=>({...r,created_at:'2026-11-13T12:00:00.000Z'})));}
   return Promise.resolve({data:tables[table].filter(r=>filters.every(f=>f(r))).slice(start,end+1),error:null}).then(resolve);
  }};return q;
 }} as unknown as SupabaseClient;
 return {client,tables,visited,down:()=>{fail=true;}};
}
test('queue retries reuse the receipt, validate access once, and never write stock or a cooking journal',async()=>{
 const f=fixture(),service=new RecipeLifecycleService(f.client,OWNER,()=>new Date('2026-11-14T12:00:00Z')),command={id:id(2),recipe,action:'queue'};
 await expect(service.write({commands:[command]})).resolves.toEqual({ids:[id(2)]});
 await service.write({commands:[command]});expect(f.tables.recipe_interactions).toHaveLength(1);expect(readable).toHaveBeenCalledTimes(1);
 expect(readable).toHaveBeenCalledWith(expect.objectContaining({userId:OWNER,userClient:f.client}),recipe);
 expect(new Set(f.visited)).toEqual(new Set(['recipe_interactions']));
});
test('a reused command with a different payload is refused and inaccessible recipes cannot be queued',async()=>{
 const f=fixture(),service=new RecipeLifecycleService(f.client,OWNER,()=>new Date('2026-11-14T12:00:00Z')),c={id:id(2),recipe,action:'queue'};
 await service.write({commands:[c]});await expect(service.write({commands:[{...c,action:'cooked'}]})).rejects.toMatchObject({code:'IDEMPOTENCY_CONFLICT'});
 readable.mockRejectedValue(new Error('No access'));await expect(service.write({commands:[{...c,id:id(3)}]})).rejects.toThrow('No access');expect(f.tables.recipe_interactions).toHaveLength(1);
});
test('full pagination retains an old queue, excludes another owner, and merges actual non-voided preparations',async()=>{
 const rows=Array.from({length:550},(_,i)=>({id:id(i+10),user_id:OWNER,recipe_reference:recipe,metadata:{library_lifecycle:true,action:'shown'},created_at:'2026-11-12T12:00:00.000Z'}));
 const f=fixture([...rows,{id:id(2),user_id:OWNER,recipe_reference:recipe,metadata:{library_lifecycle:true,action:'queue'},created_at:'2026-11-11T12:00:00.000Z'},{id:id(3),user_id:OTHER,recipe_reference:recipe,metadata:{library_lifecycle:true,action:'unqueue'},created_at:'2026-11-13T12:00:00.000Z'}]);
 const service=new RecipeLifecycleService(f.client,OWNER,()=>new Date('2026-11-14T12:00:00Z'));expect((await service.read()).recipes[0].queued_at).not.toBeNull();
 f.tables.cooking_journal_entries.push({id:id(999),user_id:OWNER,recipe_id:null,adjustments:{recipe_reference:recipe},cooked_at:'2026-11-13T12:00:00.000Z',voided_at:null},{id:id(1000),user_id:OWNER,recipe_id:recipe.id,cooked_at:'2026-11-13T12:00:00.000Z',voided_at:'2026-11-13T13:00:00.000Z'});
 expect((await service.read()).recipes[0]).toMatchObject({queued_at:null,cooked_count:1,last_cooked_at:'2026-11-13T12:00:00.000Z'});
});
test('read failures stay errors rather than fabricated empty state; deleted recipes can still be unqueued',async()=>{
 const f=fixture(),service=new RecipeLifecycleService(f.client,OWNER,()=>new Date('2026-11-14T12:00:00Z'));readable.mockRejectedValue(new Error('Deleted'));
 await expect(service.write({commands:[{id:id(2),recipe,action:'unqueue'}]})).resolves.toEqual({ids:[id(2)]});
 f.down();await expect(service.read()).rejects.toThrow();
});
