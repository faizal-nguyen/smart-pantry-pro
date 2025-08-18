import { useState, useEffect, useMemo } from 'react';
import { useInventory } from './useInventory';
import { useShoppingList } from './useShoppingList';
import { useRecipes } from './useRecipes';
import { supabase } from '@/integrations/supabase/client';

export interface KeyMetric {
  id: string;
  title: string;
  value: string | number;
  trend?: string;
  icon: string;
  color: 'green' | 'blue' | 'purple' | 'orange' | 'red';
  detail?: string;
  progress?: number;
  achievement?: boolean;
  streak?: boolean;
}

export interface SpendingTrend {
  month: string;
  amount: number;
  budget?: number;
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface NutritionBalance {
  dimension: string;
  value: number;
  target: number;
}

export interface InsightsData {
  keyMetrics: KeyMetric[];
  spendingTrends: SpendingTrend[];
  categoryBreakdown: CategorySpending[];
  nutritionBalance: NutritionBalance[];
  wasteReductionDays: number;
  totalSavings: number;
  nutritionScore: number;
}

const CATEGORY_COLORS = {
  'Fruits et légumes': '#10B981',
  'Viandes et poissons': '#EF4444',
  'Produits laitiers': '#3B82F6',
  'Féculents': '#F59E0B',
  'Épices et condiments': '#8B5CF6',
  'Boissons': '#06B6D4',
  'Snacks': '#F97316',
  'Autres': '#6B7280'
};

export const useInsightsData = () => {
  const { inventory } = useInventory();
  const { shoppingList, getTotalEstimatedCost } = useShoppingList();
  const { recipes } = useRecipes();
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastMonthSpending, setLastMonthSpending] = useState(0);

  // Fetch historical spending data
  const fetchHistoricalData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Simulate historical spending data for demo
      // In a real app, you'd fetch this from purchase history
      const mockData = [
        { month: 'Jan', amount: 420, budget: 500 },
        { month: 'Fév', amount: 380, budget: 500 },
        { month: 'Mar', amount: 450, budget: 500 },
        { month: 'Avr', amount: 320, budget: 500 },
        { month: 'Mai', amount: 280, budget: 500 },
        { month: 'Juin', amount: 347, budget: 500 },
      ];

      setHistoricalData(mockData);
      setLastMonthSpending(mockData[mockData.length - 2]?.amount || 380);
    } catch (error) {
      console.error('Error fetching historical data:', error);
    }
  };

  // Calculate savings based on shopping list vs last month
  const calculateSavings = useMemo(() => {
    const currentBudget = getTotalEstimatedCost();
    const savings = lastMonthSpending - currentBudget;
    const trendPercentage = lastMonthSpending > 0 ? ((savings / lastMonthSpending) * 100) : 0;
    
    return {
      amount: Math.max(0, savings),
      trend: trendPercentage > 0 ? `+${trendPercentage.toFixed(1)}%` : `${trendPercentage.toFixed(1)}%`
    };
  }, [getTotalEstimatedCost, lastMonthSpending]);

  // Calculate waste reduction streak
  const calculateWasteReduction = useMemo(() => {
    const today = new Date();
    const inventoryWithExpiry = inventory.filter(item => item.expiry_date);
    
    // Count items that haven't expired yet but are close
    const itemsNearExpiry = inventoryWithExpiry.filter(item => {
      const expiryDate = new Date(item.expiry_date!);
      const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysToExpiry >= 0 && daysToExpiry <= 7;
    });

    // Simulate zero waste streak (in a real app, track actual waste events)
    const zeroWasteDays = 12; // Mock data
    
    return {
      days: zeroWasteDays,
      nearExpiryCount: itemsNearExpiry.length
    };
  }, [inventory]);

  // Calculate nutrition score based on recipes
  const calculateNutritionScore = useMemo(() => {
    if (recipes.length === 0) return 7.5; // Default score

    // Simple scoring based on meal variety and ratings
    const avgRating = recipes.reduce((sum, recipe) => sum + (recipe.rating || 7), 0) / recipes.length;
    const varietyBonus = Math.min(recipes.length / 10, 1) * 2; // Bonus for having more recipes
    
    const score = Math.min(10, avgRating + varietyBonus);
    return score;
  }, [recipes]);

  // Calculate category breakdown
  const calculateCategoryBreakdown = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    const totalAmount = getTotalEstimatedCost();

    shoppingList.forEach(item => {
      const category = item.product?.category || 'Autres';
      const amount = (item.estimated_price || 0) * item.quantity;
      categoryTotals[category] = (categoryTotals[category] || 0) + amount;
    });

    return Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS['Autres']
    })).sort((a, b) => b.amount - a.amount);
  }, [shoppingList, getTotalEstimatedCost]);

  // Calculate nutrition balance
  const calculateNutritionBalance = useMemo(() => {
    // Mock nutrition data based on recipes
    // In a real app, you'd analyze recipe nutrition data
    return [
      { dimension: 'Protéines', value: 85, target: 100 },
      { dimension: 'Glucides', value: 70, target: 100 },
      { dimension: 'Lipides', value: 60, target: 100 },
      { dimension: 'Fibres', value: 90, target: 100 },
      { dimension: 'Vitamines', value: 75, target: 100 }
    ];
  }, [recipes]);

  // Generate key metrics
  const keyMetrics = useMemo((): KeyMetric[] => {
    const savings = calculateSavings;
    const wasteReduction = calculateWasteReduction;
    const nutritionScore = calculateNutritionScore;

    return [
      {
        id: 'savings',
        title: 'Économies ce mois',
        value: `${savings.amount.toFixed(2)}€`,
        trend: savings.trend,
        icon: '💰',
        color: 'green',
        detail: 'vs mois dernier'
      },
      {
        id: 'waste-reduction',
        title: 'Zéro gaspillage',
        value: `${wasteReduction.days} jours`,
        achievement: wasteReduction.days >= 7,
        icon: '♻️',
        color: 'blue',
        streak: true,
        detail: `${wasteReduction.nearExpiryCount} produits à surveiller`
      },
      {
        id: 'nutrition-score',
        title: 'Score nutrition',
        value: `${nutritionScore.toFixed(1)}/10`,
        progress: nutritionScore * 10,
        icon: '🥗',
        color: 'purple',
        detail: 'Basé sur vos recettes'
      },
      {
        id: 'inventory-value',
        title: 'Valeur inventaire',
        value: `${inventory.length} produits`,
        icon: '📦',
        color: 'orange',
        detail: 'En stock'
      }
    ];
  }, [calculateSavings, calculateWasteReduction, calculateNutritionScore, inventory.length]);

  // Generate insights data
  const insightsData = useMemo((): InsightsData => ({
    keyMetrics,
    spendingTrends: historicalData,
    categoryBreakdown: calculateCategoryBreakdown,
    nutritionBalance: calculateNutritionBalance,
    wasteReductionDays: calculateWasteReduction.days,
    totalSavings: calculateSavings.amount,
    nutritionScore: calculateNutritionScore
  }), [
    keyMetrics,
    historicalData,
    calculateCategoryBreakdown,
    calculateNutritionBalance,
    calculateWasteReduction.days,
    calculateSavings.amount,
    calculateNutritionScore
  ]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchHistoricalData();
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    insightsData,
    loading,
    refetch: fetchHistoricalData
  };
};