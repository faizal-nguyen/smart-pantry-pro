/**
 * Performance Monitor Component
 * Implements Web Vitals tracking and performance optimization
 * Based on PRP-022-Layout-Optimization specification
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface PerformanceMetrics {
  lcp: number | null; // Largest Contentful Paint
  fid: number | null; // First Input Delay
  cls: number | null; // Cumulative Layout Shift
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  frameRate: number;
  memoryUsage?: number;
}

interface PerformanceThresholds {
  lcp: { good: number; needsImprovement: number };
  fid: { good: number; needsImprovement: number };
  cls: { good: number; needsImprovement: number };
  fcp: { good: number; needsImprovement: number };
  frameRate: { good: number; needsImprovement: number };
}

const PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  lcp: { good: 2500, needsImprovement: 4000 },
  fid: { good: 100, needsImprovement: 300 },
  cls: { good: 0.1, needsImprovement: 0.25 },
  fcp: { good: 1800, needsImprovement: 3000 },
  frameRate: { good: 58, needsImprovement: 45 },
};

export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    navigationStart: performance.now(),
    domContentLoaded: 0,
    loadComplete: 0,
    frameRate: 60,
  });
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  // Frame rate monitoring
  const [frameCount, setFrameCount] = useState(0);
  const [lastTimestamp, setLastTimestamp] = useState(performance.now());
  
  const updateFrameRate = useCallback((timestamp: number) => {
    if (!isMonitoring) return;
    
    const delta = timestamp - lastTimestamp;
    if (delta >= 1000) { // Calculate FPS every second
      const fps = Math.round((frameCount * 1000) / delta);
      setMetrics(prev => ({ ...prev, frameRate: fps }));
      setFrameCount(0);
      setLastTimestamp(timestamp);
    } else {
      setFrameCount(prev => prev + 1);
    }
    
    if (isMonitoring) {
      requestAnimationFrame(updateFrameRate);
    }
  }, [frameCount, lastTimestamp, isMonitoring]);
  
  // Start frame rate monitoring
  useEffect(() => {
    if (isMonitoring) {
      requestAnimationFrame(updateFrameRate);
    }
  }, [isMonitoring, updateFrameRate]);
  
  // Web Vitals monitoring
  useEffect(() => {
    const observePerformance = () => {
      // Performance Observer for Web Vitals
      if ('PerformanceObserver' in window) {
        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        
        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            setMetrics(prev => ({ ...prev, fid: entry.processingStart - entry.startTime }));
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        
        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          setMetrics(prev => ({ ...prev, cls: clsValue }));
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        
        // Navigation timing
        if (performance.getEntriesByType) {
          const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
          if (navigationEntries.length > 0) {
            const nav = navigationEntries[0];
            setMetrics(prev => ({
              ...prev,
              fcp: nav.loadEventEnd - nav.fetchStart,
              ttfb: nav.responseStart - nav.fetchStart,
              domContentLoaded: nav.domContentLoadedEventEnd - nav.fetchStart,
              loadComplete: nav.loadEventEnd - nav.fetchStart,
            }));
          }
        }
        
        // Memory usage (if available)
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          setMetrics(prev => ({ ...prev, memoryUsage: memory.usedJSHeapSize }));
        }
      }
    };
    
    // Initialize performance monitoring
    if (document.readyState === 'complete') {
      observePerformance();
    } else {
      window.addEventListener('load', observePerformance);
    }
    
    return () => {
      window.removeEventListener('load', observePerformance);
    };
  }, []);
  
  const getMetricStatus = (
    value: number | null,
    thresholds: { good: number; needsImprovement: number }
  ): 'good' | 'needs-improvement' | 'poor' | 'unknown' => {
    if (value === null) return 'unknown';
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.needsImprovement) return 'needs-improvement';
    return 'poor';
  };
  
  const startMonitoring = () => setIsMonitoring(true);
  const stopMonitoring = () => setIsMonitoring(false);
  
  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    getMetricStatus: (metric: keyof PerformanceThresholds, value: number | null) =>
      getMetricStatus(value, PERFORMANCE_THRESHOLDS[metric]),
  };
};

interface PerformanceMonitorProps {
  showDebugInfo?: boolean;
  onPerformanceIssue?: (metric: string, value: number) => void;
  className?: string;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  showDebugInfo = false,
  onPerformanceIssue,
  className,
}) => {
  const { metrics, isMonitoring, startMonitoring, stopMonitoring, getMetricStatus } = usePerformanceMonitoring();
  
  // Auto-start monitoring on mount
  useEffect(() => {
    startMonitoring();
    return () => stopMonitoring();
  }, [startMonitoring, stopMonitoring]);
  
  // Performance issue detection
  useEffect(() => {
    if (!onPerformanceIssue) return;
    
    Object.entries(metrics).forEach(([key, value]) => {
      if (value !== null && typeof value === 'number' && key in PERFORMANCE_THRESHOLDS) {
        const status = getMetricStatus(key as keyof PerformanceThresholds, value);
        if (status === 'poor') {
          onPerformanceIssue(key, value);
        }
      }
    });
  }, [metrics, onPerformanceIssue, getMetricStatus]);
  
  if (!showDebugInfo) {
    return null; // Invisible monitoring
  }
  
  return (
    <motion.div
      className={`fixed top-4 right-4 z-50 bg-black/80 text-white p-3 rounded-lg text-xs font-mono ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="performance-monitor">
        <div className="mb-2 font-semibold">Performance Metrics</div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className={`metric ${getMetricStatus('lcp', metrics.lcp)}`}>
            <span>LCP:</span> {metrics.lcp ? `${Math.round(metrics.lcp)}ms` : 'N/A'}
          </div>
          
          <div className={`metric ${getMetricStatus('fid', metrics.fid)}`}>
            <span>FID:</span> {metrics.fid ? `${Math.round(metrics.fid)}ms` : 'N/A'}
          </div>
          
          <div className={`metric ${getMetricStatus('cls', metrics.cls)}`}>
            <span>CLS:</span> {metrics.cls ? metrics.cls.toFixed(3) : 'N/A'}
          </div>
          
          <div className={`metric ${getMetricStatus('fcp', metrics.fcp)}`}>
            <span>FCP:</span> {metrics.fcp ? `${Math.round(metrics.fcp)}ms` : 'N/A'}
          </div>
          
          <div className={`metric ${getMetricStatus('frameRate', metrics.frameRate)}`}>
            <span>FPS:</span> {Math.round(metrics.frameRate)}
          </div>
          
          <div className="metric">
            <span>Mem:</span> {metrics.memoryUsage ? `${Math.round(metrics.memoryUsage / 1024 / 1024)}MB` : 'N/A'}
          </div>
        </div>
        
        <div className="mt-2 text-xs opacity-70">
          Status: {isMonitoring ? 'Monitoring' : 'Stopped'}
        </div>
      </div>
      
      <style jsx>{`
        .metric {
          padding: 2px 4px;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
        }
        
        .metric.good {
          background-color: rgba(34, 197, 94, 0.2);
          border: 1px solid rgba(34, 197, 94, 0.4);
        }
        
        .metric.needs-improvement {
          background-color: rgba(251, 191, 36, 0.2);
          border: 1px solid rgba(251, 191, 36, 0.4);
        }
        
        .metric.poor {
          background-color: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
        }
        
        .metric.unknown {
          background-color: rgba(107, 114, 128, 0.2);
          border: 1px solid rgba(107, 114, 128, 0.4);
        }
      `}</style>
    </motion.div>
  );
};

/**
 * Performance-aware animation component
 * Automatically reduces animations based on device performance
 */
interface PerformanceAwareAnimationProps {
  children: React.ReactNode;
  high?: React.ReactNode;
  balanced?: React.ReactNode;
  low?: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PerformanceAwareAnimation: React.FC<PerformanceAwareAnimationProps> = ({
  children,
  high,
  balanced,
  low,
  fallback,
}) => {
  const { metrics } = usePerformanceMonitoring();
  const [performanceMode, setPerformanceMode] = useState<'high' | 'balanced' | 'low'>('balanced');
  
  // Determine performance mode based on metrics
  useEffect(() => {
    if (metrics.frameRate < 45) {
      setPerformanceMode('low');
    } else if (metrics.frameRate < 55) {
      setPerformanceMode('balanced');
    } else {
      setPerformanceMode('high');
    }
  }, [metrics.frameRate]);
  
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion && fallback) {
    return <>{fallback}</>;
  }
  
  // Return appropriate content based on performance mode
  switch (performanceMode) {
    case 'high':
      return <>{high || children}</>;
    case 'balanced':
      return <>{balanced || children}</>;
    case 'low':
      return <>{low || fallback || children}</>;
    default:
      return <>{children}</>;
  }
};

/**
 * Layout Performance Provider
 * Provides performance context to child components
 */
interface LayoutPerformanceContextType {
  performanceMode: 'high' | 'balanced' | 'low';
  metrics: PerformanceMetrics;
  enableOptimizations: boolean;
}

const LayoutPerformanceContext = React.createContext<LayoutPerformanceContextType | null>(null);

interface LayoutPerformanceProviderProps {
  children: React.ReactNode;
  enableAutoOptimizations?: boolean;
}

export const LayoutPerformanceProvider: React.FC<LayoutPerformanceProviderProps> = ({
  children,
  enableAutoOptimizations = true,
}) => {
  const { metrics, isMonitoring, startMonitoring } = usePerformanceMonitoring();
  const [performanceMode, setPerformanceMode] = useState<'high' | 'balanced' | 'low'>('balanced');
  const [enableOptimizations, setEnableOptimizations] = useState(enableAutoOptimizations);
  
  // Auto-determine performance mode
  useEffect(() => {
    if (!enableAutoOptimizations) return;
    
    // Device performance heuristics
    const deviceMemory = (navigator as any).deviceMemory || 4; // GB
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const connection = (navigator as any).connection;
    
    let mode: 'high' | 'balanced' | 'low' = 'balanced';
    
    // High performance: Good hardware + metrics
    if (deviceMemory >= 8 && 
        hardwareConcurrency >= 8 && 
        metrics.frameRate >= 58 &&
        (!connection || connection.effectiveType === '4g')) {
      mode = 'high';
    }
    // Low performance: Limited hardware or poor metrics
    else if (deviceMemory <= 2 || 
             hardwareConcurrency <= 2 || 
             metrics.frameRate < 45 ||
             (connection && connection.effectiveType === '2g')) {
      mode = 'low';
    }
    
    setPerformanceMode(mode);
  }, [metrics, enableAutoOptimizations]);
  
  // Start monitoring on mount
  useEffect(() => {
    if (!isMonitoring) {
      startMonitoring();
    }
  }, [isMonitoring, startMonitoring]);
  
  const contextValue: LayoutPerformanceContextType = {
    performanceMode,
    metrics,
    enableOptimizations,
  };
  
  return (
    <LayoutPerformanceContext.Provider value={contextValue}>
      {children}
    </LayoutPerformanceContext.Provider>
  );
};

export const useLayoutPerformance = (): LayoutPerformanceContextType => {
  const context = React.useContext(LayoutPerformanceContext);
  if (!context) {
    throw new Error('useLayoutPerformance must be used within a LayoutPerformanceProvider');
  }
  return context;
};

/**
 * Performance-optimized motion component
 */
interface OptimizedMotionProps {
  children: React.ReactNode;
  performanceMode?: 'high' | 'balanced' | 'low';
  animation?: {
    high: any;
    balanced: any;
    low: any;
  };
  className?: string;
}

export const OptimizedMotion: React.FC<OptimizedMotionProps> = ({
  children,
  performanceMode,
  animation = {
    high: {
      initial: { opacity: 0, y: 20, scale: 0.95 },
      animate: { opacity: 1, y: 0, scale: 1 },
      transition: { duration: 0.6, ease: [0.4, 0.0, 0.2, 1] },
    },
    balanced: {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] },
    },
    low: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.15 },
    },
  },
  className,
}) => {
  const { performanceMode: contextMode } = useLayoutPerformance();
  const mode = performanceMode || contextMode;
  
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }
  
  return (
    <motion.div
      className={className}
      {...animation[mode]}
    >
      {children}
    </motion.div>
  );
};

export default PerformanceMonitor;