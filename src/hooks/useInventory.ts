import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Product {
  id: string;
  name: string;
  category: string;
  unit_type: string;
  barcode?: string;
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
  const { toast } = useToast();

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
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger l'inventaire."
      });
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
      toast({
        title: "Produit ajouté",
        description: `${productData.name} a été ajouté à la base de produits.`
      });
      
      return data;
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter le produit."
      });
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
      toast({
        title: "Produit ajouté à l'inventaire",
        description: "Le produit a été ajouté avec succès."
      });

      return data;
    } catch (error) {
      console.error('Error adding to inventory:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter le produit à l'inventaire."
      });
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

      toast({
        title: "Produit mis à jour",
        description: "Les modifications ont été sauvegardées."
      });
    } catch (error) {
      console.error('Error updating inventory item:', error);
      // Revert optimistic update
      await fetchInventory();
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier le produit."
      });
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

      toast({
        title: "Produit supprimé",
        description: "Le produit a été retiré de l'inventaire."
      });
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      // Revert optimistic update
      await fetchInventory();
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le produit."
      });
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