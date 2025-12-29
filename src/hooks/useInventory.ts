/**
 * useInventory - Enhanced inventory hook with optimistic updates
 * Phase 1 Implementation: Fast UI feedback + real-time sync ready
 *
 * Features:
 * - Optimistic updates for instant UI feedback
 * - Rollback on error
 * - Real-time sync integration (via useRealtime)
 * - Voice output integration for announcements
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { voiceOutputService } from "@/services/voice/voiceOutputService";

export interface Product {
  id: string;
  name: string;
  category: string;
  unit_type: string;
  barcode?: string;
  image_url?: string;
}

export interface InventoryItem {
  id: string;
  product_id: string;
  quantity: number;
  expiry_date?: string;
  location?: string;
  product?: Product;
  user_id?: string;
}

interface OptimisticState {
  pendingUpdates: Map<string, Partial<InventoryItem>>;
  pendingDeletes: Set<string>;
  pendingAdds: InventoryItem[];
}

interface UseInventoryOptions {
  enableVoiceFeedback?: boolean;
  enableOptimisticUpdates?: boolean;
}

export const useInventory = (options: UseInventoryOptions = {}) => {
  const { enableVoiceFeedback = false, enableOptimisticUpdates = true } = options;

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Track optimistic state for rollback
  const optimisticRef = useRef<OptimisticState>({
    pendingUpdates: new Map(),
    pendingDeletes: new Set(),
    pendingAdds: []
  });

  // Snapshot for rollback
  const snapshotRef = useRef<InventoryItem[]>([]);

  const takeSnapshot = useCallback(() => {
    snapshotRef.current = [...inventory];
  }, [inventory]);

  const rollback = useCallback(() => {
    setInventory(snapshotRef.current);
    optimisticRef.current = {
      pendingUpdates: new Map(),
      pendingDeletes: new Set(),
      pendingAdds: []
    };
  }, []);

  const fetchInventory = async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('inventory')
        .select(`
          *,
          product:products(*)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setInventory(data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch inventory'));
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (fetchError) throw fetchError;
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const addProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (insertError) throw insertError;

      setProducts(prev => [...prev, data]);
      console.log(`Produit ajouté: ${productData.name}`);

      return data;
    } catch (err) {
      console.error('Error adding product:', err);
      throw err;
    }
  };

  const addToInventory = async (inventoryData: Omit<InventoryItem, 'id' | 'product'>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticItem: InventoryItem = {
        ...inventoryData,
        id: tempId,
        user_id: userData.user.id,
        product: products.find(p => p.id === inventoryData.product_id)
      };

      // Optimistic add
      if (enableOptimisticUpdates) {
        takeSnapshot();
        setInventory(prev => [optimisticItem, ...prev]);
        optimisticRef.current.pendingAdds.push(optimisticItem);
      }

      const { data, error: insertError } = await supabase
        .from('inventory')
        .insert([{ ...inventoryData, user_id: userData.user.id }])
        .select(`
          *,
          product:products(*)
        `)
        .single();

      if (insertError) {
        if (enableOptimisticUpdates) rollback();
        throw insertError;
      }

      // Replace temp item with real item
      setInventory(prev =>
        prev.map(item => item.id === tempId ? data : item)
      );

      // Clear from pending
      optimisticRef.current.pendingAdds =
        optimisticRef.current.pendingAdds.filter(i => i.id !== tempId);

      // Voice feedback
      if (enableVoiceFeedback && data.product?.name) {
        voiceOutputService.announceItemAdded(
          data.product.name,
          inventoryData.quantity,
          data.product.unit_type
        );
      }

      console.log("Produit ajouté à l'inventaire");
      return data;
    } catch (err) {
      console.error('Error adding to inventory:', err);
      throw err;
    }
  };

  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    try {
      // Optimistic update
      if (enableOptimisticUpdates) {
        takeSnapshot();
        setInventory(prev =>
          prev.map(item =>
            item.id === id ? { ...item, ...updates } : item
          )
        );
        optimisticRef.current.pendingUpdates.set(id, updates);
      }

      setIsSyncing(true);
      const { error: updateError } = await supabase
        .from('inventory')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        if (enableOptimisticUpdates) rollback();
        throw updateError;
      }

      // Clear from pending
      optimisticRef.current.pendingUpdates.delete(id);
      console.log("Produit mis à jour");
    } catch (err) {
      console.error('Error updating inventory item:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteInventoryItem = async (id: string) => {
    try {
      // Get item for voice feedback
      const item = inventory.find(i => i.id === id);

      // Optimistic delete
      if (enableOptimisticUpdates) {
        takeSnapshot();
        setInventory(prev => prev.filter(item => item.id !== id));
        optimisticRef.current.pendingDeletes.add(id);
      }

      setIsSyncing(true);
      const { error: deleteError } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (deleteError) {
        if (enableOptimisticUpdates) rollback();
        throw deleteError;
      }

      // Clear from pending
      optimisticRef.current.pendingDeletes.delete(id);

      // Voice feedback
      if (enableVoiceFeedback && item?.product?.name) {
        voiceOutputService.announceItemRemoved(item.product.name);
      }

      console.log("Produit supprimé");
    } catch (err) {
      console.error('Error deleting inventory item:', err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Consume an item (decrease quantity with optimistic update)
   */
  const consumeItem = async (id: string, amount: number = 1) => {
    const item = inventory.find(i => i.id === id);
    if (!item) throw new Error('Item not found');

    const newQuantity = Math.max(0, item.quantity - amount);

    if (newQuantity === 0) {
      await deleteInventoryItem(id);
    } else {
      await updateInventoryItem(id, { quantity: newQuantity });
    }
  };

  /**
   * Restock an item (increase quantity with optimistic update)
   */
  const restockItem = async (id: string, amount: number = 1) => {
    const item = inventory.find(i => i.id === id);
    if (!item) throw new Error('Item not found');

    const newQuantity = item.quantity + amount;
    await updateInventoryItem(id, { quantity: newQuantity });
  };

  /**
   * Get items expiring soon
   */
  const getExpiringItems = useCallback((withinDays: number = 7): InventoryItem[] => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + withinDays);

    return inventory.filter(item => {
      if (!item.expiry_date) return false;
      const expiryDate = new Date(item.expiry_date);
      return expiryDate <= futureDate && expiryDate >= now;
    });
  }, [inventory]);

  /**
   * Get low stock items
   */
  const getLowStockItems = useCallback((threshold: number = 2): InventoryItem[] => {
    return inventory.filter(item => item.quantity <= threshold);
  }, [inventory]);

  /**
   * Search inventory
   */
  const searchInventory = useCallback((query: string): InventoryItem[] => {
    const lowerQuery = query.toLowerCase();
    return inventory.filter(item =>
      item.product?.name.toLowerCase().includes(lowerQuery) ||
      item.product?.category?.toLowerCase().includes(lowerQuery) ||
      item.location?.toLowerCase().includes(lowerQuery)
    );
  }, [inventory]);

  /**
   * Get inventory stats
   */
  const getStats = useCallback(() => {
    const expiringCount = getExpiringItems(7).length;
    const lowStockCount = getLowStockItems(2).length;
    const totalItems = inventory.length;
    const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);

    const byCategory: Record<string, number> = {};
    inventory.forEach(item => {
      const category = item.product?.category || 'Autres';
      byCategory[category] = (byCategory[category] || 0) + 1;
    });

    return {
      totalItems,
      totalQuantity,
      expiringCount,
      lowStockCount,
      byCategory
    };
  }, [inventory, getExpiringItems, getLowStockItems]);

  /**
   * Handle real-time update from other devices/users
   */
  const handleRealtimeUpdate = useCallback((payload: {
    itemId: string;
    action: string;
    item?: InventoryItem;
  }) => {
    switch (payload.action) {
      case 'add':
        if (payload.item) {
          setInventory(prev => {
            // Avoid duplicates
            if (prev.some(i => i.id === payload.item!.id)) return prev;
            return [payload.item!, ...prev];
          });
        }
        break;
      case 'update':
        if (payload.item) {
          setInventory(prev =>
            prev.map(item =>
              item.id === payload.itemId ? { ...item, ...payload.item } : item
            )
          );
        }
        break;
      case 'delete':
        setInventory(prev => prev.filter(item => item.id !== payload.itemId));
        break;
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchInventory(), fetchProducts()]);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    // Data
    inventory,
    products,
    loading,
    error,
    isSyncing,

    // Basic CRUD
    addProduct,
    addToInventory,
    updateInventoryItem,
    deleteInventoryItem,

    // Enhanced operations
    consumeItem,
    restockItem,

    // Queries
    getExpiringItems,
    getLowStockItems,
    searchInventory,
    getStats,

    // Sync
    refetch: () => Promise.all([fetchInventory(), fetchProducts()]),
    handleRealtimeUpdate,

    // Optimistic state info
    hasPendingChanges:
      optimisticRef.current.pendingUpdates.size > 0 ||
      optimisticRef.current.pendingDeletes.size > 0 ||
      optimisticRef.current.pendingAdds.length > 0
  };
};