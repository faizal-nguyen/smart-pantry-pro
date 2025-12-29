import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase.js';
import { InventoryRepository } from '../repositories/InventoryRepository.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

type InventoryItem = Database['public']['Tables']['inventory']['Row'];
type CreateInventoryItemData = Database['public']['Tables']['inventory']['Insert'];
type UpdateInventoryItemData = Database['public']['Tables']['inventory']['Update'];

/**
 * InventoryService - Business logic for inventory management
 */
export class InventoryService {
  private repository: InventoryRepository;

  constructor(supabase: SupabaseClient<Database>) {
    this.repository = new InventoryRepository(supabase);
  }

  /**
   * Get all inventory items for a user
   */
  async getAll(userId: string, filters?: {
    zone?: string;
    category?: string;
  }): Promise<InventoryItem[]> {
    if (filters?.zone) {
      return this.repository.findByLocation(userId, filters.zone);
    }
    if (filters?.category) {
      return this.repository.findByCategory(userId, filters.category);
    }
    return this.repository.findAll(userId);
  }

  /**
   * Get a single inventory item
   */
  async getById(userId: string, itemId: string): Promise<InventoryItem | null> {
    return this.repository.findById(itemId, userId);
  }

  /**
   * Create a new inventory item
   */
  async create(userId: string, data: Omit<CreateInventoryItemData, 'user_id'>): Promise<InventoryItem> {
    // Calculate freshness based on expiration date
    const freshness = this.calculateFreshness(data.expiration_date);

    return this.repository.create({
      ...data,
      user_id: userId,
      freshness,
      created_at: new Date().toISOString()
    });
  }

  /**
   * Update an inventory item
   */
  async update(
    userId: string,
    itemId: string,
    data: UpdateInventoryItemData
  ): Promise<InventoryItem> {
    // Recalculate freshness if expiration date changed
    if (data.expiration_date) {
      data.freshness = this.calculateFreshness(data.expiration_date);
    }

    data.updated_at = new Date().toISOString();

    return this.repository.update(itemId, userId, data);
  }

  /**
   * Delete an inventory item
   */
  async delete(userId: string, itemId: string): Promise<void> {
    return this.repository.delete(itemId, userId);
  }

  /**
   * Search inventory items
   */
  async search(userId: string, query: string): Promise<InventoryItem[]> {
    return this.repository.search(userId, query);
  }

  /**
   * Get items expiring soon
   */
  async getExpiringSoon(userId: string, withinDays: number = 7): Promise<InventoryItem[]> {
    return this.repository.findExpiringSoon(userId, withinDays);
  }

  /**
   * Get low stock items
   */
  async getLowStock(userId: string, threshold: number = 2): Promise<InventoryItem[]> {
    return this.repository.findLowStock(userId, threshold);
  }

  /**
   * Get inventory statistics
   */
  async getStats(userId: string) {
    return this.repository.getStats(userId);
  }

  /**
   * Consume an item (decrease quantity)
   * Uses database-level transaction for ACID guarantees
   */
  async consume(userId: string, itemId: string, amount: number): Promise<InventoryItem> {
    if (amount <= 0) {
      throw new BadRequestError('Amount must be positive');
    }

    // Use database function with transaction support
    // This ensures atomic operation: check quantity -> update OR delete
    try {
      const result = await this.repository.executeRpc('consume_inventory_item', {
        p_item_id: itemId,
        p_user_id: userId,
        p_amount: amount
      });

      return result as unknown as InventoryItem;
    } catch (error: unknown) {
      // Re-throw with standardized errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('not found')) {
        throw new NotFoundError('Item not found');
      }
      if (errorMessage.includes('Insufficient quantity')) {
        throw new BadRequestError('Insufficient quantity');
      }
      throw error;
    }
  }

  /**
   * Restock an item (increase quantity)
   */
  async restock(userId: string, itemId: string, amount: number): Promise<InventoryItem> {
    if (amount <= 0) {
      throw new BadRequestError('Amount must be positive');
    }

    return this.repository.updateQuantity(itemId, userId, amount);
  }

  /**
   * Calculate freshness score based on expiration date
   * Returns a value between 0 and 1
   */
  private calculateFreshness(expirationDate: string): number {
    const now = new Date();
    const expiry = new Date(expirationDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry <= 0) return 0; // Expired
    if (daysUntilExpiry >= 30) return 1; // Very fresh

    // Linear scale: 30 days = 100%, 0 days = 0%
    return daysUntilExpiry / 30;
  }

  /**
   * Get items by zone/location
   */
  async getByZone(userId: string, zone: string): Promise<InventoryItem[]> {
    return this.repository.findByLocation(userId, zone);
  }

  /**
   * Get items by category
   */
  async getByCategory(userId: string, category: string): Promise<InventoryItem[]> {
    return this.repository.findByCategory(userId, category);
  }

  /**
   * Bulk create inventory items
   */
  async createBulk(
    userId: string,
    items: Array<Omit<CreateInventoryItemData, 'user_id'>>
  ): Promise<InventoryItem[]> {
    const itemsWithFreshness = items.map(item => ({
      ...item,
      user_id: userId,
      freshness: this.calculateFreshness(item.expiration_date),
      created_at: new Date().toISOString()
    }));

    const results: InventoryItem[] = [];
    for (const item of itemsWithFreshness) {
      const created = await this.repository.create(item);
      results.push(created);
    }

    return results;
  }
}
