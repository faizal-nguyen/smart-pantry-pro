import { RecipeLifecycleCommandSchema,RecipeLifecycleSnapshotSchema,type RecipeLifecycleCommand,type RecipeLifecycleSnapshot } from '@smart/shared';
import { apiGet,apiPost } from '@/lib/api';
import { readOwnedValue,writeOwnedValue,removeOwnedValue } from '@/lib/ownedStorage';
import { supabase } from '@/integrations/supabase/client';
export function pendingRecipeChoice(owner:string):RecipeLifecycleCommand|null {
  const saved=readOwnedValue<unknown>(owner,'recipe-library-choice',null);
  return saved?RecipeLifecycleCommandSchema.parse(saved):null;
}
async function checkOwner(owner:string){if((await supabase.auth.getSession()).data.session?.user.id!==owner)throw new Error('Le compte a changé. Reprends ce choix avec son propriétaire.');}
export async function readRecipeLifecycle(owner:string,signal?:AbortSignal):Promise<RecipeLifecycleSnapshot>{
  const result=await apiGet<unknown>('/v1/recommendations/library-state',undefined,{expectedUserId:owner,signal});
  await checkOwner(owner);return RecipeLifecycleSnapshotSchema.parse(result);
}
export async function recordRecipeLifecycle(owner:string,command:RecipeLifecycleCommand){
  const checked=RecipeLifecycleCommandSchema.parse(command);
  const result=await apiPost<{ids:string[]}>('/v1/recommendations/library-events',{commands:[checked]},{expectedUserId:owner});
  await checkOwner(owner);if(result.ids?.length!==1||result.ids[0]!==checked.id)throw new Error('Action à vérifier avant de recommencer.');
}
export async function saveRecipeChoice(owner:string,input:Omit<RecipeLifecycleCommand,'id'>){
  const previous=pendingRecipeChoice(owner);
  if(previous&&(previous.action!==input.action||previous.recipe.id!==input.recipe.id||previous.recipe.source!==input.recipe.source))throw new Error('Un choix précédent reste à confirmer. Utilise « Vérifier mon dernier choix ».');
  const command=previous??RecipeLifecycleCommandSchema.parse({...input,id:crypto.randomUUID()});
  writeOwnedValue(owner,'recipe-library-choice',command);
  await recordRecipeLifecycle(owner,command);removeOwnedValue(owner,'recipe-library-choice');
}
