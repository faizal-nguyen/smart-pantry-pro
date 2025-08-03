import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ShoppingItem {
  id: string;
  product_id: string;
  quantity: number;
  is_purchased: boolean;
  priority: number;
  estimated_price?: number;
  store_section?: string;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    category: string;
    unit_type: string;
  };
}

export interface NewShoppingItem {
  productName: string;
  quantity: number;
  category: string;
  unit: string;
  estimatedPrice?: number;
  storeSection?: string;
}

export const useShoppingList = () => {
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchShoppingList = async () => {
    try {
      const { data, error } = await supabase
        .from('shopping_list')
        .select(`
          *,
          product:products(*)
        `)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShoppingList(data || []);
    } catch (error) {
      console.error('Error fetching shopping list:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger la liste de courses."
      });
    }
  };

  const addToShoppingList = async (item: NewShoppingItem) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Check if product exists or create it
      let product = await supabase
        .from('products')
        .select('*')
        .eq('name', item.productName)
        .single();

      if (product.error || !product.data) {
        // Create new product
        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert({
            name: item.productName,
            category: item.category,
            unit_type: item.unit
          })
          .select()
          .single();

        if (productError) throw productError;
        product.data = newProduct;
      }

      // Add to shopping list
      const { data, error } = await supabase
        .from('shopping_list')
        .insert({
          user_id: user.user.id,
          product_id: product.data.id,
          quantity: item.quantity,
          estimated_price: item.estimatedPrice,
          store_section: item.storeSection,
          priority: 1
        })
        .select(`
          *,
          product:products(*)
        `)
        .single();

      if (error) throw error;

      setShoppingList(prev => [data, ...prev]);
      toast({
        title: "Produit ajouté",
        description: `${item.productName} ajouté à votre liste de courses.`
      });

      return data;
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter le produit à la liste."
      });
      throw error;
    }
  };

  const togglePurchased = async (id: string, isPurchased: boolean) => {
    try {
      // Optimistic update
      setShoppingList(prev =>
        prev.map(item =>
          item.id === id ? { ...item, is_purchased: isPurchased } : item
        )
      );

      const { error } = await supabase
        .from('shopping_list')
        .update({ 
          is_purchased: isPurchased,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      if (isPurchased) {
        toast({
          title: "Produit acheté",
          description: "Le produit a été marqué comme acheté."
        });
      }
    } catch (error) {
      console.error('Error toggling purchased status:', error);
      // Revert optimistic update
      await fetchShoppingList();
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier le statut du produit."
      });
    }
  };

  const removeFromShoppingList = async (id: string) => {
    try {
      // Optimistic update
      setShoppingList(prev => prev.filter(item => item.id !== id));

      const { error } = await supabase
        .from('shopping_list')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Produit supprimé",
        description: "Le produit a été retiré de la liste."
      });
    } catch (error) {
      console.error('Error removing from shopping list:', error);
      // Revert optimistic update
      await fetchShoppingList();
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le produit."
      });
    }
  };

  const addAllToInventory = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const purchasedItems = shoppingList.filter(item => item.is_purchased);
      
      if (purchasedItems.length === 0) {
        toast({
          title: "Aucun produit acheté",
          description: "Cochez d'abord les produits que vous avez achetés."
        });
        return;
      }

      // Add each purchased item to inventory
      for (const item of purchasedItems) {
        await supabase
          .from('inventory')
          .insert({
            user_id: user.user.id,
            product_id: item.product_id,
            quantity: item.quantity
          });
      }

      // Remove purchased items from shopping list
      const purchasedIds = purchasedItems.map(item => item.id);
      await supabase
        .from('shopping_list')
        .delete()
        .in('id', purchasedIds);

      // Update local state
      setShoppingList(prev => prev.filter(item => !item.is_purchased));

      toast({
        title: "Produits ajoutés à l'inventaire",
        description: `${purchasedItems.length} produit(s) transféré(s) vers votre inventaire.`
      });
    } catch (error) {
      console.error('Error adding to inventory:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de transférer les produits vers l'inventaire."
      });
    }
  };

  const clearPurchased = async () => {
    try {
      const { error } = await supabase
        .from('shopping_list')
        .delete()
        .eq('is_purchased', true);

      if (error) throw error;

      setShoppingList(prev => prev.filter(item => !item.is_purchased));
      
      toast({
        title: "Liste nettoyée",
        description: "Les produits achetés ont été supprimés."
      });
    } catch (error) {
      console.error('Error clearing purchased items:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de nettoyer la liste."
      });
    }
  };

  const getTotalEstimatedCost = () => {
    return shoppingList
      .filter(item => !item.is_purchased)
      .reduce((total, item) => total + (item.estimated_price || 0) * item.quantity, 0);
  };

  const getPurchasedCount = () => {
    return shoppingList.filter(item => item.is_purchased).length;
  };

  const generateShareableList = () => {
    const listText = shoppingList
      .filter(item => !item.is_purchased)
      .map(item => `${item.quantity} ${item.product?.unit_type} ${item.product?.name}`)
      .join('\n');
    
    return `📝 Ma liste de courses:\n\n${listText}\n\n🛒 Générée avec Smart Grocery`;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchShoppingList();
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    shoppingList,
    loading,
    addToShoppingList,
    togglePurchased,
    removeFromShoppingList,
    addAllToInventory,
    clearPurchased,
    getTotalEstimatedCost,
    getPurchasedCount,
    generateShareableList,
    refetch: fetchShoppingList
  };
};