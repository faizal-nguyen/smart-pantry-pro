import { useState, useEffect, useMemo } from 'react';
import { useInventory } from './useInventory';
import { useShoppingList } from './useShoppingList';
import { useRecipes } from './useRecipes';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'savings' | 'waste' | 'nutrition' | 'inventory' | 'recipes' | 'shopping';
  type: 'milestone' | 'streak' | 'challenge';
  isUnlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  target: number;
  reward: {
    points: number;
    badge?: string;
  };
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface UserProgress {
  totalPoints: number;
  level: number;
  nextLevelPoints: number;
  currentLevelPoints: number;
  unlockedAchievements: number;
  currentStreak: {
    type: string;
    days: number;
  };
}

export interface Leaderboard {
  family: Array<{
    id: string;
    name: string;
    points: number;
    achievements: number;
    avatar?: string;
  }>;
  friends: Array<{
    id: string;
    name: string;
    points: number;
    achievements: number;
    avatar?: string;
  }>;
}

const ACHIEVEMENTS_DEFINITIONS: Omit<Achievement, 'isUnlocked' | 'unlockedAt' | 'progress'>[] = [
  // Savings Achievements
  {
    id: 'first_savings',
    title: 'Premier Économe',
    description: 'Économisez votre premier euro',
    icon: '💰',
    category: 'savings',
    type: 'milestone',
    target: 1,
    reward: { points: 50 },
    tier: 'bronze'
  },
  {
    id: 'savings_master',
    title: 'Maître des Économies',
    description: 'Économisez 100€ en total',
    icon: '💸',
    category: 'savings',
    type: 'milestone',
    target: 100,
    reward: { points: 500, badge: '🏆' },
    tier: 'gold'
  },
  {
    id: 'budget_ninja',
    title: 'Ninja du Budget',
    description: 'Restez sous votre budget pendant 5 mois',
    icon: '🥷',
    category: 'savings',
    type: 'streak',
    target: 5,
    reward: { points: 300 },
    tier: 'silver'
  },

  // Waste Reduction Achievements
  {
    id: 'zero_waste_week',
    title: 'Semaine Zéro Déchet',
    description: 'Aucun gaspillage pendant 7 jours',
    icon: '♻️',
    category: 'waste',
    type: 'streak',
    target: 7,
    reward: { points: 200 },
    tier: 'silver'
  },
  {
    id: 'waste_warrior',
    title: 'Guerrier Anti-Gaspillage',
    description: 'Aucun gaspillage pendant 30 jours',
    icon: '🛡️',
    category: 'waste',
    type: 'streak',
    target: 30,
    reward: { points: 1000, badge: '🌱' },
    tier: 'platinum'
  },
  {
    id: 'expiry_tracker',
    title: 'Traqueur de Dates',
    description: 'Consommez 10 produits avant expiration',
    icon: '📅',
    category: 'waste',
    type: 'milestone',
    target: 10,
    reward: { points: 150 },
    tier: 'bronze'
  },

  // Nutrition Achievements
  {
    id: 'balanced_meal',
    title: 'Repas Équilibré',
    description: 'Atteignez un score nutrition de 8/10',
    icon: '🥗',
    category: 'nutrition',
    type: 'milestone',
    target: 8,
    reward: { points: 100 },
    tier: 'bronze'
  },
  {
    id: 'nutrition_expert',
    title: 'Expert Nutrition',
    description: 'Maintenez un score de 9/10 pendant une semaine',
    icon: '🏥',
    category: 'nutrition',
    type: 'streak',
    target: 7,
    reward: { points: 400 },
    tier: 'gold'
  },
  {
    id: 'veggie_lover',
    title: 'Amoureux des Légumes',
    description: 'Cuisinez 20 recettes avec des légumes',
    icon: '🥕',
    category: 'nutrition',
    type: 'milestone',
    target: 20,
    reward: { points: 250 },
    tier: 'silver'
  },

  // Inventory Achievements
  {
    id: 'organized_pantry',
    title: 'Garde-Manger Organisé',
    description: 'Ayez 50 produits en inventaire',
    icon: '📦',
    category: 'inventory',
    type: 'milestone',
    target: 50,
    reward: { points: 200 },
    tier: 'silver'
  },
  {
    id: 'stock_master',
    title: 'Maître du Stock',
    description: 'Gérez un inventaire de 100 produits',
    icon: '🏪',
    category: 'inventory',
    type: 'milestone',
    target: 100,
    reward: { points: 500, badge: '📊' },
    tier: 'gold'
  },

  // Recipes Achievements
  {
    id: 'chef_apprentice',
    title: 'Apprenti Chef',
    description: 'Ajoutez votre première recette',
    icon: '👨‍🍳',
    category: 'recipes',
    type: 'milestone',
    target: 1,
    reward: { points: 50 },
    tier: 'bronze'
  },
  {
    id: 'recipe_collector',
    title: 'Collectionneur de Recettes',
    description: 'Collectionnez 25 recettes',
    icon: '📚',
    category: 'recipes',
    type: 'milestone',
    target: 25,
    reward: { points: 300 },
    tier: 'silver'
  },
  {
    id: 'master_chef',
    title: 'Chef Étoilé',
    description: 'Possédez 50 recettes avec note moyenne de 8+',
    icon: '⭐',
    category: 'recipes',
    type: 'milestone',
    target: 50,
    reward: { points: 800, badge: '👑' },
    tier: 'platinum'
  },

  // Shopping Achievements
  {
    id: 'smart_shopper',
    title: 'Acheteur Intelligent',
    description: 'Utilisez la liste de courses 10 fois',
    icon: '🛒',
    category: 'shopping',
    type: 'milestone',
    target: 10,
    reward: { points: 100 },
    tier: 'bronze'
  },
  {
    id: 'list_master',
    title: 'Maître de la Liste',
    description: 'Complétez 50 listes de courses',
    icon: '✅',
    category: 'shopping',
    type: 'milestone',
    target: 50,
    reward: { points: 400 },
    tier: 'gold'
  }
];

export const useAchievements = () => {
  const { inventory } = useInventory();
  const { shoppingList, getPurchasedCount } = useShoppingList();
  const { recipes } = useRecipes();
  // Removed state to prevent circular updates

  // Calculate current values for achievements
  const currentStats = useMemo(() => ({
    totalSavings: 47.30, // Mock data - would be calculated from actual savings
    zeroWasteDays: 12,
    nutritionScore: 8.5,
    inventoryCount: inventory.length,
    recipesCount: recipes.length,
    shoppingListsCompleted: getPurchasedCount(),
    averageRecipeRating: recipes.length > 0 
      ? recipes.reduce((sum, r) => sum + (r.rating || 7), 0) / recipes.length 
      : 0
  }), [inventory, recipes, getPurchasedCount]);

  // Calculate achievements progress
  const achievements = useMemo((): Achievement[] => {
    return ACHIEVEMENTS_DEFINITIONS.map(achievementDef => {
      let progress = 0;
      let isUnlocked = false;

      // Calculate progress based on achievement type and category
      switch (achievementDef.category) {
        case 'savings':
          if (achievementDef.id === 'first_savings') {
            progress = Math.min(currentStats.totalSavings, 1);
          } else if (achievementDef.id === 'savings_master') {
            progress = Math.min(currentStats.totalSavings, 100);
          } else if (achievementDef.id === 'budget_ninja') {
            progress = 3; // Mock streak data
          }
          break;

        case 'waste':
          if (achievementDef.id.includes('zero_waste') || achievementDef.id === 'waste_warrior') {
            progress = Math.min(currentStats.zeroWasteDays, achievementDef.target);
          } else if (achievementDef.id === 'expiry_tracker') {
            progress = 7; // Mock consumed items before expiry
          }
          break;

        case 'nutrition':
          if (achievementDef.id === 'balanced_meal') {
            progress = Math.min(currentStats.nutritionScore, 8);
          } else if (achievementDef.id === 'nutrition_expert') {
            progress = currentStats.nutritionScore >= 9 ? 7 : 0; // Mock streak
          } else if (achievementDef.id === 'veggie_lover') {
            // Count recipes with vegetables
            const veggieRecipes = recipes.filter(r => 
              r.tags?.some(tag => tag.toLowerCase().includes('légumes') || tag.toLowerCase().includes('vegetable'))
            ).length;
            progress = Math.min(veggieRecipes, 20);
          }
          break;

        case 'inventory':
          progress = Math.min(currentStats.inventoryCount, achievementDef.target);
          break;

        case 'recipes':
          if (achievementDef.id === 'master_chef') {
            const highRatedRecipes = recipes.filter(r => (r.rating || 0) >= 8).length;
            progress = Math.min(highRatedRecipes, 50);
          } else {
            progress = Math.min(currentStats.recipesCount, achievementDef.target);
          }
          break;

        case 'shopping':
          progress = Math.min(currentStats.shoppingListsCompleted, achievementDef.target);
          break;
      }

      isUnlocked = progress >= achievementDef.target;

      return {
        ...achievementDef,
        progress,
        isUnlocked,
        unlockedAt: isUnlocked ? new Date() : undefined
      };
    });
  }, [currentStats, recipes]);

  // Calculate user progress
  const calculatedProgress = useMemo((): UserProgress => {
    const unlockedAchievements = achievements.filter(a => a.isUnlocked);
    const totalPoints = unlockedAchievements.reduce((sum, a) => sum + a.reward.points, 0);
    
    // Level calculation (every 500 points = 1 level)
    const level = Math.floor(totalPoints / 500) + 1;
    const currentLevelPoints = totalPoints % 500;
    const nextLevelPoints = 500;

    return {
      totalPoints,
      level,
      nextLevelPoints,
      currentLevelPoints,
      unlockedAchievements: unlockedAchievements.length,
      currentStreak: { type: 'zero_waste', days: currentStats.zeroWasteDays }
    };
  }, [achievements, currentStats.zeroWasteDays]);

  // Recent achievements (unlocked in last 7 days)
  const recentAchievements = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return achievements.filter(a => 
      a.isUnlocked && a.unlockedAt && a.unlockedAt > weekAgo
    ).slice(0, 3);
  }, [achievements]);

  // Next milestone
  const nextMilestone = useMemo(() => {
    const lockedAchievements = achievements
      .filter(a => !a.isUnlocked)
      .sort((a, b) => (a.progress / a.target) - (b.progress / b.target));
    
    return lockedAchievements[0] || null;
  }, [achievements]);

  // Mock leaderboard data
  const leaderboard: Leaderboard = useMemo(() => ({
    family: [
      { id: '1', name: 'Papa', points: 1250, achievements: 8, avatar: '👨' },
      { id: '2', name: 'Maman', points: 1180, achievements: 7, avatar: '👩' },
      { id: '3', name: 'Vous', points: calculatedProgress.totalPoints, achievements: calculatedProgress.unlockedAchievements, avatar: '🧑' },
      { id: '4', name: 'Julie', points: 850, achievements: 5, avatar: '👧' }
    ].sort((a, b) => b.points - a.points),
    friends: [
      { id: '5', name: 'Marie', points: 1400, achievements: 9, avatar: '👩' },
      { id: '6', name: 'Thomas', points: 1100, achievements: 6, avatar: '👨' },
      { id: '7', name: 'Sophie', points: 950, achievements: 7, avatar: '👩' }
    ].sort((a, b) => b.points - a.points)
  }), [calculatedProgress]);

  // Utiliser directement calculatedProgress
  const userProgress = calculatedProgress;

  return {
    achievements,
    userProgress,
    recentAchievements,
    nextMilestone,
    leaderboard,
    loading: false // Since we're using mock data primarily
  };
};