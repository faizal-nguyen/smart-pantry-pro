import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ShoppingPattern } from '@/types/shopping-list';

interface UseShoppingPatternsReturn {
  patterns: ShoppingPattern[];
  loading: boolean;
  updatePattern: (section: string, order?: number) => Promise<void>;
  getOptimalOrder: (items: any[]) => any[];
  recordSectionVisit: (section: string, timeSpent?: number) => Promise<void>;
  getUserShoppingFlow: () => string[];
}

export const useShoppingPatterns = (): UseShoppingPatternsReturn => {
  const [patterns, setPatterns] = useState<ShoppingPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch user's shopping patterns
  const fetchPatterns = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('shopping_patterns')
        .select('*')
        .eq('user_id', user.user.id)
        .order('typical_order', { ascending: true });

      if (error) throw error;

      setPatterns(data || []);
    } catch (error) {
      console.error('Error fetching shopping patterns:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les habitudes d'achat."
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Update or create a shopping pattern
  const updatePattern = useCallback(async (section: string, order?: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const existingPattern = patterns.find(p => p.store_section === section);
      
      if (existingPattern) {
        // Update existing pattern
        const { error } = await supabase
          .from('shopping_patterns')
          .update({
            frequency: existingPattern.frequency + 1,
            typical_order: order || existingPattern.typical_order,
            last_visited: new Date().toISOString()
          })
          .eq('user_id', user.user.id)
          .eq('store_section', section);

        if (error) throw error;
      } else {
        // Create new pattern
        const { error } = await supabase
          .from('shopping_patterns')
          .insert({
            user_id: user.user.id,
            store_section: section,
            typical_order: order || patterns.length + 1,
            frequency: 1,
            last_visited: new Date().toISOString()
          });

        if (error) throw error;
      }

      // Refresh patterns
      await fetchPatterns();
    } catch (error) {
      console.error('Error updating shopping pattern:', error);
    }
  }, [patterns, fetchPatterns]);

  // Record a section visit with time spent
  const recordSectionVisit = useCallback(async (section: string, timeSpent: number = 0) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const existingPattern = patterns.find(p => p.store_section === section);
      
      if (existingPattern) {
        const newAverageTime = Math.round(
          (existingPattern.average_time_spent * existingPattern.frequency + timeSpent) / 
          (existingPattern.frequency + 1)
        );

        const { error } = await supabase
          .from('shopping_patterns')
          .update({
            frequency: existingPattern.frequency + 1,
            average_time_spent: newAverageTime,
            last_visited: new Date().toISOString()
          })
          .eq('user_id', user.user.id)
          .eq('store_section', section);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shopping_patterns')
          .insert({
            user_id: user.user.id,
            store_section: section,
            typical_order: patterns.length + 1,
            frequency: 1,
            average_time_spent: timeSpent,
            last_visited: new Date().toISOString()
          });

        if (error) throw error;
      }

      // Refresh patterns
      await fetchPatterns();
    } catch (error) {
      console.error('Error recording section visit:', error);
    }
  }, [patterns, fetchPatterns]);

  // Get optimal order for shopping items based on user patterns
  const getOptimalOrder = useCallback((items: any[]) => {
    if (!items || items.length === 0) return items;

    // Group items by store section
    const sectionMap = new Map<string, any[]>();
    const itemsWithoutSection: any[] = [];

    items.forEach(item => {
      const section = item.store_section;
      if (section) {
        if (!sectionMap.has(section)) {
          sectionMap.set(section, []);
        }
        sectionMap.get(section)!.push(item);
      } else {
        itemsWithoutSection.push(item);
      }
    });

    // Get user's typical section order
    const sectionOrder = [...patterns]
      .sort((a, b) => a.typical_order - b.typical_order)
      .map(p => p.store_section);

    // Add sections that exist in items but not in patterns
    const unknownSections = [...sectionMap.keys()]
      .filter(section => !sectionOrder.includes(section));
    
    const finalSectionOrder = [...sectionOrder, ...unknownSections];

    // Build ordered list
    const orderedItems: any[] = [];

    finalSectionOrder.forEach(section => {
      const sectionItems = sectionMap.get(section);
      if (sectionItems) {
        // Sort items within section by priority and shopping pattern order
        const sortedSectionItems = sectionItems.sort((a, b) => {
          // First by shopping pattern order if available
          if (a.shopping_pattern_order && b.shopping_pattern_order) {
            return a.shopping_pattern_order - b.shopping_pattern_order;
          }
          // Then by priority
          return (b.priority || 0) - (a.priority || 0);
        });
        
        orderedItems.push(...sortedSectionItems);
      }
    });

    // Add items without section at the end
    orderedItems.push(...itemsWithoutSection);

    return orderedItems;
  }, [patterns]);

  // Get user's typical shopping flow (section order)
  const getUserShoppingFlow = useCallback(() => {
    return patterns
      .sort((a, b) => a.typical_order - b.typical_order)
      .map(p => p.store_section);
  }, [patterns]);

  // Auto-learn from shopping behavior
  const learnFromBehavior = useCallback(async (sectionSequence: string[]) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Update typical order based on observed sequence
      for (let i = 0; i < sectionSequence.length; i++) {
        const section = sectionSequence[i];
        const newOrder = i + 1;
        
        await updatePattern(section, newOrder);
      }
    } catch (error) {
      console.error('Error learning from behavior:', error);
    }
  }, [updatePattern]);

  // Initialize patterns
  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  return {
    patterns,
    loading,
    updatePattern,
    getOptimalOrder,
    recordSectionVisit,
    getUserShoppingFlow
  };
};