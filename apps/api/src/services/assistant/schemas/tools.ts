/**
 * PRP-221 J3 — Tool catalog (Zod schemas + OpenAI function specs).
 *
 * Single source of truth for the 21 tools the voice agent can invoke.
 * Each entry carries:
 *   - schema           Zod parser used to validate the LLM's tool_call.args
 *                      before any handler runs.
 *   - jsonSchema       OpenAI function-calling spec (JSON Schema). Exposed
 *                      to the model so it knows how to format args.
 *   - description      One-line for the LLM to choose when to call it.
 *   - defaultRiskTier  'read' | 'low' | 'medium' | 'high'.
 *                      The RiskClassifier may escalate this on a per-call
 *                      basis (volume, ambiguity, …) — never de-escalate.
 *   - reversible       Whether an undo is conceptually possible. The
 *                      actual reversible_action JSONB is computed by the
 *                      handler at execution time.
 *
 * Handlers are NOT defined here — that's J5/J6 wiring. This module is
 * pure metadata + validation.
 */
import { z } from 'zod';

// ---- Shared atoms ----------------------------------------------------

/**
 * What the LLM emits when proposing an item to add. The ProductResolver
 * (J2) turns these names into stable product_ids before the actual write.
 */
const ItemArgSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  unit: z.string().max(50).optional(),
  quantity: z.number().nonnegative().max(100_000),
  expiry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'expiry_date must be ISO YYYY-MM-DD')
    .optional(),
  notes: z.string().max(500).optional(),
});
export type ItemArg = z.infer<typeof ItemArgSchema>;

const itemJsonSchema = {
  type: 'object',
  required: ['name', 'quantity'],
  properties: {
    name: { type: 'string', maxLength: 200 },
    category: { type: 'string', maxLength: 100 },
    unit: { type: 'string', maxLength: 50 },
    quantity: { type: 'number', minimum: 0, maximum: 100_000 },
    expiry_date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    notes: { type: 'string', maxLength: 500 },
  },
  additionalProperties: false,
} as const;

const dayOfWeekSchema = z
  .number()
  .int()
  .min(0, 'day_of_week is 0=Monday … 6=Sunday')
  .max(6);

const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

// ---- Tool spec interface --------------------------------------------

export type RiskTier = 'read' | 'low' | 'medium' | 'high';

export interface ToolSpec<TArgs = unknown> {
  name: string;
  description: string;
  schema: z.ZodSchema<TArgs>;
  jsonSchema: Record<string, unknown>;
  defaultRiskTier: RiskTier;
  /** Whether the action is conceptually reversible via undo_last_action. */
  reversible: boolean;
}

// ---- READ tools ------------------------------------------------------

const readInventoryArgs = z.object({
  search: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  near_expiry_days: z.number().int().nonnegative().max(90).optional(),
});
export type ReadInventoryArgs = z.infer<typeof readInventoryArgs>;

const readShoppingListArgs = z.object({
  purchased: z.boolean().optional(),
});
export type ReadShoppingListArgs = z.infer<typeof readShoppingListArgs>;

const readRecentRecipesArgs = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  search: z.string().max(200).optional(),
});
export type ReadRecentRecipesArgs = z.infer<typeof readRecentRecipesArgs>;

const readMealPlanArgs = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'week_start ISO YYYY-MM-DD'),
});
export type ReadMealPlanArgs = z.infer<typeof readMealPlanArgs>;

const findCookableArgs = z.object({
  max_missing_ingredients: z.number().int().min(0).max(10).optional(),
  max_prep_time: z.number().int().min(0).max(600).optional(),
});
export type FindCookableArgs = z.infer<typeof findCookableArgs>;

const searchRecipesArgs = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(20).optional(),
});
export type SearchRecipesArgs = z.infer<typeof searchRecipesArgs>;

// ---- LOW write tools -------------------------------------------------

const addInventoryItemsArgs = z.object({
  items: z.array(ItemArgSchema).min(1).max(50),
});
export type AddInventoryItemsArgs = z.infer<typeof addInventoryItemsArgs>;

const addShoppingItemsArgs = z.object({
  items: z.array(ItemArgSchema).min(1).max(50),
});
export type AddShoppingItemsArgs = z.infer<typeof addShoppingItemsArgs>;

const markShoppingItemsBoughtArgs = z.object({
  shopping_item_ids: z.array(z.string().uuid()).min(1).max(50),
});
export type MarkShoppingItemsBoughtArgs = z.infer<typeof markShoppingItemsBoughtArgs>;

const unmarkShoppingItemsBoughtArgs = z.object({
  shopping_item_ids: z.array(z.string().uuid()).min(1).max(50),
});
export type UnmarkShoppingItemsBoughtArgs = z.infer<typeof unmarkShoppingItemsBoughtArgs>;

const addRecipeToMealPlanArgs = z.object({
  recipe_id: z.string().uuid(),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  day_of_week: dayOfWeekSchema,
  meal_type: mealTypeSchema,
});
export type AddRecipeToMealPlanArgs = z.infer<typeof addRecipeToMealPlanArgs>;

// ---- MEDIUM write tools ----------------------------------------------

const consumeInventoryItemsArgs = z.object({
  items: z
    .array(
      z.object({
        inventory_id: z.string().uuid(),
        quantity: z.number().nonnegative(),
      })
    )
    .min(1)
    .max(50),
});
export type ConsumeInventoryItemsArgs = z.infer<typeof consumeInventoryItemsArgs>;

const updateInventoryItemArgs = z.object({
  inventory_id: z.string().uuid(),
  quantity: z.number().nonnegative().optional(),
  expiry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  location: z.string().max(200).nullable().optional(),
});
export type UpdateInventoryItemArgs = z.infer<typeof updateInventoryItemArgs>;

const removeShoppingItemsArgs = z.object({
  shopping_item_ids: z.array(z.string().uuid()).min(1).max(50),
});
export type RemoveShoppingItemsArgs = z.infer<typeof removeShoppingItemsArgs>;

// ---- HIGH write tools ------------------------------------------------

const deleteRecipeArgs = z.object({
  recipe_id: z.string().uuid(),
});
export type DeleteRecipeArgs = z.infer<typeof deleteRecipeArgs>;

const clearShoppingListArgs = z.object({
  purchased_only: z.boolean().optional(),
});
export type ClearShoppingListArgs = z.infer<typeof clearShoppingListArgs>;

const clearInventoryCategoryArgs = z.object({
  category: z.string().min(1).max(100),
});
export type ClearInventoryCategoryArgs = z.infer<typeof clearInventoryCategoryArgs>;

const importRecipeFromUrlArgs = z.object({
  url: z.string().url().max(2000),
  caption: z.string().max(2000).optional(),
});
export type ImportRecipeFromUrlArgs = z.infer<typeof importRecipeFromUrlArgs>;

// ---- META tools ------------------------------------------------------

const askClarificationArgs = z.object({
  question: z.string().min(1).max(500),
  options: z.array(z.string().max(200)).max(5).optional(),
});
export type AskClarificationArgs = z.infer<typeof askClarificationArgs>;

const summarizeSessionArgs = z.object({});
export type SummarizeSessionArgs = z.infer<typeof summarizeSessionArgs>;

const undoActionArgs = z.object({
  action_id: z.string().uuid(),
});
export type UndoActionArgs = z.infer<typeof undoActionArgs>;

// ---- Catalog --------------------------------------------------------

export const TOOL_SPECS: readonly ToolSpec<any>[] = [
  // ===== READ =====
  {
    name: 'read_inventory',
    description:
      'Read the user inventory. Returns items with their product name, category, unit, quantity, expiry date and location. Use this BEFORE suggesting recipes or adding to a list, so you ground answers in actual stock.',
    schema: readInventoryArgs,
    jsonSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'optional product-name substring filter' },
        category: { type: 'string', description: 'optional category filter' },
        near_expiry_days: {
          type: 'integer',
          minimum: 0,
          maximum: 90,
          description: 'only items expiring within N days',
        },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'read',
    reversible: false,
  },
  {
    name: 'read_shopping_list',
    description: 'Read the user shopping list. Returns items pending or purchased.',
    schema: readShoppingListArgs,
    jsonSchema: {
      type: 'object',
      properties: {
        purchased: { type: 'boolean', description: 'filter on is_purchased state' },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'read',
    reversible: false,
  },
  {
    name: 'read_recent_recipes',
    description: 'Read recently created or saved recipes for the user.',
    schema: readRecentRecipesArgs,
    jsonSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 50 },
        search: { type: 'string' },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'read',
    reversible: false,
  },
  {
    name: 'read_meal_plan',
    description: 'Read the meal plan for a given ISO week (Monday-anchored).',
    schema: readMealPlanArgs,
    jsonSchema: {
      type: 'object',
      required: ['week_start'],
      properties: {
        week_start: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'read',
    reversible: false,
  },
  {
    name: 'find_cookable_recipes',
    description:
      'Return recipes the user can cook with their current inventory. Only considers recipes whose essential ingredients are linked to a product (legacy recipes without product link are excluded).',
    schema: findCookableArgs,
    jsonSchema: {
      type: 'object',
      properties: {
        max_missing_ingredients: { type: 'integer', minimum: 0, maximum: 10 },
        max_prep_time: { type: 'integer', minimum: 0, maximum: 600, description: 'minutes' },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'read',
    reversible: false,
  },
  {
    name: 'search_recipes',
    description: 'Free-text search across the user recipes.',
    schema: searchRecipesArgs,
    jsonSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 200 },
        limit: { type: 'integer', minimum: 1, maximum: 20 },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'read',
    reversible: false,
  },

  // ===== LOW write =====
  {
    name: 'add_inventory_items',
    description:
      'Add items to the user inventory. Each item is { name, quantity, optional category/unit/expiry_date/notes }. The server resolves names to product_ids — you do NOT need to know UUIDs.',
    schema: addInventoryItemsArgs,
    jsonSchema: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          maxItems: 50,
          items: itemJsonSchema,
        },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'low',
    reversible: true,
  },
  {
    name: 'add_shopping_items',
    description: 'Add items to the user shopping list (is_purchased=false).',
    schema: addShoppingItemsArgs,
    jsonSchema: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          maxItems: 50,
          items: itemJsonSchema,
        },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'low',
    reversible: true,
  },
  {
    name: 'mark_shopping_items_bought',
    description: 'Mark shopping list items as purchased.',
    schema: markShoppingItemsBoughtArgs,
    jsonSchema: {
      type: 'object',
      required: ['shopping_item_ids'],
      properties: {
        shopping_item_ids: {
          type: 'array',
          minItems: 1,
          maxItems: 50,
          items: { type: 'string', format: 'uuid' },
        },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'low',
    reversible: true,
  },
  {
    name: 'unmark_shopping_items_bought',
    description: 'Revert shopping list items to is_purchased=false.',
    schema: unmarkShoppingItemsBoughtArgs,
    jsonSchema: {
      type: 'object',
      required: ['shopping_item_ids'],
      properties: {
        shopping_item_ids: {
          type: 'array',
          minItems: 1,
          maxItems: 50,
          items: { type: 'string', format: 'uuid' },
        },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'low',
    reversible: true,
  },
  {
    name: 'add_recipe_to_meal_plan',
    description: 'Add a recipe to the user meal plan for a given week / day / meal slot.',
    schema: addRecipeToMealPlanArgs,
    jsonSchema: {
      type: 'object',
      required: ['recipe_id', 'week_start', 'day_of_week', 'meal_type'],
      properties: {
        recipe_id: { type: 'string', format: 'uuid' },
        week_start: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        day_of_week: {
          type: 'integer',
          minimum: 0,
          maximum: 6,
          description: '0=Monday, 6=Sunday',
        },
        meal_type: {
          type: 'string',
          enum: ['breakfast', 'lunch', 'dinner', 'snack'],
        },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'low',
    reversible: true,
  },

  // ===== MEDIUM write =====
  {
    name: 'consume_inventory_items',
    description:
      'Decrement inventory quantities (e.g. user cooked something or threw it away). Each item references an inventory row by id and a quantity to subtract.',
    schema: consumeInventoryItemsArgs,
    jsonSchema: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          maxItems: 50,
          items: {
            type: 'object',
            required: ['inventory_id', 'quantity'],
            properties: {
              inventory_id: { type: 'string', format: 'uuid' },
              quantity: { type: 'number', minimum: 0 },
            },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'medium',
    reversible: true,
  },
  {
    name: 'update_inventory_item',
    description: 'Update quantity / expiry_date / location of a single inventory row.',
    schema: updateInventoryItemArgs,
    jsonSchema: {
      type: 'object',
      required: ['inventory_id'],
      properties: {
        inventory_id: { type: 'string', format: 'uuid' },
        quantity: { type: 'number', minimum: 0 },
        expiry_date: {
          oneOf: [{ type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, { type: 'null' }],
        },
        location: {
          oneOf: [{ type: 'string', maxLength: 200 }, { type: 'null' }],
        },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'medium',
    reversible: true,
  },
  {
    name: 'remove_shopping_items',
    description: 'Delete shopping list rows by id.',
    schema: removeShoppingItemsArgs,
    jsonSchema: {
      type: 'object',
      required: ['shopping_item_ids'],
      properties: {
        shopping_item_ids: {
          type: 'array',
          minItems: 1,
          maxItems: 50,
          items: { type: 'string', format: 'uuid' },
        },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'medium',
    reversible: true,
  },

  // ===== HIGH write =====
  {
    name: 'delete_recipe',
    description: 'Delete a recipe (cascades to recipe_ingredients).',
    schema: deleteRecipeArgs,
    jsonSchema: {
      type: 'object',
      required: ['recipe_id'],
      properties: {
        recipe_id: { type: 'string', format: 'uuid' },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'high',
    reversible: false,
  },
  {
    name: 'clear_shopping_list',
    description:
      'Empty the user shopping list. With purchased_only=true, only deletes already-purchased items.',
    schema: clearShoppingListArgs,
    jsonSchema: {
      type: 'object',
      properties: {
        purchased_only: { type: 'boolean' },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'high',
    reversible: false,
  },
  {
    name: 'clear_inventory_category',
    description: 'Delete every inventory row in a given category.',
    schema: clearInventoryCategoryArgs,
    jsonSchema: {
      type: 'object',
      required: ['category'],
      properties: {
        category: { type: 'string', minLength: 1, maxLength: 100 },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'high',
    reversible: false,
  },
  {
    name: 'import_recipe_from_url',
    description:
      'Import a recipe from a public URL (Instagram, TikTok, YouTube, food blog). Triggers the existing extraction pipeline. Returns the new recipe_id.',
    schema: importRecipeFromUrlArgs,
    jsonSchema: {
      type: 'object',
      required: ['url'],
      properties: {
        url: { type: 'string', format: 'uri', maxLength: 2000 },
        caption: { type: 'string', maxLength: 2000 },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'high',
    reversible: false,
  },

  // ===== META =====
  {
    name: 'ask_clarification',
    description:
      'Ask the user a clarifying question when intent is ambiguous (e.g. "tu parles de tomate cerise ou tomate ronde ?"). No state changes.',
    schema: askClarificationArgs,
    jsonSchema: {
      type: 'object',
      required: ['question'],
      properties: {
        question: { type: 'string', minLength: 1, maxLength: 500 },
        options: {
          type: 'array',
          maxItems: 5,
          items: { type: 'string', maxLength: 200 },
        },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'low',
    reversible: false,
  },
  {
    name: 'summarize_session',
    description: 'Return a short summary of all actions taken in the current session.',
    schema: summarizeSessionArgs,
    jsonSchema: { type: 'object', properties: {}, additionalProperties: false },
    defaultRiskTier: 'low',
    reversible: false,
  },
  {
    name: 'undo_action',
    description:
      'Undo a previous action by its assistant_action_log id. Only works within the 15-minute window and on actions marked reversible.',
    schema: undoActionArgs,
    jsonSchema: {
      type: 'object',
      required: ['action_id'],
      properties: {
        action_id: { type: 'string', format: 'uuid' },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'low',
    reversible: false,
  },
];

export const TOOL_NAMES = TOOL_SPECS.map((t) => t.name);
export type ToolName = (typeof TOOL_SPECS)[number]['name'];
