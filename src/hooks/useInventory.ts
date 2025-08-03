import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
}

export const useInventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          *,
          product:products(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) throw error;
      
      setProducts(prev => [...prev, data]);
      console.log(`Produit ajouté: ${productData.name}`);
      
      return data;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  };

  const addToInventory = async (inventoryData: Omit<InventoryItem, 'id' | 'product'>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('inventory')
        .insert([{ ...inventoryData, user_id: user.user.id }])
        .select(`
          *,
          product:products(*)
        `)
        .single();

      if (error) throw error;

      setInventory(prev => [data, ...prev]);
      console.log("Produit ajouté à l'inventaire");

      return data;
    } catch (error) {
      console.error('Error adding to inventory:', error);
      throw error;
    }
  };

  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    try {
      // Optimistic update
      setInventory(prev => 
        prev.map(item => 
          item.id === id ? { ...item, ...updates } : item
        )
      );

      const { error } = await supabase
        .from('inventory')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      console.log("Produit mis à jour");
    } catch (error) {
      console.error('Error updating inventory item:', error);
      // Revert optimistic update
      await fetchInventory();
    }
  };

  const deleteInventoryItem = async (id: string) => {
    try {
      // Optimistic update
      setInventory(prev => prev.filter(item => item.id !== id));

      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log("Produit supprimé");
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      // Revert optimistic update
      await fetchInventory();
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchInventory(), fetchProducts()]);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    inventory,
    products,
    loading,
    addProduct,
    addToInventory,
    updateInventoryItem,
    deleteInventoryItem,
    refetch: () => Promise.all([fetchInventory(), fetchProducts()])
  };
};