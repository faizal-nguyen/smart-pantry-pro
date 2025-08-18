import { useMemo } from 'react';
import { useInsightsData } from './useInsightsData';

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
  [key: string]: any;
}

export interface LineChartData extends ChartDataPoint {
  budget?: number;
  trend?: number;
}

export interface DonutChartData extends ChartDataPoint {
  percentage: number;
}

export interface RadarChartData {
  dimension: string;
  value: number;
  target: number;
  percentage: number;
}

export interface TrendChartData {
  period: string;
  savings: number;
  spending: number;
  budget: number;
}

export interface ChartConfig {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    [key: string]: string;
  };
  gradients: {
    [key: string]: {
      from: string;
      to: string;
    };
  };
}

const CHART_CONFIG: ChartConfig = {
  colors: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#06B6D4',
    purple: '#8B5CF6',
    orange: '#F97316',
    pink: '#EC4899',
    indigo: '#6366F1'
  },
  gradients: {
    savings: { from: '#10B981', to: '#059669' },
    spending: { from: '#3B82F6', to: '#1D4ED8' },
    nutrition: { from: '#8B5CF6', to: '#7C3AED' },
    waste: { from: '#06B6D4', to: '#0891B2' }
  }
};

export const useChartData = () => {
  const { insightsData, loading } = useInsightsData();

  // Spending trends for line chart
  const spendingTrendsData = useMemo((): LineChartData[] => {
    return insightsData.spendingTrends.map(trend => ({
      name: trend.month,
      value: trend.amount,
      budget: trend.budget,
      color: CHART_CONFIG.colors.primary
    }));
  }, [insightsData.spendingTrends]);

  // Category breakdown for donut chart
  const categoryBreakdownData = useMemo((): DonutChartData[] => {
    return insightsData.categoryBreakdown.map(category => ({
      name: category.category,
      value: category.amount,
      percentage: category.percentage,
      color: category.color
    }));
  }, [insightsData.categoryBreakdown]);

  // Nutrition balance for radar chart
  const nutritionBalanceData = useMemo((): RadarChartData[] => {
    return insightsData.nutritionBalance.map(nutrition => ({
      dimension: nutrition.dimension,
      value: nutrition.value,
      target: nutrition.target,
      percentage: (nutrition.value / nutrition.target) * 100
    }));
  }, [insightsData.nutritionBalance]);

  // Combined trends data for advanced charts
  const combinedTrendsData = useMemo((): TrendChartData[] => {
    return insightsData.spendingTrends.map((trend, index) => {
      const previousAmount = index > 0 ? insightsData.spendingTrends[index - 1].amount : trend.amount;
      const savings = Math.max(0, previousAmount - trend.amount);
      
      return {
        period: trend.month,
        savings,
        spending: trend.amount,
        budget: trend.budget || 500
      };
    });
  }, [insightsData.spendingTrends]);

  // Waste reduction timeline
  const wasteReductionTimeline = useMemo(() => {
    const days = [];
    const currentDate = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);
      
      // Mock waste data - 0 means no waste, positive numbers mean items wasted
      const wasteCount = Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0;
      
      days.push({
        name: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        value: wasteCount,
        color: wasteCount === 0 ? CHART_CONFIG.colors.success : CHART_CONFIG.colors.danger,
        fullDate: date.toLocaleDateString('fr-FR')
      });
    }
    
    return days;
  }, []);

  // Monthly comparison data
  const monthlyComparisonData = useMemo(() => {
    const currentMonth = insightsData.spendingTrends[insightsData.spendingTrends.length - 1];
    const previousMonth = insightsData.spendingTrends[insightsData.spendingTrends.length - 2];
    
    if (!currentMonth || !previousMonth) return [];

    return [
      {
        category: 'Dépenses',
        current: currentMonth.amount,
        previous: previousMonth.amount,
        change: ((currentMonth.amount - previousMonth.amount) / previousMonth.amount) * 100
      },
      {
        category: 'Budget',
        current: currentMonth.budget || 500,
        previous: previousMonth.budget || 500,
        change: 0
      },
      {
        category: 'Économies',
        current: Math.max(0, (currentMonth.budget || 500) - currentMonth.amount),
        previous: Math.max(0, (previousMonth.budget || 500) - previousMonth.amount),
        change: 0
      }
    ];
  }, [insightsData.spendingTrends]);

  // Nutrition score over time
  const nutritionScoreTimeline = useMemo(() => {
    // Mock timeline data for nutrition score
    return [
      { week: 'S1', score: 7.2, target: 8.0 },
      { week: 'S2', score: 7.8, target: 8.0 },
      { week: 'S3', score: 8.1, target: 8.0 },
      { week: 'S4', score: 8.5, target: 8.0 }
    ];
  }, []);

  // Format currency values
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  // Format percentage values
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  // Get color by category
  const getCategoryColor = (category: string, alpha = 1): string => {
    const colorMap: Record<string, string> = {
      'Fruits et légumes': CHART_CONFIG.colors.success,
      'Viandes et poissons': CHART_CONFIG.colors.danger,
      'Produits laitiers': CHART_CONFIG.colors.info,
      'Féculents': CHART_CONFIG.colors.warning,
      'Épices et condiments': CHART_CONFIG.colors.purple,
      'Boissons': CHART_CONFIG.colors.info,
      'Snacks': CHART_CONFIG.colors.orange,
      'Autres': CHART_CONFIG.colors.secondary
    };
    
    const color = colorMap[category] || CHART_CONFIG.colors.secondary;
    
    if (alpha < 1) {
      // Convert hex to rgba
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    return color;
  };

  // Chart animations configuration
  const animationConfig = {
    duration: 800,
    easing: 'easeInOutQuart',
    delay: (index: number) => index * 100
  };

  return {
    // Processed data
    spendingTrendsData,
    categoryBreakdownData,
    nutritionBalanceData,
    combinedTrendsData,
    wasteReductionTimeline,
    monthlyComparisonData,
    nutritionScoreTimeline,
    
    // Configuration
    chartConfig: CHART_CONFIG,
    animationConfig,
    
    // Utilities
    formatCurrency,
    formatPercentage,
    getCategoryColor,
    
    // States
    loading
  };
};