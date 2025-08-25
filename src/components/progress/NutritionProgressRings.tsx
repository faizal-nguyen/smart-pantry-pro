/**
 * Nutrition Progress Rings Component
 * Apple Health-style progress visualization for nutrition and inventory goals
 * Based on PRP-026-Inventory-Visualization specification
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Apple, 
  Carrot, 
  Droplet, 
  Heart, 
  Target, 
  Trophy,
  Zap,
  Leaf,
  Star,
  TrendingUp,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  NutritionProgress,
  ProgressRingConfig,
  FoodCategory
} from '@/visualization/types/PantryTypes';

interface NutritionProgressRingsProps {
  nutritionData: NutritionProgress;
  goals: NutritionGoals;
  timeframe?: 'daily' | 'weekly' | 'monthly';
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
  showStats?: boolean;
  onRingClick?: (ringId: string) => void;
  className?: string;
}

interface NutritionGoals {
  vitamins: number;
  variety: number;
  freshness: number;
  balance: number;
}

interface ProgressRingProps {
  ring: ProgressRingConfig;
  size: number;
  strokeWidth: number;
  animationProgress: number;
  isAchieved: boolean;
  onClick?: () => void;
}

interface RingLabelProps {
  ring: ProgressRingConfig;
  isAchieved: boolean;
  onClick?: () => void;
}

interface AchievementCelebrationProps {
  achievedRings: ProgressRingConfig[];
  onComplete: () => void;
}

interface WeeklyTrendProps {
  weeklyData: WeeklyProgressData[];
  currentWeekAverage: number;
}

interface WeeklyProgressData {
  day: string;
  vitamins: number;
  variety: number;
  freshness: number;
  balance: number;
  overall: number;
}

// Individual Progress Ring Component
const ProgressRing: React.FC<ProgressRingProps> = ({
  ring,
  size,
  strokeWidth,
  animationProgress,
  isAchieved,
  onClick
}) => {
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(ring.value / ring.goal, 1);
  const animatedPercentage = percentage * animationProgress;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference * (1 - animatedPercentage);

  // Achievement glow effect
  const glowIntensity = isAchieved ? 1.0 : 0.3;
  const pulseAnimation = isAchieved ? 'ring-pulse' : 'none';

  return (
    <motion.g
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Background Ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
        fill="transparent"
        className="ring-background"
      />
      
      {/* Progress Ring */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={ring.color}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeLinecap="round"
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{
          duration: 2,
          ease: [0.4, 0, 0.2, 1],
          delay: 0.2
        }}
        className={cn(
          "ring-progress",
          isAchieved && "ring-achieved"
        )}
        style={{
          filter: `drop-shadow(0 0 ${glowIntensity * 8}px ${ring.color})`,
          animation: pulseAnimation
        }}
      />

      {/* Achievement Sparkles */}
      <AnimatePresence>
        {isAchieved && animationProgress > 0.8 && (
          <g className="achievement-sparkles">
            {[0, 60, 120, 180, 240, 300].map((angle, index) => (
              <motion.circle
                key={index}
                cx={size / 2 + radius * Math.cos((angle * Math.PI) / 180)}
                cy={size / 2 + radius * Math.sin((angle * Math.PI) / 180)}
                r="2"
                fill={ring.color}
                initial={{ r: 0, opacity: 0 }}
                animate={{ 
                  r: [0, 4, 0], 
                  opacity: [0, 1, 0] 
                }}
                transition={{
                  duration: 1.5,
                  delay: index * 0.1,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
              />
            ))}
          </g>
        )}
      </AnimatePresence>

      {/* Center Icon */}
      <foreignObject 
        x={size / 2 - 12} 
        y={size / 2 - 12} 
        width="24" 
        height="24"
        className="ring-icon"
      >
        <div className="flex items-center justify-center w-full h-full">
          {ring.icon && (
            <ring.icon 
              className={cn(
                "w-6 h-6 transition-colors duration-300",
                isAchieved ? "text-white" : "text-gray-400"
              )} 
            />
          )}
        </div>
      </foreignObject>

      {/* Achievement Check Mark */}
      {isAchieved && (
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            delay: 2.5,
            type: "spring",
            stiffness: 500,
            damping: 30
          }}
        >
          <circle
            cx={size / 2 + radius * 0.7}
            cy={size / 2 - radius * 0.7}
            r="8"
            fill="#10B981"
            stroke="white"
            strokeWidth="2"
          />
          <foreignObject 
            x={size / 2 + radius * 0.7 - 6} 
            y={size / 2 - radius * 0.7 - 6} 
            width="12" 
            height="12"
          >
            <CheckCircle className="w-3 h-3 text-white" />
          </foreignObject>
        </motion.g>
      )}
    </motion.g>
  );
};

// Ring Label Component
const RingLabel: React.FC<RingLabelProps> = ({ ring, isAchieved, onClick }) => {
  const progressPercentage = Math.min((ring.value / ring.goal) * 100, 100);

  return (
    <motion.div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border transition-all duration-300 cursor-pointer",
        "hover:shadow-md hover:scale-[1.02]",
        isAchieved 
          ? "bg-green-50 border-green-200 shadow-sm" 
          : "bg-gray-50 border-gray-200"
      )}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      style={{
        borderColor: isAchieved ? ring.color : undefined
      }}
    >
      <div className="flex items-center space-x-3">
        <div 
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: ring.color }}
        />
        <div>
          <div className="font-medium text-sm text-gray-900">
            {ring.label}
          </div>
          <div className="text-xs text-gray-500">
            {ring.value}{ring.unit} / {ring.goal}{ring.unit}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="text-right">
          <div className={cn(
            "text-sm font-semibold",
            isAchieved ? "text-green-600" : "text-gray-900"
          )}>
            {Math.round(progressPercentage)}%
          </div>
          <Progress 
            value={progressPercentage} 
            className="w-16 h-1"
            style={{ 
              backgroundColor: ring.color + '20',
            }}
          />
        </div>
        
        {isAchieved && (
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 500,
              damping: 30,
              delay: 0.2
            }}
          >
            <Trophy className="w-4 h-4 text-yellow-500" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Achievement Celebration Component
const AchievementCelebration: React.FC<AchievementCelebrationProps> = ({
  achievedRings,
  onComplete
}) => {
  useEffect(() => {
    if (achievedRings.length > 0) {
      const timer = setTimeout(() => {
        onComplete();
      }, 5000); // Show celebration for 5 seconds

      return () => clearTimeout(timer);
    }
  }, [achievedRings, onComplete]);

  if (achievedRings.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Confetti Effect */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 50 }).map((_, index) => (
            <motion.div
              key={index}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: achievedRings[index % achievedRings.length]?.color || '#10B981',
                left: `${Math.random() * 100}%`,
                top: '-10px'
              }}
              animate={{
                y: window.innerHeight + 50,
                rotate: 360 * 2,
                opacity: [1, 1, 0]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 2,
                ease: "easeOut"
              }}
            />
          ))}
        </div>

        {/* Achievement Message */}
        <motion.div
          className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4 pointer-events-auto"
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          transition={{ 
            type: "spring",
            stiffness: 500,
            damping: 30
          }}
        >
          <div className="text-center">
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 0.6,
                repeat: 2,
                repeatType: "reverse"
              }}
            >
              <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            </motion.div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Goal{achievedRings.length > 1 ? 's' : ''} Achieved!
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              You've completed {achievedRings.length} nutrition goal{achievedRings.length > 1 ? 's' : ''} today!
            </p>

            <div className="flex justify-center space-x-2">
              {achievedRings.slice(0, 3).map((ring, index) => (
                <Badge 
                  key={index}
                  variant="secondary"
                  className="text-xs"
                  style={{ 
                    backgroundColor: ring.color + '20',
                    color: ring.color,
                    borderColor: ring.color
                  }}
                >
                  {ring.label}
                </Badge>
              ))}
              {achievedRings.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{achievedRings.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Weekly Trend Component
const WeeklyTrend: React.FC<WeeklyTrendProps> = ({ weeklyData, currentWeekAverage }) => {
  const maxValue = Math.max(...weeklyData.map(d => d.overall));
  
  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Weekly Progress Trend
        </CardTitle>
        <CardDescription>
          Your nutrition goals over the past week
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Mini Chart */}
          <div className="flex items-end justify-between h-16 px-2">
            {weeklyData.map((day, index) => (
              <div key={day.day} className="flex flex-col items-center space-y-1">
                <motion.div
                  className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm"
                  style={{
                    height: `${(day.overall / maxValue) * 100}%`,
                    width: '8px',
                    minHeight: '4px'
                  }}
                  initial={{ height: 0 }}
                  animate={{ height: `${(day.overall / maxValue) * 48}px` }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                />
                <span className="text-xs text-gray-500 font-medium">
                  {day.day.slice(0, 1)}
                </span>
              </div>
            ))}
          </div>

          {/* Average Score */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-sm text-gray-600">Week Average</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {Math.round(currentWeekAverage)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Component
export const NutritionProgressRings: React.FC<NutritionProgressRingsProps> = ({
  nutritionData,
  goals,
  timeframe = 'daily',
  size = 'medium',
  showLabels = true,
  showStats = true,
  onRingClick,
  className
}) => {
  const [animationProgress, setAnimationProgress] = useState(0);
  const [celebratingAchievements, setCelebratingAchievements] = useState<ProgressRingConfig[]>([]);
  const [activeTab, setActiveTab] = useState('rings');

  // Ring configurations
  const ringData = useMemo(() => [
    {
      id: 'vitamins',
      label: 'Vitamins & Minerals',
      value: nutritionData.vitamins.current,
      goal: goals.vitamins,
      color: '#FF6B6B',
      strokeWidth: 12,
      radius: 90,
      achievement: nutritionData.vitamins.current >= goals.vitamins,
      icon: Apple,
      unit: ' pts',
      description: 'Essential vitamins from fresh ingredients'
    },
    {
      id: 'variety',
      label: 'Food Variety',
      value: nutritionData.variety.current,
      goal: goals.variety,
      color: '#4ECDC4',
      strokeWidth: 10,
      radius: 75,
      achievement: nutritionData.variety.current >= goals.variety,
      icon: Carrot,
      unit: ' types',
      description: 'Different food categories in your pantry'
    },
    {
      id: 'freshness',
      label: 'Freshness Score',
      value: nutritionData.freshness.current,
      goal: goals.freshness,
      color: '#45B7D1',
      strokeWidth: 8,
      radius: 60,
      achievement: nutritionData.freshness.current >= goals.freshness,
      icon: Leaf,
      unit: '%',
      description: 'Average freshness of your ingredients'
    },
    {
      id: 'balance',
      label: 'Nutritional Balance',
      value: nutritionData.balance.current,
      goal: goals.balance,
      color: '#96CEB4',
      strokeWidth: 6,
      radius: 45,
      achievement: nutritionData.balance.current >= goals.balance,
      icon: Heart,
      unit: '%',
      description: 'Balance across nutritional categories'
    }
  ], [nutritionData, goals]);

  // Mock weekly data (would come from props in real implementation)
  const weeklyData: WeeklyProgressData[] = useMemo(() => [
    { day: 'Mon', vitamins: 85, variety: 70, freshness: 90, balance: 75, overall: 80 },
    { day: 'Tue', vitamins: 90, variety: 80, freshness: 85, balance: 80, overall: 84 },
    { day: 'Wed', vitamins: 75, variety: 75, freshness: 95, balance: 70, overall: 79 },
    { day: 'Thu', vitamins: 95, variety: 90, freshness: 80, balance: 85, overall: 88 },
    { day: 'Fri', vitamins: 80, variety: 85, freshness: 90, balance: 90, overall: 86 },
    { day: 'Sat', vitamins: 100, variety: 95, freshness: 85, balance: 95, overall: 94 },
    { day: 'Sun', vitamins: 90, variety: 85, freshness: 90, balance: 80, overall: 86 },
  ], []);

  const currentWeekAverage = useMemo(() => {
    return weeklyData.reduce((sum, day) => sum + day.overall, 0) / weeklyData.length;
  }, [weeklyData]);

  // Animation effect
  useEffect(() => {
    const animateRings = () => {
      setAnimationProgress(0);
      
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / 2500, 1); // 2.5 second animation
        
        setAnimationProgress(progress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Check for achievements after animation completes
          const achievedRings = ringData.filter(ring => ring.achievement);
          if (achievedRings.length > 0) {
            setCelebratingAchievements(achievedRings);
          }
        }
      };
      
      requestAnimationFrame(animate);
    };
    
    animateRings();
  }, [nutritionData, goals]);

  // Ring size calculation
  const ringSize = {
    small: 160,
    medium: 200,
    large: 240
  }[size];

  // Overall completion percentage
  const overallProgress = useMemo(() => {
    const totalProgress = ringData.reduce((sum, ring) => 
      sum + Math.min(ring.value / ring.goal, 1), 0
    );
    return Math.round((totalProgress / ringData.length) * 100);
  }, [ringData]);

  const handleRingClick = useCallback((ringId: string) => {
    onRingClick?.(ringId);
  }, [onRingClick]);

  return (
    <div className={cn("nutrition-progress-rings", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rings">Progress Rings</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="rings" className="space-y-6">
          {/* Main Progress Rings */}
          <Card>
            <CardHeader className="text-center pb-4">
              <CardTitle className="flex items-center justify-center gap-2">
                <Target className="w-5 h-5" />
                Nutrition Goals - {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
              </CardTitle>
              <CardDescription>
                Track your pantry's nutritional diversity and freshness
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-6">
                {/* SVG Rings Container */}
                <div className="relative">
                  <svg 
                    width={ringSize} 
                    height={ringSize} 
                    viewBox={`0 0 ${ringSize} ${ringSize}`}
                    className="transform -rotate-90"
                  >
                    {ringData.map((ring, index) => (
                      <ProgressRing
                        key={ring.id}
                        ring={ring}
                        size={ringSize - (index * 30)}
                        strokeWidth={ring.strokeWidth}
                        animationProgress={animationProgress}
                        isAchieved={ring.achievement}
                        onClick={() => handleRingClick(ring.id)}
                      />
                    ))}
                  </svg>

                  {/* Center Status Display */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.div
                      className="text-center"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1, duration: 0.6 }}
                    >
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        {overallProgress}%
                      </div>
                      <div className="text-sm text-gray-500">
                        Overall Goal
                      </div>
                      {overallProgress === 100 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 2, type: "spring", stiffness: 500 }}
                        >
                          <Star className="w-5 h-5 text-yellow-500 mx-auto mt-1" />
                        </motion.div>
                      )}
                    </motion.div>
                  </div>
                </div>

                {/* Ring Labels */}
                {showLabels && (
                  <div className="w-full max-w-md space-y-2">
                    {ringData.map((ring) => (
                      <RingLabel
                        key={ring.id}
                        ring={ring}
                        isAchieved={ring.achievement}
                        onClick={() => handleRingClick(ring.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {ringData.map((ring) => (
            <Card key={ring.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ring.icon className="w-5 h-5" style={{ color: ring.color }} />
                    {ring.label}
                  </CardTitle>
                  <Badge 
                    variant={ring.achievement ? "default" : "secondary"}
                    className={ring.achievement ? "bg-green-100 text-green-800" : ""}
                  >
                    {ring.value}/{ring.goal}{ring.unit}
                  </Badge>
                </div>
                <CardDescription>{ring.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Progress 
                    value={(ring.value / ring.goal) * 100} 
                    className="h-2"
                  />
                  
                  {ring.id === 'vitamins' && nutritionData.vitamins.sources && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Top sources: </span>
                      {nutritionData.vitamins.sources.slice(0, 3).join(', ')}
                    </div>
                  )}
                  
                  {ring.id === 'variety' && nutritionData.variety.categories && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Categories: </span>
                      {nutritionData.variety.categories.length} of 15 food types
                    </div>
                  )}
                  
                  {ring.id === 'freshness' && nutritionData.freshness.averageAge !== undefined && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Average age: </span>
                      {nutritionData.freshness.averageAge} days
                    </div>
                  )}
                  
                  {ring.id === 'balance' && nutritionData.balance.distribution && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {Object.entries(nutritionData.balance.distribution)
                        .slice(0, 6)
                        .map(([category, percentage]) => (
                          <div key={category} className="text-xs">
                            <div className="font-medium text-gray-700 capitalize">
                              {category}
                            </div>
                            <div className="text-gray-500">{percentage}%</div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="trends">
          <WeeklyTrend 
            weeklyData={weeklyData} 
            currentWeekAverage={currentWeekAverage} 
          />
        </TabsContent>
      </Tabs>

      {/* Achievement Celebration */}
      <AchievementCelebration
        achievedRings={celebratingAchievements}
        onComplete={() => setCelebratingAchievements([])}
      />

      {/* Custom Styles */}
      <style>{`
        @keyframes ring-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        .ring-pulse {
          animation: ring-pulse 2s infinite;
        }
        
        .ring-achieved {
          filter: drop-shadow(0 0 8px currentColor);
        }
        
        .ring-background {
          transition: stroke 0.3s ease;
        }
        
        .ring-progress {
          transition: stroke 0.3s ease;
        }
        
        .achievement-sparkles {
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default NutritionProgressRings;