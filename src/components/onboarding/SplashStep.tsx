import React from 'react';
import { motion } from 'framer-motion';

interface SplashStepProps {
  title: string;
  subtitle: string;
  animation?: string;
  icon?: string;
}

const SplashStep: React.FC<SplashStepProps> = ({
  title,
  subtitle,
  icon = '🍳'
}) => {
  return (
    <div className="text-center space-y-8">
      {/* Animated Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20,
          delay: 0.2 
        }}
        className="text-8xl mb-8"
      >
        {icon}
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="text-3xl font-bold text-gray-900 dark:text-white leading-tight"
      >
        {title}
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed max-w-sm mx-auto"
      >
        {subtitle}
      </motion.p>

      {/* Decorative elements */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.8 }}
        className="flex justify-center space-x-2 mt-12"
      >
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: 0 }}
            animate={{ y: [-5, 5, -5] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2
            }}
            className="w-2 h-2 bg-primary rounded-full"
          />
        ))}
      </motion.div>
    </div>
  );
};

export default SplashStep;