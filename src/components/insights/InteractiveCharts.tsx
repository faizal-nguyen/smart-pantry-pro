import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Download,
  Share,
  Calendar,
  Filter,
  BarChart3
} from 'lucide-react';
import { 
  LineChartData, 
  DonutChartData, 
  RadarChartData,
  TrendChartData 
} from '@/hooks/useChartData';
import { cn } from '@/lib/utils';

interface SpendingTrendsChartProps {
  data: LineChartData[];
  className?: string;
}

interface CategoryBreakdownChartProps {
  data: DonutChartData[];
  className?: string;
}

interface NutritionRadarChartProps {
  data: RadarChartData[];
  className?: string;
}

interface CombinedTrendsChartProps {
  data: TrendChartData[];
  className?: string;
}

// Custom Tooltip Components
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border"
      >
        <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {`${entry.dataKey}: ${entry.value}${entry.dataKey.includes('percentage') ? '%' : '€'}`}
          </p>
        ))}
      </motion.div>
    );
  }
  return null;
};

// Empty state shown when chart data is empty/invalid. Avoids feeding
// recharts an empty dataset, which generates `<path d="Z">` and triggers
// SVG console warnings in browsers.
const EmptyChartState: React.FC<{ message?: string }> = ({
  message = 'Pas encore de données à afficher',
}) => (
  <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
    <BarChart3 className="h-10 w-10 mb-2 opacity-50" aria-hidden="true" />
    <p className="text-sm">{message}</p>
  </div>
);

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border"
      >
        <p className="font-medium text-gray-900 dark:text-gray-100">{data.name}</p>
        <p className="text-sm" style={{ color: data.color }}>
          {`Montant: ${data.value.toFixed(2)}€`}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {`${data.percentage.toFixed(1)}% du total`}
        </p>
      </motion.div>
    );
  }
  return null;
};

// Spending Trends Chart
export const SpendingTrendsChart: React.FC<SpendingTrendsChartProps> = ({ 
  data, 
  className 
}) => {
  const [period, setPeriod] = useState<'6m' | '1y' | '2y'>('6m');

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Tendances des Dépenses</CardTitle>
        <div className="flex items-center gap-2">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="6m" className="text-xs">6M</TabsTrigger>
              <TabsTrigger value="1y" className="text-xs">1A</TabsTrigger>
              <TabsTrigger value="2y" className="text-xs">2A</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="ghost" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {!data || data.length === 0 ? (
            <EmptyChartState message="Aucune dépense enregistrée pour cette période" />
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="name" 
                className="text-xs fill-gray-600 dark:fill-gray-400"
              />
              <YAxis 
                className="text-xs fill-gray-600 dark:fill-gray-400"
                tickFormatter={(value) => `${value}€`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#spendingGradient)"
                name="Dépenses"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="budget"
                stroke="#10B981"
                fillOpacity={1}
                fill="url(#budgetGradient)"
                name="Budget"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>
          )}
        </div>
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-green-500" />
            <span>-12% vs mois dernier</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            Économies: 47,30€
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

// Category Breakdown Chart
export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({ 
  data, 
  className 
}) => {
  const [activeIndex, setActiveIndex] = useState<number | undefined>();

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Répartition par Catégorie</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Share className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {!data || data.length === 0 ? (
            <EmptyChartState message="Aucune catégorie à afficher pour le moment" />
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    stroke={activeIndex === index ? "#fff" : "none"}
                    strokeWidth={activeIndex === index ? 2 : 0}
                    style={{
                      filter: activeIndex === index ? "brightness(1.1)" : "none",
                      transform: activeIndex === index ? "scale(1.05)" : "scale(1)",
                      transformOrigin: "center",
                      transition: "all 0.2s ease"
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {data.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-2 text-sm"
            >
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-700 dark:text-gray-300 truncate">
                {item.name}
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-auto">
                {item.percentage.toFixed(1)}%
              </span>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Nutrition Radar Chart
export const NutritionRadarChart: React.FC<NutritionRadarChartProps> = ({ 
  data, 
  className 
}) => {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Équilibre Nutritionnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {!data || data.length === 0 ? (
            <EmptyChartState message="Aucune donnée nutritionnelle disponible" />
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data}>
              <PolarGrid className="opacity-30" />
              <PolarAngleAxis 
                dataKey="dimension" 
                className="text-xs fill-gray-600 dark:fill-gray-400"
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]}
                tick={false}
              />
              <Radar
                name="Score Actuel"
                dataKey="value"
                stroke="#8B5CF6"
                fill="#8B5CF6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Radar
                name="Objectif"
                dataKey="target"
                stroke="#10B981"
                fill="none"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {((data.reduce((sum, item) => sum + item.percentage, 0) / data.length) || 0).toFixed(1)}%
            </div>
            <div className="text-gray-600 dark:text-gray-400">Score Global</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {data.filter(item => item.percentage >= 80).length}/{data.length}
            </div>
            <div className="text-gray-600 dark:text-gray-400">Objectifs Atteints</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Combined Trends Chart
export const CombinedTrendsChart: React.FC<CombinedTrendsChartProps> = ({ 
  data, 
  className 
}) => {
  const [viewType, setViewType] = useState<'bar' | 'line'>('bar');

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Analyse Complète</CardTitle>
        <div className="flex items-center gap-2">
          <Tabs value={viewType} onValueChange={(v) => setViewType(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="bar" className="text-xs">Barres</TabsTrigger>
              <TabsTrigger value="line" className="text-xs">Lignes</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="ghost" size="sm">
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {!data || data.length === 0 ? (
            <EmptyChartState message="Pas encore assez de données pour cette analyse" />
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            {viewType === 'bar' ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="period" 
                  className="text-xs fill-gray-600 dark:fill-gray-400"
                />
                <YAxis 
                  className="text-xs fill-gray-600 dark:fill-gray-400"
                  tickFormatter={(value) => `${value}€`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="spending" 
                  fill="#3B82F6" 
                  name="Dépenses"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="budget" 
                  fill="#10B981" 
                  name="Budget"
                  radius={[2, 2, 0, 0]}
                />
                <Bar 
                  dataKey="savings" 
                  fill="#F59E0B" 
                  name="Économies"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            ) : (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="period" 
                  className="text-xs fill-gray-600 dark:fill-gray-400"
                />
                <YAxis 
                  className="text-xs fill-gray-600 dark:fill-gray-400"
                  tickFormatter={(value) => `${value}€`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="spending" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  name="Dépenses"
                  dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="budget" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  strokeDasharray="8 8"
                  name="Budget"
                  dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="savings"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  name="Économies"
                  dot={{ fill: "#F59E0B", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-4 text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-gray-600 dark:text-gray-400">
                Économies en hausse
              </span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            Mise à jour: {new Date().toLocaleDateString('fr-FR')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};