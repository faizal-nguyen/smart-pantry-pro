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
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const recipePayload = z.object({ recipe: RecipeReferenceSchema, servings: positiveQuantity.max(100) });
const inventoryItem = z.object({
  id: z.string().uuid(), quantity: positiveQuantity, unit: z.string().trim().min(1).max(40),
  expected_version: version.optional(),
}).strict();
const boundedItems = <T extends z.ZodTypeAny>(schema: T) => z.array(schema).min(1).max(100);
const command = <K extends string, T extends z.ZodTypeAny>(type: K, payload: T) => z.object({
  command_id: z.string().uuid(), command_type: z.literal(type), payload_version: z.literal(1), payload,
}).strict();

/** V11-05 E2: where a shopping_add comes from; the database refuses any other value. */
export const ShoppingOriginSchema = z.enum(['manual', 'stock_row', 'restock', 'frequent', 'assistant']);
export type ShoppingOrigin = z.infer<typeof ShoppingOriginSchema>;
/** The four list commands, accepted once the database declares this capability. */
export const SHOPPING_COMMAND_TYPES = ['shopping_add', 'shopping_check', 'shopping_update', 'shopping_remove'] as const;
export type ShoppingCommandType = typeof SHOPPING_COMMAND_TYPES[number];
export const SHOPPING_COMMANDS_CAPABILITY = 4;
/** V11-01 E1: menu_add_missing and cooking linked to a planned meal. */
export const MENU_COMMANDS_CAPABILITY = 5;
/** V11-01 E3: update_menu (servings, move, remove, leftovers, copy). */
export const MENU_EDIT_CAPABILITY = 6;

const shoppingRow = { id: z.string().uuid(), expected_version: version };
/** V11-01 E3: an operation of update_menu, against the version of the meals it touches (null: an empty slot). */
const menuMealType = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
const menuServings = z.number().int().min(1).max(100);
const menuEntry = { entry_id: z.string().uuid(), expected_version: version };
const menuOperation = z.discriminatedUnion('op', [
  z.object({ op: z.literal('set'), date: isoDate, meal_type: menuMealType, recipe: RecipeReferenceSchema, servings: menuServings, expected_version: version.nullable() }).strict(),
  z.object({ op: z.literal('servings'), ...menuEntry, servings: menuServings }).strict(),
  z.object({ op: z.literal('move'), ...menuEntry, date: isoDate, meal_type: menuMealType, target_version: version.nullable() }).strict(),
  z.object({ op: z.literal('remove'), ...menuEntry }).strict(),
  z.object({ op: z.literal('leftover'), ...menuEntry, date: isoDate, meal_type: menuMealType, servings: menuServings }).strict(),
]);
export type MenuOperation = z.infer<typeof menuOperation>;
/** The longest product name and unit a list command accepts. */
export const SHOPPING_NAME_MAX_LENGTH = 120;
export const SHOPPING_UNIT_MAX_LENGTH = 40;
const shoppingName = z.string().trim().min(1).max(SHOPPING_NAME_MAX_LENGTH);
const shoppingCategory = z.string().trim().min(1).max(60);
const shoppingUnit = z.string().trim().min(1).max(SHOPPING_UNIT_MAX_LENGTH);
const shoppingSection = z.string().trim().max(60).nullable();
const UPDATABLE = ['name', 'quantity', 'unit', 'estimated_price', 'store_section'] as const;
const shoppingAddItem = z.object({
  product_id: z.string().uuid().optional(), name: shoppingName.optional(), category: shoppingCategory.optional(),
  quantity: positiveQuantity, unit: shoppingUnit, store_section: shoppingSection.optional(), origin: ShoppingOriginSchema,
  /** A row the screen designates; at another version the add is refused (D16). */
  target: z.object(shoppingRow).strict().optional(),
}).strict().refine(item => (item.product_id === undefined) !== (item.name === undefined), { message: 'product_id or name, not both' });
const shoppingUpdateItem = z.object({
  ...shoppingRow, name: shoppingName.optional(), category: shoppingCategory.optional(),
  quantity: positiveQuantity.optional(), unit: shoppingUnit.optional(),
  estimated_price: z.number().finite().nonnegative().max(100000).nullable().optional(), store_section: shoppingSection.optional(),
}).strict().refine(item => UPDATABLE.some(key => key in item), { message: 'nothing to update' });

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
    /** V11-01 E1: the planned meal cooked, at the version shown; it is then cooked once. */
    meal_plan_entry_id: z.string().uuid().optional(),
    entry_version: version.optional(),
  }).strict().refine(payload => (payload.meal_plan_entry_id === undefined) === (payload.entry_version === undefined), { message: 'meal and version together' })),
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
  command('shopping_add', z.object({ items: boundedItems(shoppingAddItem) }).strict()),
  command('shopping_check', z.object({ items: boundedItems(z.object({ ...shoppingRow, purchased: z.boolean() }).strict()) }).strict()),
  command('shopping_update', z.object({ items: boundedItems(shoppingUpdateItem) }).strict()),
  command('shopping_remove', z.object({ items: boundedItems(z.object(shoppingRow).strict()) }).strict()),
  command('update_menu', z.object({ operations: z.array(menuOperation).min(1).max(30) }).strict()),
  command('menu_add_missing', z.object({
    week_start: isoDate, as_of: isoDate,
    menu_version: z.string().regex(/^[0-9a-f]{32}$/), context_revision: z.number().int().nonnegative(),
    adds: z.array(z.object({
      product_id: z.string().uuid().optional(), name: shoppingName.optional(),
      quantity: positiveQuantity, unit: shoppingUnit, target: z.object(shoppingRow).strict().optional(),
    }).strict().refine(item => (item.product_id === undefined) !== (item.name === undefined), { message: 'product_id or name, not both' })).max(100),
    reductions: z.array(z.object({ ...shoppingRow, quantity: positiveQuantity, unit: shoppingUnit }).strict()).max(100),
  }).strict().refine(payload => payload.adds.length + payload.reductions.length > 0, { message: 'nothing to write' })),
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
export type ShoppingChangeOutcome = 'created' | 'merged' | 'checked' | 'unchecked' | 'unchanged' | 'updated' | 'removed' | 'restored' | 'reduced';
/** One shopping row touched by a command, as the database confirmed it. */
export interface ShoppingChange {
  id: string; outcome: ShoppingChangeOutcome; name?: string; quantity?: number; unit?: string; purchased?: boolean;
  /** created or merged: the amount this command put on the row, in the row's unit. */
  added_quantity?: number;
  /** created: why the product was not topped up on a row it already has. */
  note?: 'unit_incompatible' | 'purchased_pending';
  stock_version?: number;
}
export interface StockCommandResult {
  command_id: string; command_type: string; status: 'confirmed';
  affected_tables: string[]; inventory_ids?: string[]; shopping_ids?: string[];
  meal_plan_id?: string; meal_plan_entry_id?: string;
  /** plan_recipe: the meal the slot held before, which undo_stock gives back. */
  replaced_entry?: { recipe_name?: string; servings?: number };
  /** plan_recipe (V11-01 E3): the leftovers of the replaced meal, removed with it. */
  replaced_leftovers?: Array<{ id: string; recipe_name?: string }>;
  /** update_menu (V11-01 E3): the meals it removed, leftovers included, and what stands after. */
  menu_edit?: { removed: Array<{ id: string; recipe_name?: string; leftover_of?: string }>; after: Array<{ id: string; version: number }> };
  changes?: Array<{ id: string; before_quantity: number; after_quantity: number; unit: string; stock_version: number }>;
  /** Shopping commands, recipe_add_missing and their undo. */
  shopping_changes?: ShoppingChange[];
  recipe_id?: string; journal_id?: string; user_recipe_id?: string;
}
