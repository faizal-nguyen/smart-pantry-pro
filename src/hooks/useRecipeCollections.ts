import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  RecipeCollection, 
  CollectionRecipe, 
  CollectionShare,
  CollectionFilters,
  CollectionPermissions 
} from "@/types/recipe-collections";

// Hook principal pour Recipe Collections (pattern Cipher)
export const useRecipeCollections = () => {
  const [collections, setCollections] = useState<RecipeCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Charger les collections de l'utilisateur
  const loadCollections = async (filters?: CollectionFilters) => {
    if (!user) {
      setCollections([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('recipe_collections')
        .select(`
          *,
          created_by:users!recipe_collections_user_id_fkey(
            id,
            email,
            raw_user_meta_data->full_name,
            raw_user_meta_data->avatar_url
          ),
          recipe_count:collection_recipes(count)
        `)
        .or(`user_id.eq.${user.id},is_public.eq.true`);

      // Appliquer les filtres
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }
      
      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }
      
      if (filters?.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }
      
      if (filters?.createdBy) {
        query = query.eq('user_id', filters.createdBy);
      }

      // Tri
      const sortBy = filters?.sortBy || 'updated_at';
      const sortOrder = filters?.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;

      if (error) throw error;

      // Formatter les données
      const formattedCollections = data?.map(collection => ({
        ...collection,
        recipe_count: collection.recipe_count?.[0]?.count || 0,
        created_by: collection.created_by ? {
          id: collection.created_by.id,
          email: collection.created_by.email,
          full_name: collection.created_by.raw_user_meta_data?.full_name,
          avatar_url: collection.created_by.raw_user_meta_data?.avatar_url
        } : undefined
      })) || [];

      setCollections(formattedCollections);
      setError(null);
    } catch (err) {
      console.error('Error loading collections:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast({
        title: "Erreur",
        description: "Impossible de charger les collections",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Créer une nouvelle collection
  const createCollection = async (collection: {
    name: string;
    description?: string;
    image_url?: string;
    is_public?: boolean;
    tags?: string[];
  }) => {
    if (!user) {
      toast({
        title: "Non connecté",
        description: "Vous devez être connecté pour créer une collection",
        variant: "destructive"
      });
      return null;
    }

    try {
      // Générer un code de partage unique
      const shareCode = generateShareCode();

      const { data, error } = await supabase
        .from('recipe_collections')
        .insert({
          user_id: user.id,
          name: collection.name,
          description: collection.description,
          image_url: collection.image_url,
          is_public: collection.is_public || false,
          tags: collection.tags || [],
          share_code: shareCode,
          view_count: 0,
          favorite_count: 0
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Collection créée",
        description: `${collection.name} a été créée avec succès`,
      });

      await loadCollections();
      return data;
    } catch (err) {
      console.error('Error creating collection:', err);
      toast({
        title: "Erreur",
        description: "Impossible de créer la collection",
        variant: "destructive"
      });
      return null;
    }
  };

  // Mettre à jour une collection
  const updateCollection = async (
    collectionId: string, 
    updates: Partial<RecipeCollection>
  ) => {
    try {
      const { data, error } = await supabase
        .from('recipe_collections')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionId)
        .eq('user_id', user?.id) // Sécurité: seul le propriétaire peut modifier
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Collection mise à jour",
        description: "Les modifications ont été enregistrées",
      });

      await loadCollections();
      return data;
    } catch (err) {
      console.error('Error updating collection:', err);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la collection",
        variant: "destructive"
      });
      return null;
    }
  };

  // Supprimer une collection
  const deleteCollection = async (collectionId: string) => {
    try {
      const { error } = await supabase
        .from('recipe_collections')
        .delete()
        .eq('id', collectionId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Collection supprimée",
        description: "La collection a été supprimée avec succès",
      });

      await loadCollections();
    } catch (err) {
      console.error('Error deleting collection:', err);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la collection",
        variant: "destructive"
      });
    }
  };

  // Ajouter une recette à une collection
  const addRecipeToCollection = async (
    collectionId: string, 
    recipeId: string,
    notes?: string
  ) => {
    if (!user) return null;

    try {
      // Vérifier que la recette n'est pas déjà dans la collection
      const { data: existing } = await supabase
        .from('collection_recipes')
        .select('id')
        .eq('collection_id', collectionId)
        .eq('recipe_id', recipeId)
        .single();

      if (existing) {
        toast({
          title: "Recette déjà présente",
          description: "Cette recette est déjà dans la collection",
          variant: "destructive"
        });
        return null;
      }

      // Obtenir le prochain order_index
      const { data: maxOrder } = await supabase
        .from('collection_recipes')
        .select('order_index')
        .eq('collection_id', collectionId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      const nextOrder = maxOrder ? maxOrder.order_index + 1 : 0;

      // Ajouter la recette
      const { data, error } = await supabase
        .from('collection_recipes')
        .insert({
          collection_id: collectionId,
          recipe_id: recipeId,
          added_by: user.id,
          notes,
          order_index: nextOrder
        })
        .select()
        .single();

      if (error) throw error;

      // Mettre à jour updated_at de la collection
      await supabase
        .from('recipe_collections')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', collectionId);

      toast({
        title: "Recette ajoutée",
        description: "La recette a été ajoutée à la collection",
      });

      return data;
    } catch (err) {
      console.error('Error adding recipe to collection:', err);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la recette à la collection",
        variant: "destructive"
      });
      return null;
    }
  };

  // Retirer une recette d'une collection
  const removeRecipeFromCollection = async (
    collectionId: string, 
    recipeId: string
  ) => {
    try {
      const { error } = await supabase
        .from('collection_recipes')
        .delete()
        .eq('collection_id', collectionId)
        .eq('recipe_id', recipeId);

      if (error) throw error;

      // Mettre à jour updated_at de la collection
      await supabase
        .from('recipe_collections')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', collectionId);

      toast({
        title: "Recette retirée",
        description: "La recette a été retirée de la collection",
      });
    } catch (err) {
      console.error('Error removing recipe from collection:', err);
      toast({
        title: "Erreur",
        description: "Impossible de retirer la recette de la collection",
        variant: "destructive"
      });
    }
  };

  // Charger les recettes d'une collection
  const loadCollectionRecipes = async (collectionId: string) => {
    try {
      const { data, error } = await supabase
        .from('collection_recipes')
        .select(`
          *,
          recipe:recipes(
            id,
            name,
            description,
            image_url,
            cuisine_category,
            prep_time,
            cook_time,
            servings,
            difficulty,
            tags
          )
        `)
        .eq('collection_id', collectionId)
        .order('order_index', { ascending: true });

      if (error) throw error;

      return data as CollectionRecipe[];
    } catch (err) {
      console.error('Error loading collection recipes:', err);
      return [];
    }
  };

  // Vérifier les permissions sur une collection
  const checkPermissions = async (
    collectionId: string
  ): Promise<CollectionPermissions> => {
    if (!user) {
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canShare: false,
        canAddRecipes: false,
        canRemoveRecipes: false,
        isOwner: false
      };
    }

    try {
      const { data: collection } = await supabase
        .from('recipe_collections')
        .select('user_id, is_public')
        .eq('id', collectionId)
        .single();

      if (!collection) {
        return {
          canView: false,
          canEdit: false,
          canDelete: false,
          canShare: false,
          canAddRecipes: false,
          canRemoveRecipes: false,
          isOwner: false
        };
      }

      const isOwner = collection.user_id === user.id;
      const isPublic = collection.is_public;

      // Check for shared permissions
      const { data: share } = await supabase
        .from('collection_shares')
        .select('permissions')
        .eq('collection_id', collectionId)
        .eq('shared_with', user.email)
        .single();

      const hasEditPermission = share?.permissions === 'edit';

      return {
        canView: isOwner || isPublic || !!share,
        canEdit: isOwner || hasEditPermission,
        canDelete: isOwner,
        canShare: isOwner,
        canAddRecipes: isOwner || hasEditPermission,
        canRemoveRecipes: isOwner || hasEditPermission,
        isOwner
      };
    } catch (err) {
      console.error('Error checking permissions:', err);
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canShare: false,
        canAddRecipes: false,
        canRemoveRecipes: false,
        isOwner: false
      };
    }
  };

  // Partager une collection
  const shareCollection = async (
    collectionId: string,
    shareData: {
      shared_with?: string;
      share_type: 'public' | 'private' | 'link';
      permissions: 'view' | 'edit';
      expires_at?: string;
    }
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('collection_shares')
        .insert({
          collection_id: collectionId,
          shared_by: user.id,
          ...shareData,
          access_count: 0
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Collection partagée",
        description: "Le lien de partage a été créé",
      });

      return data;
    } catch (err) {
      console.error('Error sharing collection:', err);
      toast({
        title: "Erreur",
        description: "Impossible de partager la collection",
        variant: "destructive"
      });
      return null;
    }
  };

  // Générer un code de partage unique
  const generateShareCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Charger une collection par son code de partage
  const loadCollectionByShareCode = async (shareCode: string) => {
    try {
      const { data, error } = await supabase
        .from('recipe_collections')
        .select(`
          *,
          created_by:users!recipe_collections_user_id_fkey(
            id,
            email,
            raw_user_meta_data->full_name,
            raw_user_meta_data->avatar_url
          ),
          recipe_count:collection_recipes(count)
        `)
        .eq('share_code', shareCode)
        .single();

      if (error) throw error;

      // Incrémenter le compteur de vues
      await supabase
        .from('recipe_collections')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', data.id);

      return data;
    } catch (err) {
      console.error('Error loading collection by share code:', err);
      return null;
    }
  };

  // Dupliquer une collection
  const duplicateCollection = async (collectionId: string) => {
    if (!user) return null;

    try {
      // Charger la collection originale avec ses recettes
      const { data: original } = await supabase
        .from('recipe_collections')
        .select('*')
        .eq('id', collectionId)
        .single();

      if (!original) throw new Error('Collection not found');

      const recipes = await loadCollectionRecipes(collectionId);

      // Créer la nouvelle collection
      const newCollection = await createCollection({
        name: `${original.name} (Copie)`,
        description: original.description,
        image_url: original.image_url,
        is_public: false, // Toujours privée par défaut
        tags: original.tags
      });

      if (!newCollection) throw new Error('Failed to create collection');

      // Copier les recettes
      for (const recipe of recipes) {
        if (recipe.recipe_id) {
          await addRecipeToCollection(
            newCollection.id, 
            recipe.recipe_id, 
            recipe.notes
          );
        }
      }

      toast({
        title: "Collection dupliquée",
        description: "La collection a été copiée avec succès",
      });

      return newCollection;
    } catch (err) {
      console.error('Error duplicating collection:', err);
      toast({
        title: "Erreur",
        description: "Impossible de dupliquer la collection",
        variant: "destructive"
      });
      return null;
    }
  };

  // Rechercher des collections publiques
  const searchPublicCollections = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('recipe_collections')
        .select(`
          *,
          created_by:users!recipe_collections_user_id_fkey(
            id,
            email,
            raw_user_meta_data->full_name,
            raw_user_meta_data->avatar_url
          ),
          recipe_count:collection_recipes(count)
        `)
        .eq('is_public', true)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
        .order('view_count', { ascending: false })
        .limit(20);

      if (error) throw error;

      return data || [];
    } catch (err) {
      console.error('Error searching public collections:', err);
      return [];
    }
  };

  // Charger au montage
  useEffect(() => {
    if (user) {
      loadCollections();
    } else {
      setCollections([]);
      setLoading(false);
    }
  }, [user]);

  return {
    collections,
    loading,
    error,
    loadCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    addRecipeToCollection,
    removeRecipeFromCollection,
    loadCollectionRecipes,
    checkPermissions,
    shareCollection,
    loadCollectionByShareCode,
    duplicateCollection,
    searchPublicCollections
  };
};