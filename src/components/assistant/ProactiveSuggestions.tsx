import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, AlertCircle, ShoppingCart, ChefHat, Sparkles } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { useRecipes } from '@/hooks/useRecipes';

interface Suggestion {
  id: string;
  trigger: 'time-based' | 'expiry-alert' | 'low-stock' | 'recipe-match';
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: () => void;
  actionLabel?: string;
}

interface ProactiveSuggestionsProps {
  onSuggestionClick: (suggestion: Suggestion) => void;
}

export const ProactiveSuggestions: React.FC<ProactiveSuggestionsProps> = ({
  onSuggestionClick
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const { inventory } = useInventory();
  const { recipes } = useRecipes();

  useEffect(() => {
    const generateSuggestions = () => {
      const newSuggestions: Suggestion[] = [];
      const now = new Date();
      const currentHour = now.getHours();

      // Time-based suggestions
      if (currentHour >= 11 && currentHour <= 13) {
        newSuggestions.push({
          id: 'lunch-time',
          trigger: 'time-based',
          icon: <Clock className="w-5 h-5 text-blue-500" />,
          title: "C'est l'heure du déjeuner !",
          message: "Avec vos ingrédients, je peux vous proposer 3 recettes rapides pour le midi.",
          actionLabel: "Voir les recettes"
        });
      } else if (currentHour >= 18 && currentHour <= 20) {
        newSuggestions.push({
          id: 'dinner-time',
          trigger: 'time-based',
          icon: <Clock className="w-5 h-5 text-orange-500" />,
          title: "C'est l'heure du dîner !",
          message: "Que diriez-vous d'un bon repas ? J'ai des suggestions basées sur votre inventaire.",
          actionLabel: "Suggestions du soir"
        });
      }

      // Expiry alerts
      const expiringItems = inventory.filter(item => {
        if (!item.expiry_date) return false;
        const expiryDate = new Date(item.expiry_date);
        const daysUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry <= 3 && daysUntilExpiry > 0;
      });

      if (expiringItems.length > 0) {
        const firstItem = expiringItems[0];
        newSuggestions.push({
          id: 'expiry-alert',
          trigger: 'expiry-alert',
          icon: <AlertCircle className="w-5 h-5 text-red-500" />,
          title: "Produits bientôt périmés",
          message: `${firstItem.product?.name} ${expiringItems.length > 1 ? `et ${expiringItems.length - 1} autres produits expirent` : 'expire'} bientôt. Voulez-vous une recette pour les utiliser ?`,
          actionLabel: "Recettes anti-gaspi"
        });
      }

      // Low stock suggestions
      const lowStockItems = inventory.filter(item => 
        item.quantity <= (item.min_quantity || 1)
      );

      if (lowStockItems.length > 0) {
        newSuggestions.push({
          id: 'low-stock',
          trigger: 'low-stock',
          icon: <ShoppingCart className="w-5 h-5 text-purple-500" />,
          title: "Stock faible",
          message: `Vous avez ${lowStockItems.length} produit${lowStockItems.length > 1 ? 's' : ''} en stock faible. Dois-je les ajouter à votre liste de courses ?`,
          actionLabel: "Gérer la liste"
        });
      }

      // Recipe match based on inventory
      const availableIngredients = inventory.filter(item => item.quantity > 0);
      if (availableIngredients.length >= 3) {
        const matchingRecipes = recipes.filter(recipe => {
          // Simple matching logic - can be enhanced
          return true; // Placeholder - should check if recipe ingredients match inventory
        }).length;

        if (matchingRecipes > 0) {
          newSuggestions.push({
            id: 'recipe-match',
            trigger: 'recipe-match',
            icon: <ChefHat className="w-5 h-5 text-green-500" />,
            title: "Recettes disponibles",
            message: `J'ai trouvé ${matchingRecipes} recette${matchingRecipes > 1 ? 's' : ''} que vous pouvez réaliser avec vos ingrédients actuels !`,
            actionLabel: "Explorer"
          });
        }
      }

      setSuggestions(newSuggestions);
    };

    generateSuggestions();
    const interval = setInterval(generateSuggestions, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [inventory, recipes]);

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Sparkles className="w-4 h-4" />
        <span>Suggestions intelligentes</span>
      </div>
      
      <AnimatePresence>
        {suggestions.map((suggestion, index) => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSuggestionClick(suggestion)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">{suggestion.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{suggestion.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {suggestion.message}
                  </p>
                  {suggestion.actionLabel && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="px-0 h-auto mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSuggestionClick(suggestion);
                      }}
                    >
                      {suggestion.actionLabel} →
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};