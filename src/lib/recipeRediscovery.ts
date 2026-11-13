import { compareRecipeRediscovery,recipeDurationMinutes,recipeReferenceKey,type RecipeLifecycleSnapshot } from '@smart/shared';
import type { Recipe } from '@/hooks/useRecipes';
export function selectRecipeShelves(recipes:Recipe[],snapshot:RecipeLifecycleSnapshot,now=Date.now()){
  const state=new Map(snapshot.recipes.map(s=>[recipeReferenceKey(s.recipe),s]));
  const allowed=new Set(snapshot.eligibility.filter(s=>s.status==='compatible').map(s=>recipeReferenceKey(s.recipe)));
  const key=(r:Recipe)=>recipeReferenceKey({id:r.id,source:r.source??'recipes'});
  const sorted=recipes.filter(r=>allowed.has(key(r))&&!state.get(key(r))?.queued_at).sort((a,b)=>compareRecipeRediscovery(state.get(key(a)),state.get(key(b)))||a.created_at.localeCompare(b.created_at)||key(a).localeCompare(key(b)));
  const fresh=sorted.filter(r=>{const s=state.get(key(r));return ![s?.last_shown_at,s?.last_cooked_at].some(at=>at&&now-Date.parse(at)<86400000);});
  // When every recipe has recently been shown, offer the least recent again.
  const pool=fresh.length?fresh:sorted;
  const takeDiverse=(rows:Recipe[],count:number)=>{
    const result:Recipe[]=[],cuisines=new Set<string>();
    for(const r of rows){const cuisine=(r.cuisine_category??'').toLocaleLowerCase('fr');if(!cuisines.has(cuisine)){result.push(r);cuisines.add(cuisine);}if(result.length===count)return result;}
    for(const r of rows){if(!result.includes(r))result.push(r);if(result.length===count)break;}return result;
  };
  const rediscover=takeDiverse(pool,3),chosen=new Set(rediscover.map(key));
  const weekend=takeDiverse(pool.filter(r=>!chosen.has(key(r))&&(recipeDurationMinutes(r)??0)>=45),3);
  return {rediscover,weekend};
}
