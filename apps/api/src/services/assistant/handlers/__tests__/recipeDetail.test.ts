import {ReadRecipeHandler} from '../recipeDetail.js';
import type {ToolExecutionContext} from '../types.js';
test('detail preserves saved steps and source while scaling ingredients explicitly',async()=>{
  const readRecipeForUser=jest.fn(async()=>({id:'recipe',name:'Blanquette',servings:4,instructions:'1. Cuire doucement.\n2. Lier la sauce.',source_url:'https://example.com/recette',recipe_ingredients:[{ingredient_name:'Veau',quantity:1000,unit:'g'}]}));
  const ctx={userId:'owner',recommendationEngine:{readRecipeForUser}} as unknown as ToolExecutionContext;
  const result=(await new ReadRecipeHandler().execute(ctx,{recipe_id:'recipe',source:'recipes',servings:2})).result;
  expect(result).toMatchObject({base_servings:4,servings:2,ingredients:[{ingredient_name:'Veau',quantity:500}],instructions:['Cuire doucement.','Lier la sauce.'],sources:[{url:'https://example.com/recette'}]});
  expect(result.limitations).toHaveLength(1);
  expect(readRecipeForUser).toHaveBeenCalledWith(ctx,{id:'recipe',source:'recipes'});
});
test('a missing or unauthorized detail cannot become an invented recipe',async()=>{
  const ctx={recommendationEngine:{readRecipeForUser:jest.fn(async()=>{throw Error('RECIPE_NOT_FOUND');})}} as unknown as ToolExecutionContext;
  await expect(new ReadRecipeHandler().execute(ctx,{recipe_id:'unknown',source:'user_recipes'})).rejects.toThrow('RECIPE_NOT_FOUND');
});
