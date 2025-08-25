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
      
      // Cast data to ensure all required properties are present
      const mappedData = (data || []).map(item => ({
        ...item,
        priority: item.priority ?? 1,
        estimated_price: item.estimated_price ?? undefined,
        store_section: item.store_section ?? undefined
      })) as ShoppingItem[];
      
      setShoppingList(mappedData);
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
      const { data: existingProducts, error: searchError } = await supabase
        .from('products')
        .select('*')
        .ilike('name', item.productName);

      let productData;
      
      if (searchError) {
        console.error('Error searching for product:', searchError);
        throw searchError;
      }

      if (!existingProducts || existingProducts.length === 0) {
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

        if (productError) {
          console.error('Error creating product:', productError);
          throw productError;
        }
        productData = newProduct;
      } else {
        // Use existing product
        productData = existingProducts[0];
      }

      // Add to shopping list
      const { data, error } = await supabase
        .from('shopping_list')
        .insert({
          user_id: user.user.id,
          product_id: productData.id,
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

      // Map the returned data to include all required properties
      const mappedData = {
        ...data,
        priority: data.priority ?? 1,
        estimated_price: data.estimated_price ?? undefined,
        store_section: data.store_section ?? undefined
      } as ShoppingItem;

      setShoppingList(prev => [mappedData, ...prev]);
      toast({
        title: "Produit ajouté",
        description: `${item.productName} ajouté à votre liste de courses.`
      });

      return mappedData;
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

  const updateShoppingItem = async (id: string, updates: {
    productName: string;
    quantity: number;
    unit: string;
    category: string;
    estimatedPrice?: number;
    storeSection?: string;
  }) => {
    try {
      // First, check if we need to update the product or create a new one
      const item = shoppingList.find(i => i.id === id);
      if (!item) throw new Error('Item not found');

      let productId = item.product_id;
      
      // Check if product name changed
      if (item.product?.name !== updates.productName) {
        // Check if a product with the new name exists
        const { data: existingProducts, error: searchError } = await supabase
          .from('products')
          .select('*')
          .ilike('name', updates.productName);

        if (searchError) {
          console.error('Error searching for product:', searchError);
          throw searchError;
        }

        if (existingProducts && existingProducts.length > 0) {
          productId = existingProducts[0].id;
        } else {
          // Create new product
          const { data: newProduct, error: productError } = await supabase
            .from('products')
            .insert({
              name: updates.productName,
              category: updates.category,
              unit_type: updates.unit
            })
            .select()
            .single();

          if (productError) {
            console.error('Error creating product:', productError);
            throw productError;
          }
          productId = newProduct.id;
        }
      } else if (item.product) {
        // Update existing product if category or unit changed
        await supabase
          .from('products')
          .update({
            category: updates.category,
            unit_type: updates.unit
          })
          .eq('id', item.product_id);
      }

      // Update shopping list item
      const { error } = await supabase
        .from('shopping_list')
        .update({
          product_id: productId,
          quantity: updates.quantity,
          estimated_price: updates.estimatedPrice,
          store_section: updates.storeSection
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Article modifié",
        description: "Les modifications ont été enregistrées."
      });
      
      fetchShoppingList();
    } catch (error) {
      console.error('Error updating shopping item:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier l'article."
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

  const removeMultipleFromShoppingList = async (ids: string[]) => {
    try {
      // Optimistic update
      setShoppingList(prev => prev.filter(item => !ids.includes(item.id)));

      const { error } = await supabase
        .from('shopping_list')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast({
        title: "Produits supprimés",
        description: `${ids.length} produit(s) supprimé(s) de la liste.`
      });
    } catch (error) {
      console.error('Error removing multiple items:', error);
      // Revert optimistic update
      await fetchShoppingList();
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer les produits."
      });
    }
  };

  const toggleMultiplePurchased = async (ids: string[], isPurchased: boolean) => {
    try {
      // Optimistic update
      setShoppingList(prev =>
        prev.map(item =>
          ids.includes(item.id) ? { ...item, is_purchased: isPurchased } : item
        )
      );

      const { error } = await supabase
        .from('shopping_list')
        .update({ 
          is_purchased: isPurchased,
          updated_at: new Date().toISOString()
        })
        .in('id', ids);

      if (error) throw error;

      toast({
        title: isPurchased ? "Produits achetés" : "Produits non achetés",
        description: `${ids.length} produit(s) marqué(s) comme ${isPurchased ? 'acheté(s)' : 'non acheté(s)'}.`
      });
    } catch (error) {
      console.error('Error toggling multiple items:', error);
      // Revert optimistic update
      await fetchShoppingList();
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier le statut des produits."
      });
    }
  };

  const addMultipleToShoppingList = async (items: NewShoppingItem[]) => {
    console.log('🔄 addMultipleToShoppingList called with:', items);
    
    try {
      const results = [];
      for (const item of items) {
        console.log('➕ Adding item:', item);
        try {
          const addedItem = await addToShoppingList(item);
          console.log('✅ Item added successfully:', addedItem);
          results.push({ success: true, item });
        } catch (error) {
          console.error('❌ Error adding item:', item, error);
          results.push({ success: false, item, error });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      console.log(`📊 Results: ${successCount} success, ${failCount} failed`);
      
      // Force refresh after adding all items
      if (successCount > 0) {
        console.log('🔄 Fetching shopping list after additions...');
        await fetchShoppingList();
        console.log('✅ Shopping list refreshed');
        
        toast({
          title: "✅ Produits ajoutés",
          description: `${successCount} produit(s) ajouté(s) à votre liste${failCount > 0 ? ` (${failCount} échec(s))` : ''}`
        });
      }
      
      if (failCount > 0 && successCount === 0) {
        throw new Error(`Échec de l'ajout de ${failCount} produit(s)`);
      }
      
      console.log('🎉 addMultipleToShoppingList completed successfully');
      return { success: true, added: successCount, failed: failCount };
      
    } catch (error) {
      console.error('💥 Fatal error in addMultipleToShoppingList:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter les produits à la liste."
      });
      return { success: false, added: 0, failed: items.length };
    }
  };

  const getTotalEstimatedCost = () => {
    return shoppingList
      .filter(item => !item.is_purchased)
      .reduce((total, item) => {
        let price = item.estimated_price || 0;
        const productName = item.product?.name?.toLowerCase() || '';
        
        // Fix pour les prix incorrects des feuilles de curry
        if ((productName.includes('curry') && (productName.includes('feuille') || productName.includes('leaf') || productName.includes('leaves'))) ||
            productName === 'curry leaves' || productName === 'feuilles de curry') {
          if (price > 10) {
            price = 0.01; // 1 centime par feuille
          }
        }
        
        // Fix pour les prix incorrects de l'eau
        if ((productName === 'eau' || productName === 'water' || productName.includes('eau')) && 
            price > 1) {
          price = 0.001; // 0.001€ par unité pour l'eau
        }
        
        // Fix pour les prix incorrects de la viande
        const unit = item.product?.unit_type?.toLowerCase() || '';
        if ((productName.includes('steak') || productName.includes('viande') || productName.includes('boeuf') || 
             productName.includes('porc') || productName.includes('poulet') || productName.includes('agneau')) && 
            unit === 'g' && price > 100) {
          // Prix par gramme pour la viande
          const pricePerKg = productName.includes('flank') ? 25 : 20;
          price = pricePerKg / 1000;
        }
        
        return total + (price * item.quantity);
      }, 0);
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
    addMultipleToShoppingList,
    updateShoppingItem,
    togglePurchased,
    removeFromShoppingList,
    removeMultipleFromShoppingList,
    toggleMultiplePurchased,
    addAllToInventory,
    clearPurchased,
    getTotalEstimatedCost,
    getPurchasedCount,
    generateShareableList,
    refetch: fetchShoppingList
  };
};