/**
 * Layout Optimization Demo Page
 * Comprehensive demonstration of the PRP-022 Layout Optimization system
 * Shows all components working together with real-time performance monitoring
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChefHat, 
  ShoppingCart, 
  BarChart3, 
  Package, 
  Gauge, 
  Smartphone, 
  Monitor, 
  Tablet,
  Settings,
  Eye,
  Zap,
  Target
} from 'lucide-react';

import { EnhancedLayout } from '@/components/navigation/SimplifiedMorphingNav';
import { AdaptiveHeroViewport, HeroVariants } from '@/components/layout/AdaptiveHeroViewport';
import { 
  PerformanceMonitor, 
  LayoutPerformanceProvider, 
  OptimizedMotion, 
  useLayoutPerformance 
} from '@/components/performance/PerformanceMonitor';
import { HybridGoldenGrid } from '@/design-system/HybridGoldenGrid';
import { useResponsiveZones, useViewport } from '@/hooks/useResponsiveZones';
import { MaterialButton } from '@/components/ui/material/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface DemoState {
  heroContent: 'dashboard' | 'cooking' | 'shopping';
  performanceMode: 'high' | 'balanced' | 'low';
  enableParallax: boolean;
  showPerformanceMonitor: boolean;
  contentDensity: 'low' | 'medium' | 'high';
  navState: 'default' | 'cooking' | 'shopping' | 'minimal';
}

interface MetricDisplayProps {
  label: string;
  value: string | number;
  unit?: string;
  status: 'good' | 'needs-improvement' | 'poor' | 'unknown';
  icon: React.ReactNode;
}

const MetricDisplay: React.FC<MetricDisplayProps> = ({ 
  label, 
  value, 
  unit = '', 
  status, 
  icon 
}) => {
  const statusColors = {
    good: 'bg-green-500/10 text-green-700 border-green-500/20',
    'needs-improvement': 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    poor: 'bg-red-500/10 text-red-700 border-red-500/20',
    unknown: 'bg-gray-500/10 text-gray-700 border-gray-500/20',
  };

  return (
    <Card className={cn('transition-all duration-300', statusColors[status])}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {icon}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-muted-foreground">{label}</div>
            <div className="text-xl font-bold">
              {value}{unit}
            </div>
          </div>
          <Badge variant={status === 'good' ? 'default' : 'secondary'}>
            {status === 'good' ? 'Excellent' : 
             status === 'needs-improvement' ? 'Good' : 
             status === 'poor' ? 'Poor' : 'N/A'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

const DemoControls: React.FC<{
  demoState: DemoState;
  onStateChange: (newState: Partial<DemoState>) => void;
}> = ({ demoState, onStateChange }) => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Demo Controls
        </CardTitle>
        <CardDescription>
          Adjust settings to see how the layout optimization system responds in real-time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="layout" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="navigation">Navigation</TabsTrigger>
            <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          </TabsList>
          
          <TabsContent value="layout" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Hero Content Type</label>
                <div className="flex gap-2">
                  {(['dashboard', 'cooking', 'shopping'] as const).map(type => (
                    <MaterialButton
                      key={type}
                      variant={demoState.heroContent === type ? 'filled' : 'outlined'}
                      size="sm"
                      onClick={() => onStateChange({ heroContent: type })}
                      className="flex-1 capitalize"
                    >
                      {type}
                    </MaterialButton>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Content Density</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map(density => (
                    <MaterialButton
                      key={density}
                      variant={demoState.contentDensity === density ? 'filled' : 'outlined'}
                      size="sm"
                      onClick={() => onStateChange({ contentDensity: density })}
                      className="flex-1 capitalize"
                    >
                      {density}
                    </MaterialButton>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Performance Mode</label>
                <div className="flex gap-2">
                  {(['high', 'balanced', 'low'] as const).map(mode => (
                    <MaterialButton
                      key={mode}
                      variant={demoState.performanceMode === mode ? 'filled' : 'outlined'}
                      size="sm"
                      onClick={() => onStateChange({ performanceMode: mode })}
                      className="flex-1 capitalize"
                    >
                      {mode}
                    </MaterialButton>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Enable Parallax</label>
                  <Switch
                    checked={demoState.enableParallax}
                    onCheckedChange={(enableParallax) => onStateChange({ enableParallax })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Show Performance Monitor</label>
                  <Switch
                    checked={demoState.showPerformanceMonitor}
                    onCheckedChange={(showPerformanceMonitor) => onStateChange({ showPerformanceMonitor })}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="navigation" className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Navigation State</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(['default', 'cooking', 'shopping', 'minimal'] as const).map(state => (
                  <MaterialButton
                    key={state}
                    variant={demoState.navState === state ? 'filled' : 'outlined'}
                    size="sm"
                    onClick={() => onStateChange({ navState: state })}
                    className="capitalize"
                  >
                    {state}
                  </MaterialButton>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="accessibility" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">This layout system is designed with accessibility in mind:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>WCAG AAA compliant touch targets (minimum 44px)</li>
                <li>Respects prefers-reduced-motion preferences</li>
                <li>High contrast mode support</li>
                <li>Keyboard navigation throughout</li>
                <li>Screen reader compatible</li>
                <li>Platform-specific optimizations (iOS/Android)</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const SystemMetrics: React.FC = () => {
  const { performanceMode, metrics } = useLayoutPerformance();
  const viewport = useViewport();
  const { grid } = useResponsiveZones();

  const [gridInfo, setGridInfo] = useState(HybridGoldenGrid.generateHybridGrid(1024, 768));

  useEffect(() => {
    setGridInfo(HybridGoldenGrid.generateHybridGrid(viewport.width, viewport.height));
  }, [viewport.width, viewport.height]);

  const getStatusFromValue = (
    value: number | null, 
    thresholds: { good: number; needsImprovement: number }
  ) => {
    if (value === null) return 'unknown';
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.needsImprovement) return 'needs-improvement';
    return 'poor';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            Real-time Performance Metrics
          </CardTitle>
          <CardDescription>
            Live monitoring of Web Vitals and layout performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricDisplay
              label="Largest Contentful Paint"
              value={metrics.lcp ? Math.round(metrics.lcp) : 'N/A'}
              unit="ms"
              status={getStatusFromValue(metrics.lcp, { good: 2500, needsImprovement: 4000 })}
              icon={<Target className="w-4 h-4" />}
            />
            
            <MetricDisplay
              label="First Input Delay"
              value={metrics.fid ? Math.round(metrics.fid) : 'N/A'}
              unit="ms"
              status={getStatusFromValue(metrics.fid, { good: 100, needsImprovement: 300 })}
              icon={<Zap className="w-4 h-4" />}
            />
            
            <MetricDisplay
              label="Cumulative Layout Shift"
              value={metrics.cls ? metrics.cls.toFixed(3) : 'N/A'}
              unit=""
              status={getStatusFromValue(metrics.cls, { good: 0.1, needsImprovement: 0.25 })}
              icon={<Eye className="w-4 h-4" />}
            />
            
            <MetricDisplay
              label="Frame Rate"
              value={Math.round(metrics.frameRate)}
              unit=" FPS"
              status={getStatusFromValue(metrics.frameRate, { good: 58, needsImprovement: 45 })}
              icon={<Monitor className="w-4 h-4" />}
            />
            
            <MetricDisplay
              label="Memory Usage"
              value={metrics.memoryUsage ? Math.round(metrics.memoryUsage / 1024 / 1024) : 'N/A'}
              unit=" MB"
              status="good"
              icon={<BarChart3 className="w-4 h-4" />}
            />
            
            <MetricDisplay
              label="Performance Mode"
              value={performanceMode}
              unit=""
              status={performanceMode === 'high' ? 'good' : performanceMode === 'balanced' ? 'needs-improvement' : 'poor'}
              icon={<Settings className="w-4 h-4" />}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Golden Grid System Information
          </CardTitle>
          <CardDescription>
            Current viewport and grid configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                {viewport.width < 768 ? <Smartphone className="w-4 h-4" /> :
                 viewport.width < 1024 ? <Tablet className="w-4 h-4" /> :
                 <Monitor className="w-4 h-4" />}
                Viewport Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Width:</span>
                  <code>{viewport.width}px</code>
                </div>
                <div className="flex justify-between">
                  <span>Height:</span>
                  <code>{viewport.height}px</code>
                </div>
                <div className="flex justify-between">
                  <span>Available Height:</span>
                  <code>{viewport.availableHeight}px</code>
                </div>
                <div className="flex justify-between">
                  <span>Device Type:</span>
                  <Badge variant="outline">
                    {viewport.width < 768 ? 'Mobile' :
                     viewport.width < 1024 ? 'Tablet' : 'Desktop'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Golden Ratio Calculations</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Primary Section:</span>
                  <code>{gridInfo.goldenProportions.sections.primary}px</code>
                </div>
                <div className="flex justify-between">
                  <span>Secondary Section:</span>
                  <code>{gridInfo.goldenProportions.sections.secondary}px</code>
                </div>
                <div className="flex justify-between">
                  <span>Touch Target Min:</span>
                  <code>{gridInfo.touchTargets.minimum}px</code>
                </div>
                <div className="flex justify-between">
                  <span>Touch Target Comfortable:</span>
                  <code>{gridInfo.touchTargets.comfortable}px</code>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const LayoutOptimizationDemo: React.FC = () => {
  const [demoState, setDemoState] = useState<DemoState>({
    heroContent: 'dashboard',
    performanceMode: 'balanced',
    enableParallax: false,
    showPerformanceMonitor: true,
    contentDensity: 'medium',
    navState: 'default',
  });

  const handleStateChange = (newState: Partial<DemoState>) => {
    setDemoState(prev => ({ ...prev, ...newState }));
  };

  const getHeroContent = () => {
    const mockStats = [
      { label: 'Recipes', value: '150+', icon: <ChefHat className="w-4 h-4" /> },
      { label: 'Items', value: '45', icon: <Package className="w-4 h-4" /> },
      { label: 'Lists', value: '12', icon: <ShoppingCart className="w-4 h-4" /> },
      { label: 'Savings', value: '€287', icon: <BarChart3 className="w-4 h-4" /> },
    ];

    switch (demoState.heroContent) {
      case 'dashboard':
        return <HeroVariants.Dashboard stats={mockStats} />;
      case 'cooking':
        return <HeroVariants.Cooking recipe={{ name: 'Ratatouille Provençale', duration: '45 min' }} />;
      case 'shopping':
        return <HeroVariants.Shopping listCount={8} />;
      default:
        return <HeroVariants.Dashboard stats={mockStats} />;
    }
  };

  return (
    <LayoutPerformanceProvider enableAutoOptimizations={true}>
      <div className="min-h-screen bg-background">
        {/* Performance Monitor Overlay */}
        <PerformanceMonitor 
          showDebugInfo={demoState.showPerformanceMonitor}
          onPerformanceIssue={(metric, value) => {
            console.warn(`Performance issue detected: ${metric} = ${value}`);
          }}
        />

        {/* Enhanced Layout with Adaptive Hero */}
        <EnhancedLayout
          enableMorphingNav={true}
          navState={demoState.navState}
          heroContent={
            <AdaptiveHeroViewport
              content={{ 
                density: demoState.contentDensity,
                hasImages: true,
                hasVideo: false,
              }}
              context={{ 
                mode: demoState.heroContent === 'dashboard' ? 'browsing' : 
                       demoState.heroContent as 'cooking' | 'shopping' 
              }}
              performanceMode={demoState.performanceMode}
              enableParallax={demoState.enableParallax}
            >
              {getHeroContent()}
            </AdaptiveHeroViewport>
          }
          className="layout-optimization-demo"
        >
          <div className="container mx-auto px-4 py-8 space-y-8">
            {/* Demo Title */}
            <OptimizedMotion
              animation={{
                high: {
                  initial: { opacity: 0, y: 30, scale: 0.95 },
                  animate: { opacity: 1, y: 0, scale: 1 },
                  transition: { duration: 0.8, ease: [0.4, 0.0, 0.2, 1] }
                },
                balanced: {
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }
                },
                low: {
                  initial: { opacity: 0 },
                  animate: { opacity: 1 },
                  transition: { duration: 0.3 }
                }
              }}
            >
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-foreground mb-4">
                  Layout Optimization System Demo
                </h1>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Experience the PRP-022 Layout Optimization system featuring hybrid golden ratio grid, 
                  adaptive hero viewport, morphing navigation, and comprehensive performance monitoring.
                </p>
              </div>
            </OptimizedMotion>

            {/* Demo Controls */}
            <OptimizedMotion performanceMode={demoState.performanceMode}>
              <DemoControls 
                demoState={demoState} 
                onStateChange={handleStateChange} 
              />
            </OptimizedMotion>

            {/* System Metrics */}
            <OptimizedMotion performanceMode={demoState.performanceMode}>
              <SystemMetrics />
            </OptimizedMotion>

            {/* Feature Highlights */}
            <OptimizedMotion performanceMode={demoState.performanceMode}>
              <Card>
                <CardHeader>
                  <CardTitle>Key Features Demonstrated</CardTitle>
                  <CardDescription>
                    This demo showcases all major components of the layout optimization system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="text-center p-6 border rounded-lg">
                      <Package className="w-8 h-8 mx-auto mb-3 text-primary" />
                      <h3 className="font-semibold mb-2">Hybrid Golden Grid</h3>
                      <p className="text-sm text-muted-foreground">
                        Mathematical harmony with practical 8px base units
                      </p>
                    </div>
                    
                    <div className="text-center p-6 border rounded-lg">
                      <Monitor className="w-8 h-8 mx-auto mb-3 text-primary" />
                      <h3 className="font-semibold mb-2">Adaptive Hero Viewport</h3>
                      <p className="text-sm text-muted-foreground">
                        Intelligent content density and context awareness
                      </p>
                    </div>
                    
                    <div className="text-center p-6 border rounded-lg">
                      <Settings className="w-8 h-8 mx-auto mb-3 text-primary" />
                      <h3 className="font-semibold mb-2">Morphing Navigation</h3>
                      <p className="text-sm text-muted-foreground">
                        Context-aware navigation with smooth state transitions
                      </p>
                    </div>
                    
                    <div className="text-center p-6 border rounded-lg">
                      <Gauge className="w-8 h-8 mx-auto mb-3 text-primary" />
                      <h3 className="font-semibold mb-2">Performance Monitoring</h3>
                      <p className="text-sm text-muted-foreground">
                        Real-time Web Vitals and layout performance tracking
                      </p>
                    </div>
                    
                    <div className="text-center p-6 border rounded-lg">
                      <Eye className="w-8 h-8 mx-auto mb-3 text-primary" />
                      <h3 className="font-semibold mb-2">Accessibility Compliance</h3>
                      <p className="text-sm text-muted-foreground">
                        WCAG AAA compliance with platform optimizations
                      </p>
                    </div>
                    
                    <div className="text-center p-6 border rounded-lg">
                      <Zap className="w-8 h-8 mx-auto mb-3 text-primary" />
                      <h3 className="font-semibold mb-2">Progressive Enhancement</h3>
                      <p className="text-sm text-muted-foreground">
                        Graceful fallbacks and reduced motion support
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </OptimizedMotion>
          </div>
        </EnhancedLayout>
      </div>
    </LayoutPerformanceProvider>
  );
};

export default LayoutOptimizationDemo;