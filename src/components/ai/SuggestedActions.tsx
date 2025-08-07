import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  ChefHat, 
  ShoppingCart, 
  AlertCircle, 
  Lightbulb,
  Clock,
  Utensils
} from 'lucide-react';

interface SuggestedActionsProps {
  onActionClick: (action: string) => void;
}

const suggestions = [
  {
    icon: ChefHat,
    label: "Qu'est-ce que je peux cuisiner ce soir ?",
    action: "Qu'est-ce que je peux cuisiner ce soir avec mon inventaire actuel ?",
    color: "text-orange-600"
  },
  {
    icon: AlertCircle,
    label: "Produits qui expirent bientôt",
    action: "Montre-moi les produits qui vont expirer dans les prochains jours",
    color: "text-red-600"
  },
  {
    icon: ShoppingCart,
    label: "Liste de courses intelligente",
    action: "Génère une liste de courses basée sur mes recettes préférées",
    color: "text-blue-600"
  },
  {
    icon: Lightbulb,
    label: "Idée recette anti-gaspi",
    action: "Donne-moi une idée de recette pour utiliser mes produits qui expirent bientôt",
    color: "text-green-600"
  },
  {
    icon: Clock,
    label: "Recette rapide (< 20 min)",
    action: "Propose-moi une recette rapide à faire en moins de 20 minutes",
    color: "text-purple-600"
  },
  {
    icon: Utensils,
    label: "Menu de la semaine",
    action: "Aide-moi à planifier le menu de la semaine avec mon inventaire",
    color: "text-indigo-600"
  }
];

export function SuggestedActions({ onActionClick }: SuggestedActionsProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto"
    >
      {suggestions.map((suggestion, index) => {
        const Icon = suggestion.icon;
        
        return (
          <motion.div key={index} variants={itemVariants}>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto p-3 text-left hover:shadow-md transition-shadow"
              onClick={() => onActionClick(suggestion.action)}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${suggestion.color}`} />
              <span className="text-sm">{suggestion.label}</span>
            </Button>
          </motion.div>
        );
      })}
    </motion.div>
  );
}