"use client";

import React, { useState } from 'react';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Settings,
  Zap,
  Cloud,
  Calendar,
  Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface DiagnosticResult {
  success: boolean;
  executionTime: number;
  environment: {
    contextualEnabled: boolean;
    hasWeatherKey: boolean;
    hasGoogleKey: boolean;
    isDemo: boolean;
  };
  tests: {
    performance: any;
    weather: any;
    overall: 'success' | 'warning' | 'error';
  };
  recommendations: string[];
}

export const ContextualSystemDiagnostics: React.FC = () => {
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setError(null);
    
    try {
      const response = await fetch('/api/contextual-test');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du diagnostic');
      }
      
      setDiagnosticResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  return (
    <Card className="contextual-diagnostics">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500" />
            Diagnostic Système Contextuel
          </CardTitle>
          <Button
            onClick={runDiagnostics}
            disabled={isRunning}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isRunning && "animate-spin")} />
            {isRunning ? 'Test...' : 'Tester'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Erreur de diagnostic</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {diagnosticResult && (
          <>
            {/* Statut global */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                {getStatusIcon(diagnosticResult.tests.overall)}
                <div>
                  <p className={cn("font-medium", getStatusColor(diagnosticResult.tests.overall))}>
                    {diagnosticResult.tests.overall === 'success' && 'Système Opérationnel'}
                    {diagnosticResult.tests.overall === 'warning' && 'Attention Requise'}
                    {diagnosticResult.tests.overall === 'error' && 'Problème Détecté'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Tests exécutés en {diagnosticResult.executionTime}ms
                  </p>
                </div>
              </div>
              <Badge 
                variant={diagnosticResult.tests.overall === 'success' ? 'default' : 'secondary'}
                className={getStatusColor(diagnosticResult.tests.overall)}
              >
                {diagnosticResult.tests.overall.toUpperCase()}
              </Badge>
            </div>

            {/* Configuration */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Configuration</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">Système activé</span>
                  {diagnosticResult.environment.contextualEnabled ? 
                    <CheckCircle className="w-4 h-4 text-green-600" /> : 
                    <XCircle className="w-4 h-4 text-red-600" />
                  }
                </div>
                <div className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">API Météo</span>
                  {diagnosticResult.environment.hasWeatherKey ? 
                    <CheckCircle className="w-4 h-4 text-green-600" /> : 
                    <XCircle className="w-4 h-4 text-red-600" />
                  }
                </div>
                <div className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">Google Calendar</span>
                  {diagnosticResult.environment.hasGoogleKey ? 
                    <CheckCircle className="w-4 h-4 text-green-600" /> : 
                    <XCircle className="w-4 h-4 text-red-600" />
                  }
                </div>
                <div className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">Mode</span>
                  <Badge variant={diagnosticResult.environment.isDemo ? "secondary" : "default"}>
                    {diagnosticResult.environment.isDemo ? "Démo" : "Prod"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Tests des services */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Services</h4>
              
              {/* Performance */}
              {diagnosticResult.tests.performance && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Performance Optimizer</p>
                      {diagnosticResult.tests.performance.status === 'success' && (
                        <p className="text-sm text-gray-600">
                          Cache: {diagnosticResult.tests.performance.metrics.cacheHitRatio}% hit ratio
                        </p>
                      )}
                    </div>
                  </div>
                  {getStatusIcon(diagnosticResult.tests.performance.status)}
                </div>
              )}

              {/* Weather */}
              {diagnosticResult.tests.weather && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Cloud className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Service Météo</p>
                      {diagnosticResult.tests.weather.status === 'success' && (
                        <p className="text-sm text-gray-600">
                          {diagnosticResult.tests.weather.data.currentTemp}°C - 
                          {diagnosticResult.tests.weather.data.recommendationsCount} suggestions
                        </p>
                      )}
                    </div>
                  </div>
                  {getStatusIcon(diagnosticResult.tests.weather.status)}
                </div>
              )}
            </div>

            {/* Recommandations */}
            {diagnosticResult.recommendations.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-700">Recommandations</h4>
                <div className="space-y-2">
                  {diagnosticResult.recommendations.map((rec, index) => (
                    <Alert key={index} variant={rec.startsWith('❌') ? 'destructive' : rec.startsWith('⚠️') ? 'default' : 'default'}>
                      <AlertDescription className="text-sm">
                        {rec}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {/* Actions rapides */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/meal-planning', '_blank')}
                className="flex items-center gap-1"
              >
                <Database className="w-3 h-3" />
                Interface
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://openweathermap.org/api', '_blank')}
                className="flex items-center gap-1"
              >
                <Cloud className="w-3 h-3" />
                API Météo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://console.cloud.google.com/', '_blank')}
                className="flex items-center gap-1"
              >
                <Calendar className="w-3 h-3" />
                Google Cloud
              </Button>
            </div>
          </>
        )}

        {!diagnosticResult && !isRunning && (
          <div className="text-center py-8 text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Cliquez sur "Tester" pour vérifier le système contextuel</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};