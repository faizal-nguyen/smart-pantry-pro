import React from 'react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';

interface SliderRange {
  min: { label: string; emoji: string };
  mid: { label: string; emoji: string };
  max: { label: string; emoji: string };
}

interface SliderStepProps {
  question: string;
  range: SliderRange;
  value: number;
  onChange: (value: number) => void;
}

const SliderStep: React.FC<SliderStepProps> = ({
  question,
  range,
  value,
  onChange
}) => {
  const getCurrentLevel = () => {
    if (value <= 0.33) return range.min;
    if (value <= 0.66) return range.mid;
    return range.max;
  };

  const currentLevel = getCurrentLevel();

  return (
    <div className="space-y-12">
      {/* Question */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="text-2xl font-semibold text-gray-900 dark:text-white text-center leading-tight"
      >
        {question}
      </motion.h2>

      {/* Current Level Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="text-center space-y-4"
      >
        <motion.div
          key={currentLevel.emoji}
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="text-8xl"
        >
          {currentLevel.emoji}
        </motion.div>
        
        <motion.div
          key={currentLevel.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-xl font-semibold text-gray-800 dark:text-gray-200"
        >
          {currentLevel.label}
        </motion.div>
      </motion.div>

      {/* Slider */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="space-y-6"
      >
        <Slider
          value={[value]}
          onValueChange={(values) => onChange(values[0])}
          max={1}
          min={0}
          step={0.01}
          className="w-full"
        />

        {/* Level Labels */}
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex flex-col items-center">
            <span className="text-lg mb-1">{range.min.emoji}</span>
            <span>{range.min.label}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-lg mb-1">{range.mid.emoji}</span>
            <span>{range.mid.label}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-lg mb-1">{range.max.emoji}</span>
            <span>{range.max.label}</span>
          </div>
        </div>
      </motion.div>

      {/* Tips based on level */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="text-center"
      >
        {value <= 0.33 && (
          <p className="text-sm text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
            💡 Parfait ! Nous vous proposerons des recettes simples et rapides
          </p>
        )}
        {value > 0.33 && value <= 0.66 && (
          <p className="text-sm text-gray-600 dark:text-gray-300 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl">
            👨‍🍳 Super ! Vous aurez accès à une variété de recettes intéressantes
          </p>
        )}
        {value > 0.66 && (
          <p className="text-sm text-gray-600 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 p-3 rounded-xl">
            ⭐ Excellent ! Nous vous défirons avec des recettes créatives
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default SliderStep;