import { z } from 'zod';
import { allocateRecipeStock, type StockIngredient, type StockLot } from './quantities.js';
export const CookingAdjustmentSchema = z.object({
  ingredient_index: z.number().int().nonnegative(),
  // Actual quantity for the whole meal, not per original serving.
  quantity: z.number().finite().nonnegative().max(1e9),
  unit: z.string().trim().min(1).max(40),
  inventory_product_id: z.string().uuid().optional(),
  inventory_id: z.string().uuid().optional(),
}).strict();
export const CookingAdjustmentsSchema = z.array(CookingAdjustmentSchema).max(100);
export type CookingAdjustment = z.infer<typeof CookingAdjustmentSchema>;
export function adjustedCookingIngredients(ingredients: StockIngredient[], base: number, servings: number, adjustments: CookingAdjustment[] = [], outside: number[] = []): StockIngredient[] {
  const used = new Set<number>();
  for (const item of adjustments) {
    if (item.ingredient_index >= ingredients.length || used.has(item.ingredient_index)) throw new Error('INVALID_ALLOCATION');
    used.add(item.ingredient_index);
  }
  return ingredients.map((ingredient,index) => {
    const change = adjustments.find(item => item.ingredient_index === index);
    return { ...ingredient, quantity: outside.includes(index) ? 0 : change?.quantity ?? (ingredient.quantity == null ? null : ingredient.quantity * servings/base),
      unit: change?.unit ?? ingredient.unit, inventory_product_id: change?.inventory_product_id ?? ingredient.inventory_product_id };
  });
}
export function allocateCookingStock(ingredients: StockIngredient[], lots: StockLot[], base: number, servings: number, adjustments: CookingAdjustment[] = [], outside: number[] = []) {
  const actual = adjustedCookingIngredients(ingredients,base,servings,adjustments,outside);
  if (outside.some(index => index < 0 || index >= ingredients.length)) throw new Error('INVALID_ALLOCATION');
  const selectedLots: Record<number,string> = {};
  for (const change of adjustments) if (change.inventory_id) selectedLots[change.ingredient_index] = change.inventory_id;
  return allocateRecipeStock(actual,lots,1,1,{ skip: [...outside,...adjustments.filter(item => item.quantity === 0).map(item => item.ingredient_index)], selectedLots });
}
