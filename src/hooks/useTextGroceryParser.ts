import { useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { trackSmartInput } from '@/lib/analytics/smart-input';

interface ParsedGroceryItem {
  productName: string;
  quantity: number;
  unit: string;
  category: string;
  storeSection: string;
  confidence: number;
  estimatedPrice?: number;
}

export const useTextGroceryParser = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedGroceryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const parseText = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    const startTime = Date.now();
    setIsProcessing(true);
    setError(null);
    setParsedItems([]);
    
    try {
      const response = await fetch('/api/shopping/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }
      
      const data = await response.json();
      const processingTime = Date.now() - startTime;
      
      if (data.items && data.items.length > 0) {
        const averageConfidence = data.items.reduce((sum: number, item: any) => sum + item.confidence, 0) / data.items.length;
        
        setParsedItems(data.items);
        
        // Analytics tracking
        trackSmartInput.itemsParsed({
          method: 'text',
          itemCount: data.items.length,
          successRate: 1.0,
          averageConfidence,
          processingTime
        });
        
        toast({
          title: "✅ Analyse terminée",
          description: `${data.items.length} produits détectés`
        });
      } else {
        setError("Aucun produit détecté. Essayez un format différent.");
        
        trackSmartInput.parsingError('text', 'no_items_detected', text.length);
      }
      
    } catch (err) {
      console.error('Erreur parsing:', err);
      setError("Erreur lors de l'analyse. Réessayez.");
      
      trackSmartInput.parsingError('text', err instanceof Error ? err.message : 'unknown_error', text.length);
      
      toast({
        title: "Erreur",
        description: "Impossible d'analyser le texte",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const confirmItems = useCallback(async (addMultipleToShoppingList?: (items: any[]) => Promise<any>) => {
    console.log('🎯 confirmItems called with parsedItems:', parsedItems);
    
    if (parsedItems.length === 0) {
      console.log('❌ No items to confirm');
      return false;
    }
    
    try {
      if (addMultipleToShoppingList) {
        console.log('✅ Using addMultipleToShoppingList function');
        
        // Convertir les items au format attendu par useShoppingList
        const shoppingItems = parsedItems.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          category: item.category,
          unit: item.unit,
          estimatedPrice: item.estimatedPrice,
          storeSection: item.storeSection
        }));
        
        console.log('📝 Converted shopping items:', shoppingItems);
        
        const result = await addMultipleToShoppingList(shoppingItems);
        console.log('📊 addMultipleToShoppingList result:', result);
        
        if (result.success && result.added > 0) {
          // Analytics tracking
          trackSmartInput.itemsConfirmed(result.added, 'text');
          setParsedItems([]);
          console.log('✅ Items confirmed and cleared from parser');
          return true;
        } else {
          throw new Error(`Échec de l'ajout: ${result.failed} items ont échoué`);
        }
      } else {
        // Fallback à l'API batch si pas de fonction fournie
        const response = await fetch('/api/shopping/items/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: parsedItems })
        });
        
        if (!response.ok) throw new Error('Erreur ajout');
        
        // Analytics tracking
        trackSmartInput.itemsConfirmed(parsedItems.length, 'text');
        
        toast({
          title: "✅ Produits ajoutés (simulation)",
          description: `${parsedItems.length} produits traités (mode simulation)`
        });
        
        setParsedItems([]);
        return true;
      }
      
    } catch (err) {
      console.error('Erreur confirmation:', err);
      
      trackSmartInput.error('confirm_items', err instanceof Error ? err.message : 'unknown_error', {
        method: 'text',
        item_count: parsedItems.length
      });
      
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter les produits",
        variant: "destructive"
      });
      return false;
    }
  }, [parsedItems]);

  const editParsedItem = useCallback((index: number, updates: Partial<ParsedGroceryItem>) => {
    setParsedItems(prev => prev.map((item, i) => {
      if (i === index) {
        // Track the edit
        Object.keys(updates).forEach(field => {
          trackSmartInput.itemEdited(field, item[field as keyof ParsedGroceryItem], updates[field as keyof ParsedGroceryItem]);
        });
        return { ...item, ...updates };
      }
      return item;
    }));
  }, []);

  const removeParsedItem = useCallback((index: number) => {
    setParsedItems(prev => {
      const itemToRemove = prev[index];
      if (itemToRemove) {
        trackSmartInput.itemRemoved(itemToRemove.productName, itemToRemove.confidence);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearParsedItems = useCallback(() => {
    setParsedItems([]);
    setError(null);
  }, []);

  return {
    isProcessing,
    parsedItems,
    error,
    parseText,
    confirmItems,
    editParsedItem,
    removeParsedItem,
    clearParsedItems
  };
};