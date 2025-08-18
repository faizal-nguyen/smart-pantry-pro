import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Search, ChefHat, Calendar, Salad } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConversationMode {
  id: 'recipe-finder' | 'cooking-guide' | 'meal-planner' | 'nutrition-coach';
  icon: React.ReactNode;
  title: string;
  prompt: string;
  description: string;
  color: string;
}

const MODES: ConversationMode[] = [
  {
    id: 'recipe-finder',
    icon: <Search className="w-6 h-6" />,
    title: 'Trouver des recettes',
    prompt: "Qu'avez-vous envie de manger ?",
    description: "Je trouve les meilleures recettes avec vos ingrédients",
    color: 'bg-blue-500'
  },
  {
    id: 'cooking-guide',
    icon: <ChefHat className="w-6 h-6" />,
    title: 'Guide culinaire',
    prompt: "Je vous guide étape par étape",
    description: "Instructions détaillées, minuteurs et conseils de chef",
    color: 'bg-green-500'
  },
  {
    id: 'meal-planner',
    icon: <Calendar className="w-6 h-6" />,
    title: 'Planifier les repas',
    prompt: "Planifions vos repas de la semaine",
    description: "Organisation des menus selon votre emploi du temps",
    color: 'bg-purple-500'
  },
  {
    id: 'nutrition-coach',
    icon: <Salad className="w-6 h-6" />,
    title: 'Coach nutrition',
    prompt: "Analysons vos habitudes alimentaires",
    description: "Suivi nutritionnel et recommandations personnalisées",
    color: 'bg-orange-500'
  }
];

interface ConversationModesProps {
  selectedMode: ConversationMode['id'] | null;
  onModeSelect: (mode: ConversationMode) => void;
}

export const ConversationModes: React.FC<ConversationModesProps> = ({
  selectedMode,
  onModeSelect
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {MODES.map((mode) => (
        <motion.div
          key={mode.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card
            className={cn(
              "p-4 cursor-pointer transition-all",
              "hover:shadow-lg",
              selectedMode === mode.id ? "ring-2 ring-primary" : "hover:border-primary/50"
            )}
            onClick={() => onModeSelect(mode)}
          >
            <div className="flex flex-col items-center text-center space-y-2">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-white",
                mode.color
              )}>
                {mode.icon}
              </div>
              <h3 className="font-medium text-sm">{mode.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {mode.description}
              </p>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export { MODES };