import { RecipeLifecycleCommandSchema,RecipeLifecycleWriteSchema,foldRecipeLifecycle,type RecipeLifecycleEvent,type RecipeLifecycleCommand } from '@smart/shared';
import { isDeepStrictEqual } from 'node:util';
import type { SupabaseClient } from '@supabase/supabase-js';
import { RecommendationEngine } from './RecommendationEngine.js';
import { ProfileError } from './NutritionProfileService.js';
const PAGE=500,MAX=20000;
type SelectQuery=ReturnType<ReturnType<SupabaseClient['from']>['select']>;
interface InteractionRow {id:string;recipe_reference:unknown;metadata:Record<string,unknown>|null;created_at:string}
interface JournalRow {id:string;recipe_id:string|null;cooked_at:string;adjustments:{recipe_reference?:unknown}|null}
/** Reuse the owned interaction journal; queue intentions never write stock or imply a cooking session. */
export class RecipeLifecycleService {
  constructor(private client:SupabaseClient,private owner:string,private now:()=>Date=()=>new Date()){}
  private async pages<T>(table:string,columns:string,filter:(query:SelectQuery)=>SelectQuery){
    const all:T[]=[];
    const cutoff=this.now().toISOString();
    for(let offset=0;offset<MAX;offset+=PAGE){
      const {data,error}=await filter(this.client.from(table).select(columns).eq('user_id',this.owner)).lte(table==='recipe_interactions'?'created_at':'cooked_at',cutoff).order('id').range(offset,offset+PAGE-1);
      if(error)throw new ProfileError('LIBRARY_HISTORY_UNAVAILABLE',503);
      all.push(...((data??[]) as T[]));if((data??[]).length<PAGE)return all;
    }
    // Never claim that an incomplete queue or cooking history is empty.
    throw new ProfileError('LIBRARY_HISTORY_TOO_LARGE',503);
  }
  async read(){
    const [rows,history,eligibility]=await Promise.all([
      this.pages<InteractionRow>('recipe_interactions','id,recipe_reference,metadata,created_at',q=>q.contains('metadata',{library_lifecycle:true})),
      this.pages<JournalRow>('cooking_journal_entries','id,recipe_id,cooked_at,adjustments',q=>q.is('voided_at',null)),
      new RecommendationEngine().libraryConstraintsForUser({userId:this.owner,userClient:this.client}),
    ]);
    const events:RecipeLifecycleEvent[]=[];
    for(const row of rows){
      const parsed=RecipeLifecycleCommandSchema.safeParse({id:row.id,recipe:row.recipe_reference,action:row.metadata?.action});
      if(parsed.success&&Number.isFinite(Date.parse(row.created_at)))events.push({...parsed.data,at:new Date(row.created_at).toISOString()});
    }
    for(const row of history){
      const parsed=RecipeLifecycleCommandSchema.safeParse({id:row.id,recipe:row.adjustments?.recipe_reference??{id:row.recipe_id,source:'recipes'},action:'cooked'});
      if(parsed.success&&Number.isFinite(Date.parse(row.cooked_at)))events.push({...parsed.data,at:new Date(row.cooked_at).toISOString()});
    }
    return {...foldRecipeLifecycle(events),eligibility};
  }
  async write(input:unknown){
    const {commands}=RecipeLifecycleWriteSchema.parse(input);
    const ids=commands.map(c=>c.id);
    const existing=await this.client.from('recipe_interactions').select('id,recipe_reference,metadata').eq('user_id',this.owner).in('id',ids);
    if(existing.error)throw new ProfileError('LIBRARY_WRITE_UNAVAILABLE',503);
    const same=(row:Pick<InteractionRow,'recipe_reference'|'metadata'>,c:RecipeLifecycleCommand)=>isDeepStrictEqual(row.recipe_reference,c.recipe)&&row.metadata?.library_lifecycle===true&&row.metadata?.action===c.action;
    for(const row of existing.data??[]){const command=commands.find(c=>c.id===row.id)!;if(!same(row,command))throw new ProfileError('IDEMPOTENCY_CONFLICT',409);}
    const pending=commands.filter(c=>!existing.data?.some(row=>row.id===c.id));
    // Ownership/access is resolved through the same reader as recipe detail. Removal
    // stays possible for a queued recipe that has since been deleted.
    const engine=new RecommendationEngine();
    for(const command of pending.filter(c=>c.action!=='unqueue'))await engine.readRecipeForUser({userId:this.owner,userClient:this.client},command.recipe);
    if(pending.length){
      const result=await this.client.from('recipe_interactions').insert(pending.map(c=>({
        id:c.id,user_id:this.owner,recipe_id:c.recipe.source==='recipes'?c.recipe.id:null,
        recipe_reference:c.recipe,interaction_type:c.action==='queue'?'accepted':c.action==='unqueue'?'dismissed':c.action==='shown'?'recommended':c.action,
        metadata:{library_lifecycle:true,action:c.action},
      })));
      // A duplicate from a concurrent identical retry is confirmed by readback below.
      if(result.error&&result.error.code!=='23505')throw new ProfileError('LIBRARY_WRITE_UNAVAILABLE',503);
    }
    const receipt=await this.client.from('recipe_interactions').select('id,recipe_reference,metadata').eq('user_id',this.owner).in('id',ids);
    if(receipt.error||commands.some(c=>!receipt.data?.some(row=>row.id===c.id&&same(row,c))))throw new ProfileError('LIBRARY_WRITE_UNCONFIRMED',503);
    return {ids};
  }
}
