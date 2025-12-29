/**
 * PRP-026 Inventory Visualization Demo Page
 * Comprehensive demonstration of the 3D pantry visualization system
 * Features: 3D pantry, Pokémon-style collection, Apple Health progress rings, seasonal themes
 */

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
// Removed Next.js-specific types and Head for Vite/React usage
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  Info,
  Gamepad2,
  Target,
  Palette,
  Cpu,
  Zap,
  Eye,
  Calendar,
  Trophy,
  Star,
  Apple,
  Carrot,
  Heart,
  Leaf,
  Sun,
  Snowflake,
  Flower,
  MapleLeaf,
  Monitor,
  Smartphone,
  Tablet,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';

// Dynamic imports for heavy 3D components
const InteractiveInventoryVisualization = React.lazy(() => 
  import('@/visualization/InteractiveInventoryVisualization').then(module => ({
    default: module.InteractiveInventoryVisualization
  }))
);

const NutritionProgressRings = React.lazy(() =>
  import('@/components/progress/NutritionProgressRings').then(module => ({
    default: module.NutritionProgressRings
  }))
);

interface DemoState {
  isPlaying: boolean;
  currentSeason: 'spring' | 'summer' | 'autumn' | 'winter';
  performanceMode: 'ultra_performance' | 'balanced' | 'high_quality' | 'ultra_quality';
  selectedDemo: string;
  showStats: boolean;
  autoRotate: boolean;
  enableParticles: boolean;
  enableSounds: boolean;
}

interface PerformanceStats {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  triangles: number;
  deviceInfo: {
    type: 'mobile' | 'tablet' | 'desktop';
    memory: number;
    cores: number;
    gpu: string;
  };
}

interface DemoFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'implemented' | 'demo' | 'concept';
  difficulty: 'basic' | 'advanced' | 'expert';
}

const InventoryVisualizationDemo: React.FC = () => {
  const [demoState, setDemoState] = useState<DemoState>({
    isPlaying: false,
    currentSeason: 'spring',
    performanceMode: 'balanced',
    selectedDemo: 'overview',
    showStats: true,
    autoRotate: true,
    enableParticles: true,
    enableSounds: false
  });

  const [performanceStats, setPerformanceStats] = useState<PerformanceStats>({
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 50000000,
    drawCalls: 25,
    triangles: 8500,
    deviceInfo: {
      type: 'desktop',
      memory: 8,
      cores: 8,
      gpu: 'Unknown'
    }
  });

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isSystemReady, setIsSystemReady] = useState(false);
  const [activeFeatureDemo, setActiveFeatureDemo] = useState<string | null>(null);

  const performanceMonitorRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Mock inventory data for demonstration
  const mockInventoryData = [
    {
      id: 'apple_001',
      name: 'Honeycrisp Apples',
      category: 'fruits' as const,
      quantity: 6,
      unit: 'pieces',
      expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      freshness: 0.95,
      nutritionalValue: { vitamins: 90, minerals: 25, fiber: 20 },
      location: { zone: 'fruit_bowl', x: 2, y: 1, z: 0 },
      discoveryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      rarity: 'common' as const
    },
    {
      id: 'cheese_001',
      name: 'Aged Gruyère',
      category: 'dairy' as const,
      quantity: 300,
      unit: 'grams',
      expirationDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      freshness: 0.85,
      nutritionalValue: { vitamins: 45, minerals: 75, protein: 95 },
      location: { zone: 'refrigerator', x: 1, y: 2, z: 1 },
      discoveryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      rarity: 'rare' as const
    },
    {
      id: 'herbs_001',
      name: 'Fresh Basil',
      category: 'herbs' as const,
      quantity: 50,
      unit: 'grams',
      expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      freshness: 0.92,
      nutritionalValue: { vitamins: 70, minerals: 30, antioxidants: 85 },
      location: { zone: 'herb_garden', x: 0, y: 0, z: 2 },
      discoveryDate: new Date(),
      rarity: 'uncommon' as const
    },
    {
      id: 'truffle_001',
      name: 'Black Truffle',
      category: 'specialty' as const,
      quantity: 25,
      unit: 'grams',
      expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      freshness: 0.88,
      nutritionalValue: { vitamins: 60, minerals: 95, umami: 100 },
      location: { zone: 'specialty_shelf', x: 3, y: 3, z: 1 },
      discoveryDate: new Date(),
      rarity: 'legendary' as const
    }
  ];

  // Mock nutrition data for progress rings
  const mockNutritionData = {
    vitamins: { 
      current: 87,
      sources: ['Apples', 'Basil', 'Gruyère'],
      trend: 'increasing'
    },
    variety: { 
      current: 12,
      categories: ['fruits', 'dairy', 'herbs', 'specialty'],
      trend: 'stable'
    },
    freshness: { 
      current: 91,
      averageAge: 3.2,
      trend: 'stable'
    },
    balance: { 
      current: 89,
      distribution: {
        fruits: 25,
        vegetables: 20,
        dairy: 20,
        grains: 15,
        protein: 12,
        herbs: 8
      },
      trend: 'improving'
    }
  };

  const mockNutritionGoals = {
    vitamins: 100,
    variety: 15,
    freshness: 90,
    balance: 85
  };

  // Demo features configuration
  const demoFeatures: DemoFeature[] = [
    {
      id: '3d_pantry',
      title: '3D Pantry Environment',
      description: 'Animal Crossing-inspired 3D pantry with realistic lighting and shadows',
      icon: Monitor,
      status: 'implemented',
      difficulty: 'advanced'
    },
    {
      id: 'pokemon_collection',
      title: 'Pokémon-Style Collection',
      description: 'Discover and collect ingredients with rarity system and achievements',
      icon: Gamepad2,
      status: 'implemented',
      difficulty: 'basic'
    },
    {
      id: 'health_rings',
      title: 'Apple Health Progress Rings',
      description: 'Beautiful animated rings showing nutrition goals and achievements',
      icon: Target,
      status: 'implemented',
      difficulty: 'basic'
    },
    {
      id: 'seasonal_themes',
      title: 'Dynamic Seasonal Themes',
      description: 'Smooth transitions between seasons with particles and lighting changes',
      icon: Palette,
      status: 'implemented',
      difficulty: 'advanced'
    },
    {
      id: 'performance_optimization',
      title: 'Performance Optimization',
      description: 'Adaptive quality and LOD system for smooth 60fps on all devices',
      icon: Cpu,
      status: 'implemented',
      difficulty: 'expert'
    },
    {
      id: 'smart_interactions',
      title: 'Smart Interactions',
      description: 'Context-aware interactions with hover effects and animations',
      icon: Eye,
      status: 'demo',
      difficulty: 'advanced'
    }
  ];

  // Initialize system and start monitoring
  useEffect(() => {
    let mounted = true;

    const initializeSystem = async () => {
      try {
        // Simulate system initialization with progress
        for (let i = 0; i <= 100; i += 10) {
          if (!mounted) return;
          setLoadingProgress(i);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Detect device capabilities
        const deviceInfo = {
          type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 
                /Tablet|iPad/i.test(navigator.userAgent) ? 'tablet' : 'desktop',
          memory: (navigator as any).deviceMemory || 4,
          cores: navigator.hardwareConcurrency || 4,
          gpu: 'WebGL Supported'
        } as const;

        setPerformanceStats(prev => ({
          ...prev,
          deviceInfo
        }));

        setIsSystemReady(true);
        startPerformanceMonitoring();
      } catch (error) {
        console.error('System initialization failed:', error);
      }
    };

    initializeSystem();

    return () => {
      mounted = false;
      stopPerformanceMonitoring();
    };
  }, []);

  // Performance monitoring
  const startPerformanceMonitoring = useCallback(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const monitor = () => {
      const currentTime = performance.now();
      frameCount++;

      if (currentTime - lastTime >= 1000) {
        const fps = frameCount;
        const frameTime = 1000 / fps;
        
        setPerformanceStats(prev => ({
          ...prev,
          fps,
          frameTime,
          memoryUsage: (performance as any).memory?.usedJSHeapSize || prev.memoryUsage,
          drawCalls: 15 + Math.floor(Math.random() * 20), // Simulated
          triangles: 5000 + Math.floor(Math.random() * 8000) // Simulated
        }));

        frameCount = 0;
        lastTime = currentTime;
      }

      performanceMonitorRef.current = requestAnimationFrame(monitor);
    };

    performanceMonitorRef.current = requestAnimationFrame(monitor);
  }, []);

  const stopPerformanceMonitoring = useCallback(() => {
    if (performanceMonitorRef.current) {
      cancelAnimationFrame(performanceMonitorRef.current);
      performanceMonitorRef.current = null;
    }
  }, []);

  // Demo control handlers
  const handlePlayPause = useCallback(() => {
    setDemoState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const handleSeasonChange = useCallback((season: typeof demoState.currentSeason) => {
    setDemoState(prev => ({ ...prev, currentSeason: season }));
  }, []);

  const handlePerformanceModeChange = useCallback((mode: typeof demoState.performanceMode) => {
    setDemoState(prev => ({ ...prev, performanceMode: mode }));
  }, []);

  const handleFeatureDemo = useCallback((featureId: string) => {
    setActiveFeatureDemo(featureId);
    setTimeout(() => setActiveFeatureDemo(null), 5000); // Auto-close after 5 seconds
  }, []);

  // Get season icon
  const getSeasonIcon = (season: string) => {
    switch (season) {
      case 'spring': return Flower;
      case 'summer': return Sun;
      case 'autumn': return MapleLeaf;
      case 'winter': return Snowflake;
      default: return Sun;
    }
  };

  // Get performance mode color
  const getPerformanceModeColor = (mode: string) => {
    switch (mode) {
      case 'ultra_performance': return 'text-red-600';
      case 'balanced': return 'text-yellow-600';
      case 'high_quality': return 'text-green-600';
      case 'ultra_quality': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  if (!isSystemReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        {/* Title management can be handled by a layout or react-helmet-async if needed */}
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Zap className="w-6 h-6 animate-pulse text-blue-600" />
              Initializing Demo System
            </CardTitle>
            <CardDescription>
              Loading 3D visualization components and assets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div 
                  className="bg-blue-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="text-center text-sm text-gray-600">
                {loadingProgress < 50 ? 'Loading 3D engine...' :
                 loadingProgress < 80 ? 'Initializing shaders...' :
                 'Preparing demo content...'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* SEO head removed for Vite demo page; add react-helmet-async if required */}

      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                PRP-026 Inventory Visualization
              </h1>
              <p className="text-sm text-gray-600">
                Interactive 3D Pantry • Pokémon Collection • Apple Health Rings • Seasonal Themes
              </p>
            </div>

            {/* Demo Controls */}
            <div className="flex items-center space-x-2">
              <Button
                variant={demoState.isPlaying ? "default" : "outline"}
                size="sm"
                onClick={handlePlayPause}
                className="flex items-center gap-2"
              >
                {demoState.isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Play Demo
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={demoState.selectedDemo} onValueChange={(value) => 
          setDemoState(prev => ({ ...prev, selectedDemo: value }))
        }>
          <TabsList className="grid grid-cols-5 w-full max-w-2xl mx-auto mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="3d-pantry">3D Pantry</TabsTrigger>
            <TabsTrigger value="collection">Collection</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Advanced Inventory Visualization System
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Experience a revolutionary approach to pantry management with our cutting-edge 3D visualization, 
                gamified collection system, and intelligent progress tracking.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {demoFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className="h-full cursor-pointer hover:shadow-lg transition-all duration-300"
                      onClick={() => handleFeatureDemo(feature.id)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <Icon className="w-8 h-8 text-blue-600" />
                          <div className="flex gap-2">
                            <Badge 
                              variant={feature.status === 'implemented' ? 'default' : 
                                      feature.status === 'demo' ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {feature.status}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                feature.difficulty === 'expert' ? 'border-red-300 text-red-600' :
                                feature.difficulty === 'advanced' ? 'border-yellow-300 text-yellow-600' :
                                'border-green-300 text-green-600'
                              }`}
                            >
                              {feature.difficulty}
                            </Badge>
                          </div>
                        </div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription>
                          {feature.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">3D Engine</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Performance</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {performanceStats.fps} FPS
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Device</span>
                    <Badge variant="outline">
                      {performanceStats.deviceInfo.type}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3D Pantry Tab */}
          <TabsContent value="3d-pantry" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Interactive 3D Pantry Environment
              </h3>
              
              <div className="flex items-center space-x-2">
                {/* Season Controls */}
                <div className="flex items-center space-x-1 bg-white rounded-lg p-1 shadow-sm">
                  {['spring', 'summer', 'autumn', 'winter'].map((season) => {
                    const SeasonIcon = getSeasonIcon(season);
                    return (
                      <Button
                        key={season}
                        variant={demoState.currentSeason === season ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleSeasonChange(season as any)}
                        className="px-2"
                      >
                        <SeasonIcon className="w-4 h-4" />
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3D Visualization Container */}
            <Card className="overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-green-100 relative">
                <Suspense fallback={
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-sm text-gray-600">Loading 3D Environment...</p>
                    </div>
                  </div>
                }>
                  <InteractiveInventoryVisualization
                    inventoryData={mockInventoryData}
                    userId="demo_user"
                    className="w-full h-full"
                  />
                </Suspense>
                
                {/* Overlay Controls */}
                <div className="absolute top-4 right-4 space-y-2">
                  <Card className="p-3 bg-white/90 backdrop-blur-sm">
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Season: <span className="capitalize font-medium">{demoState.currentSeason}</span></div>
                      <div>Items: <span className="font-medium">{mockInventoryData.length}</span></div>
                      <div>FPS: <span className="font-medium">{performanceStats.fps}</span></div>
                    </div>
                  </Card>
                </div>
              </div>
            </Card>

            {/* Environment Controls */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Environment Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Auto Rotation</span>
                    <Button
                      variant={demoState.autoRotate ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDemoState(prev => ({ 
                        ...prev, autoRotate: !prev.autoRotate 
                      }))}
                    >
                      {demoState.autoRotate ? 'On' : 'Off'}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Particle Effects</span>
                    <Button
                      variant={demoState.enableParticles ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDemoState(prev => ({ 
                        ...prev, enableParticles: !prev.enableParticles 
                      }))}
                    >
                      {demoState.enableParticles ? 'On' : 'Off'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Inventory Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Items:</span>
                      <span className="font-medium">{mockInventoryData.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avg. Freshness:</span>
                      <span className="font-medium">
                        {Math.round(mockInventoryData.reduce((sum, item) => sum + item.freshness, 0) / mockInventoryData.length * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Rare Items:</span>
                      <span className="font-medium">
                        {mockInventoryData.filter(item => item.rarity === 'rare' || item.rarity === 'legendary').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Collection Tab */}
          <TabsContent value="collection" className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Pokémon-Style Ingredient Collection
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Collection Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5" />
                    Collection Progress
                  </CardTitle>
                  <CardDescription>
                    Discover and collect ingredients throughout your kitchen
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Discovered</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {mockInventoryData.length}/50
                      </Badge>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(mockInventoryData.length / 50) * 100}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {['common', 'uncommon', 'rare', 'legendary'].map((rarity) => {
                        const count = mockInventoryData.filter(item => item.rarity === rarity).length;
                        const color = {
                          common: 'bg-gray-100 text-gray-800',
                          uncommon: 'bg-green-100 text-green-800',
                          rare: 'bg-blue-100 text-blue-800',
                          legendary: 'bg-purple-100 text-purple-800'
                        }[rarity];
                        
                        return (
                          <div key={rarity} className="text-center">
                            <Badge variant="secondary" className={`text-xs ${color}`}>
                              {rarity}
                            </Badge>
                            <div className="text-lg font-bold mt-1">{count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Discoveries */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Recent Discoveries
                  </CardTitle>
                  <CardDescription>
                    Your latest ingredient findings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockInventoryData
                      .sort((a, b) => b.discoveryDate.getTime() - a.discoveryDate.getTime())
                      .slice(0, 3)
                      .map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                              item.rarity === 'legendary' ? 'bg-purple-500' :
                              item.rarity === 'rare' ? 'bg-blue-500' :
                              item.rarity === 'uncommon' ? 'bg-green-500' : 'bg-gray-500'
                            }`}>
                              {item.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{item.name}</div>
                              <div className="text-xs text-gray-500">
                                {new Date().toDateString() === item.discoveryDate.toDateString() 
                                  ? 'Today' 
                                  : item.discoveryDate.toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <Trophy className="w-4 h-4 text-yellow-500" />
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Achievement Showcase */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Achievements
                </CardTitle>
                <CardDescription>
                  Unlock rewards as you expand your collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { id: 'first_discovery', name: 'First Discovery', desc: 'Discover your first ingredient', unlocked: true },
                    { id: 'rare_collector', name: 'Rare Collector', desc: 'Find 3 rare ingredients', unlocked: true },
                    { id: 'legendary_hunter', name: 'Legendary Hunter', desc: 'Discover a legendary ingredient', unlocked: true },
                    { id: 'variety_master', name: 'Variety Master', desc: 'Collect from 10 different categories', unlocked: false },
                    { id: 'freshness_expert', name: 'Freshness Expert', desc: 'Maintain 95% average freshness', unlocked: false },
                    { id: 'pantry_master', name: 'Pantry Master', desc: 'Complete the entire collection', unlocked: false }
                  ].map((achievement) => (
                    <div key={achievement.id} className={`p-4 rounded-lg border-2 transition-all ${
                      achievement.unlocked 
                        ? 'border-yellow-200 bg-yellow-50' 
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className={`w-5 h-5 ${
                          achievement.unlocked ? 'text-yellow-600' : 'text-gray-400'
                        }`} />
                        <span className="font-medium text-sm">{achievement.name}</span>
                      </div>
                      <p className="text-xs text-gray-600">{achievement.desc}</p>
                      {achievement.unlocked && (
                        <Badge variant="secondary" className="mt-2 bg-yellow-100 text-yellow-800 text-xs">
                          Unlocked
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Apple Health-Style Progress Rings
            </h3>

            <Suspense fallback={
              <Card className="h-96 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-sm text-gray-600">Loading Progress Rings...</p>
                </div>
              </Card>
            }>
              <NutritionProgressRings
                nutritionData={mockNutritionData}
                goals={mockNutritionGoals}
                timeframe="daily"
                size="large"
                showLabels={true}
                showStats={true}
                onRingClick={(ringId) => console.log(`Clicked ring: ${ringId}`)}
              />
            </Suspense>

            {/* Additional Progress Metrics */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Weekly Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Avg. Daily Progress</span>
                      <span className="font-medium">86%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Best Day</span>
                      <span className="font-medium">Saturday (94%)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Streak</span>
                      <span className="font-medium">5 days</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Goal Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Daily Goals</span>
                      <Badge className="bg-green-100 text-green-800">3/4 Complete</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Weekly Goals</span>
                      <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Monthly Goals</span>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Performance Optimization & Analytics
              </h3>
              
              {/* Performance Mode Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Quality:</span>
                <div className="flex space-x-1">
                  {[
                    { key: 'ultra_performance', label: 'Ultra', icon: Smartphone },
                    { key: 'balanced', label: 'Balanced', icon: Tablet },
                    { key: 'high_quality', label: 'High', icon: Monitor },
                    { key: 'ultra_quality', label: 'Ultra', icon: Cpu }
                  ].map(({ key, label, icon: Icon }) => (
                    <Button
                      key={key}
                      variant={demoState.performanceMode === key ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePerformanceModeChange(key as any)}
                      className="px-2"
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Real-time Performance Metrics */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Frame Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {performanceStats.fps} <span className="text-sm text-gray-500">FPS</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {performanceStats.frameTime.toFixed(1)}ms per frame
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Memory Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(performanceStats.memoryUsage / (1024 * 1024))} 
                    <span className="text-sm text-gray-500">MB</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {((performanceStats.memoryUsage / (performanceStats.deviceInfo.memory * 1024 * 1024 * 1024)) * 100).toFixed(1)}% of total
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Draw Calls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {performanceStats.drawCalls}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {performanceStats.triangles.toLocaleString()} triangles
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Device Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getPerformanceModeColor(demoState.performanceMode)}`}>
                    {performanceStats.deviceInfo.type === 'desktop' ? 'A+' :
                     performanceStats.deviceInfo.type === 'tablet' ? 'B+' : 'C+'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 capitalize">
                    {performanceStats.deviceInfo.type} • {performanceStats.deviceInfo.cores} cores
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Device Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Device Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Device Type:</span>
                      <Badge variant="outline" className="capitalize">
                        {performanceStats.deviceInfo.type}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Memory:</span>
                      <span className="text-sm">{performanceStats.deviceInfo.memory}GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">CPU Cores:</span>
                      <span className="text-sm">{performanceStats.deviceInfo.cores}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Graphics:</span>
                      <span className="text-sm">WebGL 2.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Current Mode:</span>
                      <Badge className={getPerformanceModeColor(demoState.performanceMode)}>
                        {demoState.performanceMode.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Adaptive Quality:</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Enabled
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Optimization Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {performanceStats.fps < 30 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Low Frame Rate Detected</AlertTitle>
                      <AlertDescription>
                        Consider switching to Ultra Performance mode for better responsiveness.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {performanceStats.memoryUsage > (performanceStats.deviceInfo.memory * 0.8 * 1024 * 1024 * 1024) && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>High Memory Usage</AlertTitle>
                      <AlertDescription>
                        Memory usage is high. Consider reducing particle effects or texture quality.
                      </AlertDescription>
                    </Alert>
                  )}

                  {performanceStats.fps >= 55 && performanceStats.memoryUsage < (performanceStats.deviceInfo.memory * 0.6 * 1024 * 1024 * 1024) && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>Excellent Performance</AlertTitle>
                      <AlertDescription>
                        Your system is running optimally. Consider enabling higher quality settings.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Feature Demo Overlay */}
      <AnimatePresence>
        {activeFeatureDemo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setActiveFeatureDemo(null)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="bg-white rounded-xl p-6 max-w-md mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold mb-2">Feature Demo Active</h3>
                <p className="text-gray-600 text-sm mb-4">
                  {demoFeatures.find(f => f.id === activeFeatureDemo)?.description}
                </p>
                <Button onClick={() => setActiveFeatureDemo(null)}>
                  Close Demo
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Performance Stats in Development */}
      {demoState.showStats && (
        <div className="fixed bottom-4 right-4 z-30">
          <Card className="p-2 bg-black/80 text-white text-xs space-y-1">
            <div>FPS: {performanceStats.fps}</div>
            <div>Frame: {performanceStats.frameTime.toFixed(1)}ms</div>
            <div>Calls: {performanceStats.drawCalls}</div>
            <div>Mode: {demoState.performanceMode.split('_')[0]}</div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InventoryVisualizationDemo;
