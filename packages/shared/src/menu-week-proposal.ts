/**
 * V11-01 E4a (D7) — a proposed week: recipes for empty slots, read from the recommendation engine
 * without any write. Stateless: the proposal is identified (an imprint of its inputs and of the
 * versions it read) and expires; nothing is stored. Shared by the Menus screen and, later, the
 * assistant (V11-04), which gets no extra write.
 */
import { z } from 'zod';
import { inMenuWeek, isCalendarDay, menuSlotKey, MenuWeekStartSchema, ProposedMealSchema } from './menu-shopping.js';
import { MealContextSchema } from './personalization.js';
import { RecipeReferenceSchema } from './stock-commands.js';

/** A proposal is valid 30 minutes (V11-01 E0), then computed again. */
export const WEEK_PROPOSAL_TTL_MINUTES = 30;
export const WEEK_PROPOSAL_MAX_SLOTS = 28;

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const mealType = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
const hash = z.string().regex(/^[0-9a-f]{32}$/);
const SlotSchema = z.object({ date: day.refine(isCalendarDay, { message: 'a calendar day' }), meal_type: mealType }).strict();

/** What a proposal respects, beyond the profile: the meal context's fields, and foods left out. */
export const WeekProposalConstraintsSchema = z.object({
  timeLimitMinutes: MealContextSchema.shape.timeLimitMinutes,
  excludedIngredients: z.array(z.string().trim().min(1).max(80)).max(10).optional(),
  dietaryFlag: MealContextSchema.shape.dietaryFlag,
  goal: MealContextSchema.shape.goal,
}).strict();

/** POST /api/v1/menus/week-proposal. */
export const WeekProposalRequestSchema = z.object({
  week_start: MenuWeekStartSchema,
  /** The empty slots to fill; none when a proposal is recomputed with every choice kept (E4b). */
  slots: z.array(SlotSchema).max(WEEK_PROPOSAL_MAX_SLOTS),
  servings: z.number().int().min(1).max(20).optional(),
  constraints: WeekProposalConstraintsSchema.optional(),
  /** Slots of an earlier proposal kept as they are (« change jeudi soir »): placed, never chosen again. */
  keep: z.array(ProposedMealSchema).max(WEEK_PROPOSAL_MAX_SLOTS).optional(),
  /** Recipes the user set aside: never proposed. */
  avoid: z.array(RecipeReferenceSchema).max(50).optional(),
}).strict().superRefine((value, context) => {
  const seen = new Set<string>();
  const slots = [...value.slots.map(slot => ['slots', slot] as const), ...(value.keep ?? []).map(slot => ['keep', slot] as const)];
  for (const [index, [field, slot]] of slots.entries()) {
    const at = field === 'slots' ? index : index - value.slots.length;
    if (!inMenuWeek(value.week_start, slot.date)) context.addIssue({ code: z.ZodIssueCode.custom, path: [field, at, 'date'], message: 'a slot is a day of the week' });
    if (seen.has(menuSlotKey(slot))) context.addIssue({ code: z.ZodIssueCode.custom, path: [field, at], message: 'a slot is named once' });
    seen.add(menuSlotKey(slot));
  }
  if (slots.length > WEEK_PROPOSAL_MAX_SLOTS) context.addIssue({ code: z.ZodIssueCode.custom, path: ['keep'], message: 'a week has 28 slots' });
  if (!slots.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['slots'], message: 'a slot to fill or to keep' });
});
export type WeekProposalRequest = z.infer<typeof WeekProposalRequestSchema>;

const amount = z.number().finite();
const ProposalRecipeSchema = z.object({
  /** As update_menu set takes it: a kept meal whose recipe no longer resolves keeps the reference it was given. */
  reference: z.object({ id: z.string().min(1), source: z.enum(['auto', 'recipes', 'user_recipes', 'recipes_catalog']) }).strict(),
  name: z.string(), image_url: z.string().nullable(), duration_minutes: z.number().int().nonnegative().nullable(),
  servings: z.number().int().min(1).max(100),
}).strict();
/** What the slot's meal lacks once the earlier meals of the week took their stock. */
const ProposalMissingSchema = z.object({
  name: z.string(), quantity: amount.nullable(), unit: z.string().nullable(), status: z.enum(['to_buy', 'manual', 'verify']),
}).strict();
const filled = {
  date: day, meal_type: mealType, recipe: ProposalRecipeSchema,
  /** The engine's reasons that do not speak of stock: stock is judged again for the week. */
  reasons: z.array(z.string()),
  availability: z.enum(['in_stock', 'to_buy', 'to_check']),
  missing: z.array(ProposalMissingSchema),
};
export const WeekProposalSlotSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('proposed'), ...filled }).strict(),
  z.object({ status: z.literal('kept'), ...filled }).strict(),
  /** NO_COMPATIBLE_RECIPE: nothing meets the profile and constraints; POOL_EXHAUSTED: every match is already placed. */
  z.object({ status: z.literal('empty'), date: day, meal_type: mealType, cause: z.enum(['NO_COMPATIBLE_RECIPE', 'POOL_EXHAUSTED']) }).strict(),
]);
export type WeekProposalSlot = z.infer<typeof WeekProposalSlotSchema>;

export const WeekProposalSchema = z.object({
  proposal_id: hash, week_start: day,
  calculated_at: z.string().datetime(), expires_at: z.string().datetime(),
  /** The week's meals as read (all of them, cooked and leftovers included). */
  menu_version: hash,
  context_revision: z.number().int().nonnegative(), profile_version: z.number().int().nonnegative(),
  slots: z.array(WeekProposalSlotSchema),
}).strict();
export type WeekProposal = z.infer<typeof WeekProposalSchema>;
