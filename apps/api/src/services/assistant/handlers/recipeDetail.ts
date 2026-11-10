import {normalizeRecipeInstructions} from '@smart/shared';
import {RecommendationEngine} from '../../recommendations/RecommendationEngine.js';
import {estimateNutrition} from '../../recommendations/PersonalizationScoring.js';
import type {ReadRecipeArgs} from '../schemas/tools.js';
import type {ToolHandler,ToolExecutionContext} from './types.js';

export class ReadRecipeHandler implements ToolHandler<ReadRecipeArgs> {
  async execute(ctx:ToolExecutionContext,args:ReadRecipeArgs) {
    const recipe=await (ctx.recommendationEngine ?? new RecommendationEngine()).readRecipeForUser(ctx,{id:args.recipe_id,source:args.source});
    const base=recipe.servings && recipe.servings>0 ? recipe.servings : null;
    const servings=args.servings ?? base;
    const factor=base && servings ? servings/base : null;
    const metadata=recipe.source_metadata as {sources?:Array<{url?:string;title?:string}>}|null;
    const sources=[{url:recipe.source_url,title:recipe.source_name},...(Array.isArray(metadata?.sources) ? metadata.sources : [])]
      .filter((s):s is {url:string;title:string|null|undefined}=>typeof s.url==='string' && /^https?:\/\//i.test(s.url))
      .filter((s,i,all)=>all.findIndex(other=>other.url===s.url)===i).slice(0,8);
    return {result:{reference:{id:recipe.id,source:args.source},name:recipe.name,base_servings:base,servings,
      prep_time:recipe.prep_time,cook_time:recipe.cook_time,rest_time:recipe.rest_time,
      ingredients:(recipe.recipe_ingredients ?? []).map(i=>({ingredient_name:i.ingredient_name,
        quantity:factor && i.quantity!=null ? i.quantity*factor : i.quantity,unit:i.unit,is_essential:i.is_essential!==false})),
      instructions:normalizeRecipeInstructions(recipe.instructions),sources,nutrition:estimateNutrition(recipe,new Map()),
      limitations:[...(!base ? ['Portions de base inconnues ; quantités non redimensionnées.'] : []),
        ...(factor!==null && factor!==1 ? ['Quantités adaptées aux portions demandées ; étapes conservées telles qu’enregistrées, leurs quantités intégrées et durées sont à adapter.'] : [])]}};
  }
}
