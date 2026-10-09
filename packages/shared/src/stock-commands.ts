import { z } from 'zod';
import { CookingAdjustmentsSchema } from './cooking-adjustments.js';
import { LotDateKindSchema,LotQuantityQualitySchema } from './personalization.js';
import type { StockAllocation, StockIngredient, StockLot, StockMissing } from './quantities.js';

export const RecipeReferenceSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(['auto', 'recipes', 'user_recipes', 'recipes_catalog']).default('auto'),
}).strict();
export type RecipeReference = z.infer<typeof RecipeReferenceSchema>;

const positiveQuantity = z.number().finite().positive().max(1e9);
const version = z.number().int().nonnegative();
const recipePayload = z.object({ recipe: RecipeReferenceSchema, servings: positiveQuantity.max(100) });
const inventoryItem = z.object({
  id: z.string().uuid(), quantity: positiveQuantity, unit: z.string().trim().min(1).max(40),
  expected_version: version.optional(),
}).strict();
const boundedItems = <T extends z.ZodTypeAny>(schema: T) => z.array(schema).min(1).max(100);
const command = <K extends string, T extends z.ZodTypeAny>(type: K, payload: T) => z.object({
  command_id: z.string().uuid(), command_type: z.literal(type), payload_version: z.literal(1), payload,
}).strict();

export const StockCommandSchema = z.discriminatedUnion('command_type', [
  command('transfer_shopping', z.object({ items: boundedItems(z.object({
    id: z.string().uuid(), expected_version: version,
    quantity: positiveQuantity.optional(), unit: z.string().trim().min(1).max(40).optional(),
    location: z.string().max(100).nullable().optional(),
    expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    date_kind:LotDateKindSchema.optional(),quantity_quality:LotQuantityQualitySchema.optional(),
  }).strict()) }).strict()),
  command('consume_recipe', recipePayload.extend({
    recipe_version: z.string().min(1).max(64),
    outside_inventory: z.array(z.number().int().nonnegative()).max(100).default([]),
    adjustments: CookingAdjustmentsSchema.optional(),
  }).strict()),
  command('consume_inventory', z.object({ items: boundedItems(inventoryItem) }).strict()),
  command('adjust_inventory', z.object({ items: boundedItems(inventoryItem.extend({
    quantity: z.number().finite().nonnegative().max(1e9), expected_version: version,
    location: z.string().max(100).nullable().optional(),
    expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    date_kind:LotDateKindSchema.optional(),quantity_quality:LotQuantityQualitySchema.optional(),
  }).strict()) }).strict()),
  command('undo_stock', z.object({ original_command_id: z.string().uuid() }).strict()),
  command('save_recipe', z.object({
    recipe: z.object({
      name: z.string().trim().min(1).max(255), instructions: z.string().max(100000),
      description: z.string().max(10000).nullable().optional(), image_url: z.string().max(2000).nullable().optional(),
      cuisine_category: z.string().max(100).nullable().optional(), meal_type: z.string().max(100).nullable().optional(),
      prep_time: z.number().int().nonnegative().max(10080), cook_time: z.number().int().nonnegative().max(10080),
      rest_time: z.number().int().nonnegative().max(10080).optional(), servings: positiveQuantity.int().max(100),
      difficulty: z.number().int().min(1).max(5), tags: z.array(z.string().max(100)).max(100).default([]),
      is_public: z.boolean().default(false), source_type: z.string().max(100).nullable().optional(),
      source_url: z.string().max(2000).nullable().optional(),
    }).strict(),
    ingredients: boundedItems(z.object({
      ingredient_name: z.string().trim().min(1).max(255), quantity: positiveQuantity.nullable().optional(),
      unit: z.string().max(40).nullable().optional(), is_essential: z.boolean().default(true),
      notes: z.string().max(2000).nullable().optional(), inventory_product_id: z.string().uuid().nullable().optional(),
    }).strict()),
  }).strict()),
  command('add_catalog_recipe', z.object({
    catalog_recipe_id: z.string().uuid(), collections: z.array(z.string().max(100)).max(100).default([]),
    personal_notes: z.string().max(10000).optional(),
  }).strict()),
  command('recipe_add_missing', recipePayload.strict()),
  command('plan_recipe', recipePayload.extend({
    servings: positiveQuantity.int().max(100),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).default('dinner'),
  }).strict()),
]);
export type StockCommand = z.infer<typeof StockCommandSchema>;

export interface ResolvedStockRecipe {
  id: string; source: RecipeReference['source']; canonicalId: string; name: string;
  servings: number; version: string; ingredients: StockIngredient[];
}
export interface RecipeStockPreview {
  recipe: ResolvedStockRecipe; servings: number; lots: StockLot[];
  allocations: StockAllocation[]; missing: StockMissing[];
}
export interface StockCommandResult {
  command_id: string; command_type: string; status: 'confirmed';
  affected_tables: string[]; inventory_ids?: string[]; shopping_ids?: string[];
  meal_plan_id?: string; meal_plan_entry_id?: string;
  changes?: Array<{ id: string; before_quantity: number; after_quantity: number; unit: string; stock_version: number }>;
  recipe_id?: string; journal_id?: string; user_recipe_id?: string;
}
