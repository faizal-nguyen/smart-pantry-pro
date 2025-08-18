import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { KeyMetric } from '@/hooks/useInsightsData';
import { cn } from '@/lib/utils';

interface AnimatedMetricCardProps {
  metric: KeyMetric;
  className?: string;
  onClick?: () => void;
}

interface TrendBadgeProps {
  value: string;
  positive: boolean;
}

const TrendBadge: React.FC<TrendBadgeProps> = ({ value, positive }) => (
  <Badge 
    variant={positive ? "default" : "destructive"}
    className={cn(
      "text-xs font-medium transition-colors",
      positive 
        ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" 
        : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
    )}
  >
    {value}
  </Badge>
);

const StreakIndicator: React.FC<{ days: number }> = ({ days }) => (
  <motion.div
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
    className="flex items-center gap-2 mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
  >
    <div className="flex items-center gap-1">
      {Array.from({ length: Math.min(days, 7) }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 + i * 0.1 }}
          className="w-2 h-2 bg-blue-500 rounded-full"
        />
      ))}
      {days > 7 && (
        <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">
          +{days - 7}
        </span>
      )}
    </div>
    <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
      {days} jours
    </span>
  </motion.div>
);

const MetricDetails: React.FC<{ metric: KeyMetric }> = ({ metric }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="space-y-3"
  >
    <div className="text-center">
      <div className="text-4xl mb-2">{metric.icon}</div>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
        {metric.title}
      </h3>
    </div>
    
    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
      {metric.achievement && (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <span>🏆</span>
          <span>Objectif atteint!</span>
        </div>
      )}
      
      {metric.progress !== undefined && (
        <div>
          <div className="flex justify-between mb-1">
            <span>Progression</span>
            <span>{metric.progress.toFixed(0)}%</span>
          </div>
          <Progress value={metric.progress} className="h-2" />
        </div>
      )}
      
      {metric.detail && (
        <p className="text-center italic">{metric.detail}</p>
      )}
    </div>
  </motion.div>
);

const colorClasses = {
  green: "from-green-500 to-emerald-600",
  blue: "from-blue-500 to-cyan-600", 
  purple: "from-purple-500 to-violet-600",
  orange: "from-orange-500 to-amber-600",
  red: "from-red-500 to-rose-600"
};

export const AnimatedMetricCard: React.FC<AnimatedMetricCardProps> = ({ 
  metric, 
  className,
  onClick 
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    setIsFlipped(!isFlipped);
    onClick?.();
  };

  // Parse trend value to determine if positive
  const getTrendInfo = (trend: string) => {
    const isPositive = trend.includes('+');
    return { isPositive, value: trend };
  };

  const trendInfo = metric.trend ? getTrendInfo(metric.trend) : null;

  return (
    <motion.div
      className={cn("cursor-pointer", className)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleClick}
      layout
    >
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300 h-40",
        "hover:shadow-lg dark:hover:shadow-xl",
        isHovered && "ring-2 ring-blue-200 dark:ring-blue-800"
      )}>
        {/* Background gradient */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-5",
          colorClasses[metric.color]
        )} />

        <div className="relative p-6 h-full">
          <AnimatePresence mode="wait">
            {!isFlipped ? (
              <motion.div
                key="front"
                initial={{ rotateY: 0 }}
                exit={{ rotateY: 90 }}
                transition={{ duration: 0.3 }}
                className="h-full flex flex-col"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <motion.div 
                    className="text-3xl"
                    animate={{ 
                      rotate: isHovered ? [0, -10, 10, 0] : 0,
                      scale: isHovered ? 1.1 : 1
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    {metric.icon}
                  </motion.div>
                  
                  {trendInfo && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <TrendBadge 
                        value={trendInfo.value} 
                        positive={trendInfo.isPositive} 
                      />
                    </motion.div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-center">
                  <motion.p 
                    className="text-sm text-gray-600 dark:text-gray-400 mb-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    {metric.title}
                  </motion.p>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                  >
                    <motion.p 
                      className="text-3xl font-bold text-gray-900 dark:text-gray-100"
                      key={metric.value} // Re-animate when value changes
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      {typeof metric.value === 'number' 
                        ? metric.value.toFixed(0)
                        : metric.value}
                    </motion.p>
                  </motion.div>
                  
                  {metric.detail && (
                    <motion.p 
                      className="text-xs text-gray-500 dark:text-gray-400 mt-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {metric.detail}
                    </motion.p>
                  )}
                </div>

                {/* Progress bar */}
                {metric.progress !== undefined && (
                  <motion.div 
                    className="mt-4"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    <Progress 
                      value={metric.progress} 
                      className="h-2"
                    />
                  </motion.div>
                )}

                {/* Streak indicator */}
                {metric.streak && typeof metric.value === 'string' && (
                  <StreakIndicator days={parseInt(metric.value)} />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="back"
                initial={{ rotateY: -90 }}
                animate={{ rotateY: 0 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <MetricDetails metric={metric} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Achievement badge */}
        {metric.achievement && (
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
            className="absolute top-2 right-2"
          >
            <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs">
              ⭐
            </div>
          </motion.div>
        )}

        {/* Flip hint */}
        <motion.div
          className="absolute bottom-2 right-2 text-xs text-gray-400 dark:text-gray-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          Cliquez pour plus
        </motion.div>
      </Card>
    </motion.div>
  );
};