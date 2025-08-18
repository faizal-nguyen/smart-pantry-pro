import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ShoppingListItem, 
  SharedShoppingList, 
  InStoreModeConfig, 
  DEFAULT_IN_STORE_CONFIG,
  StoreLayout,
  ShoppingListCollaboration
} from '@/types/shopping-list';
import { useShoppingPatterns } from './useShoppingPatterns';
import { ShoppingItem, NewShoppingItem } from './useShoppingList';

interface UseEnhancedShoppingListReturn {
  // Basic shopping list functionality
  shoppingList: ShoppingListItem[];
  loading: boolean;
  
  // Enhanced functionality
  sharedLists: SharedShoppingList[];
  activeList: SharedShoppingList | null;
  inStoreMode: boolean;
  checkedItems: Set<string>;
  
  // Configuration
  inStoreConfig: InStoreModeConfig;
  
  // Actions
  addToShoppingList: (item: NewShoppingItem) => Promise<ShoppingListItem | null>;
  updateShoppingItem: (id: string, updates: any) => Promise<void>;
  togglePurchased: (id: string, isPurchased: boolean) => void;
  removeFromShoppingList: (id: string) => Promise<void>;
  
  // Enhanced actions
  setActiveList: (listId: string) => Promise<void>;
  createSharedList: (name: string, description?: string) => Promise<SharedShoppingList | null>;
  toggleInStoreMode: () => void;
  updateInStoreConfig: (config: InStoreModeConfig) => Promise<void>;
  
  // Smart features
  getOptimalShoppingOrder: () => ShoppingListItem[];
  markSectionComplete: (sectionId: string) => void;
  
  // Collaboration
  shareList: (listId: string, userEmail: string, permissions: 'view' | 'edit' | 'admin') => Promise<void>;
  removeCollaborator: (listId: string, userId: string) => Promise<void>;
  
  // Statistics and calculations
  getTotalEstimatedCost: () => number;
  getCompletionPercentage: () => number;
  getSessionStats: () => {
    totalItems: number;
    checkedItems: number;
    remainingItems: number;
    totalValue: number;
  };
}

export const useEnhancedShoppingList = (
  listId?: string
): UseEnhancedShoppingListReturn => {
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [sharedLists, setSharedLists] = useState<SharedShoppingList[]>([]);
  const [activeList, setActiveListState] = useState<SharedShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [inStoreMode, setInStoreMode] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [inStoreConfig, setInStoreConfig] = useState<InStoreModeConfig>(DEFAULT_IN_STORE_CONFIG);
  
  const { toast } = useToast();
  const { getOptimalOrder, recordSectionVisit } = useShoppingPatterns();

  // Fetch shared lists
  const fetchSharedLists = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('shared_shopping_lists')
        .select(`
          *,
          collaborators:shopping_list_collaborators(
            *,
            user:auth.users(id, email)
          ),
          store_layout:store_layouts(
            *,
            sections:store_sections(*)
          )
        `)
        .or(`user_id.eq.${user.user.id},id.in.(${await getSharedListIds(user.user.id)})`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSharedLists(data || []);
      
      // Set active list
      const targetList = listId ? 
        data?.find(list => list.id === listId) : 
        data?.find(list => list.user_id === user.user.id) || data?.[0];
      
      if (targetList) {
        setActiveListState(targetList);
        setInStoreConfig(targetList.in_store_config || DEFAULT_IN_STORE_CONFIG);
      }

    } catch (error) {
      console.error('Error fetching shared lists:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les listes de courses."
      });
    }
  }, [listId, toast]);

  // Get shared list IDs for current user
  const getSharedListIds = async (userId: string): Promise<string> => {
    const { data } = await supabase
      .from('shopping_list_collaborators')
      .select('shopping_list_id')
      .eq('shared_with_user_id', userId);
    
    return data?.map(item => item.shopping_list_id).join(',') || '';
  };

  // Fetch shopping list items
  const fetchShoppingListItems = useCallback(async () => {
    if (!activeList) return;

    try {
      const { data, error } = await supabase
        .from('shopping_list')
        .select(`
          *,
          product:products(*)
        `)
        .eq('shared_list_id', activeList.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedData = (data || []).map(item => ({
        ...item,
        priority: item.priority ?? 1,
        estimated_price: item.estimated_price ?? undefined,
        store_section: item.store_section ?? undefined,
        notes: item.notes ?? undefined,
        purchased_at: item.purchased_at ?? undefined,
        shopping_pattern_order: item.shopping_pattern_order ?? undefined,
        discount: item.discount ?? undefined
      })) as ShoppingListItem[];
      
      setShoppingList(mappedData);
      
      // Update checked items
      const checked = new Set(mappedData.filter(item => item.is_purchased).map(item => item.id));
      setCheckedItems(checked);

    } catch (error) {
      console.error('Error fetching shopping list items:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les articles."
      });
    }
  }, [activeList, toast]);

  // Set active list
  const setActiveList = useCallback(async (listId: string) => {
    const list = sharedLists.find(l => l.id === listId);
    if (list) {
      setActiveListState(list);
      setInStoreConfig(list.in_store_config || DEFAULT_IN_STORE_CONFIG);
    }
  }, [sharedLists]);

  // Create shared list
  const createSharedList = useCallback(async (
    name: string, 
    description?: string
  ): Promise<SharedShoppingList | null> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const { data, error } = await supabase
        .from('shared_shopping_lists')
        .insert({
          user_id: user.user.id,
          name,
          description,
          in_store_config: DEFAULT_IN_STORE_CONFIG
        })
        .select()
        .single();

      if (error) throw error;

      const newList: SharedShoppingList = {
        ...data,
        items: [],
        collaborators: []
      };

      setSharedLists(prev => [newList, ...prev]);
      
      toast({
        title: "Liste créée",
        description: `La liste "${name}" a été créée.`
      });

      return newList;
    } catch (error) {
      console.error('Error creating shared list:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer la liste."
      });
      return null;
    }
  }, [toast]);

  // Add item to shopping list
  const addToShoppingList = useCallback(async (item: NewShoppingItem): Promise<ShoppingListItem | null> => {
    if (!activeList) return null;

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
        productData = existingProducts[0];
      }

      // Add to shopping list
      const { data, error } = await supabase
        .from('shopping_list')
        .insert({
          user_id: user.user.id,
          shared_list_id: activeList.id,
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

      const mappedData = {
        ...data,
        priority: data.priority ?? 1,
        estimated_price: data.estimated_price ?? undefined,
        store_section: data.store_section ?? undefined,
        notes: data.notes ?? undefined,
        purchased_at: data.purchased_at ?? undefined,
        shopping_pattern_order: data.shopping_pattern_order ?? undefined,
        discount: data.discount ?? undefined
      } as ShoppingListItem;

      setShoppingList(prev => [mappedData, ...prev]);
      
      toast({
        title: "Article ajouté",
        description: `${item.productName} ajouté à votre liste.`
      });

      return mappedData;
    } catch (error) {
      console.error('Error adding to shopping list:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter l'article."
      });
      throw error;
    }
  }, [activeList, toast]);

  // Toggle purchased status
  const togglePurchased = useCallback((id: string, isPurchased: boolean) => {
    // Optimistic update
    setShoppingList(prev =>
      prev.map(item =>
        item.id === id ? { 
          ...item, 
          is_purchased: isPurchased,
          purchased_at: isPurchased ? new Date().toISOString() : undefined
        } : item
      )
    );

    // Update checked items
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (isPurchased) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });

    // Update database
    supabase
      .from('shopping_list')
      .update({ 
        is_purchased: isPurchased,
        purchased_at: isPurchased ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Error updating purchase status:', error);
          // Revert optimistic update
          fetchShoppingListItems();
        }
      });
  }, [fetchShoppingListItems]);

  // Update shopping item
  const updateShoppingItem = useCallback(async (id: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('shopping_list')
        .update({
          quantity: updates.quantity,
          estimated_price: updates.estimatedPrice,
          store_section: updates.storeSection,
          notes: updates.notes
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Article modifié",
        description: "Les modifications ont été enregistrées."
      });
      
      fetchShoppingListItems();
    } catch (error) {
      console.error('Error updating shopping item:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier l'article."
      });
    }
  }, [fetchShoppingListItems, toast]);

  // Remove item from shopping list
  const removeFromShoppingList = useCallback(async (id: string) => {
    try {
      // Optimistic update
      setShoppingList(prev => prev.filter(item => item.id !== id));

      const { error } = await supabase
        .from('shopping_list')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Article supprimé",
        description: "L'article a été retiré de la liste."
      });
    } catch (error) {
      console.error('Error removing from shopping list:', error);
      // Revert optimistic update
      await fetchShoppingListItems();
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer l'article."
      });
    }
  }, [fetchShoppingListItems, toast]);

  // Toggle in-store mode
  const toggleInStoreMode = useCallback(() => {
    setInStoreMode(prev => !prev);
  }, []);

  // Update in-store config
  const updateInStoreConfig = useCallback(async (config: InStoreModeConfig) => {
    if (!activeList) return;

    try {
      const { error } = await supabase
        .from('shared_shopping_lists')
        .update({ in_store_config: config })
        .eq('id', activeList.id);

      if (error) throw error;

      setInStoreConfig(config);
      setActiveListState(prev => prev ? { ...prev, in_store_config: config } : null);
    } catch (error) {
      console.error('Error updating in-store config:', error);
    }
  }, [activeList]);

  // Get optimal shopping order using patterns
  const getOptimalShoppingOrder = useCallback(() => {
    return getOptimalOrder(shoppingList);
  }, [shoppingList, getOptimalOrder]);

  // Mark section as complete
  const markSectionComplete = useCallback((sectionId: string) => {
    recordSectionVisit(sectionId);
  }, [recordSectionVisit]);

  // Share list
  const shareList = useCallback(async (
    listId: string, 
    userEmail: string, 
    permissions: 'view' | 'edit' | 'admin'
  ) => {
    try {
      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (userError || !userData) {
        throw new Error('Utilisateur introuvable');
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Non authentifié');

      // Add collaborator
      const { error } = await supabase
        .from('shopping_list_collaborators')
        .insert({
          shopping_list_id: listId,
          shared_with_user_id: userData.id,
          shared_by_user_id: user.user.id,
          permissions
        });

      if (error) throw error;

      toast({
        title: "Liste partagée",
        description: `La liste a été partagée avec ${userEmail}.`
      });

      fetchSharedLists();
    } catch (error) {
      console.error('Error sharing list:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de partager la liste."
      });
    }
  }, [fetchSharedLists, toast]);

  // Remove collaborator
  const removeCollaborator = useCallback(async (listId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('shopping_list_collaborators')
        .delete()
        .eq('shopping_list_id', listId)
        .eq('shared_with_user_id', userId);

      if (error) throw error;

      toast({
        title: "Collaborateur retiré",
        description: "L'accès à la liste a été retiré."
      });

      fetchSharedLists();
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de retirer le collaborateur."
      });
    }
  }, [fetchSharedLists, toast]);

  // Calculate statistics
  const getTotalEstimatedCost = useCallback(() => {
    return shoppingList
      .filter(item => !item.is_purchased)
      .reduce((total, item) => {
        const price = item.estimated_price || 0;
        return total + (price * item.quantity);
      }, 0);
  }, [shoppingList]);

  const getCompletionPercentage = useCallback(() => {
    if (shoppingList.length === 0) return 0;
    return Math.round((checkedItems.size / shoppingList.length) * 100);
  }, [shoppingList.length, checkedItems.size]);

  const getSessionStats = useCallback(() => {
    const totalItems = shoppingList.length;
    const checkedCount = checkedItems.size;
    const remainingItems = totalItems - checkedCount;
    const totalValue = shoppingList.reduce((sum, item) => {
      const price = item.estimated_price || 0;
      return sum + (price * item.quantity);
    }, 0);

    return {
      totalItems,
      checkedItems: checkedCount,
      remainingItems,
      totalValue
    };
  }, [shoppingList, checkedItems]);

  // Initialize
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await fetchSharedLists();
      setLoading(false);
    };

    initialize();
  }, [fetchSharedLists]);

  // Fetch items when active list changes
  useEffect(() => {
    if (activeList) {
      fetchShoppingListItems();
    }
  }, [activeList, fetchShoppingListItems]);

  return {
    // Basic functionality
    shoppingList,
    loading,
    
    // Enhanced functionality
    sharedLists,
    activeList,
    inStoreMode,
    checkedItems,
    
    // Configuration
    inStoreConfig,
    
    // Actions
    addToShoppingList,
    updateShoppingItem,
    togglePurchased,
    removeFromShoppingList,
    
    // Enhanced actions
    setActiveList,
    createSharedList,
    toggleInStoreMode,
    updateInStoreConfig,
    
    // Smart features
    getOptimalShoppingOrder,
    markSectionComplete,
    
    // Collaboration
    shareList,
    removeCollaborator,
    
    // Statistics
    getTotalEstimatedCost,
    getCompletionPercentage,
    getSessionStats
  };
};