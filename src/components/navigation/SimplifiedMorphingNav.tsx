/**
 * Simplified Morphing Navigation Component
 * Context-aware navigation with clear state machine and smooth transitions
 * Based on PRP-022-Layout-Optimization specification
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Package, 
  ChefHat, 
  ShoppingCart, 
  BarChart3, 
  Bot, 
  Timer, 
  HelpCircle, 
  Menu, 
  Plus,
  Scan
} from 'lucide-react';
import { MaterialButton } from '@/components/ui/material/Button';
import { useResponsiveZones, useViewport } from '@/hooks/useResponsiveZones';
import { cn } from '@/lib/utils';

type NavState = 'default' | 'cooking' | 'shopping' | 'minimal';

interface NavConfig {
  items: NavItem[];
  height: number;
  layout: 'spread' | 'centered' | 'corners';
  accentColor?: string;
  autoHide?: boolean;
  showLabels?: boolean;
}

interface NavItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  route: string;
  action?: () => void;
  badge?: number;
}

interface NavigationContext {
  currentRoute: string;
  userContext: {
    mode: 'cooking' | 'shopping' | 'browsing';
    isActive?: boolean;
  };
  scrollBehavior: {
    direction: 'up' | 'down';
    velocity: number;
    isScrolling: boolean;
  };
}

interface SimplifiedMorphingNavProps {
  className?: string;
  forceState?: NavState;
  onStateChange?: (state: NavState) => void;
}

export const SimplifiedMorphingNav: React.FC<SimplifiedMorphingNavProps> = ({
  className,
  forceState,
  onStateChange,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const viewport = useViewport();
  const { grid } = useResponsiveZones();
  
  const [navState, setNavState] = useState<NavState>('default');
  const [isVisible, setIsVisible] = useState(true);
  const [scrollBehavior, setScrollBehavior] = useState({
    direction: 'up' as const,
    velocity: 0,
    isScrolling: false,
  });
  
  // Track scroll behavior for auto-hide functionality
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const velocity = Math.abs(currentScrollY - lastScrollY);
      const direction = currentScrollY > lastScrollY ? 'down' : 'up';
      
      setScrollBehavior(prev => ({
        direction,
        velocity,
        isScrolling: true,
      }));
      
      lastScrollY = currentScrollY;
      
      // Clear scrolling state after inactivity
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setScrollBehavior(prev => ({ ...prev, isScrolling: false }));
      }, 150);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);
  
  // Determine navigation context
  const navigationContext: NavigationContext = useMemo(() => {
    const route = location.pathname;
    
    // Determine user context based on route
    let mode: 'cooking' | 'shopping' | 'browsing' = 'browsing';
    if (route.includes('/recipe') && route.includes('/cook')) mode = 'cooking';
    else if (route.includes('/shopping')) mode = 'shopping';
    
    return {
      currentRoute: route,
      userContext: { mode },
      scrollBehavior,
    };
  }, [location.pathname, scrollBehavior]);
  
  // Simplified state machine
  const determineNavState = useCallback((): NavState => {
    if (forceState) return forceState;
    
    // Priority: explicit context > route-based > scroll behavior > default
    if (navigationContext.userContext.mode === 'cooking') return 'cooking';
    if (navigationContext.userContext.mode === 'shopping') return 'shopping';
    if (scrollBehavior.direction === 'down' && 
        scrollBehavior.velocity > 100 && 
        scrollBehavior.isScrolling) {
      return 'minimal';
    }
    return 'default';
  }, [navigationContext, scrollBehavior, forceState]);
  
  // Update navigation state
  useEffect(() => {
    const newState = determineNavState();
    if (newState !== navState) {
      setNavState(newState);
      onStateChange?.(newState);
    }
  }, [determineNavState, navState, onStateChange]);
  
  // Define navigation configurations
  const navConfigs: Record<NavState, NavConfig> = useMemo(() => ({
    default: {
      items: [
        { id: 'inventory', icon: Package, label: 'Inventaire', route: '/inventory' },
        { id: 'recipes', icon: ChefHat, label: 'Recettes', route: '/recipes' },
        { id: 'scan', icon: Scan, label: 'Scanner', route: '/inventory', action: () => {/* TODO: Open scanner */} },
        { id: 'shopping', icon: ShoppingCart, label: 'Courses', route: '/shopping' },
        { id: 'insights', icon: BarChart3, label: 'Insights', route: '/insights' },
      ],
      height: grid.touchTargets.minimum,
      layout: 'spread',
      showLabels: true,
    },
    
    cooking: {
      items: [
        { id: 'timer', icon: Timer, label: 'Timer', route: '#', action: () => {/* TODO: Timer action */} },
        { id: 'steps', icon: ChefHat, label: 'Étapes', route: '#', action: () => {/* TODO: Steps action */} },
        { id: 'help', icon: HelpCircle, label: 'Aide', route: '/assistant' },
      ],
      height: grid.touchTargets.comfortable,
      layout: 'centered',
      accentColor: '#EA580C', // Cooking orange
      showLabels: true,
    },
    
    shopping: {
      items: [
        { id: 'list', icon: ShoppingCart, label: 'Liste', route: '/shopping' },
        { id: 'scan', icon: Scan, label: 'Scanner', route: '#', action: () => {/* TODO: Scanner action */} },
        { id: 'budget', icon: BarChart3, label: 'Budget', route: '/insights' },
      ],
      height: grid.touchTargets.comfortable,
      layout: 'spread',
      accentColor: '#3B82F6', // Shopping blue
      showLabels: true,
    },
    
    minimal: {
      items: [
        { id: 'menu', icon: Menu, label: 'Menu', route: '#', action: () => {/* TODO: Menu action */} },
        { id: 'action', icon: Plus, label: 'Action', route: '#', action: () => {/* TODO: Quick action */} },
      ],
      height: grid.touchTargets.minimum * 0.85,
      layout: 'corners',
      autoHide: true,
      showLabels: false,
    },
  }), [grid.touchTargets]);
  
  // Handle navigation and actions
  const handleNavigation = useCallback((item: NavItem) => {
    if (item.action) {
      item.action();
    } else if (item.route && item.route !== '#') {
      navigate(item.route);
    }
  }, [navigate]);
  
  // Determine if item is active
  const isActiveRoute = useCallback((item: NavItem): boolean => {
    const currentPath = location.pathname;
    
    // Special handling for scanner in inventory
    if (item.id === 'scan' && currentPath === '/inventory') return false;
    
    return currentPath === item.route;
  }, [location.pathname]);
  
  // Calculate touch size based on navigation height
  const calculateTouchSize = useCallback((navHeight: number) => {
    return Math.max(grid.touchTargets.minimum, navHeight * 0.8);
  }, [grid.touchTargets.minimum]);
  
  // Auto-hide logic for minimal state
  useEffect(() => {
    if (navState === 'minimal' && navConfigs[navState].autoHide) {
      const hideTimer = setTimeout(() => {
        if (!scrollBehavior.isScrolling) {
          setIsVisible(false);
        }
      }, 2000);
      
      return () => clearTimeout(hideTimer);
    } else {
      setIsVisible(true);
    }
  }, [navState, scrollBehavior.isScrolling, navConfigs]);
  
  const currentConfig = navConfigs[navState];
  
  return (
    <AnimatePresence mode="wait">
      <motion.nav
        key={navState}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "bg-card/90 backdrop-blur-md border-t shadow-lg",
          "safe-area-inset-bottom", // Respect device safe areas
          className
        )}
        style={{
          height: currentConfig.height,
          backgroundColor: currentConfig.accentColor ? 
            `${currentConfig.accentColor}15` : undefined,
        }}
        initial={{ y: 100, opacity: 0 }}
        animate={{ 
          y: isVisible ? 0 : 100,
          opacity: isVisible ? 1 : 0,
          height: currentConfig.height,
        }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ 
          type: 'spring',
          damping: 25,
          stiffness: 400,
          duration: 0.3,
        }}
        data-nav-state={navState}
        data-layout={currentConfig.layout}
      >
        <div 
          className={cn(
            "h-full px-2",
            currentConfig.layout === 'spread' && "grid gap-1",
            currentConfig.layout === 'centered' && "flex justify-center items-center gap-4",
            currentConfig.layout === 'corners' && "flex justify-between items-center px-6"
          )}
          style={{
            gridTemplateColumns: currentConfig.layout === 'spread' ? 
              `repeat(${currentConfig.items.length}, 1fr)` : undefined,
          }}
        >
          {currentConfig.items.map((item, index) => (
            <motion.div
              key={`${navState}-${item.id}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{
                delay: index * 0.05,
                duration: 0.2,
                ease: [0.4, 0.0, 0.2, 1],
              }}
            >
              <MaterialButton
                variant={isActiveRoute(item) ? 'tonal' : 'text'}
                size="sm"
                onClick={() => handleNavigation(item)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-lg transition-all",
                  "min-h-[var(--touch-minimum)] min-w-[var(--touch-minimum)]",
                  currentConfig.showLabels ? "h-full" : "aspect-square",
                  currentConfig.layout === 'corners' && "flex-row gap-2"
                )}
                style={{
                  minHeight: calculateTouchSize(currentConfig.height),
                  color: currentConfig.accentColor && isActiveRoute(item) ? 
                    currentConfig.accentColor : undefined,
                }}
              >
                <item.icon 
                  className={cn(
                    "transition-all",
                    currentConfig.showLabels ? "w-5 h-5" : "w-6 h-6",
                    isActiveRoute(item) && "scale-110"
                  )}
                />
                
                {currentConfig.showLabels && (
                  <span className={cn(
                    "text-xs font-medium transition-all",
                    currentConfig.layout === 'corners' && "text-sm"
                  )}>
                    {item.label}
                  </span>
                )}
                
                {/* Badge for notifications */}
                {item.badge && item.badge > 0 && (
                  <motion.div
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </motion.div>
                )}
              </MaterialButton>
            </motion.div>
          ))}
        </div>
        
        {/* Context indicator */}
        {navState !== 'default' && (
          <motion.div
            className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <div 
              className="w-8 h-1 rounded-full"
              style={{ backgroundColor: currentConfig.accentColor || 'var(--primary)' }}
            />
          </motion.div>
        )}
      </motion.nav>
    </AnimatePresence>
  );
};

/**
 * Hook for managing navigation state and context
 */
export const useNavigation = () => {
  const location = useLocation();
  const [userContext, setUserContext] = useState<NavigationContext['userContext']>({
    mode: 'browsing',
  });
  const [scrollBehavior, setScrollBehavior] = useState<NavigationContext['scrollBehavior']>({
    direction: 'up',
    velocity: 0,
    isScrolling: false,
  });
  
  // Auto-detect user context from route
  useEffect(() => {
    const route = location.pathname;
    
    if (route.includes('/recipe') && route.includes('/cook')) {
      setUserContext({ mode: 'cooking', isActive: true });
    } else if (route.includes('/shopping')) {
      setUserContext({ mode: 'shopping', isActive: true });
    } else {
      setUserContext({ mode: 'browsing', isActive: false });
    }
  }, [location.pathname]);
  
  return {
    currentRoute: location.pathname,
    userContext,
    scrollBehavior,
    setUserContext,
    setScrollBehavior,
  };
};

/**
 * Enhanced Layout Component with Morphing Navigation
 */
interface EnhancedLayoutProps {
  children: React.ReactNode;
  heroContent?: React.ReactNode;
  enableMorphingNav?: boolean;
  navState?: NavState;
  className?: string;
}

export const EnhancedLayout: React.FC<EnhancedLayoutProps> = ({
  children,
  heroContent,
  enableMorphingNav = true,
  navState,
  className,
}) => {
  const { zones } = useResponsiveZones();
  const viewport = useViewport();
  
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Hero Section */}
      {heroContent && (
        <section 
          className="hero-section"
          style={{ height: zones.hero.height }}
        >
          {heroContent}
        </section>
      )}
      
      {/* Main Content */}
      <main className={cn(
        "main-content",
        enableMorphingNav && "pb-20", // Space for navigation
        heroContent && "relative z-10"
      )}>
        {children}
      </main>
      
      {/* Enhanced Morphing Navigation */}
      {enableMorphingNav && (
        <SimplifiedMorphingNav 
          forceState={navState}
          onStateChange={(state) => {
            console.log('Navigation state changed to:', state);
          }}
        />
      )}
    </div>
  );
};

export default SimplifiedMorphingNav;