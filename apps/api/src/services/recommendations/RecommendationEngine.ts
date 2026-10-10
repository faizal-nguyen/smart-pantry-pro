import { createHash } from 'node:crypto';
import { mapLibraryRecipe,resolveRecipeImageUrl,normalizeIngredientName,calendarDaysUntil,calendarDate,type LibraryRecipeRow,type RecipeCatalogRow,type RecipeEvaluationInput,type RecipeEvaluation,type RecommendationReason } from '@smart/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MemoryService } from '../assistant/MemoryService.js';
import type { RecommendationEventWriter } from './RecommendationEventWriter.js';
import { extractRecipeFacets } from '../recipes/RecipeFacetExtractor.js';
import { NutritionProfileService,ProfileError } from './NutritionProfileService.js';
import { qualifyLots,scoreExplicitTaste,scoreNutritionGoal,vegetableCriterion,normalizeEquipment,type IngredientProduct,type QualifiedLot } from './PersonalizationScoring.js';
import { evaluateRecipe } from './RecipeEvaluation.js';
import type { RecommendationContext,RecommendationResult,RecipeWithIngredients,RecommendedRecipeView,RecommendationScoreParts } from './types.js';

export interface RecommendationExecutionContext {
  userId:string;userClient:SupabaseClient;serviceClient?:SupabaseClient;now?:Date;
  conversationId?:string;assistantMessageId?:string;eventWriter?:RecommendationEventWriter;memoryService?:MemoryService;
}
type Interaction={ recipe_id:string|null;recipe_reference?:{ id:string;source:string }|null;feedback?:string|null;interaction_type:string;created_at:string };
type History={ recipe_id:string|null;cooked_at:string;adjustments?:{ recipe_reference?:{ id:string;source:string } };voided_at?:string|null };
const fingerprint=(value:unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const recipeColumns='id,user_id,is_public,name,description,prep_time,cook_time,rest_time,servings,image_url,cuisine_category,meal_type,tags,difficulty,required_equipment,meal_style,created_at,updated_at,recipe_ingredients(id,ingredient_name,quantity,unit,inventory_product_id,is_essential)';
const stockFingerprint=(lots:QualifiedLot[]) => fingerprint([...lots].sort((a,b)=>a.id.localeCompare(b.id)));
const clamp=(value:number) => Math.max(0,Math.min(1,value));

/** The only scoring pipeline: explicit profile first, constraints before ranking,
 * qualified original lots, structured evidence, and no LLM or inferred-health input. */
export class RecommendationEngine {
  async evaluateForUser(ctx:RecommendationExecutionContext,input:RecipeEvaluationInput):Promise<RecipeEvaluation> {
    const [recipe,{ profile,legacyServerPresent },lots]=await Promise.all([
      this.loadRecipe(ctx,input.recipe),new NutritionProfileService(ctx.userClient).read(ctx.userId),this.loadInventory(ctx),
    ]);
    const ids=[...new Set((recipe.recipe_ingredients ?? []).map(item=>item.inventory_product_id).filter((id):id is string=>!!id))];
    const products=await this.loadProducts(ctx,ids);
    return evaluateRecipe(recipe,{ profile,settings:profile.settings,legacyServerPresent,lots,products,servings:input.servings,stockVersion:stockFingerprint(lots),now:ctx.now ?? new Date() });
  }

  async suggestForUser(ctx:RecommendationExecutionContext,input:RecommendationContext):Promise<RecommendationResult> {
    const { profile,legacyServerPresent }=await new NutritionProfileService(ctx.userClient).read(ctx.userId);
    const now=ctx.now ?? new Date(),settings={ ...profile.settings,diets:[...profile.settings.diets] };
    if (input.dietaryFlag==='vegetarien' && !settings.diets.includes('vegetarian')) settings.diets.push('vegetarian');
    if (input.dietaryFlag==='vegan' && !settings.diets.includes('vegan')) settings.diets.push('vegan');
    const [recipes,lots,interactions,history]=await Promise.all([this.loadRecipes(ctx,input),this.loadInventory(ctx),this.loadInteractions(ctx),this.loadHistory(ctx)]);
    const productIds=[...new Set(recipes.flatMap(recipe=>(recipe.recipe_ingredients ?? []).map(item=>item.inventory_product_id).filter(Boolean)))];
    const products=await this.loadProducts(ctx,productIds);
    const stockVersion=stockFingerprint(lots);
    // Read authoritative inputs before cache: profile, date, edited recipes, product
    // provenance, feedback and cooked history all participate, even on direct writes.
    const key='v10-03a:'+fingerprint({ owner:ctx.userId,profile,stockVersion,day:calendarDate(now),input:{ ...input,requestText:undefined },recipes,products:[...products],interactions,history });
    if (ctx.eventWriter) {
      try { const cached=await ctx.eventWriter.readCache(ctx.userId,key);if (cached.hit && !cached.expired && cached.hit.result.pipeline_version===3) return cached.hit.result; } catch { /* Fresh computation remains authoritative. */ }
    }
    const limit=Math.min(20,input.limitPerBucket ?? 3),threshold=input.almostThreshold ?? 3;
    const effectiveTime=input.timeLimitMinutes ?? settings.usualTimeMinutes ?? (input.goal==='quick' || settings.goals.includes('quick') ? 20 : undefined);
    const cookable:RecommendedRecipeView[]=[],almost:RecommendedRecipeView[]=[],verify:RecommendedRecipeView[]=[],excluded:RecommendedRecipeView[]=[],recent:RecommendedRecipeView[]=[];
    for (const recipe of recipes) {
      const servings=input.servings ?? settings.usualServings ?? (recipe.servings && recipe.servings>0 ? recipe.servings : null);
      const evaluation=evaluateRecipe(recipe,{ profile,settings,legacyServerPresent,lots,products,servings,stockVersion,now });
      const { duration_minutes:minutes,constraints,availability,nutrition }=evaluation;
      const taste=scoreExplicitTaste(recipe,settings);
      const reasons:RecommendationReason[]=[],unavailable:string[]=[];
      const essential=(recipe.recipe_ingredients ?? []).filter(item=>item.is_essential!==false);
      const gaps=availability.missing.filter(item=>item.is_essential),unknown=gaps.filter(item=>['QUANTITY_UNKNOWN','UNIT_UNKNOWN','UNIT_INCOMPATIBLE'].includes(item.reason));
      const stockScore=essential.length ? clamp(1-gaps.length/essential.length) : 0;
      reasons.push({ code:availability.status==='available' ? 'STOCK_AVAILABLE' : availability.status==='missing' ? 'STOCK_MISSING' : 'STOCK_UNCERTAIN',text:availability.status==='available' ? 'Quantités et lots utilisables renseignés pour les portions demandées.' : availability.status==='missing' ? `${availability.missing.length} ingrédient(s) à acheter ou vérifier.` : 'Stock présent ; dates ou quantités à vérifier.' });
      const eligible=qualifyLots(lots,now).eligible,used=new Set(availability.allocations.map(item=>item.inventory_id));
      const dated=eligible.filter(lot=>used.has(lot.id) && lot.date_kind && lot.date_kind!=='unknown' && calendarDaysUntil(lot.expiry_date,now)!==null);
      const near=dated.filter(lot=>{ const days=calendarDaysUntil(lot.expiry_date,now)!;return days>=0 && days<=(input.nearExpiryDays ?? 7); });
      const expiry=near.length ? Math.max(...near.map(lot=>{ const days=calendarDaysUntil(lot.expiry_date,now)!;return days===0 ? 1 : days<=3 ? 0.8 : 0.4; })) : 0;
      if (near.length) reasons.push({ code:'NEAR_DATE',text:`Utilise ${near[0].product_name}, date renseignée dans ${calendarDaysUntil(near[0].expiry_date,now)} jour(s).` });
      else if (!dated.length) unavailable.push('expiry');
      if (minutes===null) { unavailable.push('time');reasons.push({ code:'TIME_UNKNOWN',text:'Durée totale à vérifier.' }); }
      else if (effectiveTime && minutes<=effectiveTime) reasons.push({ code:'TIME_FITS',text:`Durée enregistrée ${minutes} min, dans les ${effectiveTime} min disponibles.` });
      for (const text of taste.reasons) reasons.push({ code:'DECLARED_TASTE',text });
      if (!taste.available) unavailable.push('taste');
      const matching=(interactions ?? []).filter(item=>(item.recipe_reference ? item.recipe_reference.id===recipe.id && item.recipe_reference.source===(recipe.source ?? 'recipes') : recipe.source==='recipes' && item.recipe_id===recipe.id));
      const latest=matching.find(item=>!!item.feedback);
      const daysAgo=latest ? Math.max(0,(now.getTime()-new Date(latest.created_at).getTime())/86400000) : Infinity;
      let feedbackScore=0;
      if (latest?.feedback==='repeat') { feedbackScore=0.6;reasons.push({ code:'FEEDBACK',text:'Vous avez choisi « à refaire ».' }); }
      if (latest?.feedback==='dislike') { feedbackScore=-1;reasons.push({ code:'FEEDBACK',text:'Vous avez indiqué ne pas aimer cette recette.' }); }
      if (latest?.feedback==='too_long' && daysAgo<=30) { feedbackScore=effectiveTime ? -0.8 : -0.4;reasons.push({ code:'FEEDBACK',text:'Vous avez trouvé cette recette trop longue.' }); }
      const cooked=(history ?? []).filter(item=>item.adjustments?.recipe_reference ? item.adjustments.recipe_reference.id===recipe.id && item.adjustments.recipe_reference.source===recipe.source : recipe.source==='recipes' && item.recipe_id===recipe.id);
      const novelty=history?.length ? cooked.length ? clamp(Math.min(30,(now.getTime()-new Date(cooked[0].cooked_at).getTime())/86400000)/30) : 1 : null;
      if (novelty===null) unavailable.push('variety');else if (settings.goals.includes('variety') && !cooked.length) reasons.push({ code:'VARIETY',text:'Pas cuisinée dans l’historique disponible.' });
      const nutritionFit=scoreNutritionGoal(nutrition,settings,input.goal);
      if (nutritionFit===null) unavailable.push('nutrition');
      else reasons.push({ code:'NUTRITION_GOAL',text:`Estimation par portion : ${nutrition.per_serving.proteinG ?? '—'} g de protéines, ${nutrition.per_serving.fiberG ?? '—'} g de fibres ; objectif culinaire choisi.` });
      if (settings.equipment.length && !recipe.required_equipment) { unavailable.push('equipment');reasons.push({ code:'EQUIPMENT_UNKNOWN',text:'Matériel de la recette non renseigné.' }); }
      const missingEquipment=recipe.required_equipment?.filter(item=>!settings.equipment.some(value=>normalizeEquipment(value)===normalizeEquipment(item))) ?? [];
      const craving=input.craving && input.craving!=='any' && recipe.meal_style===input.craving;
      if (craving) reasons.push({ code:'CRAVING',text:'Style du repas renseigné correspondant à votre envie.' });
      const effort=settings.skill && recipe.difficulty ? clamp(1-Math.max(0,recipe.difficulty-(settings.skill==='beginner' ? 2 : settings.skill==='intermediate' ? 4 : 5))/3) : 0;
      if (!settings.skill || !recipe.difficulty) unavailable.push('skill');
      if (input.mealType && !recipe.meal_type) unavailable.push('meal_type');
      if (interactions===null) { unavailable.push('feedback');availability.uncertainties.push('Vos retours précédents ne peuvent pas être vérifiés.'); }
      const vegetables=vegetableCriterion(recipe);
      if (settings.goals.includes('vegetables')) reasons.push({ code:'KNOWN_VEGETABLES',text:vegetables.names.length ? `Contient ${vegetables.names.length} légume(s) identifié(s) dans les ingrédients : ${vegetables.names.join(', ')}.` : 'Aucun légume identifié dans la liste connue ; aucun apport végétal inventé.' });
      const parts:RecommendationScoreParts={ cookability:stockScore,expiryUrgency:expiry,preferenceMatch:Math.max(-1,Math.min(1,taste.score+feedbackScore)),timeFit:minutes===null ? 0 : effectiveTime ? clamp(1-minutes/(effectiveTime*2)) : clamp(1-minutes/180),novelty,nutritionFit,effortFit:effort,missingPenalty:threshold>0 ? Math.min(1,gaps.length/threshold) : gaps.length ? 1 : 0 };
      // Inactive goals remove an axis for every candidate. A missing value on an
      // active axis contributes zero, so incomplete data cannot gain a bonus.
      const nutritionActive=settings.goals.some(goal=>['protein','more_fiber'].includes(goal)) || input.goal==='high_protein';
      const varietyActive=settings.goals.includes('variety') && !!history?.length;
      const expiryWeight=settings.goals.includes('anti_waste') || input.goal==='anti_waste' ? 23 : 18;
      const maxWeight=40+expiryWeight+14+10+(settings.skill ? 6 : 0)+(nutritionActive ? 10 : 0)+(varietyActive ? 7 : 0)+(settings.goals.includes('vegetables') ? 6 : 0)+(input.craving && input.craving!=='any' ? 4 : 0);
      const raw=parts.cookability*40+expiry*expiryWeight+parts.preferenceMatch*14+parts.timeFit*10+effort*6+(nutritionActive ? (nutritionFit ?? 0)*10 : 0)+(varietyActive ? (novelty ?? 0)*7 : 0)+(craving ? 4 : 0)+(settings.goals.includes('vegetables') ? vegetables.score*6 : 0)-parts.missingPenalty*20;
      const view:RecommendedRecipeView={ id:recipe.id,name:recipe.name,prep_time:recipe.prep_time,cook_time:recipe.cook_time,image_url:recipe.image_url,image_origin:recipe.image_origin,
        description:recipe.description,servings,cuisine_category:recipe.cuisine_category,meal_type:recipe.meal_type,tags:recipe.tags,
        total_essential:essential.length,linked_essential:essential.length-unknown.length,missing_count:gaps.length-unknown.length,missing_ingredients:gaps.filter(item=>!unknown.includes(item)).map(item=>item.ingredient_name),
        unlinked:!!unknown.length,unlinked_count:unknown.length,unknown_ingredients:unknown.map(item=>item.ingredient_name),
        score_total:Math.round(Math.max(0,Math.min(100,raw/maxWeight*100))),score_parts:parts,reasons:reasons.map(item=>item.text),reason_codes:reasons,
        ...evaluation,unavailable_criteria:unavailable,
        expiring_ingredients_used:near.map(lot=>({ product_id:lot.product_id,product_name:lot.product_name,days_to_expiry:calendarDaysUntil(lot.expiry_date,now)! })),
        suggested_actions:['open_recipe',...(availability.missing.length ? ['add_missing_to_shopping' as const] : []),'plan_recipe'] };
      if (input.goal==='light') view.unavailable_criteria.push('light_goal');
      if (constraints.status==='incompatible') { excluded.push(view);continue; }
      if (effectiveTime && minutes!==null && minutes>effectiveTime) continue;
      if (interactions===null || constraints.status==='verify' || (effectiveTime && minutes===null) || missingEquipment.length || (latest?.feedback==='not_today' && daysAgo<1)) {
        if (missingEquipment.length) view.availability.uncertainties.push(`Matériel manquant : ${missingEquipment.join(', ')}.`);
        if (latest?.feedback==='not_today' && daysAgo<1) view.reason_codes.push({ code:'FEEDBACK',text:'Vous avez choisi « pas aujourd’hui » ; suggestion suspendue pendant 24 h.' });
        verify.push(view);continue;
      }
      if (latest?.feedback==='dislike') { excluded.push(view);continue; }
      if (!essential.length || availability.status==='verify') { verify.push(view);continue; }
      if (availability.missing.length===0) cookable.push(view);
      else if (gaps.length<=threshold) almost.push(view);else recent.push(view);
    }
    const sort=(a:RecommendedRecipeView,b:RecommendedRecipeView)=>b.score_total-a.score_total || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    for (const bucket of [cookable,almost,verify,excluded,recent]) bucket.sort(sort);
    const selected=new Set([...cookable,...almost].sort(sort).slice(0,limit).map(recipe=>`${recipe.reference.source}:${recipe.id}`));
    const result:RecommendationResult={ cookable_now:cookable.filter(recipe=>selected.has(`${recipe.reference.source}:${recipe.id}`)),almost_cookable:almost.filter(recipe=>selected.has(`${recipe.reference.source}:${recipe.id}`)),recent_suggestions:input.includeRecentFallback===false ? [] : recent.slice(0,limit).map(recipe=>({ ...recipe,description:recipe.description ?? null,servings:recipe.servings ?? null,cuisine_category:recipe.cuisine_category ?? null,meal_type:recipe.meal_type ?? null,tags:recipe.tags ?? null })),
      verify_suggestions:verify.slice(0,limit),excluded_suggestions:excluded.slice(0,limit),total_user_recipes:recipes.length,pipeline_version:3,profile_version:profile.version,calculated_at:now.toISOString(),has_constraints:settings.allergies.length+settings.diets.length+settings.excludedIngredients.length>0 };
    // No sensitive input or raw conversation goes into ordinary recommendation events.
    if (ctx.eventWriter) {
      try { result.event_id=await ctx.eventWriter.recordEvent({ userId:ctx.userId,conversationId:ctx.conversationId ?? null,assistantMessageId:ctx.assistantMessageId ?? null,requestText:null,context:input,result }); } catch { /* Optional event receipt; no false domain success. */ }
      try { await ctx.eventWriter.writeCache({ userId:ctx.userId,cacheKey:key,payload:result }); } catch { /* Computed result remains valid. */ }
    }
    return result;
  }
  private libraryRecipe(row:LibraryRecipeRow):RecipeWithIngredients {
    const mapped=mapLibraryRecipe(row);
    return { ...mapped,recipe_ingredients:mapped.inlineIngredients.map((ingredient,index)=>({
      ...ingredient,id:mapped.id+':'+index,quantity:ingredient.quantity ?? null,is_essential:ingredient.is_essential!==false,inventory_product_id:ingredient.inventory_product_id ?? null,
    })),required_equipment:row.catalog_recipe?.required_equipment ?? null,meal_style:row.catalog_recipe?.meal_style ?? null } as RecipeWithIngredients;
  }
  private catalogRecipe(row:RecipeCatalogRow & { ingredients_json?:unknown }):RecipeWithIngredients {
    return { ...this.libraryRecipe({ id:row.id,user_id:'',is_from_catalog:true,catalog_recipe:row,created_at:row.created_at,updated_at:row.updated_at }),source:'recipes_catalog' };
  }
  private async loadRecipe(ctx:RecommendationExecutionContext,reference:RecipeEvaluationInput['recipe']):Promise<RecipeWithIngredients> {
    if (reference.source==='recipes') {
      const { data,error }=await ctx.userClient.from('recipes').select(recipeColumns).eq('id',reference.id)
        .or('user_id.eq.'+ctx.userId+',is_public.eq.true').maybeSingle();
      if (error) throw new Error('RECIPE_DATA_UNAVAILABLE');
      if (!data) throw new ProfileError('RECIPE_NOT_FOUND',404);
      return { ...data,source:'recipes',image_url:resolveRecipeImageUrl(data.image_url) } as RecipeWithIngredients;
    }
    if (reference.source==='user_recipes') {
      const { data,error }=await ctx.userClient.from('user_recipes').select('*,catalog_recipe:recipes_catalog(*)')
        .eq('user_id',ctx.userId).eq('id',reference.id).maybeSingle();
      if (error) throw new Error('RECIPE_DATA_UNAVAILABLE');
      if (!data) throw new ProfileError('RECIPE_NOT_FOUND',404);
      return this.libraryRecipe(data as LibraryRecipeRow);
    }
    const { data,error }=await ctx.userClient.from('recipes_catalog').select('*').eq('id',reference.id).maybeSingle();
    if (error) throw new Error('RECIPE_DATA_UNAVAILABLE');
    if (!data) throw new ProfileError('RECIPE_NOT_FOUND',404);
    return this.catalogRecipe(data as RecipeCatalogRow & { ingredients_json?:unknown });
  }
  private async loadRecipes(ctx:RecommendationExecutionContext,input:RecommendationContext):Promise<RecipeWithIngredients[]> {
    let query=ctx.userClient.from('recipes').select(recipeColumns).eq('user_id',ctx.userId).order('created_at',{ ascending:false }).limit(200);
    if (input.query?.trim()) query=query.ilike('name','%'+input.query.trim().replace(/[%_]/g,'\\$&')+'%');
    const [own,library,catalog]=await Promise.all([query,ctx.userClient.from('user_recipes').select('*,catalog_recipe:recipes_catalog(*)').eq('user_id',ctx.userId).limit(200),ctx.userClient.from('recipes_catalog').select('*').order('created_at',{ ascending:false }).limit(200)]);
    for (const row of [own,library,catalog]) if (row.error) throw new Error('RECIPE_DATA_UNAVAILABLE');
    const libraryRows=(library.data ?? []) as LibraryRecipeRow[],catalogOwned=new Set(libraryRows.map(row=>row.recipe_id));
    const rows=[...(own.data ?? []).map(row=>({ ...row,source:'recipes',image_url:resolveRecipeImageUrl(row.image_url) })),...libraryRows.map(row=>this.libraryRecipe(row)),...(catalog.data ?? []).filter(row=>!catalogOwned.has(row.id)).map(row=>this.catalogRecipe(row as RecipeCatalogRow & { ingredients_json?:unknown }))] as RecipeWithIngredients[];
    return rows.filter(recipe=>{
      if (input.query && !normalizeIngredientName(recipe.name).includes(normalizeIngredientName(input.query))) return false;
      if (input.mealType && recipe.meal_type && recipe.meal_type!==input.mealType) return false;
      const ingredients=recipe.recipe_ingredients ?? [];
      if (input.ingredient && !ingredients.some(item=>normalizeIngredientName(item.ingredient_name).includes(normalizeIngredientName(input.ingredient!)))) return false;
      if (input.proteinFamily || input.proteinCut) {
        const facets=extractRecipeFacets(ingredients.map(item=>({ name:item.ingredient_name })));
        if (input.proteinFamily && !facets.protein_families.includes(input.proteinFamily)) return false;
        if (input.proteinCut && !(facets.protein_cuts as string[]).includes(input.proteinCut)) return false;
      }
      return true;
    });
  }
  private async loadInventory(ctx:RecommendationExecutionContext):Promise<QualifiedLot[]> {
    const { data,error }=await ctx.userClient.from('inventory').select('id,product_id,quantity,unit,stock_version,expiry_date,date_kind,quantity_quality,location,products(name,unit_type)').eq('user_id',ctx.userId);
    if (error) throw new Error('STOCK_DATA_UNAVAILABLE');
    return (data ?? []).map(row=>{ const product=Array.isArray(row.products) ? row.products[0] : row.products;return { ...row,quantity:Number(row.quantity),stock_version:Number(row.stock_version),unit:row.unit ?? product?.unit_type ?? null,product_name:product?.name ?? '' }; });
  }
  private async loadProducts(ctx:RecommendationExecutionContext,ids:string[]):Promise<Map<string,IngredientProduct>> {
    if (!ids.length) return new Map();
    const { data,error }=await ctx.userClient.from('products').select('id,name,nutrition_json,allergens_json,off_last_synced_at,enrichment_status,updated_at').in('id',ids);
    if (error) throw new Error('PRODUCT_DATA_UNAVAILABLE');
    return new Map((data ?? []).map(row=>[row.id,row]));
  }
  private async loadInteractions(ctx:RecommendationExecutionContext):Promise<Interaction[]|null> {
    const { data,error }=await ctx.userClient.from('recipe_interactions').select('recipe_id,recipe_reference,feedback,interaction_type,created_at').eq('user_id',ctx.userId).order('created_at',{ ascending:false }).limit(200);
    return error ? null : data ?? [];
  }
  private async loadHistory(ctx:RecommendationExecutionContext):Promise<History[]|null> {
    const { data,error }=await ctx.userClient.from('cooking_journal_entries').select('recipe_id,cooked_at,adjustments').eq('user_id',ctx.userId).is('voided_at',null).order('cooked_at',{ ascending:false }).limit(200);
    return error ? null : data ?? [];
  }
}
