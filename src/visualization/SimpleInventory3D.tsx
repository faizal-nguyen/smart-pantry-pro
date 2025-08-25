/**
 * Simple 3D Inventory Visualization
 * A clean, practical 3D view for food inventory management
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  Refrigerator, 
  Archive, 
  AlertCircle,
  Zap,
  Droplet,
  Apple,
  Wheat,
  TrendingUp,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expirationDate: Date;
  freshness: number;
  nutritionalValue: {
    vitamins: number;
    minerals: number;
    fiber?: number;
  };
  location: {
    zone: string;
    x: number;
    y: number;
    z: number;
  };
}

interface SimpleInventory3DProps {
  inventoryData: InventoryItem[];
  userId: string;
  className?: string;
}

export const SimpleInventory3D: React.FC<SimpleInventory3DProps> = ({
  inventoryData,
  userId,
  className = ''
}) => {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [view, setView] = useState<'overview' | 'zones' | 'freshness'>('overview');

  // Group items by location
  const itemsByZone = inventoryData.reduce((acc, item) => {
    const zone = item.location.zone || 'Autres';
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  // Calculate zone stats
  const zoneStats = Object.entries(itemsByZone).map(([zone, items]) => {
    const totalItems = items.length;
    const avgFreshness = items.reduce((sum, item) => sum + item.freshness, 0) / totalItems;
    const expiringCount = items.filter(item => {
      const daysUntilExpiry = Math.ceil((item.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 3;
    }).length;

    return {
      zone,
      totalItems,
      avgFreshness: Math.round(avgFreshness * 100),
      expiringCount,
      icon: zone === 'frigo' ? Refrigerator : zone === 'congélateur' ? Package : Archive
    };
  });

  // Calculate overall stats
  const totalProducts = inventoryData.length;
  const avgOverallFreshness = Math.round(
    inventoryData.reduce((sum, item) => sum + item.freshness, 0) / totalProducts * 100
  ) || 0;
  const productsExpiringCount = inventoryData.filter(item => {
    const daysUntilExpiry = Math.ceil((item.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7;
  }).length;

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Vue d'ensemble de l'inventaire</h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant={view === 'overview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('overview')}
            >
              Vue générale
            </Button>
            <Button
              variant={view === 'zones' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('zones')}
            >
              Par zones
            </Button>
            <Button
              variant={view === 'freshness' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('freshness')}
            >
              Fraîcheur
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 bg-gray-50">
        {view === 'overview' && (
          <div className="space-y-4">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total produits</p>
                      <p className="text-3xl font-bold mt-1">{totalProducts}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Répartis dans {Object.keys(itemsByZone).length} zones
                      </p>
                    </div>
                    <Package className="w-8 h-8 text-primary opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Fraîcheur moyenne</p>
                      <p className="text-3xl font-bold mt-1">{avgOverallFreshness}%</p>
                      <Progress value={avgOverallFreshness} className="mt-2" />
                    </div>
                    <Droplet className="w-8 h-8 text-blue-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">À consommer</p>
                      <p className="text-3xl font-bold mt-1 text-orange-600">{productsExpiringCount}</p>
                      <p className="text-xs text-muted-foreground mt-1">Dans les 7 jours</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-orange-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Zone Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Répartition par zone de stockage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {zoneStats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <motion.div
                        key={stat.zone}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                        whileHover={{ scale: 1.02 }}
                        onClick={() => {
                          setSelectedZone(stat.zone);
                          setView('zones');
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium capitalize">{stat.zone}</p>
                            <p className="text-sm text-muted-foreground">
                              {stat.totalItems} produit{stat.totalItems > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {stat.expiringCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {stat.expiringCount} expire{stat.expiringCount > 1 ? 'nt' : ''}
                            </Badge>
                          )}
                          <div className="text-right">
                            <p className="text-sm font-medium">{stat.avgFreshness}%</p>
                            <p className="text-xs text-muted-foreground">fraîcheur</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Nutritional Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Valeur nutritionnelle globale</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                      <Apple className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-sm font-medium">Vitamines</p>
                    <p className="text-2xl font-bold text-green-600">
                      {Math.round(inventoryData.reduce((sum, item) => sum + item.nutritionalValue.vitamins, 0) / totalProducts) || 0}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                      <Zap className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium">Minéraux</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {Math.round(inventoryData.reduce((sum, item) => sum + item.nutritionalValue.minerals, 0) / totalProducts) || 0}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-2">
                      <Wheat className="w-6 h-6 text-amber-600" />
                    </div>
                    <p className="text-sm font-medium">Fibres</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {Math.round(inventoryData.reduce((sum, item) => sum + (item.nutritionalValue.fiber || 0), 0) / totalProducts) || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {view === 'zones' && (
          <div className="space-y-4">
            {/* Zone selector */}
            <div className="flex gap-2 flex-wrap">
              {Object.keys(itemsByZone).map(zone => (
                <Button
                  key={zone}
                  variant={selectedZone === zone ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedZone(zone)}
                  className="capitalize"
                >
                  {zone} ({itemsByZone[zone].length})
                </Button>
              ))}
            </div>

            {/* Zone details */}
            {selectedZone && itemsByZone[selectedZone] && (
              <Card>
                <CardHeader>
                  <CardTitle className="capitalize">{selectedZone}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {itemsByZone[selectedZone].map(item => {
                      const daysUntilExpiry = Math.ceil((item.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} {item.unit}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={item.freshness * 100} className="w-20" />
                            {daysUntilExpiry <= 3 && (
                              <Badge variant="destructive" className="text-xs">
                                {daysUntilExpiry}j
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {view === 'freshness' && (
          <div className="space-y-4">
            {/* Freshness categories */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-green-800 mb-2">Très frais</h3>
                  <p className="text-3xl font-bold text-green-600">
                    {inventoryData.filter(item => item.freshness > 0.7).length}
                  </p>
                  <p className="text-sm text-green-600 mt-1">Produits &gt; 70% fraîcheur</p>
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-amber-800 mb-2">À surveiller</h3>
                  <p className="text-3xl font-bold text-amber-600">
                    {inventoryData.filter(item => item.freshness > 0.3 && item.freshness <= 0.7).length}
                  </p>
                  <p className="text-sm text-amber-600 mt-1">30-70% fraîcheur</p>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-red-800 mb-2">À consommer rapidement</h3>
                  <p className="text-3xl font-bold text-red-600">
                    {inventoryData.filter(item => item.freshness <= 0.3).length}
                  </p>
                  <p className="text-sm text-red-600 mt-1">&lt; 30% fraîcheur</p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed freshness list */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Produits par fraîcheur</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {inventoryData
                    .sort((a, b) => a.freshness - b.freshness)
                    .slice(0, 10)
                    .map(item => {
                      const freshnessPercent = Math.round(item.freshness * 100);
                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">{item.location.zone}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Progress 
                              value={freshnessPercent} 
                              className={cn(
                                "w-24",
                                freshnessPercent > 70 && "[&>div]:bg-green-500",
                                freshnessPercent > 30 && freshnessPercent <= 70 && "[&>div]:bg-amber-500",
                                freshnessPercent <= 30 && "[&>div]:bg-red-500"
                              )}
                            />
                            <span className={cn(
                              "text-sm font-medium w-12 text-right",
                              freshnessPercent > 70 && "text-green-600",
                              freshnessPercent > 30 && freshnessPercent <= 70 && "text-amber-600",
                              freshnessPercent <= 30 && "text-red-600"
                            )}>
                              {freshnessPercent}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleInventory3D;