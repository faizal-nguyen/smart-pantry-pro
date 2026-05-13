import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MaterialCard, MaterialCardContent, MaterialCardHeader } from '@/components/ui/material/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MaterialButton } from '@/components/ui/material/Button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  BarChart3,
  TrendingUp,
  Download,
  Share2,
  RefreshCw,
  Calendar,
  Filter
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

  // PRP-229 Commit 4: removed the hardcoded "smartInsights" sidebar
  // (3 marketing cards "Optimisez vos achats", "Réduisez le gaspillage",
  // "Atteignez votre objectif nutrition" with fabricated numbers).
  // A real insight engine should land before re-enabling this surface.

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