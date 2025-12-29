"use client";

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Zap, 
  Clock, 
  Database, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { contextualPerformanceOptimizer } from '@/services/context/PerformanceOptimizer';

interface PerformanceMonitorProps {
  className?: string;
  refreshInterval?: number;
  showDetailedMetrics?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  className,
  refreshInterval = 5000,
  showDetailedMetrics = false
}) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadMetrics();
    
    const interval = setInterval(() => {
      if (!isLoading) {
        loadMetrics();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, isLoading]);

  const loadMetrics = async () => {
    try {
      const currentMetrics = contextualPerformanceOptimizer.getMetrics();
      setMetrics(currentMetrics);
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    }
  };

  const handleOptimize = async () => {
    setIsLoading(true);
    try {
      contextualPerformanceOptimizer.optimize();
      await loadMetrics();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = () => {
    contextualPerformanceOptimizer.invalidateCache();
    loadMetrics();
  };

  if (!metrics) {
    return (
      <Card className={cn("performance-monitor", className)}>
        <CardContent className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          <span className="ml-2 text-sm">Chargement métriques...</span>
        </CardContent>
      </Card>
    );
  }

  const getPerformanceStatus = () => {
    if (metrics.cacheHitRatio > 0.8 && metrics.averageResponseTime < 2000) {
      return { status: 'excellent', color: 'text-green-600', icon: CheckCircle };
    }
    if (metrics.cacheHitRatio > 0.6 && metrics.averageResponseTime < 4000) {
      return { status: 'good', color: 'text-blue-600', icon: TrendingUp };
    }
    if (metrics.cacheHitRatio > 0.4 && metrics.averageResponseTime < 8000) {
      return { status: 'average', color: 'text-yellow-600', icon: Activity };
    }
    return { status: 'poor', color: 'text-red-600', icon: TrendingDown };
  };

  const performanceStatus = getPerformanceStatus();
  const StatusIcon = performanceStatus.icon;

  return (
    <Card className={cn("performance-monitor", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Performance Contextuelle
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className={cn("flex items-center gap-1", performanceStatus.color)}
            >
              <StatusIcon className="w-3 h-3" />
              {performanceStatus.status}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOptimize}
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Métriques principales */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-600">Cache Hit</span>
            </div>
            <p className="text-lg font-bold text-blue-700">
              {(metrics.cacheHitRatio * 100).toFixed(1)}%
            </p>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600">Réponse</span>
            </div>
            <p className="text-lg font-bold text-green-700">
              {metrics.averageResponseTime.toFixed(0)}ms
            </p>
          </div>
        </div>

        {/* Barre de progression du cache */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <Database className="w-4 h-4 text-gray-500" />
              <span>Cache</span>
            </div>
            <span className="text-gray-600">
              {metrics.cacheSize}/{metrics.config.maxCacheSize}
            </span>
          </div>
          <Progress 
            value={(metrics.cacheSize / metrics.config.maxCacheSize) * 100} 
            className="h-2"
          />
        </div>

        {/* Métriques détaillées */}
        {showDetailedMetrics && (
          <div className="space-y-3 pt-4 border-t">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Requêtes totales:</span>
                <span className="font-medium">{metrics.totalRequests}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Échecs:</span>
                <span className="font-medium text-red-600">{metrics.failedRequests}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Actives:</span>
                <span className="font-medium">{metrics.activeRequests}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">File d'attente:</span>
                <span className="font-medium">{metrics.queueSize}</span>
              </div>
            </div>

            {/* Configuration */}
            <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-xs font-medium text-gray-700">Configuration</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>TTL: {(metrics.config.defaultTTL / 1000 / 60).toFixed(0)}min</div>
                <div>Max Concurrent: {metrics.config.maxConcurrentRequests}</div>
                <div>Timeout: {metrics.config.requestTimeout / 1000}s</div>
                <div>Retries: {metrics.config.retryAttempts}</div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCache}
            className="flex items-center gap-1"
          >
            <Database className="w-3 h-3" />
            Vider Cache
          </Button>
          
          {metrics.failedRequests > 5 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOptimize}
              className="flex items-center gap-1 text-orange-600"
            >
              <AlertTriangle className="w-3 h-3" />
              Optimiser
            </Button>
          )}
        </div>

        {/* Alertes */}
        {metrics.cacheHitRatio < 0.3 && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <span className="text-xs text-yellow-800">
              Faible taux de cache - performance dégradée
            </span>
          </div>
        )}

        {metrics.averageResponseTime > 5000 && (
          <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
            <Clock className="w-4 h-4 text-red-600" />
            <span className="text-xs text-red-800">
              Temps de réponse élevé - vérifiez la connectivité
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};