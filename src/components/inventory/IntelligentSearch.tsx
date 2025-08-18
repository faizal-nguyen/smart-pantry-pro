import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mic, Camera, Package, FolderOpen, ChefHat } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useInventory } from '@/hooks/useInventory';
import { useRecipes } from '@/hooks/useRecipes';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: string;
  name: string;
  type: 'product' | 'category' | 'recipe';
  icon: React.ReactNode;
  meta?: string;
}

interface SearchGroup {
  title: string;
  items: SearchResult[];
  icon: React.ReactNode;
}

interface IntelligentSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  onCategorySelect?: (category: string) => void;
  onRecipeSelect?: (recipeId: string) => void;
}

export const IntelligentSearch: React.FC<IntelligentSearchProps> = ({
  onResultSelect,
  onCategorySelect,
  onRecipeSelect
}) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'text' | 'voice' | 'image'>('text');
  const [isSearching, setIsSearching] = useState(false);
  const [searchGroups, setSearchGroups] = useState<SearchGroup[]>([]);
  
  const { inventory } = useInventory();
  const { recipes } = useRecipes();
  const debouncedQuery = useDebounce(query, 300);

  const performSearch = useCallback(() => {
    if (!debouncedQuery.trim()) {
      setSearchGroups([]);
      return;
    }

    setIsSearching(true);
    const lowerQuery = debouncedQuery.toLowerCase();

    // Search products
    const productResults: SearchResult[] = inventory
      .filter(item => 
        item.product?.name.toLowerCase().includes(lowerQuery) ||
        item.product?.category?.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 5)
      .map(item => ({
        id: item.id,
        name: item.product?.name || '',
        type: 'product',
        icon: <Package className="w-4 h-4" />,
        meta: `${item.quantity} ${item.unit || ''}`
      }));

    // Search categories
    const categories = [...new Set(inventory.map(item => item.product?.category).filter(Boolean))];
    const categoryResults: SearchResult[] = categories
      .filter(cat => cat?.toLowerCase().includes(lowerQuery))
      .slice(0, 3)
      .map(cat => ({
        id: cat!,
        name: cat!,
        type: 'category',
        icon: <FolderOpen className="w-4 h-4" />,
        meta: `${inventory.filter(item => item.product?.category === cat).length} produits`
      }));

    // Search recipes that can be made with inventory
    const recipeResults: SearchResult[] = recipes
      .filter(recipe => 
        recipe.name.toLowerCase().includes(lowerQuery) ||
        recipe.cuisine_category?.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 3)
      .map(recipe => ({
        id: recipe.id,
        name: recipe.name,
        type: 'recipe',
        icon: <ChefHat className="w-4 h-4" />,
        meta: `${recipe.prep_time + recipe.cook_time} min`
      }));

    setSearchGroups([
      {
        title: 'Produits',
        items: productResults,
        icon: <Package className="w-4 h-4" />
      },
      {
        title: 'Catégories',
        items: categoryResults,
        icon: <FolderOpen className="w-4 h-4" />
      },
      {
        title: 'Recettes possibles',
        items: recipeResults,
        icon: <ChefHat className="w-4 h-4" />
      }
    ].filter(group => group.items.length > 0));

    setIsSearching(false);
  }, [debouncedQuery, inventory, recipes]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'product' && onResultSelect) {
      onResultSelect(result);
    } else if (result.type === 'category' && onCategorySelect) {
      onCategorySelect(result.id);
    } else if (result.type === 'recipe' && onRecipeSelect) {
      onRecipeSelect(result.id);
    }
    setQuery('');
  };

  const startVoiceSearch = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
      };
      
      recognition.start();
      setMode('voice');
    }
  };

  return (
    <div className="relative w-full">
      {/* Barre de recherche principale */}
      <div className="flex items-center bg-gray-50 rounded-2xl p-3 border border-gray-200 focus-within:border-primary transition-colors">
        <Search className="w-5 h-5 text-gray-400 mr-3" />
        
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par nom, catégorie, date..."
          className="flex-1 bg-transparent border-0 focus-visible:ring-0 px-0"
        />
        
        {/* Boutons mode */}
        <div className="flex gap-2 ml-2">
          <Button
            size="icon"
            variant={mode === 'voice' ? 'default' : 'ghost'}
            className="h-8 w-8"
            onClick={startVoiceSearch}
          >
            <Mic className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={mode === 'image' ? 'default' : 'ghost'}
            className="h-8 w-8"
            onClick={() => setMode('image')}
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Suggestions en temps réel */}
      <AnimatePresence>
        {query && searchGroups.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-200 p-2 z-50"
          >
            {searchGroups.map((group, groupIndex) => (
              <div key={group.title} className={cn(groupIndex > 0 && "mt-2")}>
                <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-gray-500">
                  {group.icon}
                  <span>{group.title}</span>
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleResultClick(item)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="text-gray-400">{item.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{item.name}</p>
                        {item.meta && (
                          <p className="text-xs text-gray-500">{item.meta}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};