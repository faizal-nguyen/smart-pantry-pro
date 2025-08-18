import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InteractiveStepProps {
  question: string;
  options: string[];
  value?: string;
  onChange: (value: string) => void;
  illustration?: string;
  followUp?: Record<string, string | null>;
}

const InteractiveStep: React.FC<InteractiveStepProps> = ({
  question,
  options,
  value,
  onChange,
  illustration = '🤔',
  followUp
}) => {
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [selectedOption, setSelectedOption] = useState(value);

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
    onChange(option);

    // Show follow-up question if available
    if (followUp && followUp[option]) {
      setShowFollowUp(true);
    } else {
      setShowFollowUp(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Illustration */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="text-6xl text-center mb-6"
      >
        {illustration}
      </motion.div>

      {/* Question */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="text-2xl font-semibold text-gray-900 dark:text-white text-center leading-tight"
      >
        {question}
      </motion.h2>

      {/* Options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="space-y-3"
      >
        {options.map((option, index) => (
          <motion.div
            key={option}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
          >
            <Button
              variant={selectedOption === option ? "default" : "outline"}
              className={cn(
                "w-full py-4 px-6 text-left justify-start rounded-2xl transition-all duration-200",
                selectedOption === option
                  ? "bg-primary text-primary-foreground shadow-lg scale-105"
                  : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:scale-102"
              )}
              onClick={() => handleOptionSelect(option)}
            >
              <span className="text-base font-medium">{option}</span>
            </Button>
          </motion.div>
        ))}
      </motion.div>

      {/* Follow-up question */}
      {showFollowUp && selectedOption && followUp?.[selectedOption] && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
          className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl"
        >
          <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
            {followUp[selectedOption]}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default InteractiveStep;