import {foldRecipeLifecycle,compareRecipeRediscovery,RecipeLifecycleWriteSchema,type RecipeLifecycleEvent} from '@smart/shared';
import {selectRecipeShelves} from '../recipeRediscovery';
import type {Recipe} from '@/hooks/useRecipes';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const ref={id:id(1),source:'recipes' as const};
const event=(action:RecipeLifecycleEvent['action'],day:number,source=ref.source as RecipeLifecycleEvent['recipe']['source']):RecipeLifecycleEvent=>({id:id(day),recipe:{...ref,source},action,at:`2026-11-${String(day).padStart(2,'0')}T12:00:00.000Z`});
test('queue, viewing and preparation are distinct; confirmed cooking removes an earlier queue, later requeue survives',()=>{
 const state=foldRecipeLifecycle([event('queue',1),event('viewed',2),event('shown',3)]).recipes[0];
 expect(state).toMatchObject({queued_at:expect.any(String),last_cooked_at:null,cooked_count:0});
 expect(foldRecipeLifecycle([event('queue',1),event('cooked',4)]).recipes[0]).toMatchObject({queued_at:null,cooked_count:1});
 expect(foldRecipeLifecycle([event('queue',5),event('cooked',4)]).recipes[0].queued_at).toContain('11-05');
});
test('equal UUIDs in different sources remain separate and removing a queue preserves history',()=>{
 const result=foldRecipeLifecycle([event('cooked',1),event('queue',2),event('queue',3,'user_recipes'),event('unqueue',4)]);
 expect(result.recipes).toHaveLength(2);expect(result.recipes[0]).toMatchObject({queued_at:null,cooked_count:1});expect(result.recipes[1].queued_at).not.toBeNull();
});
test('commands reject foreign owner fields, unknown actions and duplicate identities',()=>{
 const c={id:id(1),recipe:ref,action:'queue'};
 expect(RecipeLifecycleWriteSchema.safeParse({commands:[{...c,user_id:id(2)}]}).success).toBe(false);
 expect(RecipeLifecycleWriteSchema.safeParse({commands:[c,c]}).success).toBe(false);
 expect(RecipeLifecycleWriteSchema.safeParse({commands:[{...c,action:'delete'}]}).success).toBe(false);
});
test('rediscovery reaches older unseen recipes beyond the first 200, respects safety, queue and actual exposure',()=>{
 const recipes=Array.from({length:460},(_,i)=>({id:id(i+1),source:'recipes',name:'Recette '+i,created_at:'2026-11-01',cuisine_category:['Française','Japonaise','Italienne'][i%3],prep_time:10,cook_time:50} as Recipe));
 const snapshot=foldRecipeLifecycle(Array.from({length:459},(_,i)=>({id:id(i+1),recipe:{id:id(i+1),source:'recipes' as const},action:'shown' as const,at:'2026-11-12T12:00:00.000Z'})));
 snapshot.eligibility=recipes.map(r=>({recipe:{id:r.id,source:'recipes'},status:'compatible'}));
 let shelves=selectRecipeShelves(recipes,snapshot,Date.parse('2026-11-13T13:00:00Z'));
 expect(shelves.rediscover[0].id).toBe(id(460));expect(new Set([...shelves.rediscover,...shelves.weekend].map(r=>r.id)).size).toBe(6);
 snapshot.eligibility[459].status='incompatible';snapshot.recipes[0].queued_at='2026-11-12T12:00:00.000Z';
 shelves=selectRecipeShelves(recipes,snapshot,Date.parse('2026-11-13T13:00:00Z'));
 expect([...shelves.rediscover,...shelves.weekend].some(r=>[id(460),id(1)].includes(r.id))).toBe(false);
 expect(compareRecipeRediscovery(undefined,snapshot.recipes[0])).toBeLessThan(0);
});
