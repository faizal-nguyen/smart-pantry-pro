import type { SupabaseClient } from '@supabase/supabase-js';
import {
  allocateMenuStock, menuShoppingLines,
  type MenuContribution, type MenuMealInput, type MenuShoppingPreview, type MenuShoppingRow, type QualifiedLot, type ResolvedStockRecipe,
} from '@smart/shared';
import { databaseError } from '../stock/StockCommandService.js';

interface BasisMeal {
  id: string; version: number; date: string; meal_type: string; role: 'reserve' | 'target';
  recipe_reference: { id: string; source?: string } | null; servings: number | null; recipe_name: string;
}
interface Basis { week_start: string; as_of: string; menu_version: string; context_revision: number; meals: BasisMeal[] }
type ProductJoin = { name: string; unit_type: string } | Array<{ name: string; unit_type: string }> | null;
const productOf = (join: ProductJoin) => (Array.isArray(join) ? join[0] : join) ?? null;
const referenceKey = (reference: NonNullable<BasisMeal['recipe_reference']>) => `${reference.id}|${reference.source ?? 'auto'}`;

/**
 * V11-01 E1: the review of a week's shopping. The basis (meals and tokens) comes from the database
 * function the command menu_add_missing also uses, so both agree on what was reviewed.
 * Always constructed with a verified user-scoped client: every read is the account's own (RLS).
 */
export class MenuShoppingService {
  constructor(private readonly client: SupabaseClient) {}

  async preview(userId: string, weekStart: string): Promise<MenuShoppingPreview> {
    const { data, error } = await this.client.rpc('menu_shopping_basis', { p_week_start: weekStart });
    if (error) databaseError(error);
    const basis = data as Basis;
    const references = [...new Map(basis.meals.flatMap(meal => meal.recipe_reference ? [[referenceKey(meal.recipe_reference), meal.recipe_reference] as const] : [])).values()];
    const [recipes, lots, rows, contributions] = await Promise.all([
      Promise.all(references.map(async reference => [referenceKey(reference), await this.recipe(reference)] as const)).then(entries => new Map(entries)),
      this.lots(userId), this.rows(userId), this.contributions(userId, weekStart),
    ]);
    const meals: MenuMealInput[] = basis.meals.map(meal => ({
      id: meal.id, version: meal.version, date: meal.date, meal_type: meal.meal_type, role: meal.role, recipe_name: meal.recipe_name, servings: meal.servings,
      recipe: meal.recipe_reference ? recipes.get(referenceKey(meal.recipe_reference)) ?? null : null,
    }));
    const allocation = allocateMenuStock(meals, lots);
    return {
      week_start: basis.week_start, as_of: basis.as_of, menu_version: basis.menu_version, context_revision: basis.context_revision,
      lines: menuShoppingLines(allocation.needs, rows, contributions),
      meals: basis.meals.map(({ id, date, meal_type, recipe_name, role }) => ({ id, date, meal_type, recipe_name, role })),
      uncomputable: allocation.uncomputable,
    };
  }

  /** A recipe deleted or no longer shared since it was planned is named, not counted. */
  private async recipe(reference: NonNullable<BasisMeal['recipe_reference']>): Promise<ResolvedStockRecipe | null> {
    const { data, error } = await this.client.rpc('resolve_stock_recipe', { p_recipe_id: reference.id, p_source: reference.source ?? 'auto' });
    return error || !data ? null : data as ResolvedStockRecipe;
  }

  private async lots(userId: string): Promise<QualifiedLot[]> {
    const { data, error } = await this.client.from('inventory')
      .select('id,product_id,quantity,unit,stock_version,expiry_date,date_kind,quantity_quality,location,notes,product:products(name,unit_type)')
      .eq('user_id', userId);
    if (error) databaseError(error);
    return ((data ?? []) as Array<Record<string, unknown> & { product: ProductJoin }>).map(row => {
      const product = productOf(row.product);
      return { id: String(row.id), product_id: String(row.product_id), product_name: product?.name ?? '', quantity: Number(row.quantity),
        unit: (row.unit as string | null) ?? product?.unit_type ?? null, stock_version: Number(row.stock_version), expiry_date: (row.expiry_date as string | null) ?? null,
        date_kind: (row.date_kind as QualifiedLot['date_kind']) ?? 'unknown', quantity_quality: (row.quantity_quality as QualifiedLot['quantity_quality']) ?? 'unknown',
        location: (row.location as string | null) ?? null, notes: (row.notes as string | null) ?? null };
    });
  }

  private async rows(userId: string): Promise<MenuShoppingRow[]> {
    const { data, error } = await this.client.from('shopping_list')
      .select('id,product_id,quantity,unit,is_purchased,stock_version,created_at,product:products(name,unit_type)')
      .eq('user_id', userId);
    if (error) databaseError(error);
    return ((data ?? []) as Array<Record<string, unknown> & { product: ProductJoin }>).map(row => {
      const product = productOf(row.product);
      return { id: String(row.id), product_id: String(row.product_id), product_name: product?.name ?? '', quantity: Number(row.quantity),
        unit: (row.unit as string | null) ?? product?.unit_type ?? null, is_purchased: Boolean(row.is_purchased),
        stock_version: Number(row.stock_version), created_at: (row.created_at as string | null) ?? null };
    });
  }

  private async contributions(userId: string, weekStart: string): Promise<MenuContribution[]> {
    const { data, error } = await this.client.from('menu_shopping_contributions')
      .select('id,shopping_id,quantity,unit,line_version_after')
      .eq('user_id', userId).eq('week_start_date', weekStart);
    if (error) databaseError(error);
    return ((data ?? []) as MenuContribution[]).map(item => ({ ...item, quantity: Number(item.quantity),
      line_version_after: item.line_version_after == null ? null : Number(item.line_version_after) }));
  }
}
