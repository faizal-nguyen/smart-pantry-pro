import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import {
  allocateMenuStock, menuShoppingLines, menuSlotKey,
  type MenuContribution, type MenuMealInput, type MenuShoppingPreview, type MenuShoppingRow, type ProposedMeal, type QualifiedLot, type ResolvedStockRecipe,
} from '@smart/shared';
import { databaseError } from '../stock/StockCommandService.js';
import { assertFreeSlots, readWeekMenu } from './weekMenu.js';

/** Rows per read: PostgREST's default max-rows; a read follows the pages it is given. */
const PAGE = 1000;
/** A planned recipe the resolver refuses: deleted, no longer shared, or a reference naming none. */
const UNRESOLVED = ['RECIPE_NOT_FOUND', 'INVALID_RECIPE_SOURCE'];
const INVALID_TEXT = '22P02';

const BasisSchema = z.object({
  week_start: z.string(), as_of: z.string(), menu_version: z.string(), context_revision: z.coerce.number(),
  meals: z.array(z.object({
    id: z.string(), version: z.coerce.number(), date: z.string(), meal_type: z.string(), role: z.enum(['reserve', 'target']),
    recipe_reference: z.unknown(), servings: z.number().nullable(), recipe_name: z.string(),
  })),
});
type Basis = z.infer<typeof BasisSchema>;
/** The week's saved meals with their recipes, and the stock they are judged against. */
export interface WeekStock { basis: Basis; meals: MenuMealInput[]; lots: QualifiedLot[] }
/** A proposed meal's identity in a preview: its slot, never a saved meal's id. */
export const proposedMealId = (meal: { date?: string; meal_type?: string }) => `proposal:${menuSlotKey(meal)}`;
interface PlannedRecipe { id: string; source: string }
type ProductJoin = { name: string; unit_type: string } | Array<{ name: string; unit_type: string }> | null;
type Row = Record<string, unknown> & { product?: ProductJoin };
type Page = PromiseLike<{ data: unknown[] | null; error: { message: string; code?: string } | null; count?: number | null }>;

const productOf = (join: ProductJoin | undefined) => (Array.isArray(join) ? join[0] : join) ?? null;
/** The recipe a meal plans, when its reference names one. */
const plannedRecipe = (reference: unknown): PlannedRecipe | null => {
  if (!reference || typeof reference !== 'object') return null;
  const { id, source } = reference as { id?: unknown; source?: unknown };
  return typeof id === 'string' && id ? { id, source: typeof source === 'string' ? source : 'auto' } : null;
};
const recipeKey = (recipe: PlannedRecipe) => `${recipe.id}|${recipe.source}`;

/** Every row of a read, a page at a time: one PostgREST response holds at most max-rows. */
async function readAll(page: (from: number, to: number) => Page): Promise<Row[]> {
  const rows: Row[] = [];
  for (;;) {
    const { data, error, count } = await page(rows.length, rows.length + PAGE - 1);
    if (error) databaseError(error);
    rows.push(...((data ?? []) as Row[]));
    if (!data?.length || (count != null && rows.length >= count)) return rows;
  }
}

/**
 * V11-01 E1: the review of a week's shopping. The basis (meals and tokens) comes from the database
 * function the command menu_add_missing also uses, so both agree on what was reviewed.
 * Always constructed with a verified user-scoped client: every read is the account's own (RLS).
 */
export class MenuShoppingService {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * V11-01 E4a: with a proposal, its meals count as meals to shop for (named `proposal:<slot>`), into
   * slots still free today or later; nothing is saved, and the tokens stay those of the saved menu,
   * so menu_add_missing never confirms a proposal's lines.
   */
  async preview(userId: string, weekStart: string, proposal?: ProposedMeal[]): Promise<MenuShoppingPreview> {
    const [week, rows, contributions] = await Promise.all([this.weekStock(userId, weekStart), this.rows(userId), this.contributions(userId, weekStart)]);
    const proposed = proposal?.length ? await this.proposedMeals(userId, weekStart, week.basis.as_of, proposal) : [];
    const allocation = allocateMenuStock([...week.meals, ...proposed], week.lots);
    const { basis } = week;
    return {
      week_start: basis.week_start, as_of: basis.as_of, menu_version: basis.menu_version, context_revision: basis.context_revision,
      lines: menuShoppingLines(allocation.needs, rows, contributions),
      meals: [...basis.meals, ...proposed].map(({ id, date, meal_type, recipe_name, role }) => ({ id, date, meal_type, recipe_name, role })),
      uncomputable: allocation.uncomputable,
    };
  }

  /** The saved meals of the week (from today) with their recipes, and the account's stock. */
  async weekStock(userId: string, weekStart: string): Promise<WeekStock> {
    const basis = await this.basis(weekStart);
    const planned = [...new Map(basis.meals.flatMap(meal => {
      const recipe = plannedRecipe(meal.recipe_reference);
      return recipe ? [[recipeKey(recipe), recipe] as const] : [];
    })).values()];
    const [recipes, lots] = await Promise.all([
      Promise.all(planned.map(async recipe => [recipeKey(recipe), await this.recipe(recipe)] as const)).then(entries => new Map(entries)),
      this.lots(userId),
    ]);
    const meals: MenuMealInput[] = basis.meals.map(meal => {
      const recipe = plannedRecipe(meal.recipe_reference);
      const resolved = recipe ? recipes.get(recipeKey(recipe)) ?? null : null;
      return { id: meal.id, version: meal.version, date: meal.date, meal_type: meal.meal_type, role: meal.role, recipe_name: meal.recipe_name,
        servings: meal.servings, recipe: resolved, recipe_unavailable: meal.recipe_reference != null && !resolved };
    });
    return { basis, meals, lots };
  }

  /** Proposed meals as meals to shop for, once their slots are known free (today or later, empty). */
  async proposedMeals(userId: string, weekStart: string, today: string, proposal: ProposedMeal[]): Promise<MenuMealInput[]> {
    assertFreeSlots(await readWeekMenu(this.client, userId, weekStart), today, proposal);
    return this.resolveMeals(proposal);
  }

  /** Meals not saved (proposed or kept): their recipes resolved, as target meals of their slot. */
  async resolveMeals(meals: ProposedMeal[]): Promise<MenuMealInput[]> {
    // One read per recipe, however many meals name it.
    const reads = new Map<string, Promise<ResolvedStockRecipe | null>>();
    return Promise.all(meals.map(async meal => {
      const recipe = { id: String(meal.recipe?.id), source: meal.recipe?.source ?? 'auto' };
      if (!reads.has(recipeKey(recipe))) reads.set(recipeKey(recipe), this.recipe(recipe));
      const resolved = await reads.get(recipeKey(recipe))!;
      return { id: proposedMealId(meal), version: 0, date: String(meal.date), meal_type: String(meal.meal_type), role: 'target' as const,
        recipe_name: resolved?.name ?? 'Recette', servings: Number(meal.servings), recipe: resolved, recipe_unavailable: !resolved };
    }));
  }

  private async basis(weekStart: string): Promise<Basis> {
    const { data, error } = await this.client.rpc('menu_shopping_basis', { p_week_start: weekStart });
    if (error) databaseError(error);
    const parsed = BasisSchema.safeParse(data);
    if (!parsed.success) throw new Error('MENU_BASIS_INVALID');
    return parsed.data;
  }

  /** null when the planned recipe no longer resolves; any other failure fails the preview. */
  private async recipe(recipe: PlannedRecipe): Promise<ResolvedStockRecipe | null> {
    const { data, error } = await this.client.rpc('resolve_stock_recipe', { p_recipe_id: recipe.id, p_source: recipe.source });
    if (error && (UNRESOLVED.some(code => error.message?.startsWith(code)) || error.code === INVALID_TEXT)) return null;
    if (error) databaseError(error);
    return data && Array.isArray((data as ResolvedStockRecipe).ingredients) ? data as ResolvedStockRecipe : null;
  }

  private async lots(userId: string): Promise<QualifiedLot[]> {
    const data = await readAll((from, to) => this.client.from('inventory')
      .select('id,product_id,quantity,unit,stock_version,expiry_date,date_kind,quantity_quality,location,notes,product:products(name,unit_type)', { count: 'exact' })
      .eq('user_id', userId).order('id').range(from, to));
    return data.map(row => {
      const product = productOf(row.product);
      return { id: String(row.id), product_id: String(row.product_id), product_name: product?.name ?? '', quantity: Number(row.quantity),
        unit: (row.unit as string | null) ?? product?.unit_type ?? null, stock_version: Number(row.stock_version), expiry_date: (row.expiry_date as string | null) ?? null,
        date_kind: (row.date_kind as QualifiedLot['date_kind']) ?? 'unknown', quantity_quality: (row.quantity_quality as QualifiedLot['quantity_quality']) ?? 'unknown',
        location: (row.location as string | null) ?? null, notes: (row.notes as string | null) ?? null };
    });
  }

  private async rows(userId: string): Promise<MenuShoppingRow[]> {
    const data = await readAll((from, to) => this.client.from('shopping_list')
      .select('id,product_id,quantity,unit,is_purchased,stock_version,created_at,product:products(name,unit_type)', { count: 'exact' })
      .eq('user_id', userId).order('id').range(from, to));
    return data.map(row => {
      const product = productOf(row.product);
      return { id: String(row.id), product_id: String(row.product_id), product_name: product?.name ?? '', quantity: Number(row.quantity),
        unit: (row.unit as string | null) ?? product?.unit_type ?? null, is_purchased: Boolean(row.is_purchased),
        stock_version: Number(row.stock_version), created_at: (row.created_at as string | null) ?? null };
    });
  }

  private async contributions(userId: string, weekStart: string): Promise<MenuContribution[]> {
    const data = await readAll((from, to) => this.client.from('menu_shopping_contributions')
      .select('id,shopping_id,quantity,unit,line_version_after', { count: 'exact' })
      .eq('user_id', userId).eq('week_start_date', weekStart).order('id').range(from, to));
    return data.map(item => ({ id: Number(item.id), shopping_id: String(item.shopping_id), quantity: Number(item.quantity),
      unit: (item.unit as string | null) ?? null, line_version_after: item.line_version_after == null ? null : Number(item.line_version_after) }));
  }
}
