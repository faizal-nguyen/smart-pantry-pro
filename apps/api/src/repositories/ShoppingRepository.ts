import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase.js';
import { BaseRepository } from './BaseRepository.js';
import { NotFoundError } from '../utils/errors.js';

type ShoppingItem = Database['public']['Tables']['shopping_list']['Row'];

export class ShoppingRepository extends BaseRepository<ShoppingItem, 'shopping_list'> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, 'shopping_list');
  }

  /**
   * Find items by shopping list ID
   */
  async findByListId(userId: string, listId: string): Promise<ShoppingItem[]> {
    const { data, error } = await this.table()
      .select('*')
      .eq('user_id', userId)
      .eq('list_id', listId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as ShoppingItem[];
  }

  /**
   * Find unchecked items (not purchased yet)
   */
  async findUnchecked(userId: string, listId?: string): Promise<ShoppingItem[]> {
    let query = this.table()
      .select('*')
      .eq('user_id', userId)
      .eq('is_checked', false)
      .order('created_at', { ascending: true });

    if (listId) {
      query = query.eq('list_id', listId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as ShoppingItem[];
  }

  /**
   * Find items by category
   */
  async findByCategory(userId: string, category: string, listId?: string): Promise<ShoppingItem[]> {
    let query = this.table()
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .order('name', { ascending: true });

    if (listId) {
      query = query.eq('list_id', listId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as ShoppingItem[];
  }

  /**
   * Toggle item checked status
   */
  async toggleChecked(id: string, userId: string): Promise<ShoppingItem> {
    const item = await this.findById(id, userId);
    if (!item) {
      throw new NotFoundError('Shopping item not found');
    }

    return this.update(id, userId, {
      is_checked: !item.is_checked
    });
  }

  /**
   * Mark all items as checked/unchecked
   */
  async markAllChecked(userId: string, listId: string, checked: boolean): Promise<void> {
    const { error } = await this.table()
      .update({ is_checked: checked })
      .eq('user_id', userId)
      .eq('list_id', listId);

    if (error) throw error;
  }

  /**
   * Delete all checked items
   */
  async deleteChecked(userId: string, listId: string): Promise<void> {
    const { error } = await this.table()
      .delete()
      .eq('user_id', userId)
      .eq('list_id', listId)
      .eq('is_checked', true);

    if (error) throw error;
  }

  /**
   * Get shopping list statistics
   */
  async getStats(userId: string, listId: string): Promise<{
    total: number;
    checked: number;
    unchecked: number;
    byCategory: Record<string, number>;
  }> {
    const items = await this.findByListId(userId, listId);

    const total = items.length;
    const checked = items.filter(i => i.is_checked).length;
    const unchecked = total - checked;

    // By category
    const byCategory: Record<string, number> = {};
    items.forEach(item => {
      const cat = item.category || 'Autres';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    return {
      total,
      checked,
      unchecked,
      byCategory
    };
  }

  /**
   * Add multiple items at once
   */
  async createBulk(items: Array<Partial<ShoppingItem> & { user_id: string }>): Promise<ShoppingItem[]> {
    const { data, error } = await this.table()
      .insert(items as Database['public']['Tables']['shopping_list']['Insert'][])
      .select();

    if (error) throw error;
    return (data || []) as ShoppingItem[];
  }

  /**
   * Update item quantity
   */
  async updateQuantity(
    id: string,
    userId: string,
    quantity: number,
    unit?: string
  ): Promise<ShoppingItem> {
    const updateData: Partial<ShoppingItem> = { quantity };
    if (unit) {
      updateData.unit = unit;
    }

    return this.update(id, userId, updateData);
  }
}
