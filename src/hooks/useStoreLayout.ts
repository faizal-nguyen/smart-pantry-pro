import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StoreLayout, StoreSection, DEFAULT_STORE_SECTIONS } from '@/types/shopping-list';

interface UseStoreLayoutReturn {
  layouts: StoreLayout[];
  activeLayout: StoreLayout | null;
  loading: boolean;
  createLayout: (name: string, description?: string) => Promise<StoreLayout | null>;
  updateLayout: (layoutId: string, updates: Partial<StoreLayout>) => Promise<void>;
  deleteLayout: (layoutId: string) => Promise<void>;
  setDefaultLayout: (layoutId: string) => Promise<void>;
  updateSectionOrder: (layoutId: string, sectionId: string, newOrder: number) => Promise<void>;
  addSection: (layoutId: string, section: Omit<StoreSection, 'id' | 'layout_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateSection: (sectionId: string, updates: Partial<StoreSection>) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  getSectionsByLayout: (layoutId: string) => StoreSection[];
  duplicateLayout: (layoutId: string, newName: string) => Promise<StoreLayout | null>;
}

export const useStoreLayout = (): UseStoreLayoutReturn => {
  const [layouts, setLayouts] = useState<StoreLayout[]>([]);
  const [activeLayout, setActiveLayout] = useState<StoreLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Create default layout for new users
  const createDefaultLayout = async (userId: string) => {
    try {
      const { data: layout, error: layoutError } = await supabase
        .from('store_layouts')
        .insert({
          user_id: userId,
          name: 'Mon magasin',
          description: 'Configuration par défaut',
          mode: 'auto-organize',
          is_default: true
        })
        .select()
        .single();

      if (layoutError) throw layoutError;

      // Create default sections
      const sectionsToInsert = DEFAULT_STORE_SECTIONS.map(section => ({
        layout_id: layout.id,
        name: section.name,
        icon: section.icon,
        color: section.color,
        section_order: section.order
      }));

      const { error: sectionsError } = await supabase
        .from('store_sections')
        .insert(sectionsToInsert);

      if (sectionsError) throw sectionsError;

      return layout;
    } catch (error) {
      console.error('Error creating default layout:', error);
      return null;
    }
  };

  // Fetch all layouts with their sections
  const fetchLayouts = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Fetch layouts first
      const { data: layoutData, error: layoutError } = await supabase
        .from('store_layouts')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (layoutError) throw layoutError;

      // If no layouts exist, create a default one
      if (!layoutData || layoutData.length === 0) {
        await createDefaultLayout(user.user.id);
        await fetchLayouts();
        return;
      }

      // Fetch sections for all layouts
      const layoutIds = layoutData.map(l => l.id);
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('store_sections')
        .select('*')
        .in('layout_id', layoutIds)
        .order('section_order', { ascending: true });

      if (sectionsError) {
        console.warn('Error fetching sections:', sectionsError);
      }

      // Map layouts with their sections
      const layoutsWithSections: StoreLayout[] = layoutData.map(layout => ({
        ...layout,
        sections: (sectionsData || [])
          .filter((section: any) => section.layout_id === layout.id)
          .map((section: any) => ({
            id: section.id,
            name: section.name,
            icon: section.icon,
            color: section.color,
            order: section.section_order,
            layout_id: section.layout_id
          }))
      }));

      setLayouts(layoutsWithSections);

      // Set active layout (default or first available)
      const defaultLayout = layoutsWithSections.find(l => l.is_default);
      setActiveLayout(defaultLayout || layoutsWithSections[0] || null);

    } catch (error) {
      console.error('Error fetching store layouts:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les configurations de magasin."
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Create a new store layout
  const createLayout = useCallback(async (name: string, description?: string): Promise<StoreLayout | null> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const { data: layout, error: layoutError } = await supabase
        .from('store_layouts')
        .insert({
          user_id: user.user.id,
          name,
          description,
          mode: 'auto-organize',
          is_default: false
        })
        .select()
        .single();

      if (layoutError) throw layoutError;

      // Create default sections for the new layout
      const sectionsToInsert = DEFAULT_STORE_SECTIONS.map(section => ({
        layout_id: layout.id,
        name: section.name,
        icon: section.icon,
        color: section.color,
        section_order: section.order
      }));

      const { error: sectionsError } = await supabase
        .from('store_sections')
        .insert(sectionsToInsert);

      if (sectionsError) throw sectionsError;

      toast({
        title: "Configuration créée",
        description: `La configuration "${name}" a été créée avec succès.`
      });

      await fetchLayouts();
      return layout;

    } catch (error) {
      console.error('Error creating store layout:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer la configuration de magasin."
      });
      return null;
    }
  }, [fetchLayouts, toast]);

  // Update a store layout
  const updateLayout = useCallback(async (layoutId: string, updates: Partial<StoreLayout>) => {
    try {
      const { error } = await supabase
        .from('store_layouts')
        .update(updates)
        .eq('id', layoutId);

      if (error) throw error;

      toast({
        title: "Configuration modifiée",
        description: "Les modifications ont été enregistrées."
      });

      await fetchLayouts();
    } catch (error) {
      console.error('Error updating store layout:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier la configuration."
      });
    }
  }, [fetchLayouts, toast]);

  // Delete a store layout
  const deleteLayout = useCallback(async (layoutId: string) => {
    try {
      const { error } = await supabase
        .from('store_layouts')
        .delete()
        .eq('id', layoutId);

      if (error) throw error;

      toast({
        title: "Configuration supprimée",
        description: "La configuration a été supprimée."
      });

      await fetchLayouts();
    } catch (error) {
      console.error('Error deleting store layout:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer la configuration."
      });
    }
  }, [fetchLayouts, toast]);

  // Set a layout as default
  const setDefaultLayout = useCallback(async (layoutId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Remove default from all layouts
      await supabase
        .from('store_layouts')
        .update({ is_default: false })
        .eq('user_id', user.user.id);

      // Set new default
      const { error } = await supabase
        .from('store_layouts')
        .update({ is_default: true })
        .eq('id', layoutId);

      if (error) throw error;

      toast({
        title: "Configuration par défaut",
        description: "Cette configuration est maintenant utilisée par défaut."
      });

      await fetchLayouts();
    } catch (error) {
      console.error('Error setting default layout:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de définir la configuration par défaut."
      });
    }
  }, [fetchLayouts, toast]);

  // Update section order
  const updateSectionOrder = useCallback(async (layoutId: string, sectionId: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from('store_sections')
        .update({ section_order: newOrder })
        .eq('id', sectionId)
        .eq('layout_id', layoutId);

      if (error) throw error;

      await fetchLayouts();
    } catch (error) {
      console.error('Error updating section order:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier l'ordre des rayons."
      });
    }
  }, [fetchLayouts, toast]);

  // Add a new section
  const addSection = useCallback(async (
    layoutId: string, 
    section: Omit<StoreSection, 'id' | 'layout_id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const { error } = await supabase
        .from('store_sections')
        .insert({
          layout_id: layoutId,
          name: section.name,
          icon: section.icon,
          color: section.color,
          section_order: section.order
        });

      if (error) throw error;

      toast({
        title: "Rayon ajouté",
        description: `Le rayon "${section.name}" a été ajouté.`
      });

      await fetchLayouts();
    } catch (error) {
      console.error('Error adding section:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter le rayon."
      });
    }
  }, [fetchLayouts, toast]);

  // Update a section
  const updateSection = useCallback(async (sectionId: string, updates: Partial<StoreSection>) => {
    try {
      const { error } = await supabase
        .from('store_sections')
        .update({
          name: updates.name,
          icon: updates.icon,
          color: updates.color,
          section_order: updates.order
        })
        .eq('id', sectionId);

      if (error) throw error;

      toast({
        title: "Rayon modifié",
        description: "Les modifications ont été enregistrées."
      });

      await fetchLayouts();
    } catch (error) {
      console.error('Error updating section:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier le rayon."
      });
    }
  }, [fetchLayouts, toast]);

  // Delete a section
  const deleteSection = useCallback(async (sectionId: string) => {
    try {
      const { error } = await supabase
        .from('store_sections')
        .delete()
        .eq('id', sectionId);

      if (error) throw error;

      toast({
        title: "Rayon supprimé",
        description: "Le rayon a été supprimé."
      });

      await fetchLayouts();
    } catch (error) {
      console.error('Error deleting section:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le rayon."
      });
    }
  }, [fetchLayouts, toast]);

  // Get sections by layout ID
  const getSectionsByLayout = useCallback((layoutId: string): StoreSection[] => {
    const layout = layouts.find(l => l.id === layoutId);
    return layout?.sections || [];
  }, [layouts]);

  // Duplicate a layout
  const duplicateLayout = useCallback(async (layoutId: string, newName: string): Promise<StoreLayout | null> => {
    try {
      const originalLayout = layouts.find(l => l.id === layoutId);
      if (!originalLayout) return null;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      // Create new layout
      const { data: newLayout, error: layoutError } = await supabase
        .from('store_layouts')
        .insert({
          user_id: user.user.id,
          name: newName,
          description: `Copie de ${originalLayout.name}`,
          mode: originalLayout.mode,
          is_default: false
        })
        .select()
        .single();

      if (layoutError) throw layoutError;

      // Copy sections
      const sectionsToInsert = originalLayout.sections.map(section => ({
        layout_id: newLayout.id,
        name: section.name,
        icon: section.icon,
        color: section.color,
        section_order: section.order
      }));

      const { error: sectionsError } = await supabase
        .from('store_sections')
        .insert(sectionsToInsert);

      if (sectionsError) throw sectionsError;

      toast({
        title: "Configuration dupliquée",
        description: `La configuration "${newName}" a été créée.`
      });

      await fetchLayouts();
      return newLayout;

    } catch (error) {
      console.error('Error duplicating layout:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de dupliquer la configuration."
      });
      return null;
    }
  }, [layouts, fetchLayouts, toast]);

  // Initialize
  useEffect(() => {
    fetchLayouts();
  }, [fetchLayouts]);

  return {
    layouts,
    activeLayout,
    loading,
    createLayout,
    updateLayout,
    deleteLayout,
    setDefaultLayout,
    updateSectionOrder,
    addSection,
    updateSection,
    deleteSection,
    getSectionsByLayout,
    duplicateLayout
  };
};