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

const suggestRecipesForContextArgs = z.object({
  /** Optional free-text narrowing applied via ilike on recipe.name. */
  query: z.string().max(200).optional(),
  max_prep_time: z.number().int().min(0).max(600).optional(),
  /** Per-bucket limit (default 6). Each bucket capped independently. */
  limit_per_bucket: z.number().int().min(1).max(20).optional(),
  /** Cap for almost_cookable bucket (default 3). */
  almost_threshold: z.number().int().min(0).max(10).optional(),
  /**
   * PRP-226 PR1 — additional context hints. Accepted on the wire so
   * the LLM/tool fingerprint is stable when the engine extraction PR2
   * starts using them. PR1's handler ignores the new fields.
   */
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  goal: z
    .enum([
      'tonight',
      'quick',
      'anti_waste',
      'light',
      'high_protein',
      'comfort',
      'batch_cooking',
    ])
    .optional(),
  servings: z.number().int().min(1).max(20).optional(),
});
export type SuggestRecipesForContextArgs = z.infer<typeof suggestRecipesForContextArgs>;

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

// ---- PRP-223 PR4 memory READ tools ----------------------------------

const memoryKindSchema = z.enum([
  'preference',
  'negative_preference',
  'habit',
  'cooking_style',
  'diet_goal',
  'constraint',
  'recipe_feedback',
  'shopping_pattern',
  'response_style',
]);

const readUserMemoriesArgs = z.object({
  kind: memoryKindSchema.optional(),
  query: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});
export type ReadUserMemoriesArgs = z.infer<typeof readUserMemoriesArgs>;

const searchConversationHistoryArgs = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(20).optional(),
});
export type SearchConversationHistoryArgs = z.infer<typeof searchConversationHistoryArgs>;

// ---- PRP-223 PR5 memory WRITE tools ----------------------------------

const sensitivitySchema = z.enum(['normal', 'personal', 'health_sensitive']);

const rememberPreferenceArgs = z.object({
  kind: memoryKindSchema,
  content: z.string().min(1).max(2000),
  sensitivity: sensitivitySchema.optional(),
});
export type RememberPreferenceArgs = z.infer<typeof rememberPreferenceArgs>;

const forgetMemoryArgs = z.object({
  memory_id: z.string().uuid(),
});
export type ForgetMemoryArgs = z.infer<typeof forgetMemoryArgs>;

const updateResponseStyleArgs = z.object({
  preference: z.string().min(1).max(500),
});
export type UpdateResponseStyleArgs = z.infer<typeof updateResponseStyleArgs>;

const recordRecipeFeedbackArgs = z.object({
  recipe_id: z.string().uuid().optional(),
  recipe_title: z.string().min(1).max(300),
  outcome: z.enum(['loved', 'liked', 'ok', 'disliked', 'failed']).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
  would_cook_again: z.boolean().optional(),
});
export type RecordRecipeFeedbackArgs = z.infer<typeof recordRecipeFeedbackArgs>;

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
      'Return recipes the user can cook with their current inventory. Linked ingredients are checked precisely against inventory ; unlinked essential ingredients are returned with unlinked_count so the UI can show them as "à vérifier" instead of dropping the recipe. Default max_missing_ingredients=3.',
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
  {
    name: 'suggest_recipes_for_context',
    description:
      'One-shot recipe suggestion: returns 3 buckets — cookable_now (everything in stock), almost_cookable (1..N missing/unknown ingredients), recent_suggestions (recent recipes regardless of stock). Use this for open questions like "what can I cook tonight?" instead of chaining find_cookable_recipes + read_recent_recipes.',
    schema: suggestRecipesForContextArgs,
    jsonSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', maxLength: 200, description: 'optional ilike narrowing on recipe name' },
        max_prep_time: { type: 'integer', minimum: 0, maximum: 600, description: 'minutes' },
        limit_per_bucket: { type: 'integer', minimum: 1, maximum: 20, description: 'default 6' },
        almost_threshold: { type: 'integer', minimum: 0, maximum: 10, description: 'max missing+unknown for almost bucket, default 3' },
        meal_type: {
          type: 'string',
          enum: ['breakfast', 'lunch', 'dinner', 'snack'],
          description: 'mealtime hint to bias ranking (PRP-226)',
        },
        goal: {
          type: 'string',
          enum: ['tonight', 'quick', 'anti_waste', 'light', 'high_protein', 'comfort', 'batch_cooking'],
          description: 'high-level intent — anti_waste boosts near-expiry, quick caps prep time, etc. (PRP-226)',
        },
        servings: { type: 'integer', minimum: 1, maximum: 20, description: 'expected servings, narrows recipes (PRP-226)' },
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

  // ===== PRP-223 PR4 memory READ =====
  {
    name: 'read_user_memories',
    description:
      "Read the user's long-term assistant memories (preferences, constraints, cooking style, etc.). Use it BEFORE making suggestions so they fit who the user is. Returns only active memories.",
    schema: readUserMemoriesArgs,
    jsonSchema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: [
            'preference',
            'negative_preference',
            'habit',
            'cooking_style',
            'diet_goal',
            'constraint',
            'recipe_feedback',
            'shopping_pattern',
            'response_style',
          ],
        },
        query: {
          type: 'string',
          maxLength: 200,
          description: 'optional ILIKE substring on the memory content',
        },
        limit: { type: 'integer', minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'read',
    reversible: false,
  },
  {
    name: 'search_conversation_history',
    description:
      'Search the previous assistant conversations for a string and return matching messages and summaries. Use to recall what was discussed earlier.',
    schema: searchConversationHistoryArgs,
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

  // ===== PRP-223 PR5 memory WRITE =====
  {
    name: 'remember_preference',
    description:
      "Save a long-term preference, habit or constraint about the user. Only call this when the user explicitly asks you to remember something or states a clear lasting preference. Health-sensitive items (allergies, diet goals) are stored as candidate awaiting user confirmation.",
    schema: rememberPreferenceArgs,
    jsonSchema: {
      type: 'object',
      required: ['kind', 'content'],
      properties: {
        kind: {
          type: 'string',
          enum: [
            'preference',
            'negative_preference',
            'habit',
            'cooking_style',
            'diet_goal',
            'constraint',
            'recipe_feedback',
            'shopping_pattern',
            'response_style',
          ],
        },
        content: { type: 'string', minLength: 1, maxLength: 2000 },
        sensitivity: {
          type: 'string',
          enum: ['normal', 'personal', 'health_sensitive'],
        },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'low',
    reversible: true,
  },
  {
    name: 'forget_memory',
    description:
      "Soft-delete a memory the user no longer wants you to remember. Requires a known memory_id (call read_user_memories first). Reversible inside the 15-minute window.",
    schema: forgetMemoryArgs,
    jsonSchema: {
      type: 'object',
      required: ['memory_id'],
      properties: {
        memory_id: { type: 'string', format: 'uuid' },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'medium',
    reversible: true,
  },
  {
    name: 'update_response_style',
    description:
      "Save how the user wants the assistant to phrase its responses (e.g. 'short', 'detailed', 'cite source'). Replaces any previous response_style memory.",
    schema: updateResponseStyleArgs,
    jsonSchema: {
      type: 'object',
      required: ['preference'],
      properties: {
        preference: { type: 'string', minLength: 1, maxLength: 500 },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'low',
    reversible: true,
  },
  {
    name: 'record_recipe_feedback',
    description:
      "Record the user's feedback on a recipe they cooked (rating, outcome, notes, would cook again). Use after the user describes a result.",
    schema: recordRecipeFeedbackArgs,
    jsonSchema: {
      type: 'object',
      required: ['recipe_title'],
      properties: {
        recipe_id: { type: 'string', format: 'uuid' },
        recipe_title: { type: 'string', minLength: 1, maxLength: 300 },
        outcome: { type: 'string', enum: ['loved', 'liked', 'ok', 'disliked', 'failed'] },
        rating: { type: 'integer', minimum: 1, maximum: 5 },
        notes: { type: 'string', maxLength: 2000 },
        would_cook_again: { type: 'boolean' },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'low',
    reversible: true,
  },
];

export const TOOL_NAMES = TOOL_SPECS.map((t) => t.name);
export type ToolName = (typeof TOOL_SPECS)[number]['name'];
