import { z } from 'zod';

export const ConcreteRecipeReferenceSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(['recipes', 'user_recipes', 'recipes_catalog']),
}).strict();
export const RecipeEvaluationInputSchema = z.object({
  recipe: ConcreteRecipeReferenceSchema,
  servings: z.number().finite().positive().max(100),
}).strict();
export type RecipeEvaluationInput = z.infer<typeof RecipeEvaluationInputSchema>;

const nonnegative = z.number().finite().nonnegative();
const missing = z.object({
  ingredient_index: nonnegative.int(), ingredient_name: z.string(), quantity: nonnegative.nullable(),
  unit: z.string().nullable(), is_essential: z.boolean(),
  reason: z.enum(['NOT_IN_STOCK', 'INSUFFICIENT_QUANTITY', 'QUANTITY_UNKNOWN', 'UNIT_UNKNOWN', 'UNIT_INCOMPATIBLE']),
});
const nullableMacro = nonnegative.nullable();
export const RecipeEvaluationSchema = z.object({
  reference: ConcreteRecipeReferenceSchema,
  servings: z.number().finite().positive().max(100).nullable(),
  base_servings: z.number().finite().positive().nullable(),
  // Evaluation fingerprint only; stock commands still use their own preview token.
  recipe_version: z.string().min(1),
  profile_version: nonnegative.int(), stock_version: z.string().min(1),
  calculated_at: z.string().datetime({ offset: true }), duration_minutes: nonnegative.nullable(),
  constraints: z.object({
    status: z.enum(['compatible', 'incompatible', 'verify']),
    findings: z.array(z.object({ code: z.string(), ingredient: z.string().nullable(), message: z.string() })),
    registry_version: z.string(), limitations: z.array(z.string()),
  }),
  availability: z.object({
    status: z.enum(['available', 'missing', 'verify']), missing: z.array(missing),
    allocations: z.array(z.object({
      ingredient_index: nonnegative.int(), inventory_id: z.string(), quantity: nonnegative,
      unit: z.string(), expected_version: nonnegative.int(),
    })),
    uncertainties: z.array(z.string()), excluded_lots: z.array(z.string()),
    excluded_lot_reasons: z.array(z.object({
      id: z.string(), date_kind: z.enum(['use_by', 'best_before', 'unknown']), message: z.string(),
    })).optional(),
  }),
  nutrition: z.object({
    status: z.enum(['known', 'estimated', 'partial', 'unavailable']),
    coverage: nonnegative.max(1), known_ingredients: nonnegative.int(), total_ingredients: nonnegative.int(),
    per_serving: z.object({ energyKcal: nullableMacro, proteinG: nullableMacro, fiberG: nullableMacro }),
    sources: z.array(z.object({ product_id: z.string(), source: z.string(), updated_at: z.string().nullable(), base: z.literal('100g') })),
    limitations: z.array(z.string()),
  }),
});
export type RecipeEvaluation = z.infer<typeof RecipeEvaluationSchema>;
