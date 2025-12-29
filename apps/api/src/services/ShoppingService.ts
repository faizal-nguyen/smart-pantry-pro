import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase.js';
import { ShoppingRepository } from '../repositories/ShoppingRepository.js';
import { InventoryRepository } from '../repositories/InventoryRepository.js';

type ShoppingItem = Database['public']['Tables']['shopping_list']['Row'];
type CreateShoppingItemData = Database['public']['Tables']['shopping_list']['Insert'];
type UpdateShoppingItemData = Database['public']['Tables']['shopping_list']['Update'];

/**
 * ShoppingService - Business logic for shopping list management
 */
export class ShoppingService {
  private repository: ShoppingRepository;
  private inventoryRepository: InventoryRepository;

  constructor(supabase: SupabaseClient<Database>) {
    this.repository = new ShoppingRepository(supabase);
    this.inventoryRepository = new InventoryRepository(supabase);
  }

  /**
   * Get all shopping items
   */
  async getAll(userId: string, filters?: {
    listId?: string;
    category?: string;
    uncheckedOnly?: boolean;
  }): Promise<ShoppingItem[]> {
    if (filters?.uncheckedOnly) {
      return this.repository.findUnchecked(userId, filters.listId);
    }
    if (filters?.category) {
      return this.repository.findByCategory(userId, filters.category, filters.listId);
    }
    if (filters?.listId) {
      return this.repository.findByListId(userId, filters.listId);
    }
    return this.repository.findAll(userId);
  }

  /**
   * Get a single shopping item
   */
  async getById(userId: string, itemId: string): Promise<ShoppingItem | null> {
    return this.repository.findById(itemId, userId);
  }

  /**
   * Create a new shopping item
   */
  async create(userId: string, data: Omit<CreateShoppingItemData, 'user_id'>): Promise<ShoppingItem> {
    return this.repository.create({
      ...data,
      user_id: userId,
      is_checked: false,
      created_at: new Date().toISOString()
    });
  }

  /**
   * Update a shopping item
   */
  async update(
    userId: string,
    itemId: string,
    data: UpdateShoppingItemData
  ): Promise<ShoppingItem> {
    data.updated_at = new Date().toISOString();
    return this.repository.update(itemId, userId, data);
  }

  /**
   * Delete a shopping item
   */
  async delete(userId: string, itemId: string): Promise<void> {
    return this.repository.delete(itemId, userId);
  }

  /**
   * Toggle item checked status
   */
  async toggleChecked(userId: string, itemId: string): Promise<ShoppingItem> {
    return this.repository.toggleChecked(itemId, userId);
  }

  /**
   * Mark all items in a list as checked/unchecked
   */
  async markAllChecked(userId: string, listId: string, checked: boolean): Promise<void> {
    return this.repository.markAllChecked(userId, listId, checked);
  }

  /**
   * Delete all checked items from a list
   */
  async deleteChecked(userId: string, listId: string): Promise<void> {
    return this.repository.deleteChecked(userId, listId);
  }

  /**
   * Get shopping list statistics
   */
  async getStats(userId: string, listId: string) {
    return this.repository.getStats(userId, listId);
  }

  /**
   * Add multiple items at once
   */
  async createBulk(
    userId: string,
    items: Array<Omit<CreateShoppingItemData, 'user_id'>>
  ): Promise<ShoppingItem[]> {
    const itemsWithDefaults = items.map(item => ({
      ...item,
      user_id: userId,
      is_checked: false,
      created_at: new Date().toISOString()
    }));

    return this.repository.createBulk(itemsWithDefaults);
  }

  /**
   * Generate shopping list from low stock inventory items
   */
  async generateFromLowStock(
    userId: string,
    listId: string,
    threshold: number = 2
  ): Promise<ShoppingItem[]> {
    const lowStockItems = await this.inventoryRepository.findLowStock(userId, threshold);

    const shoppingItems = lowStockItems.map(item => ({
      user_id: userId,
      shopping_list_id: listId,
      name: item.name,
      quantity: Math.max(5 - (item.quantity || 0), 1), // Suggest restocking to 5 units
      unit: item.unit,
      category: item.category,
      estimated_price: 0,
      is_checked: false,
      created_at: new Date().toISOString()
    }));

    if (shoppingItems.length === 0) {
      return [];
    }

    return this.repository.createBulk(shoppingItems);
  }

  /**
   * Add recipe ingredients to shopping list
   */
  async addRecipeIngredients(
    userId: string,
    listId: string,
    recipeIngredients: Array<{ name: string; quantity?: number; unit?: string }>
  ): Promise<ShoppingItem[]> {
    // Get current inventory to check what's already available
    const inventory = await this.inventoryRepository.findAll(userId);
    const inventoryNames = new Set(inventory.map(item => item.name.toLowerCase()));

    // Filter out ingredients that are already in inventory
    const missingIngredients = recipeIngredients.filter(
      ing => !inventoryNames.has(ing.name.toLowerCase())
    );

    if (missingIngredients.length === 0) {
      return [];
    }

    const shoppingItems = missingIngredients.map(ing => ({
      user_id: userId,
      shopping_list_id: listId,
      name: ing.name,
      quantity: ing.quantity || 1,
      unit: ing.unit || 'unit',
      category: this.categorizeIngredient(ing.name),
      estimated_price: 0,
      is_checked: false,
      created_at: new Date().toISOString()
    }));

    return this.repository.createBulk(shoppingItems);
  }

  /**
   * Update item quantity
   */
  async updateQuantity(
    userId: string,
    itemId: string,
    quantity: number,
    unit?: string
  ): Promise<ShoppingItem> {
    return this.repository.updateQuantity(itemId, userId, quantity, unit);
  }

  /**
   * Simple ingredient categorization
   */
  private categorizeIngredient(name: string): string {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('lait') || lowerName.includes('fromage') || lowerName.includes('yaourt')) {
      return 'Produits laitiers';
    }
    if (lowerName.includes('viande') || lowerName.includes('poulet') || lowerName.includes('boeuf')) {
      return 'Viandes';
    }
    if (lowerName.includes('poisson') || lowerName.includes('saumon') || lowerName.includes('thon')) {
      return 'Poissons';
    }
    if (lowerName.includes('fruit') || lowerName.includes('pomme') || lowerName.includes('banane')) {
      return 'Fruits';
    }
    if (lowerName.includes('légume') || lowerName.includes('carotte') || lowerName.includes('tomate')) {
      return 'Légumes';
    }
    if (lowerName.includes('pain') || lowerName.includes('baguette') || lowerName.includes('farine')) {
      return 'Boulangerie';
    }
    if (lowerName.includes('riz') || lowerName.includes('pâtes') || lowerName.includes('céréales')) {
      return 'Féculents';
    }

    return 'Épicerie';
  }
}
