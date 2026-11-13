import { useContext,useEffect,useRef } from 'react';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { calendarDate,RecipeLifecycleCommandSchema,recipeReferenceKey,type RecipeLifecycleCommand } from '@smart/shared';
import {RecipeLifecycleContext} from '@/contexts/RecipeLifecycleContext';
import {toast} from '@/hooks/use-toast';
import { useAuthenticatedUser } from './useAuthenticatedUser';
import {useOwnedValue} from '@/lib/ownedStorage';
import { readRecipeLifecycle,recordRecipeLifecycle,saveRecipeChoice } from '@/services/recipeLifecycle';
import { useAgentDbInvalidation,dispatchAgentDbChanged } from '@/lib/agentEvents';
export function useRecipeLifecycleData(){
  const owner=useAuthenticatedUser().id,client=useQueryClient();
  const key=['recipe-library-state',owner];
  const [saved,,storageError]=useOwnedValue<unknown>(owner,'recipe-library-choice',null);
  const parsed=saved?RecipeLifecycleCommandSchema.safeParse(saved):null;
  const pending=parsed?.success?parsed.data:null;
  const pendingError=storageError??(parsed&&!parsed.success?'Le choix conservé est illisible.':null);
  const query=useQuery({queryKey:key,queryFn:({signal})=>readRecipeLifecycle(owner,signal),staleTime:30000,refetchOnMount:true});
  useAgentDbInvalidation(['cooking_journal','recipe_interactions'],()=>{void client.invalidateQueries({queryKey:key});});
  const save=async(recipe:RecipeLifecycleCommand['recipe'],action:'queue'|'unqueue'|'cooked')=>{
    await saveRecipeChoice(owner,{recipe,action});
    await client.invalidateQueries({queryKey:key});
    if(action==='cooked')dispatchAgentDbChanged(['recipe_interactions']);
    else toast({title:action==='queue'?'Ajoutée à « À cuisiner bientôt »':'Retirée de « À cuisiner bientôt »'});
  };
  return {...query,save,pending,pendingError,stateFor:(recipe:RecipeLifecycleCommand['recipe'])=>query.data?.recipes.find(s=>recipeReferenceKey(s.recipe)===recipeReferenceKey(recipe))};
}
export function useRecipeLifecycle(){
  const value=useContext(RecipeLifecycleContext);if(!value)throw new Error('RecipeLifecycleProvider requis');return value;
}
/** Only cards actually visible for a second count. Hidden rails and preloaded pages do not. */
export function useRecipeExposure(owner:string|undefined,recipe:RecipeLifecycleCommand['recipe'],action:'shown'|'viewed'='shown',enabled=true){
  const element=useRef<HTMLLIElement>(null);
  const {id,source}=recipe;
  useEffect(()=>{
    if(!enabled||!owner)return;
    const recipe={id,source};
    const token=`recipe-exposure:${owner}:${action}:${recipeReferenceKey(recipe)}:${calendarDate()}`;
    let sent=false,active=true,timer:ReturnType<typeof setTimeout>|undefined;
    const send=()=>{
      try{if(sessionStorage.getItem(token))return;}catch{/* Tracking can work without session storage. */}
      if(sent||!active)return;sent=true;
      void recordRecipeLifecycle(owner,{id:crypto.randomUUID(),recipe,action}).then(()=>{if(active)try{sessionStorage.setItem(token,'1');}catch{/* Best effort. */}}).catch(()=>{/* Browsing remains available; never claim successful tracking. */});
    };
    if(action==='viewed'){timer=setTimeout(send,1000);return()=>{active=false;clearTimeout(timer);};}
    if(!element.current||typeof IntersectionObserver==='undefined')return;
    const observer=new IntersectionObserver(entries=>{clearTimeout(timer);if(entries.some(e=>e.isIntersecting&&e.intersectionRatio>=.5))timer=setTimeout(send,1000);},{threshold:.5});
    observer.observe(element.current);
    return()=>{active=false;clearTimeout(timer);observer.disconnect();};
  },[owner,id,source,action,enabled]);
  return element;
}
