import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  prompt: string;
  color?: string;
}

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'quick-recipe',
    icon: '🍳',
    label: 'Recette rapide',
    prompt: "Que puis-je cuisiner en moins de 15 minutes avec mes ingrédients ?",
    color: 'hover:bg-orange-50'
  },
  {
    id: 'shopping-list',
    icon: '🛒',
    label: 'Liste courses',
    prompt: "Génère ma liste de courses pour la semaine",
    color: 'hover:bg-blue-50'
  },
  {
    id: 'week-menu',
    icon: '📅',
    label: 'Menu semaine',
    prompt: "Planifie mes repas pour la semaine en tenant compte de mon inventaire",
    color: 'hover:bg-purple-50'
  },
  {
    id: 'expiring-items',
    icon: '⏰',
    label: 'Anti-gaspi',
    prompt: "Quelles recettes pour utiliser mes produits qui expirent bientôt ?",
    color: 'hover:bg-red-50'
  },
  {
    id: 'healthy-option',
    icon: '🥗',
    label: 'Repas léger',
    prompt: "Suggère-moi un repas sain et équilibré",
    color: 'hover:bg-green-50'
  },
  {
    id: 'dessert',
    icon: '🍰',
    label: 'Dessert',
    prompt: "J'ai envie d'un dessert, que puis-je faire ?",
    color: 'hover:bg-pink-50'
  }
];

interface QuickActionsProps {
  onActionClick: (action: QuickAction) => void;
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onActionClick,
  className
}) => {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-2 scrollbar-hide", className)}>
      {DEFAULT_QUICK_ACTIONS.map((action, index) => (
        <motion.div
          key={action.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "whitespace-nowrap flex items-center gap-2 transition-colors",
              action.color
            )}
            onClick={() => onActionClick(action)}
          >
            <span className="text-lg">{action.icon}</span>
            <span>{action.label}</span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
};

export { DEFAULT_QUICK_ACTIONS };
export type { QuickAction };