import { z } from 'zod';
import { ConcreteRecipeReferenceSchema } from './recipe-evaluation.js';
export const RecipeLifecycleActionSchema = z.enum(['queue','unqueue','shown','viewed','cooked']);
export const RecipeLifecycleCommandSchema = z.object({
  id:z.string().uuid(),recipe:ConcreteRecipeReferenceSchema,action:RecipeLifecycleActionSchema,
}).strict();
export const RecipeLifecycleWriteSchema = z.object({commands:z.array(RecipeLifecycleCommandSchema).min(1).max(20)}).strict()
  .refine(value=>new Set(value.commands.map(c=>c.id)).size===value.commands.length,'Identifiants répétés');
export type RecipeLifecycleCommand = z.infer<typeof RecipeLifecycleCommandSchema>;
export const RecipeLifecycleStateSchema = z.object({
  recipe:ConcreteRecipeReferenceSchema,queued_at:z.string().datetime().nullable(),
  last_shown_at:z.string().datetime().nullable(),last_viewed_at:z.string().datetime().nullable(),
  last_cooked_at:z.string().datetime().nullable(),cooked_count:z.number().int().nonnegative(),
});
export const RecipeLifecycleSnapshotSchema = z.object({recipes:z.array(RecipeLifecycleStateSchema),eligibility:z.array(z.object({recipe:ConcreteRecipeReferenceSchema,status:z.enum(['compatible','incompatible','verify'])})).default([])});
export type RecipeLifecycleState = z.infer<typeof RecipeLifecycleStateSchema>;
export type RecipeLifecycleSnapshot = z.infer<typeof RecipeLifecycleSnapshotSchema>;
export type RecipeLifecycleEvent = RecipeLifecycleCommand & {at:string};
export const recipeReferenceKey = (r:z.infer<typeof ConcreteRecipeReferenceSchema>)=>`${r.source}:${r.id}`;
/** Fold only confirmed actions. A view is never a preparation. A later queue wins over an older cook. */
export function foldRecipeLifecycle(events:RecipeLifecycleEvent[]):RecipeLifecycleSnapshot {
  const states=new Map<string,RecipeLifecycleState>();
  for(const event of [...events].sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id))){
    const key=recipeReferenceKey(event.recipe),state=states.get(key)??{
      recipe:event.recipe,queued_at:null,last_shown_at:null,last_viewed_at:null,last_cooked_at:null,cooked_count:0,
    };
    if(event.action==='queue')state.queued_at=event.at;
    if(event.action==='unqueue')state.queued_at=null;
    if(event.action==='shown')state.last_shown_at=event.at;
    if(event.action==='viewed')state.last_viewed_at=event.at;
    if(event.action==='cooked'){state.last_cooked_at=event.at;state.cooked_count++;state.queued_at=null;}
    states.set(key,state);
  }
  return {recipes:[...states.values()],eligibility:[]};
}
/** Oldest exposure first; stable IDs make equal-date imports reachable without random reshuffling. */
export function compareRecipeRediscovery(a:RecipeLifecycleState|undefined,b:RecipeLifecycleState|undefined):number {
  return (a?.last_shown_at??'').localeCompare(b?.last_shown_at??'') ||
    (a?.last_viewed_at??'').localeCompare(b?.last_viewed_at??'') ||
    (a?.last_cooked_at??'').localeCompare(b?.last_cooked_at??'');
}
