import React, { useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriorityRankingStepProps {
  question: string;
  items: string[];
  ranked: string[];
  onChange: (ranked: string[]) => void;
}

const getItemEmoji = (item: string): string => {
  const emojiMap: Record<string, string> = {
    'Réduire le gaspillage': '♻️',
    'Économiser de l\'argent': '💰',
    'Manger plus sainement': '🥗',
    'Gagner du temps': '⏰',
    'Découvrir de nouvelles recettes': '🍽️'
  };
  return emojiMap[item] || '⭐';
};

const PriorityRankingStep: React.FC<PriorityRankingStepProps> = ({
  question,
  items,
  ranked,
  onChange
}) => {
  const [unrankedItems] = useState(items.filter(item => !ranked.includes(item)));

  const handleAddItem = (item: string) => {
    const newRanked = [...ranked, item];
    onChange(newRanked);
  };

  const handleReorder = (newRanked: string[]) => {
    onChange(newRanked);
  };

  const handleRemoveItem = (item: string) => {
    const newRanked = ranked.filter(i => i !== item);
    onChange(newRanked);
  };

  return (
    <div className="space-y-8">
      {/* Question */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="text-2xl font-semibold text-gray-900 dark:text-white text-center leading-tight"
      >
        {question}
      </motion.h2>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-gray-600 dark:text-gray-300 text-center"
      >
        Glissez-déposez pour organiser par ordre de priorité
      </motion.p>

      {/* Ranked Items */}
      {ranked.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Vos priorités (par ordre d'importance)
          </h3>
          
          <Reorder.Group
            axis="y"
            values={ranked}
            onReorder={handleReorder}
            className="space-y-2"
          >
            {ranked.map((item, index) => (
              <Reorder.Item
                key={item}
                value={item}
                className="cursor-grab active:cursor-grabbing"
              >
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  
                  <span className="text-lg">{getItemEmoji(item)}</span>
                  
                  <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                    {item}
                  </span>
                  
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(item)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    ✕
                  </Button>
                </motion.div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </motion.div>
      )}

      {/* Available Items */}
      {items.filter(item => !ranked.includes(item)).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {ranked.length > 0 ? 'Autres options' : 'Cliquez pour ajouter à vos priorités'}
          </h3>
          
          <div className="grid gap-2">
            {items.filter(item => !ranked.includes(item)).map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
              >
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start gap-3 h-auto p-3 rounded-xl",
                    "hover:bg-primary/5 hover:border-primary hover:scale-102 transition-all duration-200"
                  )}
                  onClick={() => handleAddItem(item)}
                >
                  <span className="text-lg">{getItemEmoji(item)}</span>
                  <span className="text-sm font-medium">{item}</span>
                  <Star className="w-4 h-4 ml-auto text-gray-400" />
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Progress indicator */}
      {ranked.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Badge variant="secondary" className="px-3 py-1">
            {ranked.length} / {items.length} priorité{ranked.length > 1 ? 's' : ''} définie{ranked.length > 1 ? 's' : ''}
          </Badge>
        </motion.div>
      )}
    </div>
  );
};

export default PriorityRankingStep;