import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Trophy, 
  Target, 
  Flame, 
  Star, 
  Award,
  Crown,
  Zap,
  Gift,
  ChevronRight,
  Users,
  Medal
} from 'lucide-react';
import { Achievement, UserProgress, Leaderboard } from '@/hooks/useAchievements';
import { cn } from '@/lib/utils';

interface AchievementsListProps {
  achievements: Achievement[];
  userProgress: UserProgress;
  recentAchievements: Achievement[];
  nextMilestone: Achievement | null;
  leaderboard: Leaderboard;
  className?: string;
}

interface AchievementCardProps {
  achievement: Achievement;
  isNew?: boolean;
}

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const tierColors = {
  bronze: { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', icon: '🥉' },
  silver: { bg: 'bg-gray-100 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-400', icon: '🥈' },
  gold: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', icon: '🥇' },
  platinum: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400', icon: '💎' }
};

const categoryIcons = {
  savings: '💰',
  waste: '♻️',
  nutrition: '🥗',
  inventory: '📦',
  recipes: '👨‍🍳',
  shopping: '🛒'
};

// Progress Ring Component
const ProgressRing: React.FC<ProgressRingProps> = ({ 
  progress, 
  size = 60, 
  strokeWidth = 4,
  className 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative", className)}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        <circle
          className="text-gray-200 dark:text-gray-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className="text-blue-500"
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

// Achievement Card Component
const AchievementCard: React.FC<AchievementCardProps> = ({ achievement, isNew }) => {
  const [isHovered, setIsHovered] = useState(false);
  const tierConfig = tierColors[achievement.tier];
  const progressPercentage = (achievement.progress / achievement.target) * 100;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative"
    >
      <Card className={cn(
        "transition-all duration-300 cursor-pointer",
        achievement.isUnlocked 
          ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10" 
          : "hover:shadow-md",
        isHovered && "shadow-lg"
      )}>
        {/* New Achievement Badge */}
        {isNew && (
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            className="absolute -top-2 -right-2 z-10"
          >
            <Badge className="bg-red-500 text-white text-xs px-2 py-1">
              Nouveau!
            </Badge>
          </motion.div>
        )}

        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Achievement Icon */}
            <div className={cn(
              "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg",
              tierConfig.bg,
              achievement.isUnlocked && "ring-2 ring-green-400 dark:ring-green-600"
            )}>
              {achievement.icon}
            </div>

            {/* Achievement Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "font-semibold text-sm truncate",
                    achievement.isUnlocked ? "text-green-700 dark:text-green-400" : "text-gray-900 dark:text-gray-100"
                  )}>
                    {achievement.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {achievement.description}
                  </p>
                </div>

                {/* Tier Badge */}
                <div className="flex items-center gap-1">
                  <span className="text-sm">{tierConfig.icon}</span>
                  {achievement.reward.badge && (
                    <span className="text-sm">{achievement.reward.badge}</span>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">
                    {achievement.progress} / {achievement.target}
                  </span>
                  <span className={cn("font-medium", tierConfig.text)}>
                    +{achievement.reward.points} pts
                  </span>
                </div>
                
                <Progress 
                  value={progressPercentage} 
                  className="h-2"
                />
              </div>

              {/* Achievement Type */}
              <div className="flex items-center justify-between mt-2">
                <Badge 
                  variant="outline" 
                  className="text-xs"
                >
                  {categoryIcons[achievement.category]} {achievement.type}
                </Badge>
                
                {achievement.isUnlocked && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs"
                  >
                    <Trophy className="h-3 w-3" />
                    <span>Débloqué!</span>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Leaderboard Component
const LeaderboardSection: React.FC<{ leaderboard: Leaderboard }> = ({ leaderboard }) => {
  const [activeTab, setActiveTab] = useState<'family' | 'friends'>('family');

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Classement
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="family">Famille</TabsTrigger>
            <TabsTrigger value="friends">Amis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="family" className="space-y-3 mt-4">
            {leaderboard.family.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg",
                  user.name === 'Vous' 
                    ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" 
                    : "bg-gray-50 dark:bg-gray-900/20"
                )}
              >
                <div className="flex items-center justify-center w-8 h-8 text-sm font-bold">
                  {getRankIcon(index)}
                </div>
                
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user.avatar}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {user.achievements} succès
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="font-bold text-sm">{user.points}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">points</p>
                </div>
              </motion.div>
            ))}
          </TabsContent>
          
          <TabsContent value="friends" className="space-y-3 mt-4">
            {leaderboard.friends.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20"
              >
                <div className="flex items-center justify-center w-8 h-8 text-sm font-bold">
                  {getRankIcon(index)}
                </div>
                
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user.avatar}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {user.achievements} succès
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="font-bold text-sm">{user.points}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">points</p>
                </div>
              </motion.div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Main Achievements List Component
export const AchievementsList: React.FC<AchievementsListProps> = ({
  achievements,
  userProgress,
  recentAchievements,
  nextMilestone,
  leaderboard,
  className
}) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [category, setCategory] = useState<string>('all');

  const filteredAchievements = achievements.filter(achievement => {
    const statusFilter = filter === 'all' || 
      (filter === 'unlocked' && achievement.isUnlocked) ||
      (filter === 'locked' && !achievement.isUnlocked);
    
    const categoryFilter = category === 'all' || achievement.category === category;
    
    return statusFilter && categoryFilter;
  });

  const levelProgress = (userProgress.currentLevelPoints / userProgress.nextLevelPoints) * 100;

  return (
    <div className={cn("space-y-6", className)}>
      {/* User Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Votre Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Level */}
            <div className="text-center">
              <div className="relative mb-4">
                <ProgressRing progress={levelProgress} size={80} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">
                    {userProgress.level}
                  </span>
                </div>
              </div>
              <h3 className="font-semibold">Niveau {userProgress.level}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {userProgress.currentLevelPoints}/{userProgress.nextLevelPoints} pts
              </p>
            </div>

            {/* Total Points */}
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {userProgress.totalPoints}
              </div>
              <h3 className="font-semibold">Points Total</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {userProgress.unlockedAchievements} succès débloqués
              </p>
            </div>

            {/* Current Streak */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Flame className="h-6 w-6 text-orange-500" />
                <span className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {userProgress.currentStreak.days}
                </span>
              </div>
              <h3 className="font-semibold">Série Actuelle</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {userProgress.currentStreak.type.replace('_', ' ')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Succès Récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {recentAchievements.map(achievement => (
                <AchievementCard 
                  key={achievement.id} 
                  achievement={achievement} 
                  isNew 
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Milestone */}
      {nextMilestone && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-yellow-600" />
              Prochain Objectif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AchievementCard achievement={nextMilestone} />
            <div className="mt-4 text-center">
              <Button variant="outline" className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                Voir les conseils
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <LeaderboardSection leaderboard={leaderboard} />

      {/* All Achievements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5" />
              Tous les Succès
            </CardTitle>
            <div className="flex gap-2">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs">Tous</TabsTrigger>
                  <TabsTrigger value="unlocked" className="text-xs">Débloqués</TabsTrigger>
                  <TabsTrigger value="locked" className="text-xs">Verrouillés</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <AnimatePresence>
              {filteredAchievements.map(achievement => (
                <AchievementCard 
                  key={achievement.id} 
                  achievement={achievement} 
                />
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};