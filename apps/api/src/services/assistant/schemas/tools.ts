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

import { isValidGtin } from '../../products/gtin.js';

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
  // Read on the pack by the photo flow; added to the product name, last.
  brand: z.string().trim().max(80).optional(),
  // Photo flow only, built by the server: the barcode identifies the product,
  // the photo is kept on it for its owner.
  barcode: z.string().refine(isValidGtin, 'barcode must be a valid EAN/UPC').optional(),
  photo_path: z.string().regex(/^users\/[0-9a-f-]{36}\/groceries\/[\w-]+\.jpg$/).optional(),
});
export type ItemArg = z.infer<typeof ItemArgSchema>;

const itemJsonSchema = {
  type: 'object',
  // unit is required so the model never drops a spoken "kg" (1 run in 5 did);
  // the Zod schema stays lenient and falls back to the product unit.
  required: ['name', 'quantity', 'unit'],
  properties: {
    name: { type: 'string', maxLength: 200, description: 'Full product identity as named or shown on the referenced photo: preserve flavour, variety and brand. Never replace « Brassé coco pomme poire Babybio » with the generic category « compote ».' },
    brand: { type: 'string', maxLength: 80, description: 'Brand explicitly named by the user or read on the referenced product photo. Also retain it in name. Omit when unknown or when the user explicitly wants any brand.' },
    category: { type: 'string', maxLength: 100 },
    unit: { type: 'string', minLength: 1, maxLength: 50, description: 'the unit the user said (kg, g, L, sachet…); « unité » when the user gave only a count (« 2 pommes de terre »)' },
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
export const readRecipeArgs=z.object({recipe_id:z.string().uuid(),source:z.enum(['recipes','user_recipes','recipes_catalog']).default('recipes'),servings:z.number().int().min(1).max(100).optional()});
export type ReadRecipeArgs=z.infer<typeof readRecipeArgs>;
export const searchWebRecipesArgs=z.object({query:z.string().trim().min(2).max(200),limit:z.number().int().min(1).max(3).optional()});
export type SearchWebRecipesArgs=z.infer<typeof searchWebRecipesArgs>;

const readInventoryArgs = z.object({
  search: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  near_expiry_days: z.number().int().nonnegative().max(90).optional(),
});
export type ReadInventoryArgs = z.infer<typeof readInventoryArgs>;

const readShoppingListArgs = z.object({
  purchased: z.boolean().optional(),
  search: z.string().max(200).optional(),
});
export type ReadShoppingListArgs = z.infer<typeof readShoppingListArgs>;

const readRecentRecipesArgs = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  search: z.string().max(200).optional(),
});
export type ReadRecentRecipesArgs = z.infer<typeof readRecentRecipesArgs>;

// The model copies one date from the prompt's TODAY lines; the server derives the
// week and the day number (live repro 2026-11-07: gpt-4o-mini mixed them up).
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'ISO date YYYY-MM-DD');
const readMealPlanArgs = z.object({
  /** Any day of the wanted week. */
  date: isoDate.optional(),
  /** Older calls: the Monday of the week. */
  week_start: isoDate.optional(),
}).refine(args => !!args.date || !!args.week_start, { message: 'date (YYYY-MM-DD) is required', path: ['date'] });
export type ReadMealPlanArgs = z.infer<typeof readMealPlanArgs>;

const findCookableArgs = z.object({
  max_missing_ingredients: z.number().int().min(0).max(10).optional(),
  max_prep_time: z.number().int().min(1).max(600).optional(),
});
export type FindCookableArgs = z.infer<typeof findCookableArgs>;

const searchRecipesArgs = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(20).optional(),
});
export type SearchRecipesArgs = z.infer<typeof searchRecipesArgs>;

// PRP-239 PR3 — protein family / cut enums shared by the recipe tools.
// Mirrors the taxonomy in `apps/api/src/services/recipes/RecipeFacetExtractor.ts`.
const proteinFamilySchema = z.enum([
  'poulet',
  'boeuf',
  'agneau',
  'poisson',
  'fruits_de_mer',
  'tofu',
  'oeuf',
  'mixte',
]);
const proteinCutSchema = z.enum([
  // poulet
  'cuisse', 'haut_de_cuisse', 'pilon', 'aile', 'blanc', 'escalope', 'entier', 'hache',
  // boeuf (hache already above, deduplicated by zod)
  'steak', 'tranche', 'jarret', 'chuck', 'gras',
  // agneau (PRP-239 PR3.2 extension — jarret + hache reused from boeuf)
  'gigot', 'epaule', 'cotelette', 'selle',
  // poisson / fruits_de_mer
  'saumon', 'thon', 'poisson_blanc', 'crevette',
]);
const dietaryFlagSchema = z.enum(['vegetarien', 'vegan', 'sans_porcin', 'sans_alcool']);

const findRecipesUsingIngredientArgs = z.object({
  /**
   * Free-text ingredient name. Optional when `protein_family` is given —
   * lets the assistant pose "what can I cook with chicken thighs?" as
   * `{ protein_family: 'poulet', protein_cut: 'haut_de_cuisse' }` without
   * having to invent a synthetic ingredient string.
   */
  ingredient: z.string().min(1).max(200).optional(),
  /** PRP-239 PR3 — narrow to a protein family. */
  protein_family: proteinFamilySchema.optional(),
  /** PRP-239 PR3 — narrow to a specific cut (poulet/boeuf/etc.). */
  protein_cut: proteinCutSchema.optional(),
  /** Maximum recipes returned (default 12). */
  limit: z.number().int().min(1).max(50).optional(),
}).refine(
  (args) => Boolean(args.ingredient || args.protein_family),
  { message: 'Either `ingredient` or `protein_family` is required.' },
);
export type FindRecipesUsingIngredientArgs = z.infer<typeof findRecipesUsingIngredientArgs>;

const suggestRecipesForContextArgs = z.object({
  course:z.enum(['starter','main','dessert']).optional(),
  cuisine:z.string().trim().min(1).max(100).optional(),
  ingredient:z.string().min(1).max(200).optional(),
  craving:z.enum(['warm','fresh','comfort','any']).optional(),
  /** Optional free-text narrowing applied via ilike on recipe.name. */
  query: z.string().max(200).optional(),
  max_prep_time: z.number().int().min(1).max(600).optional(),
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
  // PRP-239 PR3 — facet-aware narrowing. Filters the underlying recipe
  // set before bucketing. Combinable with `query` + `meal_type` +
  // `max_prep_time` (AND semantics).
  protein_family: proteinFamilySchema.optional(),
  protein_cut: proteinCutSchema.optional(),
  dietary_flag: dietaryFlagSchema.optional(),
  /** Left out of this request only (« sans crème »); never saved to the profile. */
  // The engine keeps the first 10; a longer list must not fail the whole call.
  exclude_ingredients: z.array(z.string().trim().min(1).max(80)).min(1).max(30).optional(),
});
export type SuggestRecipesForContextArgs = z.infer<typeof suggestRecipesForContextArgs>;

// ---- READ: Product Intelligence (PRP-225 PR5) -----------------------



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
  date: isoDate.optional(),
  /** Older calls: week Monday + day number (0 = Monday). */
  week_start: isoDate.optional(),
  day_of_week: dayOfWeekSchema.optional(),
  meal_type: mealTypeSchema,
}).refine(args => !!args.date || (args.week_start !== undefined && args.day_of_week !== undefined),
  { message: 'date (YYYY-MM-DD) is required', path: ['date'] });
export type AddRecipeToMealPlanArgs = z.infer<typeof addRecipeToMealPlanArgs>;

// ---- LOW: Product Intelligence (PRP-225 PR5) ------------------------



// ---- MEDIUM write tools ----------------------------------------------

const cookRecipeArgs = z.object({
  recipe_id: z.string().uuid(), servings: z.number().finite().positive().max(100).optional(),
  outside_inventory: z.array(z.number().int().nonnegative()).max(100).default([]),
});
export type CookRecipeArgs = z.infer<typeof cookRecipeArgs>;

const consumeInventoryItemsArgs = z.object({
  items: z
    .array(
      z.object({
        inventory_id: z.string().uuid(),
        quantity: z.number().finite().positive(),
        unit: z.string().min(1).max(40).optional(),
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
  recipe_source: z.enum(['recipes', 'user_recipes', 'recipes_catalog']).optional(),
  recipe_title: z.string().min(1).max(300),
  outcome: z.enum(['loved', 'liked', 'ok', 'disliked', 'failed']).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
  would_cook_again: z.boolean().optional(),
});
export type RecordRecipeFeedbackArgs = z.infer<typeof recordRecipeFeedbackArgs>;

// ---- Catalog --------------------------------------------------------

export const TOOL_SPECS: readonly ToolSpec[] = [
  {name:'search_web_recipes',description:'Search reliable cooking websites for external recipe links and verify available recipe ingredients. Use when the user requests websites, sources, links or recipes outside the library. Pass only the dish/cuisine query, never private profile/history or stock. Does not import recipes or buy anything.',
    schema:searchWebRecipesArgs,jsonSchema:{type:'object',required:['query'],properties:{query:{type:'string',minLength:2,maxLength:200},limit:{type:'integer',minimum:1,maximum:3}},additionalProperties:false},defaultRiskTier:'read',reversible:false},
  {name:'read_recipe',description:'Read a full saved recipe by a reference returned by search or recommendations: exact ingredients, quantities, steps, nutrition and source links. Use after search_recipes for instructions, ingredient lists or adapting portions. Never invent the recipe id.',
    schema:readRecipeArgs,jsonSchema:{type:'object',required:['recipe_id'],properties:{recipe_id:{type:'string',format:'uuid'},source:{type:'string',enum:['recipes','user_recipes','recipes_catalog']},servings:{type:'integer',minimum:1,maximum:100}},additionalProperties:false},defaultRiskTier:'read',reversible:false},
  // ===== READ =====
  {
    name: 'read_inventory',
    description:
      'Read the user inventory. Returns items with their product name, category, unit, quantity, expiry date and location. Use this BEFORE suggesting recipes, so you ground answers in actual stock. Adding items never requires a prior read: an empty or unmatched result is no reason to refuse an add.',
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
        search: { type: 'string', description: 'optional item-name filter, e.g. "lait" before removing or checking it' },
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
    description: 'Read the meal plan of the week that contains `date`.',
    schema: readMealPlanArgs,
    jsonSchema: {
      type: 'object',
      required: ['date'],
      properties: {
        date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Any day of the wanted week, copied from the TODAY lines' },
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
        max_prep_time: { type: 'integer', minimum: 1, maximum: 600, description: 'total minutes including preparation, cooking and recorded rest' },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'read',
    reversible: false,
  },
  {
    name: 'search_recipes',
    description: 'Free-text search across the user recipes BY NAME ONLY (recipe.name ILIKE). Does NOT search recipe ingredients — use `find_recipes_using_ingredient` for that.',
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
    name: 'find_recipes_using_ingredient',
    description:
      "Return recipes that USE a given ingredient or match a protein family/cut. Use this when the user asks 'quelles recettes je peux faire avec X', 'recettes au X', 'recettes avec du X', or any phrasing centered on an ingredient. Matches recipe_ingredients.ingredient_name (case-insensitive substring). PRP-239: you can also (or instead) pass protein_family/protein_cut to narrow by recipes.recipe_facets (e.g. {protein_family:'poulet', protein_cut:'haut_de_cuisse'} for 'cuisses de poulet'). Returns the recipe summary plus the actual matched_ingredient string for each row.",
    schema: findRecipesUsingIngredientArgs,
    jsonSchema: {
      type: 'object',
      properties: {
        ingredient: { type: 'string', minLength: 1, maxLength: 200 },
        protein_family: {
          type: 'string',
          enum: ['poulet', 'boeuf', 'agneau', 'poisson', 'fruits_de_mer', 'tofu', 'oeuf', 'mixte'],
          description: 'PRP-239: narrow by recipes.recipe_facets.protein_families',
        },
        protein_cut: {
          type: 'string',
          enum: [
            'cuisse', 'haut_de_cuisse', 'pilon', 'aile', 'blanc', 'escalope', 'entier', 'hache',
            'steak', 'tranche', 'jarret', 'chuck', 'gras',
            'gigot', 'epaule', 'cotelette', 'selle',
            'saumon', 'thon', 'poisson_blanc', 'crevette',
          ],
          description: 'PRP-239: narrow by recipes.recipe_facets.protein_cuts',
        },
        limit: { type: 'integer', minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'read',
    reversible: false,
  },
  {
    name: 'suggest_recipes_for_context',
    description:
      'Personalized server recipe suggestions with effective ingredients, exclusions before scoring, qualified lots, duration, missing quantities, nutrition coverage and structured reasons. cookable_now and almost_cookable are candidates; verify_suggestions need checks; excluded_suggestions must not be recommended. Use for open and ingredient-centric requests.',
    schema: suggestRecipesForContextArgs,
    jsonSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', maxLength: 200, description: 'optional narrowing on recipe name, not its cuisine' },
        cuisine: { type: 'string', minLength:1,maxLength:100,description:'Requested culinary origin from cuisine_category or tags, e.g. tunisienne, italienne. Do not put a cuisine in query.' },
        course:{type:'string',enum:['starter','main','dessert'],description:'Requested course: entrée/starter, plat/main, dessert. Use this instead of searching for these words in dish titles.'},
        ingredient:{ type:'string',minLength:1,maxLength:200,description:'Ingredient in the effective personal recipe, not the title' },
        craving:{ type:'string',enum:['warm','fresh','comfort','any'],description:'Transient meal style' },
        max_prep_time: { type: 'integer', minimum: 1, maximum: 600, description: 'total minutes including preparation, cooking and recorded rest' },
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
        protein_family: {
          type: 'string',
          enum: ['poulet', 'boeuf', 'agneau', 'poisson', 'fruits_de_mer', 'tofu', 'oeuf', 'mixte'],
          description: 'PRP-239: narrow recipes by protein family (recipes.recipe_facets.protein_families).',
        },
        protein_cut: {
          type: 'string',
          enum: [
            'cuisse', 'haut_de_cuisse', 'pilon', 'aile', 'blanc', 'escalope', 'entier', 'hache',
            'steak', 'tranche', 'jarret', 'chuck', 'gras',
            'gigot', 'epaule', 'cotelette', 'selle',
            'saumon', 'thon', 'poisson_blanc', 'crevette',
          ],
          description: 'PRP-239: narrow by recipes.recipe_facets.protein_cuts (e.g. "haut_de_cuisse").',
        },
        dietary_flag: {
          type: 'string',
          enum: ['vegetarien', 'vegan', 'sans_porcin', 'sans_alcool'],
          description: 'PRP-239: narrow by recipes.recipe_facets.dietary_flags. Use sparingly — sans_porcin and sans_alcool are policy defaults.',
        },
        exclude_ingredients: {
          type: 'array', minItems: 1, maxItems: 10,
          items: { type: 'string', minLength: 1, maxLength: 80 },
          description: 'Ingredients the user leaves out of THIS request only, singular or as said (« sans crème » → ["crème"], « pas de champignons ni d’oignons » → ["champignons","oignons"]). Never saved. When the user refines an earlier ask, repeat the earlier exclusions.',
        },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'read',
    reversible: false,
  },
  // PRP-225 PR5 — Product Intelligence read tools.

  // ===== LOW write =====
  {
    name: 'add_inventory_items',
    description:
      'Add items to the user inventory. Each item is { name, quantity, unit, optional category/expiry_date/notes }. The server resolves names to product_ids — you do NOT need to know UUIDs. Call it directly when the user asks to add stock, even if the inventory is empty or lacks that product: the server creates or matches the product.',
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
    description: 'Add items to the user shopping list (is_purchased=false). Preserve the full identity of the requested product, including flavour and brand from its referenced photo; do not replace it with a generic category.',
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
    description: 'Mark shopping list items as purchased, by the ids of a read_shopping_list result.',
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
    description: 'Add a recipe to the user meal plan on a date and meal slot.',
    schema: addRecipeToMealPlanArgs,
    jsonSchema: {
      type: 'object',
      required: ['recipe_id', 'date', 'meal_type'],
      properties: {
        recipe_id: { type: 'string', format: 'uuid' },
        date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'The day, copied from the TODAY lines (« demain » is the Demain date)' },
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
  // PRP-225 PR5 — Product Intelligence write tools.

  // ===== MEDIUM write =====
  {
    name: 'cook_recipe',
    description: 'Record a cooked recipe by its exact id. Converts units and portions, updates stock and cooking journal atomically. Use instead of separate consume_inventory_items and feedback calls. outside_inventory may only name ingredient indexes explicitly confirmed by the user as used outside tracked inventory; otherwise leave it empty.',
    schema: cookRecipeArgs,
    jsonSchema: {
      type: 'object', required: ['recipe_id'], properties: {
        recipe_id: { type: 'string', format: 'uuid' }, servings: { type: 'number', exclusiveMinimum: 0, maximum: 100 },
        outside_inventory: { type: 'array', items: { type: 'integer', minimum: 0 }, maxItems: 100 },
      }, additionalProperties: false,
    }, defaultRiskTier: 'medium', reversible: true,
  },
  {
    name: 'consume_inventory_items',
    description:
      'Decrement inventory quantities (e.g. user cooked something or threw it away). Each item references an inventory row by the id of a read_inventory result (never invented), a positive quantity and its unit. Use the inventory unit if no unit was specified. For a cooked recipe use cook_recipe so stock and journal remain atomic.',
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
              quantity: { type: 'number', exclusiveMinimum: 0 },
              unit: { type: 'string', minLength: 1, maxLength: 40 },
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
    description: 'Update quantity / expiry_date / location of a single inventory row, by the id of a read_inventory result.',
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
    description: 'Delete shopping list rows by the ids of a read_shopping_list result.',
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
    reversible: false,
  },
  {
    name: 'forget_memory',
    description:
      "Forget an owned memory only when the user explicitly asks. Requires a known memory_id. This does not remove a confirmed profile constraint.",
    schema: forgetMemoryArgs,
    jsonSchema: {
      type: 'object',
      required: ['memory_id'],
      properties: {
        memory_id: { type: 'string', format: 'uuid' },
      },
      additionalProperties: false,
    },
    defaultRiskTier: 'low',
    reversible: false,
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
    reversible: false,
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
        recipe_source: { type: 'string', enum: ['recipes', 'user_recipes', 'recipes_catalog'] },
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
