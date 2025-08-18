import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface MultiSelectOption {
  id: string;
  icon: string;
  label: string;
}

interface MultiSelectStepProps {
  question: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

const MultiSelectStep: React.FC<MultiSelectStepProps> = ({
  question,
  options,
  selected,
  onChange
}) => {
  const handleToggleOption = (optionId: string) => {
    const newSelected = selected.includes(optionId)
      ? selected.filter(id => id !== optionId)
      : [...selected, optionId];
    onChange(newSelected);
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
        Sélectionnez toutes les options qui vous correspondent
      </motion.p>

      {/* Options Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="grid grid-cols-2 gap-3"
      >
        {options.map((option, index) => {
          const isSelected = selected.includes(option.id);
          
          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
            >
              <Button
                variant="outline"
                className={cn(
                  "w-full h-24 flex flex-col items-center justify-center gap-2 rounded-2xl transition-all duration-200 relative",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                    : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-102"
                )}
                onClick={() => handleToggleOption(option.id)}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center"
                  >
                    <Check className="w-3 h-3 text-primary" />
                  </motion.div>
                )}
                
                <span className="text-2xl">{option.icon}</span>
                <span className="text-sm font-medium text-center leading-tight">
                  {option.label}
                </span>
              </Button>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Selected count */}
      {selected.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <Badge variant="secondary" className="px-3 py-1">
            {selected.length} sélection{selected.length > 1 ? 's' : ''}
          </Badge>
        </motion.div>
      )}
    </div>
  );
};

export default MultiSelectStep;