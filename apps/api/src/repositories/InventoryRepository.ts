import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase.js';
import { BaseRepository } from './BaseRepository.js';
import { sanitizeSearchQuery } from '../utils/sanitization.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

type InventoryItem = Database['public']['Tables']['inventory']['Row'];

export class InventoryRepository extends BaseRepository<InventoryItem, 'inventory'> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, 'inventory');
  }

  /**
   * Find items expiring soon (within specified days)
   */
  async findExpiringSoon(userId: string, withinDays: number = 7): Promise<InventoryItem[]> {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + withinDays);

    const { data, error } = await this.table()
      .select('*')
      .eq('user_id', userId)
      .lte('expiration_date', expirationDate.toISOString())
      .order('expiration_date', { ascending: true });

    if (error) throw error;
    return (data || []) as InventoryItem[];
  }

  /**
   * Find items by location/zone
   */
  async findByLocation(userId: string, zone: string): Promise<InventoryItem[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = this.supabase.from('inventory') as any;
    const { data, error } = await query
      .select('*')
      .eq('user_id', userId)
      .eq('location->zone', zone)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as InventoryItem[];
  }

  /**
   * Find items by category
   */
  async findByCategory(userId: string, category: string): Promise<InventoryItem[]> {
    const { data, error } = await this.table()
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as InventoryItem[];
  }

  /**
   * Search items by name
   * Uses sanitized query to prevent SQL injection via ILIKE
   */
  async search(userId: string, query: string): Promise<InventoryItem[]> {
    // CRITICAL: Sanitize search query to prevent SQL injection
    const sanitizedQuery = sanitizeSearchQuery(query);

    const { data, error } = await this.table()
      .select('*')
      .eq('user_id', userId)
      .ilike('name', `%${sanitizedQuery}%`)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as InventoryItem[];
  }

  /**
   * Get low stock items (quantity below threshold)
   */
  async findLowStock(userId: string, threshold: number = 2): Promise<InventoryItem[]> {
    const { data, error } = await this.table()
      .select('*')
      .eq('user_id', userId)
      .lt('quantity', threshold)
      .order('quantity', { ascending: true });

    if (error) throw error;
    return (data || []) as InventoryItem[];
  }

  /**
   * Get inventory statistics
   */
  async getStats(userId: string): Promise<{
    total: number;
    expiringThisWeek: number;
    lowStock: number;
    byCategory: Record<string, number>;
    byZone: Record<string, number>;
  }> {
    // Total items
    const total = await this.count(userId);

    // Expiring this week
    const expiringItems = await this.findExpiringSoon(userId, 7);

    // Low stock
    const lowStockItems = await this.findLowStock(userId, 2);

    // Get all items for aggregations
    const allItems = await this.findAll(userId);

    // By category
    const byCategory: Record<string, number> = {};
    allItems.forEach(item => {
      const cat = item.category || 'Autres';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    // By zone
    const byZone: Record<string, number> = {};
    allItems.forEach(item => {
      const zone = (item.location as any)?.zone || 'Autres';
      byZone[zone] = (byZone[zone] || 0) + 1;
    });

    return {
      total,
      expiringThisWeek: expiringItems.length,
      lowStock: lowStockItems.length,
      byCategory,
      byZone
    };
  }

  /**
   * Update item quantity
   */
  async updateQuantity(
    id: string,
    userId: string,
    quantityChange: number
  ): Promise<InventoryItem> {
    // First get current item
    const current = await this.findById(id, userId);
    if (!current) {
      throw new NotFoundError('Item not found');
    }

    const newQuantity = (current.quantity || 0) + quantityChange;

    if (newQuantity < 0) {
      throw new BadRequestError('Quantity cannot be negative');
    }

    return this.update(id, userId, { quantity: newQuantity });
  }
}
