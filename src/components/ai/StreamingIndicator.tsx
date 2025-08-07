import React from 'react';
import { motion } from 'framer-motion';

export function StreamingIndicator() {
  const dotVariants = {
    initial: { opacity: 0.4 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.5,
        repeat: Infinity,
        repeatType: "reverse" as const
      }
    }
  };

  return (
    <div className="flex items-center gap-1 px-2">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: index * 0.15 }}
          className="h-2 w-2 bg-primary rounded-full"
        />
      ))}
    </div>
  );
}