import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { StoreLayout, StoreSection, DEFAULT_STORE_SECTIONS } from '@/types/shopping-list';

// Version locale qui utilise localStorage au lieu de Supabase
// Ceci est temporaire jusqu'à ce que les tables soient créées

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

const STORAGE_KEY = 'smart-pantry-store-layouts';

export const useStoreLayout = (): UseStoreLayoutReturn => {
  const [layouts, setLayouts] = useState<StoreLayout[]>([]);
  const [activeLayout, setActiveLayout] = useState<StoreLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load layouts from localStorage
  const loadLayoutsFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedLayouts = JSON.parse(stored);
        setLayouts(parsedLayouts);
        
        // Set active layout (default or first available)
        const defaultLayout = parsedLayouts.find((l: StoreLayout) => l.is_default);
        setActiveLayout(defaultLayout || parsedLayouts[0] || null);
      } else {
        // Create default layout if none exists
        const defaultLayout = createDefaultLayout();
        setLayouts([defaultLayout]);
        setActiveLayout(defaultLayout);
        saveLayoutsToStorage([defaultLayout]);
      }
    } catch (error) {
      console.error('Error loading layouts from storage:', error);
      // Create default layout on error
      const defaultLayout = createDefaultLayout();
      setLayouts([defaultLayout]);
      setActiveLayout(defaultLayout);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save layouts to localStorage
  const saveLayoutsToStorage = (layoutsToSave: StoreLayout[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layoutsToSave));
    } catch (error) {
      console.error('Error saving layouts to storage:', error);
    }
  };

  // Create default layout
  const createDefaultLayout = (): StoreLayout => {
    const layout: StoreLayout = {
      id: crypto.randomUUID(),
      user_id: 'local-user',
      name: 'Mon magasin',
      description: 'Configuration par défaut',
      mode: 'auto-organize',
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sections: DEFAULT_STORE_SECTIONS.map(section => ({
        ...section,
        id: crypto.randomUUID(),
        layout_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
    };
    
    // Set layout_id for sections
    layout.sections = layout.sections.map(section => ({
      ...section,
      layout_id: layout.id
    }));
    
    return layout;
  };

  // Create a new store layout
  const createLayout = useCallback(async (name: string, description?: string): Promise<StoreLayout | null> => {
    try {
      const newLayout: StoreLayout = {
        id: crypto.randomUUID(),
        user_id: 'local-user',
        name,
        description,
        mode: 'auto-organize',
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sections: DEFAULT_STORE_SECTIONS.map(section => ({
          ...section,
          id: crypto.randomUUID(),
          layout_id: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      };

      // Set layout_id for sections
      newLayout.sections = newLayout.sections.map(section => ({
        ...section,
        layout_id: newLayout.id
      }));

      const updatedLayouts = [...layouts, newLayout];
      setLayouts(updatedLayouts);
      saveLayoutsToStorage(updatedLayouts);

      toast({
        title: "Configuration créée",
        description: `La configuration "${name}" a été créée avec succès.`
      });

      return newLayout;
    } catch (error) {
      console.error('Error creating layout:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer la configuration."
      });
      return null;
    }
  }, [layouts, toast]);

  // Update a store layout
  const updateLayout = useCallback(async (layoutId: string, updates: Partial<StoreLayout>) => {
    try {
      const updatedLayouts = layouts.map(layout => 
        layout.id === layoutId 
          ? { ...layout, ...updates, updated_at: new Date().toISOString() }
          : layout
      );
      
      setLayouts(updatedLayouts);
      saveLayoutsToStorage(updatedLayouts);
      
      if (activeLayout?.id === layoutId) {
        setActiveLayout(updatedLayouts.find(l => l.id === layoutId) || null);
      }

      toast({
        title: "Configuration mise à jour",
        description: "Les modifications ont été enregistrées."
      });
    } catch (error) {
      console.error('Error updating layout:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de mettre à jour la configuration."
      });
    }
  }, [layouts, activeLayout, toast]);

  // Delete a store layout
  const deleteLayout = useCallback(async (layoutId: string) => {
    try {
      const updatedLayouts = layouts.filter(layout => layout.id !== layoutId);
      setLayouts(updatedLayouts);
      saveLayoutsToStorage(updatedLayouts);
      
      if (activeLayout?.id === layoutId) {
        setActiveLayout(updatedLayouts[0] || null);
      }

      toast({
        title: "Configuration supprimée",
        description: "La configuration a été supprimée avec succès."
      });
    } catch (error) {
      console.error('Error deleting layout:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer la configuration."
      });
    }
  }, [layouts, activeLayout, toast]);

  // Set default layout
  const setDefaultLayout = useCallback(async (layoutId: string) => {
    try {
      const updatedLayouts = layouts.map(layout => ({
        ...layout,
        is_default: layout.id === layoutId
      }));
      
      setLayouts(updatedLayouts);
      saveLayoutsToStorage(updatedLayouts);
      setActiveLayout(updatedLayouts.find(l => l.id === layoutId) || null);

      toast({
        title: "Configuration par défaut",
        description: "La configuration par défaut a été mise à jour."
      });
    } catch (error) {
      console.error('Error setting default layout:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de définir la configuration par défaut."
      });
    }
  }, [layouts, toast]);

  // Update section order
  const updateSectionOrder = useCallback(async (layoutId: string, sectionId: string, newOrder: number) => {
    try {
      const updatedLayouts = layouts.map(layout => {
        if (layout.id !== layoutId) return layout;
        
        const updatedSections = layout.sections.map(section => {
          if (section.id === sectionId) {
            return { ...section, order: newOrder };
          }
          // Adjust other sections' order
          if (section.order >= newOrder) {
            return { ...section, order: section.order + 1 };
          }
          return section;
        }).sort((a, b) => a.order - b.order);
        
        return { ...layout, sections: updatedSections };
      });
      
      setLayouts(updatedLayouts);
      saveLayoutsToStorage(updatedLayouts);
      
      if (activeLayout?.id === layoutId) {
        setActiveLayout(updatedLayouts.find(l => l.id === layoutId) || null);
      }
    } catch (error) {
      console.error('Error updating section order:', error);
    }
  }, [layouts, activeLayout]);

  // Add section
  const addSection = useCallback(async (
    layoutId: string, 
    section: Omit<StoreSection, 'id' | 'layout_id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const newSection: StoreSection = {
        ...section,
        id: crypto.randomUUID(),
        layout_id: layoutId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const updatedLayouts = layouts.map(layout => {
        if (layout.id !== layoutId) return layout;
        return {
          ...layout,
          sections: [...layout.sections, newSection]
        };
      });
      
      setLayouts(updatedLayouts);
      saveLayoutsToStorage(updatedLayouts);
      
      if (activeLayout?.id === layoutId) {
        setActiveLayout(updatedLayouts.find(l => l.id === layoutId) || null);
      }

      toast({
        title: "Rayon ajouté",
        description: `Le rayon "${section.name}" a été ajouté.`
      });
    } catch (error) {
      console.error('Error adding section:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'ajouter le rayon."
      });
    }
  }, [layouts, activeLayout, toast]);

  // Update section
  const updateSection = useCallback(async (sectionId: string, updates: Partial<StoreSection>) => {
    try {
      const updatedLayouts = layouts.map(layout => ({
        ...layout,
        sections: layout.sections.map(section =>
          section.id === sectionId
            ? { ...section, ...updates, updated_at: new Date().toISOString() }
            : section
        )
      }));
      
      setLayouts(updatedLayouts);
      saveLayoutsToStorage(updatedLayouts);
      
      const affectedLayout = updatedLayouts.find(l => 
        l.sections.some(s => s.id === sectionId)
      );
      
      if (affectedLayout && activeLayout?.id === affectedLayout.id) {
        setActiveLayout(affectedLayout);
      }
    } catch (error) {
      console.error('Error updating section:', error);
    }
  }, [layouts, activeLayout]);

  // Delete section
  const deleteSection = useCallback(async (sectionId: string) => {
    try {
      const updatedLayouts = layouts.map(layout => ({
        ...layout,
        sections: layout.sections.filter(section => section.id !== sectionId)
      }));
      
      setLayouts(updatedLayouts);
      saveLayoutsToStorage(updatedLayouts);
      
      const affectedLayout = updatedLayouts.find(l => 
        layouts.find(ol => ol.id === l.id)?.sections.some(s => s.id === sectionId)
      );
      
      if (affectedLayout && activeLayout?.id === affectedLayout.id) {
        setActiveLayout(affectedLayout);
      }

      toast({
        title: "Rayon supprimé",
        description: "Le rayon a été supprimé avec succès."
      });
    } catch (error) {
      console.error('Error deleting section:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le rayon."
      });
    }
  }, [layouts, activeLayout, toast]);

  // Get sections by layout
  const getSectionsByLayout = useCallback((layoutId: string): StoreSection[] => {
    const layout = layouts.find(l => l.id === layoutId);
    return layout?.sections || [];
  }, [layouts]);

  // Duplicate layout
  const duplicateLayout = useCallback(async (layoutId: string, newName: string): Promise<StoreLayout | null> => {
    try {
      const layoutToDuplicate = layouts.find(l => l.id === layoutId);
      if (!layoutToDuplicate) return null;

      const newLayout: StoreLayout = {
        ...layoutToDuplicate,
        id: crypto.randomUUID(),
        name: newName,
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sections: layoutToDuplicate.sections.map(section => ({
          ...section,
          id: crypto.randomUUID(),
          layout_id: '' // Will be set below
        }))
      };

      // Set layout_id for sections
      newLayout.sections = newLayout.sections.map(section => ({
        ...section,
        layout_id: newLayout.id
      }));

      const updatedLayouts = [...layouts, newLayout];
      setLayouts(updatedLayouts);
      saveLayoutsToStorage(updatedLayouts);

      toast({
        title: "Configuration dupliquée",
        description: `La configuration "${newName}" a été créée.`
      });

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
  }, [layouts, toast]);

  // Load layouts on mount
  useEffect(() => {
    loadLayoutsFromStorage();
  }, [loadLayoutsFromStorage]);

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