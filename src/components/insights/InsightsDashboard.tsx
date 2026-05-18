import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MaterialCard, MaterialCardContent, MaterialCardHeader } from '@/components/ui/material/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MaterialButton } from '@/components/ui/material/Button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  BarChart3,
  TrendingUp,
  Download,
  Share2,
  RefreshCw,
  Calendar,
  Filter,
  Target,
  Lightbulb,
  Bell
} from 'lucide-react';

import { AnimatedMetricCard } from './AnimatedMetricCard';
import { 
  SpendingTrendsChart, 
  CategoryBreakdownChart, 
  NutritionRadarChart, 
  CombinedTrendsChart 
} from './InteractiveCharts';

import { useInsightsData } from '@/hooks/useInsightsData';
import { useChartData } from '@/hooks/useChartData';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface InsightsDashboardProps {
  className?: string;
}

interface InsightCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: () => void;
  actionLabel?: string;
}

const InsightCard: React.FC<InsightCardProps> = ({ 
  title, 
  description, 
  icon, 
  action, 
  actionLabel 
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02 }}
    className="cursor-pointer"
  >
    <MaterialCard variant="elevated" interactive className="h-full transition-all duration-200">
      <MaterialCardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">{icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">
              {title}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {description}
            </p>
            {action && actionLabel && (
              <MaterialButton 
                variant="text" 
                size="sm" 
                className="h-6 px-2 mt-2 text-xs"
                onClick={action}
              >
                {actionLabel}
              </MaterialButton>
            )}
          </div>
        </div>
      </MaterialCardContent>
    </MaterialCard>
  </motion.div>
);

export const InsightsDashboard: React.FC<InsightsDashboardProps> = ({ className }) => {
  const { insightsData, loading: insightsLoading, refetch: refetchInsights } = useInsightsData();
  const {
    spendingTrendsData,
    categoryBreakdownData,
    nutritionBalanceData,
    combinedTrendsData,
    formatCurrency
  } = useChartData();

  const [activeTab, setActiveTab] = useState<'overview' | 'charts'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Handle data refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchInsights();
      toast({
        title: "Données actualisées",
        description: "Vos insights ont été mis à jour avec succès."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'actualiser les données."
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Handle export functionality
  const handleExport = () => {
    // Mock export functionality
    toast({
      title: "Export en cours",
      description: "Vos données seront téléchargées dans un moment."
    });
  };

  // Handle share functionality
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Mes Insights Smart Pantry',
          text: `J'ai économisé ${formatCurrency(insightsData.totalSavings)} ce mois avec Smart Pantry Pro!`,
          url: window.location.href
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(
          `J'ai économisé ${formatCurrency(insightsData.totalSavings)} ce mois avec Smart Pantry Pro! ${window.location.href}`
        );
        toast({
          title: "Lien copié",
          description: "Le lien a été copié dans votre presse-papiers."
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de partager vos insights."
      });
    }
  };

  // Generate smart insights based on data
  const smartInsights = [
    {
      title: "Optimisez vos achats de légumes",
      description: "Vous pourriez économiser 15€/mois en achetant vos légumes au marché local.",
      icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
      action: () => {},
      actionLabel: "Voir les conseils"
    },
    {
      title: "Réduisez le gaspillage",
      description: "3 produits expirent bientôt. Planifiez vos repas pour les utiliser.",
      icon: <Bell className="h-5 w-5 text-red-500" />,
      action: () => {},
      actionLabel: "Voir les produits"
    },
    {
      title: "Atteignez votre objectif nutrition",
      description: "Ajoutez 2 portions de légumes pour atteindre votre objectif quotidien.",
      icon: <Target className="h-5 w-5 text-green-500" />,
      action: () => {},
      actionLabel: "Voir les recettes"
    }
  ];

  if (insightsLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">Chargement de vos insights...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Insights Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Découvrez vos habitudes alimentaires et vos économies
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <MaterialButton 
            variant="outlined" 
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            icon={<RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />}
          >
            Actualiser
          </MaterialButton>
          <MaterialButton 
            variant="outlined" 
            size="sm" 
            onClick={handleExport}
            icon={<Download className="h-4 w-4" />}
          >
            Exporter
          </MaterialButton>
          <MaterialButton 
            variant="outlined" 
            size="sm" 
            onClick={handleShare}
            icon={<Share2 className="h-4 w-4" />}
          >
            Partager
          </MaterialButton>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {insightsData.keyMetrics.map((metric, index) => (
          <motion.div
            key={metric.id || `metric-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.1 }}
          >
            <AnimatedMetricCard metric={metric} />
          </motion.div>
        ))}
      </motion.div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analyses
            </TabsTrigger>
          </TabsList>
          
          <Badge variant="outline" className="text-xs">
            Mis à jour: {new Date().toLocaleDateString('fr-FR')}
          </Badge>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <TabsContent key="overview-content" value="overview" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                {/* Main Charts */}
                <div className="lg:col-span-2 space-y-6">
                  <SpendingTrendsChart data={spendingTrendsData} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CategoryBreakdownChart data={categoryBreakdownData} />
                    <NutritionRadarChart data={nutritionBalanceData} />
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Smart Insights */}
                  <MaterialCard variant="elevated">
                    <MaterialCardHeader>
                      <div className="text-lg font-semibold">Insights Intelligents</div>
                    </MaterialCardHeader>
                    <MaterialCardContent>
                      <ScrollArea className="h-80">
                        <div className="space-y-3">
                          {smartInsights.map((insight, index) => (
                            <motion.div
                              key={`insight-${index}`}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <InsightCard {...insight} />
                            </motion.div>
                          ))}
                        </div>
                      </ScrollArea>
                    </MaterialCardContent>
                  </MaterialCard>

                  {/* Recent Achievements */}
                  {recentAchievements.length > 0 && (
                    <MaterialCard variant="elevated">
                      <MaterialCardHeader>
                        <div className="text-lg font-semibold">Derniers Succès</div>
                      </MaterialCardHeader>
                      <MaterialCardContent>
                        <div className="space-y-3">
                          {recentAchievements.slice(0, 2).map((achievement, index) => (
                            <motion.div
                              key={achievement.id || `achievement-${index}`}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                            >
                              <div className="text-2xl">{achievement.icon}</div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-green-800 dark:text-green-400">
                                  {achievement.title}
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-500">
                                  +{achievement.reward.points} points
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </MaterialCardContent>
                    </MaterialCard>
                  )}
                </div>
              </motion.div>
            </TabsContent>
          )}

          {activeTab === 'charts' && (
            <TabsContent key="charts-content" value="charts" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <CombinedTrendsChart data={combinedTrendsData} />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SpendingTrendsChart data={spendingTrendsData} />
                  <CategoryBreakdownChart data={categoryBreakdownData} />
                </div>
                
                <NutritionRadarChart data={nutritionBalanceData} />
              </motion.div>
            </TabsContent>
          )}

        </AnimatePresence>
      </Tabs>
    </div>
  );
};